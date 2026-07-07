-- Migration 024: invoice mode + ITC1 issuer block on the app_settings singleton.
--
-- The monthly member/company email can be rendered as a legal invoice instead of
-- an informational statement. The invoice is ALWAYS issued by ITC1 (ITC
-- Innovations Technologie Campus GmbH) — the app is only tooling that renders
-- ITC1's document, exactly like Lexoffice/sevDesk. The developers never appear as
-- issuer. See docs/prd-billing-commercial-addendum.md §1.1.
--
--   issue_invoices        master toggle. When true AND the issuer block below is
--                         complete, the "Report Format" admin section becomes the
--                         "Invoice Format" and the monthly email renders as an
--                         invoice with a document number and payment/transfer
--                         details. Default false → existing statement behaviour.
--
--   Issuer block (all ITC1's own details, entered by the admin, pre-fillable from
--   the Kaffeerechnung-Vorlage.pdf). NULL text = not configured yet; the API
--   refuses to enable invoice mode until the mandatory ones are set.
--     issuer_legal_name     e.g. "ITC Innovations Technologie Campus GmbH"
--     issuer_address        multi-line postal address
--     issuer_vat_id         ITC1's USt-IdNr, e.g. "DE207285819"
--     issuer_iban           ITC1's RECEIVING account (never a developer's)
--     issuer_bic
--     invoice_number_prefix e.g. "K" or "KL-" — the running number is appended
--     invoice_payment_terms e.g. "Zahlung ohne Abzug innerhalb 14 Tagen"
--     invoice_vat_rate      VAT percent shown on the document (default 19)
--
-- Service-role only, same as the rest of app_settings (migration 010).

alter table public.app_settings
  add column if not exists issue_invoices        boolean not null default false,
  add column if not exists issuer_legal_name     text,
  add column if not exists issuer_address        text,
  add column if not exists issuer_vat_id         text,
  add column if not exists issuer_iban           text,
  add column if not exists issuer_bic            text,
  add column if not exists invoice_number_prefix text,
  add column if not exists invoice_payment_terms text,
  add column if not exists invoice_vat_rate      numeric(5, 2) not null default 19;

alter table public.app_settings
  drop constraint if exists app_settings_invoice_vat_rate_check;
alter table public.app_settings
  add constraint app_settings_invoice_vat_rate_check
  check (invoice_vat_rate >= 0 and invoice_vat_rate <= 100);
