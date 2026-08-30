# PRD Addendum: Billing, Invoices, and Handover

**Product:** Kaffeelisten
**Attachment to:** `docs/prd.md`
**Status:** Draft for client scope confirmation — legal/tax review pending
**Date:** 2026-07-06
**Legal review updated:** 2026-08-30
**Prepared for:** ITC1 / Kaffeelisten stakeholders

> **Not legal or tax advice.** This document reflects the developers' current understanding and
> must be confirmed by qualified advisers (a German immigration lawyer and Steuerberater for the
> maintainers, ITC1's tax adviser for invoice compliance, and the competent Ausländerbehörde for
> residence-permit permission). A university international office may help route questions but does
> not replace the competent authority. See §12.

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

### 1.1 The legal boundary that governs this whole document

The attached template identifies **ITC Innovations Technologie Campus GmbH** as the intended issuer,
uses ITC1's issuer/VAT/bank details, and follows an ITC1 invoice-number sequence. That supports a
possible model in which ITC1 remains the supplier and invoice issuer while Kaffeelisten is only the
document-generation tool. It does **not** itself authorise the developers to issue documents in ITC1's
name.

The user reports that there is currently no signed operating, licence, support, payment, or
data-processing agreement between the Kaffeelisten team and ITC1. Invoice mode therefore remains a
technical capability only and must stay disabled until ITC1 gives written authority and its tax adviser
approves the complete process. Section 14 UStG allows a third party to issue a document in the
supplier's name and for its account, but it does not create that authority without an arrangement.

Two things that must never be conflated:

| | Who acts | Who bears it | Gating requirement |
|---|---|---|---|
| **(A) The app generates ITC1's coffee invoices to members/companies** | ITC1 as intended issuer; Kaffeelisten as proposed tooling | ITC1 for the supply/tax position; technical parties for their contracted duties | Written ITC1 authority, tax approval, controller/processor mapping, and an Art. 28 AVV or other required GDPR arrangement. |
| **(B) ITC1 pays either maintainer or contracts for work** | Depends on the actual contract and work | Each maintainer and any legally established team/entity | Individual residence-permit clearance, tax/legal advice, and any required Ausländerbehörde permission **before** work or payment. One-time wording is not a safe exemption. |

Consequences that hold everywhere below:

- This draft does not determine whether the maintainers need a business registration, have formed a
  GbR by conduct, or may lawfully accept the proposed role. Qualified advisers must determine that.
- If ITC1 approves the intended model, the developers/their domain must **never** appear as the
  supplier or invoice issuer. The issuer block, VAT ID, IBAN, and invoice numbers are ITC1's.
- Member money flows to **ITC1's** IBAN shown on the invoice. The app never touches payments.
- Hosting alone does not decide who issued the invoice, but hosting/operating live personal data creates
  GDPR and contractual duties. The actual role may be processor, controller, or joint controller based
  on the facts; it must not be assumed from the technology.

---

## 2. Current Coverage

| Request | Current status | Notes |
|---|---|---|
| Email address required | Mostly covered | `members.work_email` exists (migration 007); migration 011 makes it NOT NULL once data is clean. Self-registration collects email. |
| Automatic monthly email to every person | Partly covered | The app already sends each consuming member a monthly itemized **statement** (`sendMemberStatements` in `apps/web/api/_lib/report.ts`) when enabled. It is not a legal invoice. |
| Company pays all coffee costs via one contact | Not covered | `companies` has no billing mode / billing contact fields. |
| Monthly invoice package for ITC1 | Not covered | Current report sends one PDF + one Excel. No invoice ledger, number sequence, per-recipient PDF set, or ZIP. |
| Price for "your work and the platform" | See §11 | No quote until residence, tax, legal-form, authority, scope, and liability gates are cleared. |

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
  see §8). An HTML email can carry a statement, but this draft does not conclude that it is a compliant
  invoice for every recipient. Since 1 January 2025, German B2B e-invoices generally require a structured
  electronic format, subject to recipient type, the small-invoice exception, and the transitional rules
  through 2026/2027. ITC1's tax adviser must classify the individual/company cases and approve the
  format, consent, required fields, and transmission method before invoice mode is enabled.

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
  billing contact). Retention rules (§12) must be confirmed before launch. Section 14b UStG currently
  requires invoice copies to be retained for eight years; other tax/accounting records or special cases
  may have different periods under the AO or other rules. Either way, this exceeds the rolling
  transaction archive.

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
| **Vercel / domain** | The selected plan and current terms must permit the agreed production/commercial use. | Ties to the ownership decision (§9); ITC1-controlled paid accounts are the preferred model. |

Net: the invoice feature adds **no meaningful platform cost** over the current report feature. If ITC1's
tax adviser later insists on per-user PDF invoices, revisit batch generation (a Railway/worker) and this
cost analysis at that point.

---

## 9. Ownership of the Production Infrastructure (open decision)

Pivotal, still open — decide with ITC1 + advisers. It drives both the visa posture and the GDPR/issuer story.

1. **Recommended — ITC1 owns the prod accounts** (Supabase, Vercel, Resend, domain) and directly controls
   the operational service. This supports, but does not by itself determine, ITC1's intended controller
   and invoice-issuer role. Any maintainer access and support still need written scope and residence/tax
   clearance.
2. **Alternative — developers host under signed agreements.** This requires adviser-confirmed legal
   capacity, controller/processor allocation, an AVV where Article 28 applies, commercial-use-compliant
   accounts, liability/support terms, and immigration/tax clearance. It is not currently approved.

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
from-scratch "billing MVP." Effort should be estimated only after the ownership, lawful contracting
party, permitted maintainer roles, acceptance scope, and support/liability boundaries are settled.

---

## 11. Compensation, Residence Status & Team Legal Form

> This section identifies gates only. It does not classify a proposed payment or activity.

The maintainers report that they are international students on German residence permits for study.
Section 16b(3) AufenthG permits limited **employment** during studies; it does not by itself authorise
self-employed or freelance work. Section 21(6) allows the competent authority to permit self-employed
activity while retaining another residence purpose, and Federal Government guidance says international
students require approval from the competent Ausländerbehörde for self-employment during studies.

### 11.1 Mandatory sequence before work or payment

1. Define the actual proposed role, deliverables, control/instructions, term, support duty, IP transfer or
   licence, payment recipient, payment schedule, and amount.
2. Have a German immigration lawyer or qualified adviser assess employment versus self-employment for
   **each** maintainer and inspect the wording/ancillary provisions on each residence title.
3. Obtain written confirmation or permission from the competent Ausländerbehörde where required.
4. Have a Steuerberater confirm tax classification, registration, invoicing, VAT, and declaration duties.
5. Resolve whether the maintainers' cooperation constitutes a GbR or another legal status, who owns the
   project IP, who can sign, and who bears liability.
6. Only then sign the ITC1 agreement, perform paid work, or accept compensation.

### 11.2 No safe shortcut by labelling

- A single payment, low price, "handover fee," open-source licence, volunteer history, or absence of
  milestones does not automatically prevent self-employment or other commercial classification. The
  substance of the arrangement controls.
- Unpaid/open-source work can still create GDPR, IP, negligence, support, and partnership issues when a
  production system is operated for an organisation. It is not a substitute for written authority.
- No price recommendation is made in this addendum. A quote is premature until the lawful contracting
  party, permitted role, scope, liability, tax treatment, and support boundary are known.

### 11.3 Possible GbR and personal liability

No registered company is reported, but that does not prove that the team has no legal form. Under section
705 BGB, an agreement to pursue a common purpose can establish a GbR; operating a business jointly under
a common name creates a statutory presumption of participation in legal transactions. If a GbR exists,
section 721 BGB provides for personal joint-and-several liability. A German lawyer/tax adviser must assess
the actual facts before either maintainer signs for "Kaffeelisten" or receives team compensation.

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
- Individual advice from a qualified immigration professional and inspection of each residence title.
- A written query to the competent **Ausländerbehörde** on whether the exact proposed work/compensation
  is permitted and what approval is required. The university international office may help route the
  question but does not replace the competent authority's decision.
- A **Steuerberater** assessment of tax classification, registration, VAT/invoicing, and declaration
  duties for each maintainer and any possible GbR.
- A German lawyer/tax adviser assessment of possible GbR status, personal liability, IP ownership, and
  signing authority.

### Missing legal instruments
- An **ITC1-Kaffeelisten pilot/licence/handover agreement** defining authority, IP/licence, accepted scope,
  production ownership, liability, costs, support, termination, and exit. Currently no official agreement
  is reported.
- A documented GDPR role analysis. If the maintainers or their infrastructure process data on ITC1's
  documented instructions, an **Auftragsverarbeitungsvertrag (AVV, Art. 28)** is required; if the facts
  create another role, the corresponding controller or joint-controller obligations must be documented.
- An internal maintainer agreement, if advisers recommend one, covering IP, authority, expenses,
  compensation, liability, and exit.

| Question / risk | Owner | Blocking? |
|---|---|---|
| Are documents labelled invoices or statements? Wording? VAT text? Number format? | ITC1 / tax adviser | Yes |
| Is an email-body invoice acceptable (no PDF), and how long must the monthly Excel archive be retained? | ITC1 / tax adviser | Yes |
| Who owns the production Vercel/Supabase/Resend accounts? | ITC1 / developers | Yes, before deployment |
| Is the exact proposed role/compensation permitted under each residence title, and how is it classified/declared? | Each maintainer / Ausländerbehörde / immigration adviser / Steuerberater | Yes, before work or payment |
| Is an AVV signed before the app processes ITC1 member data commercially? | ITC1 / developers | Yes |
| Has the possible GbR, IP ownership, authority, and personal liability been reviewed? | Developers / lawyer / Steuerberater | Yes, before signing |

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
- ITC1 has signed the required authority/licence/data-processing instruments and owns or directly controls
  the agreed production accounts;
- each maintainer's residence/tax position and the team's possible GbR/IP/signing position are cleared for
  the actual role before any paid work or compensation;
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
- § 21 AufenthG (self-employed activity): https://www.gesetze-im-internet.de/aufenthg_2004/__21.html
- Federal Government guidance on study and self-employment: https://www.make-it-in-germany.com/en/study-vocational-training/studies-in-germany/work/print
- § 705 BGB (nature of a GbR): https://www.gesetze-im-internet.de/bgb/__705.html
- § 721 BGB (personal liability of GbR partners): https://www.gesetze-im-internet.de/bgb/__721.html
- § 14 UStG (invoicing): https://www.gesetze-im-internet.de/ustg_1980/__14.html
- § 14b UStG (eight-year invoice retention): https://www.gesetze-im-internet.de/ustg_1980/__14b.html
- § 27(38) UStG (B2B e-invoice transition): https://www.gesetze-im-internet.de/ustg_1980/__27.html
- BMF e-invoice FAQ (status March 2026): https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html
- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng
