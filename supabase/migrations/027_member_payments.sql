-- Migration 027: per-member, per-month payment tracking.
--
-- Independent of invoice mode. The admin needs to record whether each person has
-- paid for a given month even when only statements (not formal invoices) are
-- sent — so this is a lightweight paid ledger keyed on (member, month), separate
-- from billing_documents (which only exists when invoice mode is on).
--
-- The amount is an optional snapshot: the monthly run can fill it, but the
-- Employees paid view also derives amounts live from transactions/archive, so a
-- row can exist with amount_cents NULL and still carry a meaningful paid flag.
--
-- Service-role only (the admin Employees tab writes through the service-role API,
-- same pattern as members/companies/items — see migration 022).

create table if not exists member_payments (
  member_id    uuid not null references public.members(id) on delete cascade,
  report_month text not null,                       -- e.g. "2026-06"
  amount_cents integer,                             -- optional snapshot; NULL = derive live
  paid         boolean not null default false,
  paid_at      timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (member_id, report_month)
);

comment on table member_payments is
  'Per-member, per-month paid flag. Works with or without invoice mode. Service-role only.';

create index if not exists member_payments_month_idx on member_payments (report_month);

-- RLS on, no policies → anon/authenticated denied; service_role bypasses RLS but
-- still needs object-level grants. SELECT + INSERT + UPDATE (upsert on toggle);
-- DELETE withheld (least privilege — cascade handles member deletion at the DDL
-- level, and a payment record is never removed on its own).
alter table member_payments enable row level security;
grant select, insert, update on public.member_payments to service_role;
