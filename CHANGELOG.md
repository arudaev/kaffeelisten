# Changelog

All notable changes to Kaffeelisten will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — feat/admin-crud

### Added
- Admin Items page: full table (name, category, unit, price, status badge) with add/edit modal and toggle-active per row
- Admin Companies page: full table with add/edit modal and toggle-active per row
- Admin Members page: full table with company join, company filter dropdown, add/edit modal, and toggle-active per row
- Log page: client-side filter bar — company dropdown + name search input; results count shown live
- Log page: CSV export — downloads filtered transactions as UTF-8 BOM CSV (semicolon-delimited, German decimal)
- Dashboard: CSV export button now exports current month's full transaction list
- Sidebar: distinct icons for Unternehmen (building) and Mitarbeitende (users) — previously both used the report icon
- Supabase migration 005: anon `INSERT`/`UPDATE` grants and RLS policies for companies, members, items (admin writes via anon key; hardened in Phase 1)

---

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
