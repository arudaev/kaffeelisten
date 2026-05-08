# Roadmap — Kaffeelisten

Product phases from hackathon MVP to production-ready service.

---

## Phase 0 — Hackathon Sprint (2026-05-08 → 2026-05-09 12:00)

**Goal:** Shippable, demo-ready product on a live URL by Saturday 12:00 pitch.

---

### Status as of 14:00–19:00 Fri (Sprint day 1, end of Block 2)

| Area | Status |
|---|---|
| Repo + CI + Vercel deploy | ✅ Done |
| Supabase schema, RLS, GRANTs, seed data | ✅ Done |
| Member flow (company → member → item → confirm → success) | ✅ Done |
| Member self-registration modal (name standardisation) | ✅ Done |
| Multi-item cart with per-card quantity controls | ✅ Done |
| Admin PIN login (`/api/admin/verify-pin`) | ✅ Done |
| Admin dashboard — summary cards + transaction log (read-only) | ✅ Done |
| Report trigger UI (modal + button) | ✅ Done — but API function missing |
| **`/api/send-report.ts`** | ❌ Missing — function does not exist yet |
| Admin Items CRUD | ❌ Empty placeholder |
| Admin Members CRUD | ❌ Empty placeholder |
| Admin Companies CRUD | ❌ Read-only; edit/delete buttons wired to nothing |
| Log filtering | ❌ Button exists, does nothing |
| CSV export | ❌ Button exists, does nothing |
| Month selector (historical view) | ❌ Renders but onChange is a noop |
| Member flow mobile responsiveness | ❌ Layout broken on phone-size screens |

---

### Remaining 15h sprint plan (Fri 19:00 → Sat 10:00)

#### Fri 19:00–02:00 — 2 people (12 person-hours)

**Person A — Backend + send-report + member flow fix**

| # | Task | Est. |
|---|---|---|
| A1 | Write `/api/send-report.ts`: compute summary, send Resend email, archive + clear transactions | 2.5 h |
| A2 | Write `/api/cron/monthly-report.ts`: thin wrapper that verifies `CRON_SECRET` header, delegates to send-report logic | 0.5 h |
| A3 | Member flow mobile responsiveness: fix layouts that break on <768px (start screen, company/member/item steps, confirm) | 1.5 h |
| A4 | Log filtering: add filter by company dropdown + search-by-name input (client-side, no extra API calls) | 1 h |
| A5 | CSV export: generate and download a CSV from the current filtered transaction list | 1 h |

**Person B — Admin CRUD**

| # | Task | Est. |
|---|---|---|
| B1 | Admin Items page: load items from Supabase, show table (name, category, unit, price, active badge) | 0.5 h |
| B2 | Admin Items CRUD modal: add/edit form (name, category, unit_label, price_cents, active toggle); insert + update via Supabase client | 1.5 h |
| B3 | Admin Members page: load all members with company join, show table | 0.5 h |
| B4 | Admin Members CRUD modal: add (select company, enter name) / edit / deactivate | 1.5 h |
| B5 | Admin Companies CRUD: wire edit/delete buttons (update name, toggle active); add "Hinzufügen" modal | 1.5 h |
| B6 | Month selector: filter transactions to selected month in UI state (no extra query needed if all months loaded) | 0.5 h |

---

#### Sat 02:00–08:00 — 1 person (6 hours)

| # | Task | Est. |
|---|---|---|
| N1 | End-to-end test: full member flow → admin log → send report → email arrives → table cleared | 1 h |
| N2 | Fix any CRUD bugs or missing validations found in N1 | 1.5 h |
| N3 | Admin panel responsive polish (sidebar collapses on tablet, table scrolls on narrow) | 1 h |
| N4 | Error and loading states for all admin CRUD modals | 0.5 h |
| N5 | Settings page: replace placeholder with something real — e.g. show env-level config (admin email, PIN ••••, Resend key ••••) | 0.5 h |
| N6 | Fix any overnight regressions; push and confirm Vercel deploy green | 0.5 h |
| N7 | Buffer / sleep | 1 h |

---

#### Sat 08:00–10:00 — 1 person (2 hours)

| # | Task | Est. |
|---|---|---|
| M1 | Final demo run — full flow from cold URL to report email | 0.5 h |
| M2 | German copy review — any placeholder text, error messages | 0.5 h |
| M3 | Confirm live Vercel URL is stable; confirm CI is green | 0.25 h |
| M4 | Pitch script — 60-second narrative, demo steps, team intro | 0.75 h |

---

### Open questions that block the sprint

| # | Question | Blocking which task |
|---|---|---|
| OQ-3 | Exact list of items on campus (types, prices) — seed data is illustrative | B1/B2 before demo |
| OQ-4 | Admin email address — where does the report go? | A1 (`ADMIN_EMAIL` env var, already set?) |
| OQ-7 | Cron fire date — last calendar day, configurable, or hardcoded? | A2 |

---

### What to skip / defer

| Item | Reason |
|---|---|
| Month selector pulling historical data from archive | Not relevant until first report is sent |
| "Same as last time" quick-log | P1 — no time |
| Admin analytics charts | P2 — no time |
| Landing/pitch page | Block 5 was always optional; the app IS the demo |
| Settings page depth | Leave as-is if N5 runs out of time |

---

## Phase 1 — Post-Hackathon Hardening (within 2 weeks of event)

**Goal:** Make the MVP safe to hand over to ITC1 for real use.

- [ ] Import real ITC1 companies, members, and items (replace seed data)
- [ ] Monthly cron job — verify end-to-end (fires last day of month, 23:00 CET)
- [ ] **Member work email field** — add optional `email` column to `members` table (migration); capture it in the self-registration modal and in the admin Members edit form. The email is **never** shown in the member flow tile, the transaction log, or the summary cards — it is visible only in the admin "Mitarbeitende bearbeiten" form and included in the monthly report CSV/email so the admin can cross-reference billing contacts per person.
- [ ] 10-second undo window after logging
- [ ] CSV export from admin panel (include member email column in export)
- [ ] German copy final review
- [ ] Custom domain setup (e.g. kaffeelisten.itc1.de)
- [ ] Error logging (Vercel function logs at minimum)
- [ ] Basic GDPR notice on member flow (note that work email is stored for billing purposes)

---

## Phase 2 — Operational Quality (month 2–3)

- [ ] Admin analytics view: top consumers, top items, monthly trend chart
- [ ] "Same as last time" quick-log for frequent users
- [ ] Email report: plain-text + HTML versions, improved formatting
- [ ] Admin: soft-delete recovery (reactivate companies / members)
- [ ] Health check endpoint + uptime monitoring (UptimeRobot free tier)
- [ ] Hardened admin auth (time-limited session tokens instead of stateless PIN)
- [ ] **Auto-deactivate inactive members** — a scheduled job (Vercel Cron, monthly) soft-deletes any member who has had zero transactions in the past 90 days. Handles the common case where someone leaves a company under ITC1 and the admin forgets to remove them. Deactivated members are hidden from the member flow immediately but remain in the admin Members list (greyed out) so the admin can reactivate them if needed. The 90-day window is configurable via an env var (`MEMBER_INACTIVITY_DAYS`, default `90`).
- [ ] **Archive data retention — 3-month rolling window** — a scheduled job purges records from `transactions_archive` older than 90 days. Runs after each monthly report is sent. Keeps storage lean on the Supabase free tier. The retention window is configurable via env var (`ARCHIVE_RETENTION_DAYS`, default `90`). Admin is warned in the report email when records are about to be purged.

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
| 0 — Hackathon MVP | 2026-05-09 12:00 | Working demo, pitch-ready | **In progress** |
| 1 — Hardening | 2026-05-23 | Real campus data, safe to hand over | — |
| 2 — Operational | 2026-07-31 | Runs unattended, analytics | — |
| 3 — Self-service | 2026-10-31 | Company portal, reduced admin load | — |
| 4 — Multi-tenant | TBD | Open source release | — |
