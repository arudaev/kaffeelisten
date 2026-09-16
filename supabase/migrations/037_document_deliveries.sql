-- Migration 037: an append-only ledger of every document delivered.
--
-- billing_documents (migration 025) records INVOICES only, and invoice mode stays
-- off until ITC1 authorises it (migration 036). A documents view built on it would
-- therefore be empty for statements and information copies — which is everything
-- the app sends today. This table records every document actually delivered, of
-- every kind, so the admin can see what went to whom, spot missing attachments,
-- and re-download or re-send any of them.
--
-- APPEND-ONLY. A re-send inserts a new row pointing at the original (resend_of)
-- instead of overwriting it; markBillingDocumentSent overwrites sent_at and
-- resend_message_id on billing_documents, which erases the record of the first
-- send. service_role may select and insert only — no update, no delete.
--
-- Files are not stored here. A re-download regenerates the document from the
-- archive with its original number and amounts (api/admin/documents.ts); storing
-- the rendered bytes needs a storage decision by ITC1 (retention and ownership),
-- which is tracked separately.

create table if not exists public.document_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  report_month        text not null,                  -- e.g. "2026-08"
  kind                text not null check (kind in (
                        'member_invoice', 'member_statement', 'member_info',
                        'company_invoice', 'company_statement')),
  company_id          uuid not null references public.companies(id),
  member_id           uuid references public.members(id),   -- null → a company document
  recipient_name      text not null,
  recipient_email     text not null,
  document_number     text,                            -- invoices only
  billing_document_id uuid references public.billing_documents(id),
  gross_cents         integer not null,
  has_pdf             boolean not null,
  has_xlsx            boolean not null,
  resend_message_id   text,
  resend_of           uuid references public.document_deliveries(id),
  sent_at             timestamptz not null default now(),
  -- A person document has a member; a company document has none.
  constraint document_deliveries_subject_check check (
    (kind like 'member_%' and member_id is not null) or
    (kind like 'company_%' and member_id is null)
  ),
  -- Exactly the invoices carry a number.
  constraint document_deliveries_number_check check (
    (kind like '%_invoice') = (document_number is not null)
  )
);

comment on table public.document_deliveries is
  'Every monthly document delivered, of every kind. Append-only: re-sends add a row (resend_of). Service-role select/insert only.';

create index if not exists document_deliveries_month_idx   on public.document_deliveries (report_month);
create index if not exists document_deliveries_company_idx on public.document_deliveries (company_id);
create index if not exists document_deliveries_member_idx  on public.document_deliveries (member_id);

alter table public.document_deliveries enable row level security;
revoke all on public.document_deliveries from anon, authenticated;
grant select, insert on public.document_deliveries to service_role;
revoke update, delete on public.document_deliveries from service_role;
