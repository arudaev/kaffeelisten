# Phase 3 — ITC1 requirements: billing delivery, org checkout, admin UX

Source: ITC1 feedback relayed 2026-09-16, plus a walkthrough of the app running
locally against the production Supabase project.

Status legend: **Built** — works today · **Partial** — exists but not as
described · **Missing** — not implemented.

---

## 1. Document delivery

### 1.1 The matrix ITC1 asked for

Two billing modes already exist per company (`companies.billing_mode`). ITC1
wants each mode to produce a complete, symmetric set of documents.

| Recipient | Company pays (`company_paid`) | Each person pays (`individual`) |
| --- | --- | --- |
| **Person** | **Report** — informational statement of their own consumption. Not a demand for payment. | **Invoice** — HTML email that is itself a valid invoice, plus PDF and Excel of their own entries. |
| **Company billing contact** | **Invoice** — HTML email that is itself a valid invoice, plus PDF, plus an Excel itemising *every member's* transactions. | **Report** — aggregate statement for the company. Not a demand for payment. |
| **CEO / ledger admin** | ZIP containing byte-exact copies of every invoice and Excel sent to anyone that month, plus one overall PDF + Excel covering all of ITC1: totals, item counts, per-company and per-person breakdowns. | Same. |

The governing principle: **whoever pays gets the invoice, the other party gets
the report, and the CEO gets a copy of everything plus a campus-wide roll-up.**
Invoice and report are both rendered from the same HTML, so the email body
stands alone as the document.

### 1.2 What already exists

- **Built** — per-company `billing_mode` with a billing contact, set in the
  Unternehmen tab (migration 023).
- **Built** — invoice mode with issuer block, VAT split, sequential numbering and
  an idempotent `billing_documents` ledger (`api/_lib/billing.ts`).
- **Built** — HTML email that renders as either statement or invoice, with PDF
  attachment, driven by editable subject/intro templates.
- **Built** — a CEO ZIP: invoice-overview Excel plus every invoice PDF plus the
  summary PDF (`report.ts`, "Management archive").
- **Built** — for `individual` companies, a ZIP of that company's member invoices
  attached to the company's report email.

### 1.3 Gaps

- **Missing** — members of a `company_paid` company receive **nothing**.
  `sendMemberStatements` skips them outright (`report.ts`: "company_paid members
  are always skipped here"). ITC1 wants them to get a report.
- **Missing** — **Excel is never attached to a person's invoice.** Per-recipient
  emails carry the PDF only; the Excel toggle applies to the company report.
- **Missing** — the `company_paid` company invoice has no Excel of every
  member's transactions. That itemisation is the company's main reason for
  wanting the document.
- **Partial** — the CEO ZIP collects invoice PDFs and a ledger Excel, but cannot
  contain exact copies of the member Excels, because those do not exist yet.
- **Missing** — a campus-wide administrative PDF/Excel: item counts, volumes per
  company, per-person totals, month-over-month movement. The current summary is
  a report, not an administrative roll-up.
- **Decision needed** — for `individual` companies the company contact currently
  receives a ZIP of its members' individual invoices. ITC1 described the company
  as getting *a report*. Forwarding every employee's invoice to their employer is
  a deliberate disclosure; confirm it is wanted before keeping it.

---

## 2. Company-level checkout

Some tenants will not register individuals at all — everyone at 4process uses
one shared entry and the company is billed as a unit.

Two ways to get there:

**(a) Workaround, available today.** Create one member named after the company
(`4process` at 4process) and set the company to *Firma zahlt*. Zero code. The
person step still appears with a single choice, which is one pointless tap, and
the "member" is a fiction that shows up in every per-person view.

**(b) The real fix.** A per-company flag — e.g.
`companies.checkout_mode ∈ ('per_member','company_only')` — that makes the
member flow skip step 2 entirely and book the transaction against a hidden
house account for that company. The flow becomes company → items → confirm,
and nothing downstream has to pretend a person exists.

**Recommendation:** ship (a) now so ITC1 can start on paper-free entry, and
schedule (b), since the fiction leaks into the Mitarbeitende tab, the paid grid
and every per-person document. (b) also settles what a `company_only` company's
"member report" means: nothing is sent, because there is no person.

---

## 3. Mitarbeitende tab — company-paid presentation

Today a member of a `company_paid` company shows the literal text `Firma` where
their three paid checkboxes would be. It is easy to miss and carries no action.

Requested instead:

- The person's row is **bold**, marking at a glance that their consumption rolls
  up to the company rather than to them.
- The paid tick is recorded **once for the whole organisation per month**, not
  per person. One company, one payment, one checkbox.
- The natural shape is grouping: members listed under a collapsible company
  header, with the company's own paid ticks on the header row and the member
  rows showing consumption but no individually clickable tick.
- The "X of Y paid" summary cards must then count **companies** for
  `company_paid` tenants and **people** for `individual` ones, rather than
  silently excluding company-paid members from the denominator as now.

This needs a company-level equivalent of `member_payments` — the existing table
is keyed `(member_id, report_month)` and cannot express "the company paid".

---

## 4. Exports and administrative control

- **Built** — the Einträge tab filters by company, person and item, and
  "CSV exportieren" exports exactly the filtered rows.
- **Missing** — that export is the *only* one. There is no export from the
  Unternehmen, Mitarbeitende or Items tabs, and no way to export one company's or
  one person's history as a document rather than a raw CSV.
- **Missing — the significant one.** The admin only ever sees the **live**
  `transactions` table. `api/admin/data.ts` never reads `transactions_archive`,
  so once a month is reported and cleared, its entries vanish from the admin UI
  and from every export. The month selector still offers past months; they come
  back empty. Historical export is therefore impossible today.
- **Requested** — export scoped to a chosen company, person, item or date range,
  in CSV, Excel and PDF, for any month including archived ones.
- **Requested** — a re-send / re-download of any document already issued, from
  the `billing_documents` ledger, without regenerating or renumbering it.

---

## 5. Settings — information architecture

The page is one long column of thirteen sections with a single Save button at
the bottom. The order it renders in today:

1. Erscheinungsbild · 2. Berichts-Empfänger · 3. Geschäftsführung (CEO) ·
4. Mitglieder-Monatsbericht · 5. Zahlungsübersicht · 6. Sicherheit — Admin-PIN ·
7. Bericht-Status · 8. Automatischer Versand · 9. Bestellung ·
10. Firmendokumente · 11. Rechnungsstellung · 12. Berichts-Format ·
13. Rechnungen — Zahlungsstatus *(invoice mode only)*

**The concrete defect:** "who receives what" is spread across sections 2, 3, 4
and 10, separated by the PIN, the paid-grid toggle, dispatch status, the
schedule and a member-flow limit. Deciding what ITC1 sends and to whom means
scrolling past six unrelated sections. Section 9 (max items per order) is not a
reporting setting at all — it belongs to the member flow. Section 13 appears and
disappears depending on section 11, which is two sections below it in the
reading order.

**Proposed structure** — five groups, ideally as tabs or an anchored sub-nav,
each with its own Save:

1. **Abrechnung** — Rechnungsstellung (issuer block) → the recipient matrix in
   one place (admin/CEO, per company, per person) → Format and templates →
   attachments.
2. **Versand** — automatic on/off, dispatch day, next-run status, send-now,
   delivery history.
3. **Zahlungen** — paid-grid toggle and the per-month payment status table
   together; they are the same subject split across sections 5 and 13 today.
4. **Mitglieder-Flow** — max items per order, and anything else governing the
   iPad, which currently has no home.
5. **System** — Erscheinungsbild and Admin-PIN.

The recipient matrix in group 1 should be rendered as the table in §1.1 — a grid
of who gets an invoice, who gets a report, and what is attached — rather than
four independent toggles whose interaction the admin has to infer.

---

## 6. Per-tab improvements

**Einträge** — filters work; add date-range (not just month), an "archived
months" source once §4 is fixed, quantity/total footer, and per-row correction
or deletion with an audit trail. Person names are abbreviated (`Alex R.`) with
no way to see the full name.

**Unternehmen** — shows name, billing mode, status. Add: member count, current
month total, whether a billing contact is set (a `company_paid` company without
one is silently skipped at send time — that should be a visible warning, not a
silent no-op), last document sent, and the checkout mode from §2.

**Mitarbeitende** — the grouping and bold treatment from §3. Also: the three
stacked full-width filter selects waste most of the visible area above the
table; collapse to one row. Add per-person month total, and surface the email
verification state as something actionable (an unverified address will never
receive an invoice).

**Items** — same three-stacked-filter issue. Add: consumption count per item for
the selected month (which is what makes an item worth keeping), price-change
history, and a guard that an item referenced by past transactions is deactivated
rather than deleted.

**Übersicht** — currently five KPI tiles and a recent-entries list. Add
month-over-month movement, per-company trend, and the document-dispatch state
for the current cycle (who has been sent what, what failed).

---

## 7. Open questions and blockers

1. **Member emails are the hard blocker.** `members.work_email` is `NOT NULL`
   (migration 011), and the paper sheets carry no addresses. They cannot be
   guessed: a wrong address means an invoice goes to the wrong person or
   silently nowhere. The app already has the right mechanism — `register_member`
   lets a person add themselves from the iPad with their own work email, and
   migration 021 verifies it by confirmation link. **Recommendation: seed
   nothing, let people register themselves on first use.** The 15 companies are
   already loaded, so this works today.
2. **Eight tally rows on the paper sheets have no name** — ITC1 ×2, 4process ×3,
   Level51, PBI ×2 — including the sheet's largest count. Under §2 several of
   these are probably company-level entries, not unnamed people.
3. **Historical tallies** can only be attributed to a price tier, never to a
   drink. Two inactive items, `Bezug 0,50 €` and `Bezug 0,70 €`, exist for that
   backfill and are hidden from the member flow.
4. **Hard deletes are withheld from `service_role`** on `members`, `companies`
   and `member_payments` by design (migrations 022, 027). Removing a company or
   person requires a migration that widens those grants; deactivation is the
   supported path.
5. **Does the CEO archive contain personal data that needs a retention rule?**
   It bundles every invoice for every person on campus into one ZIP sent by
   email. Worth a decision before invoice mode goes live.
