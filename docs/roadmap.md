# Roadmap — Kaffeelisten

Product phases from hackathon MVP to production-ready service.

---

## Phase 0 — Hackathon Sprint (2026-05-08 14:00 → 2026-05-09 12:00)

**Goal:** Shippable, demo-ready product on a live URL by Saturday 12:00 pitch.

**Pitch URL:** https://kaffeelisten.vercel.app (target)

---

### Current state (as of sprint start)

- [x] GitHub repo live — `arudaev/kaffeelisten`
- [x] PRD, design system, domain model, all docs written
- [x] Supabase schema + RLS written (`001_initial_schema.sql`)
- [x] Dev seed data ready (5 companies, 10 members, 10 items)
- [x] React PWA scaffold scaffolded — Vite + Tailwind + TypeScript
- [x] CI workflow configured
- [ ] Supabase project created and schema applied
- [ ] Vercel project created and deployed
- [ ] Any feature working in the browser

---

### Block 1 — Infrastructure (14:00–16:00, Fri)

Get the plumbing live before writing a single UI component.

- [ ] Create Supabase project, run migration, load seed data
- [ ] Create Vercel project, connect GitHub repo, set all env vars
- [ ] Confirm first deploy succeeds (scaffold renders at live URL)
- [ ] Confirm Supabase anon read works from the browser (console check)
- [ ] Set `ADMIN_PIN`, `RESEND_API_KEY`, `ADMIN_EMAIL`, `CRON_SECRET` in Vercel

**Exit condition:** `https://kaffeelisten.vercel.app` loads. Supabase returns companies.

---

### Block 2 — Member flow (16:00–19:00, Fri)

This is the core of the product and the centerpiece of the pitch demo.

- [ ] Company select screen — pulls active companies from Supabase, large tiles
- [ ] Member select screen — filtered by selected company
- [ ] Item select screen — grid of items with name, unit label, price
- [ ] Confirmation screen — shows what will be logged
- [ ] Submit → `POST /api/log` → insert into `transactions`
- [ ] Success screen — "Gespeichert." + auto-reset to home after 3s
- [ ] Test on iPad landscape (or Chrome DevTools iPad simulation)
- [ ] All copy in German

**Exit condition:** A full log from company select to success screen works end-to-end and the row appears in Supabase.

---

### Block 3 — Admin panel (19:00–21:30, Fri) ← Pizza window

Focus on the two things judges will want to see: the log and the report trigger.

- [ ] `/api/admin/verify-pin` — server-side PIN check, returns session token (httpOnly cookie or short-lived JWT)
- [ ] PIN entry screen — numeric keypad, calls verify-pin, redirects on success
- [ ] Transaction log — table of current-month transactions from Supabase (date, member, company, item, quantity)
- [ ] Company summary — aggregated totals per company
- [ ] `/api/admin/send-report` — compute summary, send email via Resend, archive transactions, clear live table
- [ ] "Bericht senden" button with confirmation modal (warns about reset)
- [ ] Test full report flow: log a transaction → trigger report → check email → verify table is cleared

**Exit condition:** Admin can log in with PIN, see the transaction log, trigger the report, receive the email.

---

### Block 4 — Polish and PWA (21:30–23:30, Fri)

Make it feel real. This is what separates a hackathon tool from a hackathon product.

- [ ] Design pass on member flow — spacing, type sizes, brand colors, coffee icon on success screen
- [ ] Design pass on admin panel — table, summary cards, "Bericht senden" button prominence
- [ ] PWA installability — test "Add to Home Screen" in Chrome/Safari
- [ ] Test on real iPad if available (or Chrome iPad simulation)
- [ ] Error states — what happens if Supabase is unreachable, if submit fails
- [ ] Loading states — skeleton or spinner while data fetches
- [ ] German copy final review with Fares

**Exit condition:** The member flow looks and feels like a product, not a scaffold. Installable as PWA.

---

### Block 5 — Landing page (23:30–01:00, Fri→Sat)

One-page pitch surface for mentors and judges.

- [ ] Hero: product name, one-sentence problem, one-sentence solution, primary CTA
- [ ] Das Problem: 3-bullet explanation of the paper-sheet pain
- [ ] Die Lösung: 3-step visual flow (select → log → report)
- [ ] Deployed and linked from the root or `/landing`
- [ ] German copy, reviewed by Fares

**Exit condition:** A judge who visits the URL immediately understands the product.

---

### Block 6 — Sleep buffer (01:00–07:00, Sat)

Do not skip this. A tired pitch loses to a rested one.

---

### Block 7 — Final checks and pitch prep (07:00–11:30, Sat)

- [ ] Full end-to-end demo run (company select → log → admin → report email)
- [ ] Fix any overnight regressions or broken deploys
- [ ] Confirm live URL is stable
- [ ] Prepare 60-second team pitch narrative (team: HuggyWuggies, product: Kaffeelisten)
- [ ] Prepare final pitch (problem → solution → demo → tech → roadmap → ask)
- [ ] Fares reviews all German copy one last time

**Exit condition:** Demo runs without a hitch. Pitch narrative is memorized.

---

### Stretch goals (only if Block 1–4 are done before 21:30)

These are nice but the pitch does not require them:

- [ ] 10-second undo window after logging
- [ ] Multi-item selection in one session (cart)
- [ ] CSV export button in admin panel
- [ ] Vercel Cron job for automatic monthly report

---

### Out of scope for this sprint

Cron job, CSV export, undo, multi-item cart, analytics, company portal, multi-tenant, native app.

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
