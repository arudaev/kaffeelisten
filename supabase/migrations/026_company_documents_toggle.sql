-- Migration 026: per-company documents toggle.
--
-- Splits the monthly emails into three independent streams:
--   • admin/CEO aggregate report  → report_recipients (existing behaviour)
--   • per-company document         → each company's billing contact (this toggle)
--   • per-member statement/invoice → each member (member_statements_enabled)
--
-- When company_documents_enabled is on, every active company that has a billing
-- contact email receives its own monthly document: an Aufstellung (report), or an
-- invoice when the company's billing_mode = 'company_paid' and invoice mode is
-- configured. Default on; the admin can turn it off from Settings.

alter table public.app_settings
  add column if not exists company_documents_enabled boolean not null default true;
