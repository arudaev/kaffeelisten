# Roadmap — Kaffeelisten

Product phases from hackathon MVP to production-ready service.

---

## Phase 0 — Hackathon Sprint (2026-05-08 → 2026-05-09 12:00)

**Goal:** Shippable, demo-ready product on a live URL by Saturday 12:00 pitch.

---

### Status as of Sprint day 2 (2026-05-09)

| Area | Status |
|---|---|
| Repo + CI + Vercel deploy | ✅ Done |
| Supabase schema, RLS, GRANTs, seed data | ✅ Done |
| Member flow (company → member → item → confirm → success) | ✅ Done |
| Member self-registration modal (name standardisation) | ✅ Done |
| Multi-item cart with per-card quantity controls | ✅ Done |
| Member flow mobile responsiveness | ✅ Done |
| Admin PIN login (`/api/admin/verify-pin`) | ✅ Done |
| Admin dashboard — summary cards + transaction log | ✅ Done |
| Log filtering (company, name, item, date sort) | ✅ Done |
| CSV export | ✅ Done |
| Month selector (filters dashboard to selected month) | ✅ Done |
| Admin Items CRUD | ✅ Done |
| Admin Members CRUD | ✅ Done |
| Admin Companies CRUD | ✅ Done |
| `/api/send-report.ts` — PDF + Excel + Resend email | ✅ Done |
| `/api/cron/monthly-report.ts` — last-day guard + cron auth | ✅ Done |
| Data retention (3-month rolling window, no hard delete) | ✅ Done |
| Settings page | ❌ Placeholder only |
| Admin responsive polish (table scroll on narrow screens) | ⚠️ Partially done |

---

---

## Phase 0.5 — Demo Readiness (before final pitch)

**Goal:** Five features required before the product is demo-ready and GDPR-safe.

### F1 — Member work email field (`feat/member-work-email`)

Management needs a work email per employee for billing cross-reference. The field must be **invisible to members** and never surface in the member flow, log table, or summary cards. It appears only in:
- Self-registration modal (optional field, labelled "Arbeits-E-Mail (optional)")
- Admin Members add/edit modal
- Monthly Excel report (new "E-Mail" column in "Alle Einträge" and "Pro Unternehmen" sheets)
- Admin CSV export

Implementation:
- Supabase migration: `ALTER TABLE members ADD COLUMN work_email text` (nullable, no unique constraint — people can share an email)
- Self-registration modal: add optional e-mail input below name
- Admin Members modal: add optional e-mail input
- `generateExcel`: include `work_email` in the relevant sheets
- Admin CSV export: include `work_email` column
- RLS: no change needed (anon can read member rows; email is already inside the member record)

---

### F2 — Automated data hygiene (`feat/auto-cleanup`)

Two complementary cleanup jobs, both fired by the existing monthly cron:

**2a — Transaction rolling window (already shipped for `transactions`)**
The `pruneOldTransactions()` call after each report keeps the live table to 3 months. Extend this to also prune `transactions_archive` to 90 days to stay within Supabase free-tier storage.

**2b — Inactive member auto-deactivation**
After each monthly report, soft-deactivate any member whose most recent transaction is older than 90 days (3 months). Deactivated members are hidden from the member-flow company roster but remain visible in the admin Members list (greyed out, reactivatable). This handles the common case where someone leaves an ITC1 company and the admin forgets to remove them.

Implementation:
- New function `deactivateInactiveMembers()` in `_lib/report.ts`: query last `logged_at` per member; set `active = false` where the last activity is older than 90 days and the member has at least one transaction ever (brand-new members are never auto-deactivated)
- Call from `runMonthlyReport()` after `pruneOldTransactions()`
- New Supabase migration: no schema change needed (`active` column already exists)

---

### F3 — Real ITC1 seed data (`chore/itc1-seed-data`)

Replace the illustrative 5-company seed with accurate ITC1 Deggendorf campus data, plus realistic transaction history for the demo.

Research needed:
- Enumerate current tenant companies and startups in ITC1 Deggendorf (web research of THD / ITC1 / B4Y3RW4LD ecosystem)
- 30–50 German-name employees spread across companies (realistic German first/last names, not lorem ipsum)
- 2–3 months of backdated transaction history (varied items, realistic usage patterns — heavier coffee in morning, occasional drinks/snacks)

Deliverables:
- Updated `supabase/seeds/002_demo_data.sql` (or equivalent migration)
- Companies: real ITC1 tenants where publicly known; fill remaining slots with plausible startup names
- Members: 30–50 rows with `work_email` set to `vorname.nachname@company.de` patterns
- Transactions: 200–400 rows spread across March–May 2026, covering multiple items

---

### F4 — GDPR / data notice page (`feat/gdpr-notice`)

German users take data protection seriously. A simple, honest notice page reachable from the member flow (link in footer or on the start screen) explaining:
- What data is collected (name, work email, consumption records)
- Why (internal billing between ITC1 campus companies — not for ads, not shared with third parties)
- How long it is stored (rolling 3-month window in live DB; monthly archive retained for 90 days)
- Who can access it (admin only)
- How to request deletion (contact admin)

Design: single-column prose, stone/amber palette, same `FlowShell` wrapper. No cookie banner — no cookies or tracking are used. German copy throughout.

Route: `/datenschutz` — linked from the start screen footer.

---

### F5 — Final audit (`chore/final-audit`)

End-to-end verification before pitch:

| Check | What to verify |
|---|---|
| Supabase | RLS policies allow anon member flow; service role used only in serverless functions; no exposed service key in client bundle |
| Supabase | `transactions`, `transactions_archive`, `members`, `companies`, `items` all return correct data via anon REST |
| Vercel | All env vars set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PIN`, `CRON_SECRET`) |
| Vercel | `/api/send-report` — manual trigger works, email arrives with PDF + Excel attachments |
| Vercel | `/api/cron/monthly-report` — cron secret check works; endpoint returns 401 without correct header |
| GitHub | CI passes (lint + typecheck) on `main` after all Phase 0.5 PRs merged |
| Member flow | Full path on mobile (iPhone/Android viewport): start → company → member → item → confirm → success |
| Admin | Log filters, CSV export, month selector, CRUD modals — all functional |
| Admin | Send report modal → email arrives within 60 s |

---

### Phase 0.5 execution order

1. `feat/member-work-email` ← start here
2. `feat/auto-cleanup`
3. `chore/itc1-seed-data`
4. `feat/gdpr-notice`
5. `chore/final-audit`

---

## Phase 1 — Post-Hackathon Hardening (within 2 weeks of event)

**Goal:** Make the MVP safe to hand over to ITC1 for real use.

- [ ] Monthly cron job — verify end-to-end on production (fires last day of month, 23:00 CET)
- [ ] 10-second undo window after logging
- [ ] German copy final review with a native speaker
- [ ] Custom domain setup (e.g. kaffeelisten.itc1.de)
- [ ] Error logging (Sentry or Vercel function logs)

---

## Phase 2 — Operational Quality (month 2–3)

- [ ] Admin analytics view: top consumers, top items, monthly trend chart
- [ ] "Same as last time" quick-log for frequent users
- [ ] Admin: soft-delete recovery (reactivate companies / members from archived state)
- [ ] Health check endpoint + uptime monitoring (UptimeRobot free tier)
- [ ] Hardened admin auth (time-limited session tokens instead of stateless PIN)
- [ ] Archive data retention — extend `transactions_archive` pruning to configurable `ARCHIVE_RETENTION_DAYS` (default 90 days) with admin warning in report email

---

## Phase 3 — Company Self-Service (month 4–6)

- [ ] Company read-only portal: view current month's transactions for their own company
- [ ] Company portal access via magic-link email (no password)
- [ ] Admin can send per-company sub-reports on demand
- [ ] Item photos in member flow
- [ ] Admin approval flow for self-registered members

---

## Phase 4 — Multi-Tenant / Open Source (future)

- [ ] Multi-campus data model (campus → companies → members)
- [ ] Admin onboarding flow (self-service campus setup)
- [ ] Configurable item catalog (custom items per campus)
- [ ] Open source release under MIT
- [ ] Hosted SaaS option with free tier

---

## Milestone summary

| Phase | Target date | Key outcome | Status |
|---|---|---|---|
| 0 — Hackathon MVP | 2026-05-09 | Core product shipped | ✅ Done |
| 0.5 — Demo Readiness | 2026-05-09 (pitch) | Work email, cleanup, real data, GDPR, audit | **In progress** |
| 1 — Hardening | 2026-05-23 | Safe for real campus use | — |
| 2 — Operational | 2026-07-31 | Runs unattended, analytics | — |
| 3 — Self-service | 2026-10-31 | Company portal, reduced admin load | — |
| 4 — Multi-tenant | TBD | Open source release | — |
