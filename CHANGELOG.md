# Changelog

All notable changes to Kaffeelisten will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — fix/security-headers-csv

### Security
- **CSV export is no longer vulnerable to spreadsheet formula injection.** Cells beginning with `=`, `+`, `-`, `@`, or a leading control character (which Excel/Sheets can execute as formulas when the CSV is opened) are now prefixed with an apostrophe so they render as text.
- **Added HTTP security headers** (Vercel): a `Content-Security-Policy` (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, restricted `connect-src`/`script-src`/`style-src`, with Google Fonts allow-listed), plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and an explicit `Strict-Transport-Security`. All `/api/*` responses now send `Cache-Control: no-store`.

## [Unreleased] — fix/report-security-reliability

### Security
- **Fixed a stored-HTML/script injection in the PDF report (Critical).** User-controlled member, company and item names were inlined **unescaped** into the report HTML, which Puppeteer then rendered — a crafted name could inject markup/script and, because Chromium ran with web security relaxed, exfiltrate data or make server-side requests. All names are now HTML-escaped, the PDF is rendered with **JavaScript disabled** and **all network requests blocked**, `--disable-web-security` is dropped from the Chromium launch, and the report document carries a strict `Content-Security-Policy` (`default-src 'none'`). Defense in depth: even markup that slipped through could neither execute nor phone home.

### Fixed
- **Report emails no longer report failure as success.** The company report and each member statement now check Resend's `{ error }` result (the SDK does not throw on API errors). A failed company send aborts the run **before** archiving/pruning, so a report that wasn't delivered can't quietly wipe the month's data. Member-statement failures are counted and surfaced instead of silently swallowed.
- **The monthly prune can no longer delete unreported data.** Old live transactions are removed only if they were actually archived (new `prune_reported_transactions` RPC filters on existence in `transactions_archive`), so a month that was never reported is retained rather than permanently lost.
- **Duplicate reports on retry are prevented.** A new `report_runs` ledger (migration 019) records each month's run; a completed month is skipped on re-invocation and a concurrent second invocation is locked out. Resend **idempotency keys** dedupe individual emails within a run. A manual admin send explicitly forces a re-send (with a fresh key) while still respecting the concurrency lock.
- **A PDF-generation failure no longer sinks the whole report.** If the PDF can't be built, the report still goes out with the Excel attachment / email only, instead of aborting.

### Deploy note
- Apply **migration 019** (report_runs table + prune RPC) before/with this deploy — it's additive and safe to apply anytime, but the report run needs it.

## [Unreleased] — fix/rls-lockdown

### Security
- **The public (anon) Supabase key can no longer read personal data or write catalogue data.** Previously the key shipped in the browser bundle had table-wide `SELECT` on members (including `work_email`) and transactions, plus `INSERT`/`UPDATE` on companies, members and items — so anyone with the key could read every member's work email and every transaction and corrupt the catalogue. Migration 015 revokes all of that. The anonymous member flow keeps only what it needs: reading active companies/items, reading the non-PII columns (`id, name, company_id, active`) of active members, and inserting its own member row and transactions.
- **All admin data access now runs server-side through a PIN-protected, service-role API** (`/api/admin/data`). The admin dashboard and the Companies/Items/Members pages no longer query Supabase with the anon key; reads (including work emails) and all catalogue writes are authenticated server-side. Admin writes are now validated on the server (name/price/category/email bounds, company existence). This makes the privacy notice's "only campus admins have access" statement actually enforced by the database.
- **Anonymous writes are now validated server-side.** Logging and self-registration go through `SECURITY DEFINER` RPCs (`log_order`, `register_member`; migration 017) instead of raw table inserts. The server derives the company and timestamp (no longer trusted from the client), rejects unknown/inactive members and items, bounds each quantity, and enforces the per-order cap — so quantities/timestamps/relationships can no longer be forged and inactive items can't be charged. Migration 018 then removes the direct anon `INSERT` grants, leaving the RPCs as the only write path.

### Fixed
- **Duplicate orders via „Bestätigen“ → „Rückgängig“ → „Bestätigen“.** The success screen's undo returned to the confirm step but the order had already been written, so re-confirming logged it a second time. „Bestätigen“ now writes the order once through the validated RPC and only then shows „Gespeichert“ (so success is never shown before the data is saved), and „Rückgängig“ genuinely deletes the just-logged rows via `undo_order`. Re-confirming after an undo therefore can't duplicate.

### Added
- **Configurable per-order item limit.** Admins can cap how many items a single person may log in one order (Settings → Bestellung → „Max. Artikel pro Bestellung“; leave empty for unlimited). Enforced both in the member flow (with a notice when reached) and server-side in `log_order`.

### Known follow-ups (not in this branch)
- Anonymous request **rate limiting** for the write RPCs is not yet in place (validation is, abuse-volume throttling isn't).
- Admin auth hardening (durable rate limiting, HttpOnly session instead of the PIN in `sessionStorage`, removing the fail-open bootstrap and `Math.random()` recovery codes), report reliability (Resend error handling + idempotency + atomic archive/prune), PDF HTML escaping/sandboxing, and dependency upgrades remain open v1.0 gate items.

## [Unreleased] — feat/deathstar-theme

### Added
- **New „Imperium (Death Star)" brand palette** (Settings → Erscheinungsbild → Marken-Palette): a cold imperial-steel accent for the Death Star cafeteria. Selecting it swaps the **landing-page illustration and the browser tab favicon to a Death Star** mark and recolors the whole app (member flow + admin) with the imperial accent (issue #16).

## [Unreleased] — feat/admin-settings

### Changed (Admin form primitives — visual & interaction redesign)
- **Send-day picker (`DayGridPicker`)** now shows a plain-language summary line ("Versand am 1. jedes Monats" / "…letzten Tag des Monats"), tactile rounded day cells with a solid-amber selected state, and a distinct "Letzter Tag des Monats" row with a calendar glyph and a confirmation check.
- **PIN entry (`PinInput`)** now has a blinking caret in the active slot, dots/digits that pop in as you type, a shake on a wrong PIN, and revealed reset-codes rendered in **JetBrains Mono**.
- **Template fields (`TemplateField`)** now highlight `{platzhalter}` tokens live *inside* the field as amber chips, show the raw token on each insert-chip, and render the "Beispiel" preview in an elevated card with the substituted sample values highlighted.
- JetBrains Mono is now loaded for monospaced/numeric text (revealed PINs, code columns) — matching the design system's `--font-mono` stack.

### Changed (Datenschutzerklärung — production-ready revision)
- The `/datenschutz` page is now more comprehensive and precise for the production deployment: the Arbeits-E-Mail is correctly described as **required** (was "freiwillig"), matching the mandatory self-registration field.
- Added sections for the **verantwortliche Stelle** (ITC1 GmbH), **Empfänger & Auftragsverarbeiter** (Supabase, Vercel, Resend, incl. non-EU transfer / SCC note), and full **Betroffenenrechte** (Art. 15–21 + Beschwerde beim BayLDA).
- Corrected the localStorage disclosure (last-used company **and** light/dark preference) and clarified stammdaten vs. 90-day archive retention. Stand updated to Juli 2026.

### Fixed
- **PIN reset now recognizes server admins from `ADMIN_EMAIL` even after custom report recipients are configured**, so those admins still receive their one-time recovery code.
- **"Namen hinzufügen" (member self-registration) inputs were white in dark mode** — the Vorname/Nachname/Arbeits-E-Mail fields had no background and fell back to the browser default. They now use the themed inset (`bg-surface-2`, focus lifts to `bg-surface`) like the other form fields.

### Changed
- Member self-registration ("Namen hinzufügen") now requires **Vorname, Nachname and Arbeits-E-Mail** (with email-format validation) — matching the admin-side member form, so every self-added member is reachable for the monthly statement.

### Added (theming foundation — dark mode)
- **The whole app now supports Light / Dark / System.** Colors are driven by semantic CSS-variable tokens (`--bg`, `--surface`, `--fg`, `--accent`, …) mapped into Tailwind; a `ThemeProvider` resolves the mode, persists a per-device choice, and follows the OS in "System".
- **Appearance mode is a single global admin setting** (Settings → Erscheinungsbild → Standard-Modus): „Hell"/„Dunkel" force that appearance for everyone (members and admins); „System" follows each device's OS. There is no per-device switcher.
- The app logo and the landing/empty illustrations now recolor with the theme (inlined as `currentColor` SVGs instead of static `<img>`s).
- **Admin "Erscheinungsbild" settings:** set the app's default mode (Hell/Dunkel/System) and pick a **brand palette** — three presets (Standard-Amber, ITC1, Wald) plus **three custom palettes**, each with its own light and dark accent colour. Selecting/editing previews instantly; "Speichern" applies it app-wide (member flow + admin) for everyone. Stored in a new public `app_theme` table.
- **Report and statement emails now use the brand-palette accent** (light variant — email dark-mode is unreliable). The separate accent picker in "Berichts-Format" is removed; the email accent follows the palette under "Erscheinungsbild".
- The **browser tab favicon and theme-colour now follow the active brand palette** (generated at runtime from the accent). The installed PWA home-screen icon stays static.
- Light mode is visually unchanged — the light token values equal the previous stone/amber palette.

### Changed (Report-Format & Automatic-dispatch redesign)
- **Send day is now a calendar-style grid** (1–28 + „Letzter Tag des Monats") instead of a dropdown.
- **Subject/intro fields gained placeholder chips and a live example:** click `{monat}` / `{jahr}` / `{name}` / `{gesamt}` to insert them at the cursor, with a "Beispiel:" line showing the resolved text as you type. New `{jahr}` and `{gesamt}` placeholders (member total) are supported.
- **Fixed:** report previews (and a real send with a blank field) no longer show the literal word "null" — an empty subject/intro now correctly falls back to the built-in default.

### Changed (PIN recovery moved to the login page)
- **Self-service PIN reset is now on the `/admin` login screen**, not inside Settings. After 5 failed PIN attempts the keypad locks and the recovery flow opens (also reachable anytime via a "PIN vergessen?" link).
- Recovery now asks for **your** admin email and sends the one-time code **only to that address** (if it's on the admin list), instead of broadcasting to all recipients — so a locked-out admin can regain access even when they didn't receive a shared PIN. The email instructs setting a fresh PIN immediately; entering the code + a new PIN logs you straight in.
- The `ADMIN_RECOVERY_PIN` server backstop still works in the same code field when email is unavailable.
- Removed the now-redundant "PIN zurücksetzen" flow from the Settings page (it keeps "PIN ändern" for logged-in changes).

### Added (report scheduling, format & preview)
- **Automatic report schedule control** — a Settings card to turn the month-end automatic send on/off and choose the send day (a specific 1.–28. or the last day of the month). The cron now runs daily and the function enforces the chosen day.
- **Light report-format customization** — accent colour, email subject and intro text (with `{monat}` / `{name}` placeholders), and per-report attachment toggles (attach PDF and/or Excel to the company report), applied to both the company report and the member statement
- **Report preview** — "Vorschau" opens the company report (admin + CEO) and the member statement rendered exactly as they'll be sent, reflecting your current unsaved edits; uses this month's real data or a small sample when the month is empty
- Report recipients now also show the `ADMIN_EMAIL` env fallback as read-only "Server" chips so you can see who currently receives reports before configuring your own list

### Database
- Migration 013 — `app_settings` gains `auto_report_enabled`, `auto_report_day`, `report_accent`, `report_subject`, `report_intro`, `report_include_pdf`, `report_include_excel`, `member_subject`, `member_intro` (all with safe defaults)

### Added
- **Admin Settings page** (replaces the placeholder): manage report recipients (add/remove with inline validation and an empty-state warning), the CEO/Geschäftsführung CC address and its toggle, and the per-member monthly-statement toggle — all saved together via a "Speichern" bar
- **6-digit admin PIN with self-service change & reset**:
  - "PIN ändern" — verify the current PIN and set a new 6-digit PIN (segmented PIN entry, confirm field)
  - "PIN zurücksetzen" — two-step flow: email a one-time code to the report recipients + CEO, or use the server-side emergency recovery PIN, then set a new PIN
  - The login keypad now renders the PIN length reported by the server (6 by default) instead of a fixed 4 digits
- **CEO copied on every monthly report** — the configured CEO address is CC'd on both the manual send and the month-end cron when the toggle is on
- **Per-member monthly statement email** — each person who consumed that month and has a work e-mail receives their own warm, itemized statement (date, item, quantity, unit price, amount, total) in addition to the company report; can be turned off in Settings

### Changed
- Report recipients now come from the Settings page (`app_settings.report_recipients`); `ADMIN_EMAIL` is used only as a bootstrap fallback when the list is empty
- `/api/send-report` and `/api/admin/verify-pin` now authenticate against the hashed PIN in the database, falling back to `ADMIN_PIN` only until a PIN is set from the dashboard

### Database
- Migration 012 — `pgcrypto`-backed, service-role-only functions for verifying/setting the PIN and for issuing/consuming one-time PIN-reset codes (hashes only; clear PIN/codes are never stored)

---

## [Unreleased] — feat/itc1-production-prep

### Added
- Mandatory fields when adding a member: Vorname, Nachname, Arbeits-E-Mail and Unternehmen are now all required (with email-format validation), so every member is reachable for the upcoming per-member monthly statement
- `docs/phase-2-production.md` — the plan for moving off the hackathon demo onto an ITC1 production deployment (data reset, 6-digit PIN management, CEO report CC, per-member statements, expanded admin settings), with a migration runbook

### Database (not user-visible until features ship)
- `app_settings` table (migration 010) — single-row admin config: hashed 6-digit PIN, email-based PIN reset token, report recipients, CEO CC, and feature toggles; service-role only
- `members.work_email` becomes mandatory (migration 011, guarded — apply after the demo data is cleared)
- `supabase/maintenance/clear_demo_data.sql` to wipe demo data and `supabase/seed_production.template.sql` to seed the real campus data (run manually)

---

## [Unreleased] — feat/design-system-foundations

### Added
- Admin form primitives so the design system covers inputs (previously every form used ad-hoc markup):
  - `AdminField` — labelled text/number/email input with `form` and compact `filter` variants, optional leading icon, hint/error text, and a required-field asterisk
  - `AdminSelect` — labelled select with the same `form`/`filter` variants and `options` prop
  - `Toggle` — accessible on/off switch (replaces the bare active/inactive checkboxes)
  - `Toast` — extracted the bottom-right notification into a reusable component (`success`/`error`)
  - `EmptyState` — extracted the empty-table illustration block into a reusable component

### Changed
- Admin pages (Übersicht/Einträge log, Unternehmen, Mitarbeitende, Items) now build their filter bars and modal forms from the new primitives — visually unchanged, with active/inactive now shown as a toggle and required fields marked with an asterisk

---

## [Unreleased] — hotfix/unified-logo

### Added
- `apps/web/public/logo.svg`: amber rounded-square app icon built from the same cappuccino-with-steam paths (white stroke) — used only where a solid-background icon is required (favicon, PWA install)
- `tools/generate-icons.mjs`: renders `logo.svg` via Puppeteer + local Chrome to produce correctly sized PWA PNGs

### Changed
- `favicon.svg`: replaced ☕ emoji with the proper amber-square cappuccino logo mark
- `pwa-192x192.png` / `pwa-512x512.png`: regenerated from `logo.svg`
- `index.html`: added `<link rel="apple-touch-icon">` pointing at `pwa-192x192.png` for iOS home-screen installs
- `vite.config.ts`: fixed `includeAssets` to reference files that actually exist on disk
- PDF report header: cappuccino-with-steam SVG paths inlined directly in the amber band with `stroke="white"` — the illustration appears as-is beside the "Kaffeelisten" wordmark, no square background
- Email HTML: cappuccino-with-steam SVG embedded as a `data:image/svg+xml;base64` `<img>` in the email body (stone-700 stroke on white background, above the summary table); SVG inline tags are stripped by major email clients so base64 `<img>` is used instead

---

## [Unreleased] — feat/gdpr-notice

### Added
- `/datenschutz` — German GDPR notice page explaining what data is collected, why, retention period (90 days), who has access (admin only), how to request deletion, and confirmation that no tracking cookies or analytics are used
- Start screen footer: "Datenschutz" link opens `/datenschutz`; built on the same `FlowShell` wrapper with amber accent styling and a back-to-home chevron

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
