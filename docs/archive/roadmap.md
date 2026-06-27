# Roadmap — Kaffeelisten

What was built for a hackathon, designed to last.
This document covers everything past the shipped MVP — from making it truly maintenance-free to opening it up as a platform others can run.

---

## Current state (as of 2026-05-09)

The core product is complete and deployed at [kaffeelisten.vercel.app](https://kaffeelisten.vercel.app).

| Area | Status |
|---|---|
| Member logging flow (company → member → item → confirm) | ✅ |
| Member self-registration | ✅ |
| Multi-item cart | ✅ |
| Admin dashboard — log, summary, month selector | ✅ |
| Admin CRUD — companies, members, items | ✅ |
| CSV export | ✅ |
| Monthly PDF + Excel report via Resend | ✅ |
| Vercel Cron (last day of month, 22:00 UTC) | ✅ |
| Data retention — 3-month rolling window | ✅ |
| Inactive member auto-deactivation | ✅ |
| Work email field (Excel + CSV) | ✅ |
| ITC1 Deggendorf campus seed data (28 companies, 239 members) | ✅ |
| GDPR notice page (`/datenschutz`) | ✅ |
| PWA — installable, offline shell | ✅ |
| CI — lint + typecheck + build on every push | ✅ |

---

## Phase 1 — Zero-maintenance operations

**Goal:** the system runs itself. Admin touches it once a month at most, only to glance at the report.

### 1.1 — 10-second undo

After tapping "Bestätigen", a toast shows a countdown: *"Eintrag gespeichert — Rückgängig (9s)"*. The transaction is held client-side and only written to Supabase if the user does not cancel within the window. Fixes fat-finger errors on a shared iPad without needing admin intervention.

### 1.2 — Error visibility

Wire up Vercel function logs or a lightweight Sentry project (free tier). Any serverless error (report generation, cron failure, Supabase timeout) should produce an email alert or appear in a dashboard — not fail silently.

### 1.3 — Cron health check

Add a `/api/health` endpoint that returns the last successful report send date and current transaction count. A free uptime monitor (UptimeRobot) pings it daily and alerts if the cron hasn't fired when expected.

### 1.4 — Custom domain

Point `kaffeelisten.itc1.de` (or similar) at the Vercel deployment. Update `APP_URL` env var so email links resolve correctly.

### 1.5 — German copy review

Full native-speaker pass over all UI text — member flow, admin labels, email body, GDPR page. Fix any awkward phrasing before it goes in front of 200+ real users.

---

## Phase 2 — Insights & analytics

**Goal:** the monthly report is useful, but the admin should be able to see trends without opening Excel.

### 2.1 — Consumption dashboard

Admin dashboard gets a second tab: charts generated from the current month's transaction data.

- Top 5 items by volume and by revenue
- Peak consumption hours (bar chart by hour of day)
- Company comparison — who's drinking the most this month vs last month
- Member streak — who has logged every working day

All computed client-side from the existing Supabase data. No new backend needed.

### 2.2 — Item performance analytics

Per-item view in the Admin Items page:

- Total units sold this month / last 3 months
- Revenue generated
- Which companies buy it most
- Whether it's trending up or down

Helps decide which items to add, remove, or reprice.

### 2.3 — Monthly trend report

The email report gains a second page (PDF) and a new Excel sheet: month-over-month comparison. Tracks total spend, active members, and top items across the rolling 3-month window already in the database.

### 2.4 — Admin analytics export

One-click download of all analytics data as a structured CSV for use in external tools (Excel pivot tables, Power BI, etc.).

---

## Phase 3 — Self-service administration

**Goal:** reduce the admin's workload. Companies manage their own roster. The system rarely needs manual intervention.

### 3.1 — Company member portal

Each company gets a read-only view of their own current-month log — accessible via a magic-link email the admin sends on demand. No password, no account. They see only their own data.

### 3.2 — Admin approval queue for self-registered members

Currently, self-registered members are immediately active. Add an optional "approval required" mode: new self-registrations appear in a queue the admin approves once a week. Prevents phantom members from accumulating.

### 3.3 — Configurable item catalog per company

Some companies might want different items or different prices. Allow item overrides at the company level (e.g. a startup gets subsidised coffee at a lower price).

### 3.4 — Admin-initiated per-company reports

The admin can send a report for a single company on demand — useful when a company asks for their invoice mid-month.

### 3.5 — Soft-delete recovery

Deactivated companies and members can be reactivated from the admin panel. Currently deactivation is one-way in the UI (though the `active` flag is already in the schema).

---

## Phase 4 — Deployment & configuration

**Goal:** anyone can run their own Kaffeelisten instance in under 30 minutes.

### 4.1 — One-click deploy

A "Deploy to Vercel" button in the README that forks the repo and pre-fills the required env vars via the Vercel template system. The user provides their Supabase URL + keys, Resend key, and admin email — that's it.

### 4.2 — Setup wizard

A first-run `/setup` page (only accessible before any companies exist) that walks a new admin through:
1. Set admin PIN
2. Create the first company
3. Add the first items
4. Send a test report

After completion, the setup route is disabled permanently.

### 4.3 — Configurable retention and cron schedule

`ARCHIVE_RETENTION_DAYS` and `REPORT_DAY` env vars replace hardcoded values. The report email includes a warning when the archive is approaching its retention cutoff.

### 4.4 — Supabase migration runner

A `scripts/migrate.ts` that applies outstanding migrations against any Supabase project using the Management API — no Supabase CLI or Docker required. Makes it safe for non-technical operators to update their instance.

---

## Phase 5 — Open platform

**Goal:** Kaffeelisten works for any shared-consumption scenario, not just ITC1 coffee.

### 5.1 — Multi-campus support

Schema gains a `campuses` table. Each campus has its own companies, members, items, and admin. One deployment serves multiple sites.

### 5.2 — Public API

A documented REST API (or tRPC) that lets third-party integrations push transactions, pull reports, or sync member rosters from an HR system.

### 5.3 — Webhook support

Campus admins configure a webhook URL. The system POSTs a payload after each report send, archive, or cleanup run. Enables integration with Slack, Teams, or internal dashboards without polling.

### 5.4 — Open source release

License: Apache-2.0. Published to GitHub with full docs, a demo Supabase project (read-only), and a public roadmap. Community contributions welcome for new item categories, language translations, and alternative email providers.

---

## What "closed-circle, zero-maintenance" looks like at the end

When all phases are complete, the admin's only regular interaction is reading the monthly email. Everything else runs itself:

- Members self-register and self-log
- Inactive members are auto-deactivated after 90 days
- Old records are auto-pruned on a rolling window
- Reports are generated and emailed by cron on the last day of each month
- Companies manage their own portals without contacting the admin
- Errors alert automatically via Sentry / UptimeRobot
- Updates deploy automatically via Vercel on every merge to `main`
