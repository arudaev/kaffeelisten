# Changelog

All notable changes to Kaffeelisten will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — feat/send-report-pdf-mobile + feat/admin-crud

### Added
- `/api/send-report` — POST endpoint that computes the full month’s transactions, generates a PDF report and an Excel workbook, sends both as email attachments via Resend, archives all transactions to `transactions_archive`, and clears the live `transactions` table
- `/api/cron/monthly-report` — Vercel Cron wrapper (fires 22:00 UTC on days 28–31); verifies `CRON_SECRET` header and only runs on the actual last day of the month
- PDF report generated from styled HTML via puppeteer + `@sparticuz/chromium-min`; matches project design language (amber header, stone palette, company sections, member tables)
- Excel report (`.xlsx`) with two sheets: `Zusammenfassung` (company totals) and `Alle Einträge` (full transaction log with date, person, item, quantity, price)
- Email body includes summary metrics and per-company breakdown table; attachments named `kaffeelisten-YYYY-MM.pdf/.xlsx`
- `vercel.json` cron configuration: `0 22 28-31 * *`
- Admin Items page: full table (name, category, unit, price, status badge) with add/edit modal and toggle-active per row; name search, category filter, status filter, sort by name/price/category
- Admin Companies page: full table with add/edit modal and toggle-active per row; status filter, name A→Z/Z→A sort
- Admin Members page: full table with company join, add/edit modal, and toggle-active per row; name search, company filter, status filter, sort by name or company
- Log page: client-side filter bar — company dropdown, name search, item dropdown, date sort direction toggle; results count shown live
- Log page: CSV export — downloads filtered transactions as UTF-8 BOM CSV (semicolon-delimited, German decimal)
- Dashboard: CSV export button now exports current month’s full transaction list
- Sidebar: distinct icons for Unternehmen (building) and Mitarbeitende (users) — previously both used the report icon
- Supabase migration 005: anon `INSERT`/`UPDATE` grants and RLS policies for companies, members, items (admin writes via anon key; hardened in Phase 1)

### Fixed
- Member item grid (`grid-cols-3`) now collapses to `1 col` on mobile and `2 col` on tablet — previously completely broken on phones
- Member name grid (`grid-cols-2`) now always starts at 1 column on mobile (`sm:grid-cols-2`)
- FlowShell padding reduced on narrow screens (`px-8` → `px-4 md:px-8`) across top bar, content area, and footer
- Start screen heading (`text-5xl`) and illustration (`w-40`) now scale down on small screens
- SuccessScreen circle and heading size now scale down on small screens
- Admin layout: left sidebar is now fixed/non-scrolling; each content area scrolls independently; topbar stays sticky at the top of the content pane
- Member self-registration now stores the full name (e.g. "Anna Müller") in the database; the abbreviated "Anna M." form is computed on-the-fly for display only, ensuring uniqueness per company roster

## [Unreleased] — feat/implement-design (PR #4)

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
