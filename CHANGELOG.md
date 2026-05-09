# Changelog

All notable changes to Kaffeelisten will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — chore/itc1-seed-data

### Added
- `supabase/seeds/002_demo_data.sql`: full ITC1 Deggendorf demo dataset
  - **28 companies**: 20 Gewerbepark established tenants (4process AG, ADLINK Technology, B-plus GmbH, fivefingergames, Level51, Medtronic, TÜV NORD Diagnostics, etc.) + 8 Gründerzentrum startups (Career Captain, Quimedo, MOVEMASTER, The Blockchain Academy, etc.)
  - **239 members**: 10–12 per established company, 2–5 per startup; realistic German names with `vorname.nachname@company-domain` work emails
  - **12 items**: Filterkaffee, Espresso, Cappuccino, Latte Macchiato, Wasser, Cola, Radler, Apfelsaft, Donut, Croissant, Brezel, Müsliriegel — with correct categories and prices
  - **391 transactions**: May 2026 (7 working days); 78 % member attendance; first transaction per member always coffee; morning-biased timestamps
- Company selector: colored letter-band chevrons for faster visual scanning when scrolling through a long company list
- "Meine Firma" shortcut: appears on the start/company screen when 90 %+ of recent on-device selections (localStorage) are the same company — one tap skips the company step entirely

### Fixed
- TÜV NORD Diagnostics GmbH: corrected garbled `Ü` encoding in the database (was stored as mojibake from the initial seed run)

---

## [Unreleased] — feat/auto-cleanup

### Added
- `deactivateInactiveMembers()` in `_lib/report.ts`: after each monthly report, soft-deactivates any member whose last transaction is older than 90 days; brand-new members with zero transactions are never auto-deactivated
- Both cleanup jobs (`pruneOldTransactions` + `deactivateInactiveMembers`) are called automatically by `runMonthlyReport()` after each report send

### Changed
- `pruneOldTransactions()` now also prunes `transactions_archive` to the same 90-day rolling window, keeping Supabase free-tier storage in check

---

## [Unreleased] — feat/member-work-email

### Added
- `work_email` field on the `members` table (nullable text, Supabase migration 007)
- Self-registration modal: optional "Arbeits-E-Mail" input stored on member creation; never shown in the member flow after registration
- Admin Members add/edit modal: optional "Arbeits-E-Mail" input for admin-managed members
- Excel report "Pro Unternehmen" sheet: new "E-Mail" column between Person and Einträge
- Excel report "Alle Einträge" sheet: new "E-Mail" column between Person and Unternehmen
- Admin CSV export: new "E-Mail" column between Person and Unternehmen

---

## [Unreleased] — feat/send-report-pdf-mobile ([PR #7](https://github.com/arudaev/kaffeelisten/pull/7))

### Added
- `/api/send-report` — PIN-protected POST endpoint; accepts `month` body param; generates PDF + Excel, sends both via Resend, archives to `transactions_archive`
- `/api/cron/monthly-report` — Vercel Cron wrapper (schedule `0 22 28-31 * *`); verifies `Authorization: Bearer {CRON_SECRET}`; last-day-of-month guard prevents false fires
- PDF report: flat amber-600 header, white KPI strip (entries, total, consumers, companies), company overview table, per-company member breakdown; generated via puppeteer + `@sparticuz/chromium-min`
- Excel report (`.xlsx`, 3 sheets): `Zusammenfassung` (company totals), `Pro Unternehmen` (member breakdown with subtotals), `Alle Einträge` (full log); brand-styled headers via `exceljs`
- Email body includes summary metrics and per-company breakdown; attachments named `kaffeelisten-YYYY-MM.pdf/.xlsx`
- Admin month selector: filters all dashboard views (log, summary cards, CSV export) to the selected month; manual report trigger sends for the selected month; cron always uses current month
- Data retention: transactions are no longer deleted after a report send; `transactions` table keeps a rolling 3-month window; `pruneOldTransactions()` removes rows older than 3 months after each report

### Fixed
- `/api/send-report` was publicly accessible; now requires `x-admin-pin` header matching `ADMIN_PIN` env var
- Vercel Cron was checking `x-cron-secret` but Vercel sends `Authorization: Bearer`; corrected
- Excel headers were unstyled because `eachCell` skips not-yet-created cells; switched to explicit `addRow()` + index-based styling
- Excel file triggered "repair" dialog in desktop Excel due to missing `bgColor` on fill definitions; added
- Replaced `xlsx` (SheetJS community — no cell styling) with `exceljs` for brand-styled workbooks
- Member item grid collapses to 1 col mobile / 2 col tablet; member name grid starts at 1 col on mobile
- FlowShell padding reduced on narrow screens; start screen hero and SuccessScreen scale down on mobile

---

## [Unreleased] — feat/admin-crud ([PR #6](https://github.com/arudaev/kaffeelisten/pull/6))

### Added
- Admin Items page: full table (name, category, unit, price, status badge) with add/edit modal and toggle-active; name search, category filter, status filter, sort by name/price/category
- Admin Companies page: full table with add/edit modal and toggle-active; status filter, name A→Z/Z→A sort
- Admin Members page: full table with company join, add/edit modal, toggle-active; name search, company filter, status filter, sort by name or company
- Log page: client-side filter bar — company dropdown, name search, item dropdown, date sort direction toggle; results count shown live
- Log page: CSV export — UTF-8 BOM CSV, semicolon-delimited, German decimal format
- Sidebar: distinct icons for Unternehmen (building) and Mitarbeitende (users) — previously both used the report icon
- Supabase migration 005: anon `INSERT`/`UPDATE` grants and RLS policies for companies, members, items

### Fixed
- Admin layout: sidebar fixed/non-scrolling; content pane scrolls independently; topbar stays sticky at top of content area
- Member self-registration stores full name (e.g. "Anna Müller") in DB; abbreviated form ("Anna M.") computed on-the-fly for display only

---

## [Unreleased] — feat/implement-design ([PR #4](https://github.com/arudaev/kaffeelisten/pull/4))

### Added
- Full member-facing UI from design bundle: warm stone/amber palette, Bavarian motifs, SVG illustrations
- PWA manifest with correct `lang: "de"`, theme colour, and icon set (192×192, 512×512, maskable)
- Favicon and apple-touch-icon in `apps/web/public/`
- `apps/web/vercel.json` SPA rewrite rule — fixes 404 on hard refresh to any non-root route
- Admin dashboard: transaction log table, company-level summary cards, PIN keypad
- Supabase migration 002: explicit `GRANT SELECT/INSERT` for anon and authenticated roles (PostgREST requires this in addition to RLS policies)
- Supabase migration 003: `anon_read_transactions` SELECT policy — admin dashboard was always showing zero entries without it
- Supabase migration 004: `anon INSERT` on members + `anon_insert_members` RLS policy — required for member self-registration
- Member self-registration in the name-selection step: inline modal, name standardised as "Vorname N." with automatic disambiguation to more letters when the same initial already exists in the company roster
- Multi-item cart in the item step: each `ItemCard` has inline `−`/`+` quantity controls; all items are batch-inserted as separate transaction rows on confirm
- PRD open question 2 resolved: members log multiple items per session

### Fixed
- Back button on the item step now clears cart and resets member selection — previously left stale state that caused the confirm screen to render incorrectly
- ESLint config (`apps/web/.eslintrc.cjs`) was deleted by the design-implementation commit; restored to fix `npm run lint` in CI
- PWA manifest `lang` defaulted to `"en"`; set to `"de"` to suppress browser auto-translation

---

## [0.1.0] — Initial scaffold (2026-05-08)

### Added
- Initial repo scaffold with Vite + React + TypeScript + Tailwind
- npm workspaces monorepo — root `package.json` proxies `dev`, `build`, `lint`, `typecheck` to `apps/web`
- Supabase schema: companies, members, items, transactions, transactions_archive
- Row-Level Security policies and GRANT statements for anon/authenticated roles
- Dev seed data for ITC1 campus (companies, members, items)
- Member-facing logging flow: start → company → member → item → confirm → success (auto-reset 3s)
- Admin panel at `/admin` with server-side PIN check (Vercel serverless function)
- Monthly report email via Resend, triggered manually or by cron
- Vercel Cron Job firing on last day of month at 23:00 CET
- PWA manifest and Workbox service worker (offline shell caching)
- GitHub Actions CI: lint + typecheck on every PR and push
- Monthly report cron workflow in `.github/workflows/`
- GitHub issue templates
- `CLAUDE.md` agent context file
- `docs/prd.md`, `docs/design-foundation.md`, `docs/design-system.md`, `docs/roadmap.md`

---

<!-- Releases will be added below as tags are cut -->
