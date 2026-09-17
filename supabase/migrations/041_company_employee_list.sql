-- Migration 041: the per-person consumption list becomes its own, optional document.
--
-- deploy: pre
--
-- ITC1 (2026-09-17): a company that pays receives ONE invoice with the full
-- amount. What each employee consumed is not part of that invoice; it is a
-- separate "Verzehrliste" that a company only receives if it asked for it.
--
-- OFF by default, so deploying this removes names from every company's documents
-- until ITC1 switches the list on in Unternehmen for a company that requested it.
-- The rule is applied in api/_lib/documentMatrix.ts: the list only exists for a
-- company_paid company (an individually billed company's people get their own
-- documents; copies of those stay under member_document_copies_enabled, 033).
--
-- service_role already holds select/insert/update on companies (migrations 006,
-- 022). The flag is not sensitive; the post-deploy follow-up narrows anon's read
-- on companies to the picker columns anyway. No grant is needed.

alter table public.companies
  add column if not exists employee_list_enabled boolean not null default false;

comment on column public.companies.employee_list_enabled is
  'Company receives a separate per-person consumption list (Verzehrliste) with its documents. Opt-in; only applies when billing_mode = company_paid.';
