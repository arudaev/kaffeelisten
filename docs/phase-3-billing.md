# Phase 3 — billing documents, company accounts, admin panel

What was built in PR #41 in response to ITC1's feedback of 2026-09-16
(`docs/phase-3-requirements.md`). Environments and the migration process are in
`docs/environments.md`.

## Owner decisions

- Both billing modes stay equal. Statement mode is the default; invoice mode is
  complete but gated.
- Employer copies of employees' documents are a per-company opt-in, off by default.
- Company checkout uses a real shared house account (`members.kind = 'house'`).
- Settings are split into five tabs, each with its own save.
- Archived months can be exported but are not shown in *Einträge*.
- Transactions are kept indefinitely; invoice documents at least 8 years.
- Every transaction stores the price at the time of purchase.

## Who receives what

The payer gets the invoice (or, while invoice mode is off, the statement); the
other party gets an overview.

**Only invoices have attachments.** An invoice email carries the official invoice
as PDF and an Excel file with every entry; the payment box (IBAN, BIC,
Verwendungszweck) is in the email and in the PDF. Statements, information copies
and the non-paying side's overview are plain emails. The administration report
always has its PDF and Excel. The CEO's ZIP holds copies of every invoice file.

| Company | Person receives | Company contact receives |
| --- | --- | --- |
| Each person pays (`individual`) | **Aufstellung** / **Rechnung** | **Aufstellung** (overview). Copies of its employees' documents only if opted in. No contact → nothing, and that is fine. |
| Company pays (`company_paid`) | **Information** — own consumption, no payment details | **Aufstellung** / **Rechnung** over the full amount by item, naming no employee. The **Verzehrliste** (who consumed what) only if the company asked for it. No contact → nothing, and the admin report warns. |
| Shared account (`checkout_mode` company or both) | — (no person) | Included in the company document as *Sammelkonto (Firma)* |

| ITC1 | Receives |
| --- | --- |
| Report recipients (administration) | **Monatsbericht**: key figures against the previous month, the most-consumed items for restocking, warnings (paying company without a contact, failed deliveries, missing attachments, no CEO address). Attachments: report PDF, all entries as Excel, campus roll-up Excel. |
| CEO address only | **Dokumentenarchiv (ZIP)**: byte-identical copies of every PDF and Excel sent that month, a delivery list, the report and the roll-up. |

The matrix is shown and explained under *Einstellungen → Abrechnung*. When
invoice mode is switched on but not yet active, the matrix already shows
invoices and says why they are not sent yet. Each cell's *Vorschau* has three
tabs: the email, the PDF attachment (rendered on demand) and the Excel
attachment (sheets as tables, with download). Previews use unsaved settings,
this month's data, and placeholder issuer data where fields are missing.

## Email, PDF and Excel have different jobs

ITC1 found emails listing every coffee unreadable.

| | Email body | PDF (invoices only) | Excel (invoices only) |
| --- | --- | --- | --- |
| Person | Greeting, one line per item and price (`12× Espresso`), total, payment box (invoice only) | The same as a formal document; invoice fields when invoicing | `Meine Einträge`: every entry with date and time |
| Company that pays | Full amount by item, no names; VAT and payment box on an invoice | The invoice: the same, as a formal document | `Artikel`, `Alle Einträge` (no names) |
| Verzehrliste (opt-in) | Invoice mode: a note that it is attached. Statement mode: its own section under the amount | Per-person totals, then each person's item lines — marked as no invoice | `Pro Person`, `Pro Person × Artikel`, `Alle Einträge` |
| Company whose people pay | Overview: every person with total and item summary (email only) | — | — |
| Administration | Key figures, restocking list, warnings, per-company table | Monthly report | All entries; campus roll-up with month-over-month comparison |

**Company invoices name no one (ITC1, 2026-09-17).** A paying company gets one
invoice with the full amount. What each employee consumed is a separate
*Verzehrliste*, switched on per company under *Unternehmen → Firma erhält
zusätzlich die Verzehrliste je Person* (`companies.employee_list_enabled`,
migration `041`, off by default). It travels as its own PDF and Excel next to
the invoice and never becomes part of it.

**PDF page breaks.** Documents are printed from the email HTML. In print the
email's grey frame and footer bar are dropped and the layout tables flow as
blocks, so content continues across pages instead of leaving an empty last page.
Pages get 12 mm/14 mm margins and *Seite x von y*; totals and the payment box
stay together (`api/_lib/reportHtml.ts` `PRINT_CSS`, `api/_lib/pdf.ts`).

Lines are grouped by item **and unit price** (`api/_lib/lines.ts`), so a price
change mid-month shows as two lines, each quantity × a price actually charged.

### Cost and runtime

- PDFs and Excel files are produced for invoices only. One Chromium per run,
  four PDFs in parallel, each PDF rendered once and reused
  for the email, the company ZIP and the CEO ZIP.
- Budget: wall-clock deadline inside the 300 s function limit and at most 500
  PDFs. A document whose PDF misses the budget is still sent (with its Excel) and
  flagged in the archive's delivery list and the admin warnings.
- Previews render HTML only; PDFs are rendered on explicit download.
- Nothing is stored in Supabase Storage.
- Measured on staging (2026-09-16, local run, real Chrome): 19 documents with PDF
  and Excel plus the admin report in **29.6 s**. ITC1's full volume (~90
  documents) is expected around two minutes; re-measure on the Vercel preview
  before the first production run.

## Company accounts at the iPad

`companies.checkout_mode`:

| Mode | iPad | Admin label |
| --- | --- | --- |
| `member` | Company → name → items | Nur Personen |
| `company` (migration 034) | Company → items; everything books on the shared account | Nur Firmenkonto |
| `both` (migration 039) | Company → **Für die Firma buchen** tile above the names → items | Personen + Firmenkonto |

A shared account always bills the company, so `company` and `both` require
*Firma zahlt* with a billing contact (`companyConfigError`). Shared accounts are
not people: they never appear in the name picker, never receive documents, and
are not counted as active people.

On the paper sheets 4process has no names (→ `company`), while ITC1, PBI and
Level51 have names plus unnamed rows (→ `both`).

## Admin panel

- **Übersicht** — month against the same days of the previous month, per company.
- **Einträge** — live month only, full names with email, filters, export.
- **Dokumente** — every delivered document with company, amount, attachments,
  email preview and re-send; PDF and Excel download for invoices. Re-sending re-renders from the
  stored data and never allocates a new invoice number.
- **Unternehmen** — who pays, checkout mode, people, month total, contact warning.
- **Mitarbeitende** — grouped by company; people of paying companies in bold; paid
  ticks per paying person or once per paying company; a dash for months without
  consumption.
- **Artikel** — price, sold this month against last month, revenue.
- **Einstellungen** — *Abrechnung* (matrix, recipients, invoice mode and its
  gate, texts), *Versand* (schedule, send now), *Zahlungen* (paid column),
  *iPad* (items per order), *System* (appearance, PIN).
- **Export** (every list) — CSV, Excel or PDF over any date range, live and
  archived months, deduplicated. Row caps: 50,000 (CSV/Excel), 2,000 (PDF).

## Data and retention

- `transactions.unit_price_cents` and the archive's price, item name, unit and
  category are snapshotted (030, 031). Older archive rows were backfilled with
  the prices current on migration day.
- The monthly run no longer deletes archive rows. The database-level revoke
  follows in a separate post-deploy PR.
- `document_deliveries` (037) is append-only: every send and re-send is a row.
- **Retention decision:** consumption data is kept indefinitely at the owner's
  request; invoice documents are reproducible for at least 8 years (§ 14b UStG).
  Consumption data is personal data, so ITC1 should record this retention
  decision in its GDPR record of processing activities. Deleting a person's
  history on request would need a dedicated, reviewed procedure.

## Security changes in this phase

- Migration 038 encodes production's API privileges. A database built from the
  migrations alone previously let the public key call `set_admin_pin`,
  `verify_admin_pin` and other server-only functions. Production was protected
  only by manual changes.
- The iPad reads only `id, name, active, checkout_mode` from `companies`. A
  follow-up migration narrows the anon grant to those columns; today anon can
  still read billing contact details in production.

## Sending progress

*Senden* opens a live view instead of a spinner. The run writes its plan and
phase to `report_runs.progress`; the dialog polls
`GET /api/admin/report-progress?month=` every 1.5 s and shows invoices (with PDF
and Excel), statements and information copies (email only) sent against planned,
the administration report and the CEO archive, failures, and how many emails
Resend reports as delivered. Delivery comes from the Resend webhook
(`api/resend-webhook.ts` → `email_delivery_events`, append-only). The dialog can be
closed; the run continues, and reopening it shows the run still in progress.

Every text in the dialog sits in its own element: browser page translation
replaced bare text nodes, and React crashed with *removeChild … not a child of
this node* when the dialog changed (`test/report-send-dialog.test.tsx`).

## Migrations and deploy order

This release: `030, 031, 033, 034, 035, 036, 037, 038, 039, 040, 041`, all `deploy: pre`.
They apply automatically when the PR merges (`Database - production`), alongside
the Vercel production build.

Follow-up PR, after this release is live and iPads have reloaded: `042` — revoke
DELETE on `transactions_archive` and narrow anon's `companies` grant to the
public columns (`deploy: post`).

## Still open

- **Invoice mode** stays off in production until ITC1 gives written authority
  and its tax adviser approves (`docs/prd-billing-commercial-addendum.md` §1.1).
- **Storing rendered PDFs** in Supabase Storage needs ITC1's decision on storage
  ownership and cost. Not built.
- Supabase Branching instead of the staging project once the Pro plan is in place.
- Removing the production-only leftovers listed in `docs/environments.md`.
