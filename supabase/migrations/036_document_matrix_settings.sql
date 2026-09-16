-- Migration 036: document-matrix settings and the invoice-mode legal gate.
--
-- company_paid_member_reports_enabled
--   Members of a company that pays now receive an information copy of their own
--   consumption (previously they received nothing). On by default; the copy names
--   the paying company and carries no payment details.
--
-- invoice_mode_authorized / invoice_authority_note
--   A SECOND, independent gate on invoice mode. docs/prd-billing-commercial-
--   addendum.md §1.1: invoice mode must stay disabled until ITC1 gives written
--   authority for documents issued in its name and its tax adviser approves the
--   process. `issue_invoices` alone was a single toggle anyone with the admin PIN
--   could flip. resolveIssuer (api/_lib/billing.ts) now returns no issuer — and so
--   every invoice path stays dormant — unless BOTH flags are set, and the settings
--   API refuses to set the authorisation without a note recording who granted it
--   and when.
--
-- On the production row at the time of writing, issue_invoices = false and no
-- billing document has ever been issued, so this changes nothing that is live.

alter table public.app_settings
  add column if not exists company_paid_member_reports_enabled boolean not null default true,
  add column if not exists invoice_mode_authorized boolean not null default false,
  add column if not exists invoice_authority_note text;

comment on column public.app_settings.company_paid_member_reports_enabled is
  'Members of a company_paid company receive an information-only copy of their consumption.';
comment on column public.app_settings.invoice_mode_authorized is
  'Legal gate: invoices are issued only when this AND issue_invoices are true. Requires invoice_authority_note.';
comment on column public.app_settings.invoice_authority_note is
  'Who granted written authority to issue invoices in ITC1''s name, and when.';
