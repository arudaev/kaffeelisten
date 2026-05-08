# Roadmap — Kaffeelisten

Product phases from hackathon MVP to production-ready service.

---

## Phase 0 — Hackathon MVP (2026-05-08 → 2026-05-09)

**Goal:** Working demo for the B4Y3RW4LD Hackathon pitch at 12:00 on Saturday.

**In scope:**
- Member logging flow: company → member → item → confirm → success
- Supabase schema live with seed data
- Admin panel: PIN entry, transaction log, company summary, "Bericht senden" button
- Monthly report email via Resend (manual trigger only)
- Archive + reset on report send
- PWA manifest (installable)
- Deployed to Vercel
- Landing page for the pitch

**Out of scope:** cron job, CSV export, undo, multi-item cart, analytics.

**Pitch URL:** https://kaffeelisten.vercel.app (or similar)

---

## Phase 1 — Post-Hackathon Hardening (within 2 weeks of event)

**Goal:** Make the MVP safe to hand over to ITC1 for real use.

**Work items:**
- [ ] Import real ITC1 companies, members, and items (replace seed data)
- [ ] Monthly cron job via Vercel Cron (fires last day of month, 23:00 CET)
- [ ] 10-second undo window after logging
- [ ] CSV export from admin panel
- [ ] German copy review and correction by Fares
- [ ] PWA offline shell (member flow usable without network for selection; submits when back online)
- [ ] Custom domain setup (e.g. kaffeelisten.itc1.de)
- [ ] Error logging (Vercel function logs at minimum)
- [ ] Basic GDPR notice on landing / member flow

---

## Phase 2 — Operational Quality (month 2–3)

**Goal:** Reliable enough to run unattended for months.

**Work items:**
- [ ] Admin analytics view: top consumers, top items, monthly trend chart
- [ ] Multi-item cart in member flow (log multiple items in one session)
- [ ] "Same as last time" quick-log for frequent users
- [ ] Email report: plain-text + HTML versions, improved formatting
- [ ] Admin: soft-delete recovery (reactivate companies / members)
- [ ] Health check endpoint + uptime monitoring (UptimeRobot free tier)
- [ ] Automated backup of `transactions_archive` table
- [ ] Hardened admin auth (time-limited session tokens instead of stateless PIN)

---

## Phase 3 — Company Self-Service (month 4–6)

**Goal:** Reduce admin burden further by giving companies visibility into their own consumption.

**Work items:**
- [ ] Company read-only portal: view current month's transactions for their company only
- [ ] Company portal access via simple magic-link email (no password)
- [ ] Admin can send per-company sub-reports on demand
- [ ] Member self-registration (pending admin approval)
- [ ] Item photos in member flow

---

## Phase 4 — Multi-Tenant / Open Source (future)

**Goal:** Make Kaffeelisten useful for any coworking space, office, or club — not just ITC1.

**Work items:**
- [ ] Multi-campus data model (campus → companies → members)
- [ ] Admin onboarding flow (self-service campus setup)
- [ ] Configurable item catalog (custom items per campus)
- [ ] Open source release under MIT
- [ ] Hosted SaaS option with free tier

---

## Non-roadmap (explicitly deferred indefinitely)

- Payment processing or integrated invoicing
- Native iOS / Android app
- Real-time notifications to members or companies
- AI-powered analytics or predictions
- Hardware integrations (NFC, QR scan, magnet buttons)

---

## Milestone summary

| Phase | Target date | Key outcome |
|---|---|---|
| 0 — Hackathon MVP | 2026-05-09 | Working demo, pitch-ready |
| 1 — Hardening | 2026-05-23 | Real campus data, safe to hand over |
| 2 — Operational | 2026-07-31 | Runs unattended, analytics |
| 3 — Self-service | 2026-10-31 | Company portal, reduced admin load |
| 4 — Multi-tenant | TBD | Open source release |
