-- Migration 023: company billing mode + billing contact.
--
-- Supports ITC1's request that "if a company covers all the coffee, just register
-- one billing contact for the company". Adds a per-company billing mode and the
-- contact who receives the company-level document when the company pays for all
-- of its members.
--
--   billing_mode          'individual' — each member is billed on their own
--                                        monthly document (the default, unchanged
--                                        behaviour);
--                         'company_paid' — one document goes to the company
--                                        billing contact covering all members.
--   billing_contact_name  display name of the person who receives the company bill
--   billing_contact_email required when billing_mode = 'company_paid' (enforced in
--                         the admin API; kept nullable here so existing rows and
--                         individual-mode companies are valid)
--   billing_notes         admin-only free text, never rendered to members
--
-- service_role already holds insert/update/select on companies (migrations
-- 006 + 022), so no new grant is needed.

alter table public.companies
  add column if not exists billing_mode          text not null default 'individual',
  add column if not exists billing_contact_name  text,
  add column if not exists billing_contact_email text,
  add column if not exists billing_notes         text;

alter table public.companies
  drop constraint if exists companies_billing_mode_check;
alter table public.companies
  add constraint companies_billing_mode_check
  check (billing_mode in ('individual', 'company_paid'));

comment on column public.companies.billing_mode is
  'individual = bill each member; company_paid = one document to billing_contact_email covering all members.';
comment on column public.companies.billing_contact_email is
  'Recipient of the company-level monthly document; required (API-enforced) when billing_mode = company_paid.';
