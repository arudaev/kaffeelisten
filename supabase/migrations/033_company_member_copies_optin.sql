-- Migration 033: employer copies of employees' documents become opt-in.
--
-- For a company whose employees each pay their own way, the monthly run used to
-- zip every employee's individual invoice and send it to the employer's billing
-- contact — automatically, for every such company, in invoice mode. That hands
-- each employee's itemised consumption to their employer without anyone having
-- decided it should.
--
-- It is now a per-company choice, OFF by default. Deploying this therefore STOPS
-- the automatic disclosure, which is the intended change. ITC1 can switch it on in
-- Unternehmen for a company that has asked for copies.
--
-- The rule is applied in api/_lib/documentMatrix.ts: copies are only ever
-- attached for an `individual` company. A company_paid company's members hold
-- information copies, not invoices, so there is nothing to forward.
--
-- service_role already holds select/insert/update on companies (migrations 006,
-- 022); no grant is needed.

alter table public.companies
  add column if not exists member_document_copies_enabled boolean not null default false;

comment on column public.companies.member_document_copies_enabled is
  'Employer receives copies of its employees'' own monthly documents. Opt-in; only applies when billing_mode = individual.';
