# Roadmap — Kaffeelisten

Product phases from hackathon MVP to production-ready service.

---

## Phase 0 — Hackathon Sprint (2026-05-08 14:00 → 2026-05-09 12:00)

**Goal:** Shippable, demo-ready product on a live URL by Saturday 12:00 pitch.

**Pitch URL:** https://kaffeelisten.vercel.app (target)

---

### Current state (as of sprint end)

- [x] GitHub repo live — `arudaev/kaffeelisten`
- [x] PRD, design system, domain model, all docs written
- [x] Supabase schema + RLS written (`001_initial_schema.sql`)
- [x] Dev seed data ready (5 companies, 10 members, 10 items)
- [x] React PWA scaffold — Vite + Tailwind + TypeScript
- [x] CI workflow configured (lint + typecheck on every PR)
- [x] Supabase project created, schema + RLS + GRANTs applied (migrations 001–004)
- [x] Vercel project created, GitHub repo connected, env vars set
- [x] First deploy succeeds — live at `kaffeelisten.vercel.app`
- [x] Supabase anon read confirmed from browser

---

### Block 1 — Infrastructure + Claude Design (14:00–16:00, Fri) — DONE

**Track A — Infrastructure**
- [x] Create Supabase project, run migration, load seed data
- [x] Create Vercel project, connect GitHub repo, set all env vars
- [x] Confirm first deploy succeeds (scaffold renders at live URL)
- [x] Confirm Supabase anon read works from the browser (console check)
- [x] Set `ADMIN_PIN`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `CRON_SECRET` in Vercel

**Track B — Claude Design system generation**
- [x] Design foundation brief written (`docs/design-foundation.md`)
- [x] Design system tokens defined (`docs/design-system.md`)
- [x] Component specifications written
- [x] Full UI generated and implemented from design bundle

---

### Block 2 — Member flow (16:00–19:00, Fri) — DONE

- [x] Company select screen — pulls active companies from Supabase, large tiles
- [x] Member select screen — filtered by selected company
- [x] Member self-registration — "Ich bin noch nicht dabei" modal, name standardised as "Vorname N."
- [x] Item select screen — grid of items with name, unit label, price; multi-item cart with per-card +/− controls
- [x] Confirmation screen — shows all selected items, quantities, subtotals, grand total
- [x] Submit → batch insert into `transactions` (one row per item)
- [x] Success screen — "Gespeichert." + auto-reset to home after 3s
- [x] Back-button navigation correctly resets cart and member selection
- [x] All copy in German

**Exit condition met:** Full log from company select to success screen works end-to-end; rows appear in Supabase.

---

### Block 3 — Admin panel (19:00–21:30, Fri) — DONE

- [x] `/api/admin/verify-pin` — server-side PIN check
- [x] PIN entry screen — numeric keypad, auto-submits after 4 digits
- [x] Transaction log — table of current-month transactions (date, member, company, item, quantity)
- [x] Company summary cards — aggregated totals per company
- [x] `/api/send-report` — compute summary, send email via Resend, archive transactions, clear live table
- [x] "Bericht senden" button with confirmation modal

**Exit condition met:** Admin can log in with PIN, see the transaction log, trigger the report, receive the email.

---

### Block 4 — Polish and PWA (21:30–23:30, Fri) — DONE

- [x] Warm stone/amber design pass on member flow
- [x] Clean admin panel — data table, summary cards, sidebar navigation
- [x] PWA installability — manifest, service worker, icons (192×192, 512×512, maskable), `lang: "de"`
- [x] SPA routing fix — `vercel.json` rewrite so direct URL / hard refresh works
- [x] Loading skeleton states while data fetches
- [x] Error states (network failure, submission failure)

**Exit condition met:** Member flow feels like a product. Installable as PWA. Hard refresh on `/admin` works.

---

### Stretch goals completed during Phase 0

- [x] Multi-item cart in member flow (was Phase 2 item — shipped in Phase 0)
- [x] Member self-registration without admin involvement (was Phase 3 item — shipped in Phase 0)

### Stretch goals deferred

- [ ] 10-second undo window after logging
- [ ] CSV export button in admin panel
- [ ] Vercel Cron job for automatic monthly report (wired up but not verified end-to-end)

---

## Phase 1 — Post-Hackathon Hardening (within 2 weeks of event)

**Goal:** Make the MVP safe to hand over to ITC1 for real use.

**Work items:**
- [ ] Import real ITC1 companies, members, and items (replace seed data)
- [ ] Monthly cron job via Vercel Cron — verify end-to-end (fires last day of month, 23:00 CET)
- [ ] 10-second undo window after logging
- [ ] CSV export from admin panel
- [ ] German copy review and correction
- [ ] Custom domain setup (e.g. kaffeelisten.itc1.de)
- [ ] Error logging (Vercel function logs at minimum)
- [ ] Basic GDPR notice on member flow

---

## Phase 2 — Operational Quality (month 2–3)

**Goal:** Reliable enough to run unattended for months.

**Work items:**
- [ ] Admin analytics view: top consumers, top items, monthly trend chart
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
- [ ] Item photos in member flow
- [ ] Admin approval flow for self-registered members (currently auto-approved)

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

| Phase | Target date | Key outcome | Status |
|---|---|---|---|
| 0 — Hackathon MVP | 2026-05-09 | Working demo, pitch-ready | **Done** |
| 1 — Hardening | 2026-05-23 | Real campus data, safe to hand over | In progress |
| 2 — Operational | 2026-07-31 | Runs unattended, analytics | — |
| 3 — Self-service | 2026-10-31 | Company portal, reduced admin load | — |
| 4 — Multi-tenant | TBD | Open source release | — |
