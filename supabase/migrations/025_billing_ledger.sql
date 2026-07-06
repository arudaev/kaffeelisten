-- Migration 025: billing document ledger + monotonic invoice numbering.
--
-- When invoice mode is on, every monthly document (per member, per company, or
-- the ITC1 archive) is recorded here with a unique, never-reused number so the
-- billing is auditable and re-sends are idempotent. Nothing large is stored — the
-- document IS the email body; this ledger plus transactions_archive is the audit
-- trail. See docs/prd-billing-commercial-addendum.md §7.
--
-- All service-role only (billing runs server-side with the service key), same as
-- report_runs (migration 019).

-- ── billing_runs: one row per month, mirrors report_runs ─────────────────────
create table if not exists billing_runs (
  report_month text primary key,                 -- e.g. "2026-06"
  status       text not null default 'running'
                 check (status in ('running', 'completed', 'failed')),
  attempts     integer not null default 0,
  last_error   text,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  updated_at   timestamptz not null default now()
);

comment on table billing_runs is
  'Per-month invoice run ledger. Prevents duplicate issuance on retry. Service-role only.';

-- ── invoice number sequence ──────────────────────────────────────────────────
-- A gap-tolerant monotonic counter. German law requires invoice numbers to be
-- unique and traceable, not strictly gapless, so a sequence is sufficient and
-- safe under concurrency. The app formats the final string as
-- <invoice_number_prefix><zero-padded value> using the prefix from app_settings.
create sequence if not exists billing_document_number_seq as bigint start 1;

create or replace function public.next_billing_document_number()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.billing_document_number_seq');
$$;

revoke execute on function public.next_billing_document_number() from public;
grant  execute on function public.next_billing_document_number() to service_role;

-- ── billing_documents: the immutable ledger ──────────────────────────────────
create table if not exists billing_documents (
  id              uuid primary key default gen_random_uuid(),
  report_month    text not null,                 -- e.g. "2026-06"
  document_number text not null unique,           -- e.g. "K-000042"
  recipient_type  text not null
                    check (recipient_type in ('member', 'company', 'itc1_archive')),
  recipient_name  text not null,                  -- snapshot at time of issue
  recipient_email text not null,                  -- snapshot at time of issue
  company_id      uuid references public.companies(id),
  member_id       uuid references public.members(id),
  subtotal_cents  integer not null default 0,
  tax_cents       integer not null default 0,
  total_cents     integer not null default 0,
  status          text not null default 'draft'
                    check (status in ('draft', 'sent', 'failed', 'voided')),
  paid            boolean not null default false,
  sent_at         timestamptz,
  resend_message_id text,
  voided_at       timestamptz,
  created_at      timestamptz not null default now()
);

comment on table billing_documents is
  'Immutable per-recipient invoice/statement ledger with unique document numbers. Delivery is the email body (no stored PDF). Service-role only.';

-- One issued document per recipient per month (idempotent re-runs re-send the
-- same row instead of allocating a new number). itc1_archive rows key on month
-- alone (member_id/company_id NULL), so use a partial unique index per type.
create unique index if not exists billing_documents_member_month_uidx
  on billing_documents (report_month, member_id) where member_id is not null;
create unique index if not exists billing_documents_company_month_uidx
  on billing_documents (report_month, company_id)
  where company_id is not null and recipient_type = 'company';

create index if not exists billing_documents_month_idx on billing_documents (report_month);

-- RLS on, no policies → anon/authenticated denied; service_role bypasses RLS but
-- still needs object-level grants. INSERT + UPDATE only (voiding is an UPDATE);
-- DELETE withheld — the ledger is immutable (least privilege, like migration 022).
alter table billing_runs       enable row level security;
alter table billing_documents  enable row level security;
grant select, insert, update on public.billing_runs      to service_role;
grant select, insert, update on public.billing_documents to service_role;
