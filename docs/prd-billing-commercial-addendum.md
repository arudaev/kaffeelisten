# PRD Addendum: Billing, Invoices, and Handover

**Product:** Kaffeelisten
**Attachment to:** `docs/prd.md`
**Status:** Draft for client scope confirmation — legal/tax review pending
**Date:** 2026-07-06
**Prepared for:** ITC1 / Kaffeelisten stakeholders

> **Not legal or tax advice.** This document reflects the developers' current understanding and
> must be confirmed by qualified advisers (a Steuerberater/Lohnsteuerhilfeverein for the
> developers, ITC1's tax adviser for invoice compliance, and the relevant Ausländerbehörde /
> university international office for residence-permit questions). See §12.

---

## 1. Purpose

This document extends the original Kaffeelisten PRD with the scope requested by ITC1 after the
stakeholder meeting (Alex's email + the attached `Kaffeerechnung-Vorlage.pdf`):

- member email addresses must be mandatory,
- a company may cover all coffee costs through one billing contact,
- at month end each person should automatically receive a **statement or invoice** by email,
- ITC1 should receive a monthly billing package with invoice numbers (e.g. collected in a ZIP),
- ITC1 asked what "your work and the platform" will cost.

The original PRD treated automated billing and invoice generation as out of scope. This addendum
proposes a **post-v1 phase**, subject to legal, tax, and acceptance confirmation by ITC1.

### 1.1 The one reframing that governs this whole document

The attached template is **ITC Innovations Technologie Campus GmbH's own invoice** — issuer *ITC
Innovations Technologie Campus GmbH*, HRB Nr. 2194, **USt-IdNr DE207285819**, charging **19 % USt**,
payable to **ITC1's own Sparkasse Deggendorf account**, with ITC1's own invoice-number sequence
(`K-06-01`).

Therefore the coffee invoices are legally **issued by ITC1**, not by the developers. Kaffeelisten is
only *tooling that generates ITC1's document* from issuer data ITC1 configures — exactly like ITC1
using Lexoffice, sevDesk, or DATEV. **The vendor of an invoicing tool is not the invoice issuer.**

Two things that must never be conflated:

| | Who acts | Who bears it | Gating requirement |
|---|---|---|---|
| **(A) The app generates ITC1's coffee invoices to members/companies** | ITC1 (issuer) | ITC1 | A GDPR processor agreement (**AVV**, Art. 28) between ITC1 and the developers + ITC1's issuer/VAT configuration. **Not** dev business status. |
| **(B) ITC1 pays the developers for the software** | ITC1 → developers | The developers | Must stay a **one-time, modest** payment with **no ongoing obligation** (see §11) so it does not classify the students as self-employed. |

Consequences that hold everywhere below:

- The developers do **not** need to be a business for (A).
- The developers / their domain must **never** appear as the invoice issuer. The issuer block, VAT
  ID, IBAN, and invoice numbers are always ITC1's, taken from the template PDF.
- Member money flows to **ITC1's** IBAN shown on the invoice. The app never touches payments.
- Hosting the app on a developer-owned domain does **not** make the developer the issuer
  (hosting ≠ issuing) — but it does make the developer a **data processor**, which is why the AVV
  in §12 is the real missing legal instrument, more than the "can we issue invoices" question.

---

## 2. Current Coverage

| Request | Current status | Notes |
|---|---|---|
| Email address required | Mostly covered | `members.work_email` exists (migration 007); migration 011 makes it NOT NULL once data is clean. Self-registration collects email. |
| Automatic monthly email to every person | Partly covered | The app already sends each consuming member a monthly itemized **statement** (`sendMemberStatements` in `apps/web/api/_lib/report.ts`) when enabled. It is not a legal invoice. |
| Company pays all coffee costs via one contact | Not covered | `companies` has no billing mode / billing contact fields. |
| Monthly invoice package for ITC1 | Not covered | Current report sends one PDF + one Excel. No invoice ledger, number sequence, per-recipient PDF set, or ZIP. |
| Price for "your work and the platform" | See §11 | Reframed as a one-time handover, not a commercial product sale. |

---

## 3. Product Scope — invoicing via the tool (ITC1 as issuer)

### 3.1 Billing modes (per company)

| Mode | Who receives the document | Member email behaviour |
|---|---|---|
| `individual` (default) | Each member receives their own monthly document. | Itemized document for their own consumption only. |
| `company_paid` | One company billing contact receives one company-level document covering all members. | Members may receive an optional info-only statement, not a personal payment request. |

Default remains `individual` unless ITC1 configures otherwise.

### 3.2 Invoice vs. statement

- **Statement / Aufstellung:** informational summary; safe when ITC1 issues official invoices elsewhere.
- **Invoice / Rechnung:** official document with issuer details, invoice number, VAT treatment,
  payment terms, and long-term retention.

The template PDF shows ITC1 already issues proper *Rechnungen* with 19 % USt. So the system should be
built to generate **numbered monthly billing documents carrying ITC1's issuer block**, with ITC1's tax
adviser confirming the wording/VAT/number format (§12). Whether they are labelled "Rechnung" or
"Aufstellung" is ITC1's call, configurable in settings.

---

## 4. User Stories

### Campus member
- Store my work email correctly so I reliably receive my monthly document.
- My monthly email contains only my own consumption, so others' data stays private.
- If my company is company-paid, I keep logging normally without receiving a personal payment request.

### Company billing contact
- Receive one monthly document for my company so I can approve/reimburse all coffee costs internally.
- See the per-person and item-level breakdown to answer employee questions.
- Have the billing email sent automatically after month end.

### ITC1 administrator
- Set whether a company is billed individually or via one contact.
- Edit each company's billing contact name and email.
- Configure ITC1's issuer block (legal name, address, USt-IdNr, IBAN/BIC, number format, terms) once,
  so every monthly email is a valid ITC1 invoice with prominent payment/transfer details.
- Have every monthly document receive a unique, never-reused number, so records are auditable.
- Receive the existing monthly Excel/report — now carrying document numbers — as one complete billing archive.
- Re-send safely and traceably, without creating duplicate invoice numbers.
- Generate invoices only after the month is closed.
- Mark, per person and recent month, whether dues were paid.

### Developers / maintainers
- Invoice runs are idempotent, so cron retries and manual re-sends do not corrupt the ledger.
- Failures are visible in the admin panel and logs.

---

## 5. Functional Requirements

### P0 — Billing MVP

**Admin settings: invoice toggle turns "Report Format" into "Invoice Format"** *(reuse `app_settings`,
`api/admin/settings.ts`, `src/pages/admin/SettingsPage.tsx`)*
- `app_settings.issue_invoices` boolean toggle on the admin **Settings** page.
- The existing **Report Format** editing section (subject/intro/accent, member subject/intro templates)
  is reused as-is. When `issue_invoices` is on **and** the required legal fields are filled, that section
  relabels to **"Invoice Format"** and gains the **ITC1 issuer block**:
  - legal issuer name, address, **USt-IdNr**, receiving **IBAN + BIC** (mandatory),
    invoice-number prefix/format, payment-terms text — pre-fillable from the template PDF.
- The monthly member email then renders as an invoice/statement whose body prominently shows the member's
  expenses **and** where/how to transfer the funds (ITC1 IBAN/BIC + terms). No per-user PDF.
- **UX:** the issuer block only appears when the toggle is on; mandatory fields validated (IBAN/BIC
  format, non-empty issuer + VAT ID) with inline German error copy; a live preview of the email as it
  will render.
- **Security:** issuer/IBAN data is service-role only, stored in `app_settings` (RLS: service-role
  only); it must never enter the client bundle or the member-facing flow. Reuse the existing
  `requireAdmin()` session gate; treat the IBAN with the same sensitivity as report recipients / PIN metadata.

**Company billing settings**
- Add `billing_mode` (`individual` | `company_paid`), `billing_contact_name`,
  `billing_contact_email`, `billing_notes` (admin-only) to `companies`.
- Editable on the Companies admin page. `company_paid` requires `billing_contact_email`.
- Server validates billing-contact email format.

**Invoice ledger**
- Immutable billing-document ledger. Each document stores: document number, report month, recipient
  type (`member` | `company` | `itc1_archive`), recipient name + email at time of issue, company/member
  refs, subtotal, tax/VAT, total, status (`draft` | `sent` | `failed` | `voided`), send timestamp,
  Resend message id.
- Numbers unique and never reused. Repeat runs re-send the same already-issued documents unless the
  admin explicitly voids/reissues.

**Document delivery — the email body is the document (no per-user PDF)** *(reuse `sendMemberStatements`
and `buildMemberStatementHtml` / `buildCompanyEmailHtml` from `apps/web/api/_lib/report.ts` + `reportHtml.ts`)*
- The monthly HTML email itself is the statement/invoice: full item breakdown, totals, document number,
  and — when invoice mode is on — the ITC1 issuer block + prominent payment/transfer details.
- `individual` mode → one email per member (own consumption only); `company_paid` → one email to the
  company billing contact covering all members.
- **Per-user PDF generation and a PDF ZIP are explicitly out of scope** (they were the cost/scale risk;
  see §8). A German invoice is format-neutral (§ 14 UStG) — the email body suffices, and small monthly
  totals typically qualify as a *Kleinbetragsrechnung* (§ 33 UStDV). PDF/ZIP can be revisited later only
  if ITC1's tax adviser requires it.

**Monthly email sending** *(reuse `sendEmail`/Resend + idempotency keys)*
- Cron covers the previous, fully closed month. Individual emails → member work emails; company emails →
  billing contacts; the ITC1 archive (existing Excel/report, now carrying document numbers) → configured
  report recipients. CEO CC configurable. Per-email success/failure tracked; summary shown to admin after
  manual send.

**Paid/unpaid tracking**
- Per-document `paid` status the admin can toggle for recent months (the "toggles per user" idea).

**Admin preview and controls**
- Preview the example member email and company email as they will render (statement or invoice).
- Billing-run status view (not generated / generated / partially sent / completed / failed) with
  per-recipient re-send.

**Data protection**
- Member-facing flow must not show work emails or billing contacts.
- Personal documents include only the recipient's own data (unless the recipient is the company
  billing contact). Retention rules (§12) confirmed before launch — invoices likely need ~10-year
  retention (§ 147 AO / § 14b UStG), longer than the rolling transaction archive.

### P1 — After MVP
- Re-download the monthly Excel archive from a secure admin-only route.
- Void + reissue a correction document.
- Separate templates for member invoices, company invoices, ITC1 archive emails.
- Company-contact confirmation email (like member email confirmation).
- Dashboard card: upcoming billing run + missing billing contacts.

### Out of scope
- Payment collection, card payments, SEPA direct debit, checkout links.
- Dunning, debt collection, overdue reminders.
- Accounting-system integration (e.g. DATEV export) unless separately scoped.
- Legal/tax advice or final invoice-compliance certification.
- Multi-campus support; per-company login portals.

---

## 6. Non-Functional Requirements

- **Reliability:** billing must be retry-safe and must not archive/prune source data before required
  documents and emails are prepared.
- **Auditability:** issued numbers and recipient snapshots stay stable even if a member/company is renamed.
- **Privacy:** member emails, billing contacts, issuer IBAN, and documents are admin-only.
- **Performance:** member logging stays under the 15-second target; billing is email-only (no per-user
  PDF batch), runs server-side after month end, and does not slow the kiosk flow.
- **Maintainability:** reuse existing report grouping where safe, but invoice numbering and document
  status live in their own isolated module so the report path stays intact.
- **Portability:** documents reproducible from database data, not dependent on a developer machine.

---

## 7. Data Model Additions

```sql
companies
  billing_mode text not null default 'individual'   -- 'individual' | 'company_paid'
  billing_contact_name text
  billing_contact_email text
  billing_notes text

app_settings                                        -- issuer config lives with existing settings
  issue_invoices boolean not null default false
  issuer_legal_name text
  issuer_address text
  issuer_vat_id text                                -- ITC1's USt-IdNr, e.g. DE207285819
  issuer_iban text                                  -- ITC1's receiving account (never a developer's)
  issuer_bic text
  invoice_number_prefix text                        -- e.g. 'K' or 'KL-2026-07-'
  invoice_payment_terms text

billing_runs
  id uuid primary key
  report_month text unique not null
  status text not null
  generated_at timestamptz
  completed_at timestamptz
  last_error text

billing_documents
  id uuid primary key
  billing_run_id uuid references billing_runs(id)
  document_number text unique not null
  report_month text not null
  recipient_type text not null                      -- 'member' | 'company' | 'itc1_archive'
  recipient_name text not null
  recipient_email text not null
  company_id uuid
  member_id uuid
  subtotal_cents integer not null
  tax_cents integer not null default 0
  total_cents integer not null
  status text not null                              -- 'draft' | 'sent' | 'failed' | 'voided'
  paid boolean not null default false
  sent_at timestamptz
  resend_message_id text
  voided_at timestamptz
  created_at timestamptz not null default now()
```

Note: delivery is the email body (no per-user PDF/ZIP), so there is nothing large to store — the
immutable ledger (`billing_documents`) plus the transaction archive are the audit trail. The only stored
artifact is the existing monthly Excel/report; its retention is the §12 question.

---

## 8. Platform Cost & Free-Tier Feasibility

Because delivery is the **email body** (no per-user PDF/ZIP), the previous scaling risk — batch-generating
50–80 Chromium PDFs per run — is **removed**. What remains is ordinary email volume, which the existing
pipeline already handles.

| Concern | Detail | Status |
|---|---|---|
| **Resend** (free: 100/day, 3,000/mo) | 50–80 member/company emails in one run stays under the daily cap (the member-statement path already throttles 120 ms between sends) and far under the monthly cap. | Fits free tier; confirm total count if member + company + ITC1 archive send the same evening. |
| **Supabase** (free: 500 MB DB, 1 GB storage) | No per-user files stored; only `billing_documents` ledger rows + the one monthly Excel. Negligible growth. | Fits free tier. |
| **PDF generation** | Only the existing single monthly company-report PDF/Excel is generated, as today. | No change. |
| **Vercel / domain** | Vercel Hobby is non-commercial; a paid production service for ITC1 isn't hobby use. | Ties to the ownership decision (§9) — cleanest if ITC1 owns the paid accounts. |

Net: the invoice feature adds **no meaningful platform cost** over the current report feature. If ITC1's
tax adviser later insists on per-user PDF invoices, revisit batch generation (a Railway/worker) and this
cost analysis at that point.

---

## 9. Ownership of the Production Infrastructure (open decision)

Pivotal, still open — decide with ITC1 + advisers. It drives both the visa posture and the GDPR/issuer story.

1. **Recommended — ITC1 owns the prod accounts** (Supabase, Vercel, Resend, domain). ITC1 becomes the
   data **controller** *and* the invoice **issuer**; the developers are open-source authors + occasional
   volunteers. Cleanest for the residence permit, for GDPR, and for the Vercel non-commercial-use problem.
2. **Alternative — developers keep hosting under a signed AVV.** Workable but weaker: commercial-use ToS
   and controller/processor duties land on the developers, and their name/domain/infra stay in the path.

---

## 10. Implementation Notes

The existing monthly-report pipeline is highly reusable; this is an extension, not a rebuild:

- `apps/web/api/_lib/report.ts` — `fetchAndEnrich`, `computeSummary` (company→member→tx totals from
  `items.price_cents`), `sendMemberStatements` + `sendEmail` (Resend + idempotency), `generateExcel`
  (ExcelJS, for the ITC1 archive), `report_runs` ledger pattern (migration 019).
- `apps/web/api/_lib/reportHtml.ts` — `buildMemberStatementHtml` / `buildCompanyEmailHtml`: extend these
  to render the issuer block + payment/transfer details when invoice mode is on.
- `apps/web/api/admin/settings.ts` + `src/pages/admin/SettingsPage.tsx` — the **Report Format** section
  that relabels to **Invoice Format**; toggle/validation/template patterns.
- `app_settings` singleton (migrations 010/013) — home for the invoice toggle + issuer block.

New, isolated so the report path stays intact: company billing fields, the issuer block, the
`billing_documents` / `billing_runs` ledger with stable numbering, the invoice-mode email rendering, the
document number added to the existing Excel archive, and paid/unpaid tracking. No new PDF/ZIP machinery.

Because this reuses existing infrastructure and drops per-user PDFs, it is **much lighter** than a
from-scratch "billing MVP." Effort should be re-estimated against actual reuse once §9's ownership
decision is settled — not quoted up front as a large bespoke build (see §11 for why that framing matters).

---

## 11. Compensation & Legal Posture (developer payment)

> This is the **(B)** side of §1.1 — the part that carries residence-permit risk. It is deliberately
> kept separate from the invoicing feature and from any notion of selling a commercial product.

Both developers are international students on a German **§ 16b** student residence permit. That permit
covers **employment** (140 full / 280 half days per year); **self-employed / freelance activity is not
covered** and needs separate Ausländerbehörde permission (§ 21 AufenthG). Markers of self-employment /
*Gewerbe* — **recurring income, an ongoing paid-maintenance obligation, invoicing for one's own
services, and marketing a product for sale** — must therefore be avoided. Unauthorised self-employment
is unlawful (fine up to EUR 5,000) and can jeopardise the permit; a resulting tax problem is itself a
permit risk.

### 11.1 Recommended structure

- **A single one-time handover payment** for the *existing* project — the developers' recommendation is
  **~EUR 3,000–5,000 total for both** (~EUR 1,500–2,500 each), pending the tax adviser's confirmation of
  amount and treatment.
- **No** 50/30/20 milestones (staggered payments look recurring).
- **No** promised maintenance term. Any later help is genuine occasional goodwill, not a contracted service.
- Prefer shipping the invoice feature as an **unpaid open-source improvement**. If ITC1 ever wants to pay
  for substantial new bespoke build work, resolve the Ausländerbehörde/§ 21 question **first** — that
  paid build, not the handover, is the risky act.

### 11.2 Why this amount

- The figure is intentionally **well below** the hypothetical from-scratch rebuild cost. Pricing under
  market reinforces the truthful character needed for the permit: handing over a hackathon/hobby project,
  not running a software business.
- The product is a real, deployed, iterated tool (hackathon weekend 8–9 May 2026 + ~2 months of part-time
  productization), but modest in elapsed effort — so this is a handover fee, not a professional-services quote.

### 11.3 Tax

- Even a one-time payment is taxable and **must be declared**. The €256/yr *Freigrenze* (§ 22 Nr. 3 EStG,
  per person) is far below any realistic amount here, so this income is reportable.
- How it is **classified** (one-off private sale vs. self-employment income) is the real question for a
  Steuerberater / Lohnsteuerhilfeverein. Do **not** treat "don't declare it" as an option.

---

## 12. Required Inputs, Approvals & Open Questions

### From ITC1
- Issuer details for the app's issuer block (legal name, address, USt-IdNr, IBAN/BIC, number format,
  payment terms) — from the template PDF.
- Tax-adviser decisions: label ("Rechnung" vs "Aufstellung"), required wording, VAT handling, number
  format, retention period, correction/void process.
- Per-company billing mode; billing contact name+email for every `company_paid` company.
- Confirmation of report recipients and any CEO CC.
- The ownership decision (§9).

### From the developers
- Qualified advice replacing the earlier (life-coach) input: a **Steuerberater Erstberatung** (fee capped
  ~EUR 190) or **Lohnsteuerhilfeverein** (~EUR 50–150/yr) on classifying/declaring the one-time payment.
- A written query to the **Ausländerbehörde** and/or **university international office** (free) on
  compatibility of the one-time handover with the § 16b permit, and what a paid build would require.

### The missing legal instrument
- A **GDPR Auftragsverarbeitungsvertrag (AVV, Art. 28)** between ITC1 (controller) and the developers
  (processor) — currently there is no contract at all, and adding invoice/financial data raises the stakes.
- A minimal **handover / licence agreement** covering the one-time payment and the absence of ongoing
  obligation.

| Question / risk | Owner | Blocking? |
|---|---|---|
| Are documents labelled invoices or statements? Wording? VAT text? Number format? | ITC1 / tax adviser | Yes |
| Is an email-body invoice acceptable (no PDF), and how long must the monthly Excel archive be retained? | ITC1 / tax adviser | Yes |
| Who owns the production Vercel/Supabase/Resend accounts? | ITC1 / developers | Yes, before deployment |
| Is the one-time handover compatible with the § 16b permit? How is it declared? | Ausländerbehörde / Steuerberater | Yes, before payment |
| Is an AVV signed before the app processes ITC1 member data commercially? | ITC1 / developers | Yes |

---

## 13. Acceptance Criteria

The billing MVP is accepted when:

- every active company has a billing mode; `company_paid` companies cannot be saved without a billing
  contact email;
- the ITC1 issuer block is configured and every generated document shows **ITC1's** issuer details,
  VAT line, and IBAN — never a developer's;
- individual-mode members with consumption receive their own monthly email; company-paid contacts
  receive one company email;
- each monthly email prominently shows the recipient's expenses and, in invoice mode, where/how to
  transfer the funds (ITC1 IBAN/BIC + terms);
- ITC1 receives the monthly Excel archive carrying the document numbers;
- every generated document has a unique number; re-running the job creates no duplicate numbers;
- failed emails are visible and re-sendable;
- the email content matches ITC1's approved wording and invoice/statement format;
- the existing member logging flow remains unchanged and fast.

---

## 14. Source Notes

Platform pricing/terms to re-verify before any binding quote:
- Vercel Hobby fair-use/commercial-use: https://vercel.com/docs/limits/fair-use-guidelines · https://vercel.com/legal/terms
- Vercel Cron usage: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Supabase pricing/billing: https://supabase.com/pricing · https://supabase.com/docs/guides/platform/billing-on-supabase
- Resend quotas: https://resend.com/pricing · https://resend.com/docs/knowledge-base/account-quotas-and-limits

Legal references (developers to confirm with advisers; not legal advice):
- § 16b AufenthG (student residence permit): https://www.gesetze-im-internet.de/aufenthg_2004/__16b.html
- Self-employment for third-country nationals (BAMF): https://www.bamf.de/DE/Themen/MigrationAufenthalt/ZuwandererDrittstaaten/Arbeit/SelbstaendigeTaetigkeit/selbstaendigetaetigkeit-node.html
- § 22 Nr. 3 EStG €256 Freigrenze: https://www.finanztip.de/sonstige-einkuenfte/
