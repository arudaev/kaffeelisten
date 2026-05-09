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

### Remaining before pitch

| # | Task |
|---|---|
| R1 | Final demo run — full member flow → admin log → send report → email arrives |
| R2 | German copy review — placeholder text, error messages |
| R3 | Confirm live Vercel URL stable + CI green |
| R4 | Pitch script — 60-second narrative, demo steps, team intro |

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
- [ ] **Archive data retention** — `transactions` table already prunes to a 3-month rolling window after each report. Phase 2: extend pruning to `transactions_archive` (configurable `ARCHIVE_RETENTION_DAYS`, default `90` days); warn admin in report email when records are about to be purged.

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
| 0 — Hackathon MVP | 2026-05-09 12:00 | Working demo, pitch-ready | **Near complete — final demo run remaining** |
| 1 — Hardening | 2026-05-23 | Real campus data, safe to hand over | — |
| 2 — Operational | 2026-07-31 | Runs unattended, analytics | — |
| 3 — Self-service | 2026-10-31 | Company portal, reduced admin load | — |
| 4 — Multi-tenant | TBD | Open source release | — |
