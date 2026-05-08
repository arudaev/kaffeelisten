# PRD: Kaffeelisten

**Product:** Kaffeelisten  
**Challenge:** ITC1 Kaffeelisten Challenge (B4Y3RW4LD Hackathon)  
**Location:** ITC1, Ulrichsberger Str. 17, 94469 Deggendorf  
**Status:** Draft — v1.0  
**Date:** 2026-05-08

---

## Problem Statement

ITC1 is a coworking and startup campus in Deggendorf that houses multiple companies. Coffee machines and shared fridges are available to all campus members, and consumption is currently tracked on a paper sheet mounted on the wall — members write their name, their company, what they took, and sign it. At the end of each month, an administrator collects these sheets, tallies consumption per company, and manually bills each company accordingly.

This system is error-prone, easy to ignore, and generates administrative overhead. Sheets get lost, handwriting is illegible, and there is no audit trail. The campus CEO has to spend time manually aggregating paper records before billing can happen.

The proposed alternative — per-person magnet buttons linked to physical hardware — is too expensive to set up and maintain at scale.

---

## Goals

1. **Eliminate paper tracking entirely** — all consumption is logged digitally with a timestamp, member name, company, and item within the current month.
2. **Reduce end-of-month admin effort to under 5 minutes** — the administrator receives a clean, formatted email report automatically, requiring no manual aggregation.
3. **Zero onboarding friction for campus members** — a member can log a coffee in under 15 seconds with no account, no password, and no app install required.
4. **Zero ongoing infrastructure cost for ITC1** — the system runs on free-tier services and requires no dedicated IT maintenance.
5. **Provide an auditable, exportable record** — the admin can view or export all transactions at any time during the month, not just at month's end.

---

## Non-Goals

| Out of scope | Reason |
|---|---|
| Payment processing or invoicing | The CEO bills companies himself; Kaffeelisten only provides the data |
| Per-user authentication (passwords, email login) | Too much friction for a quick coffee log; unnecessary for this use case |
| Native iOS/Android app | A PWA covers the iPad wall-mount use case without App Store overhead |
| Hardware integration (NFC, magnet buttons, card readers) | Explicitly the expensive path the client wants to avoid |
| Multi-campus or multi-location support | ITC1 is the only location; generalizing adds complexity with no current benefit |
| Automated billing or invoice generation | Out of scope per client requirements |
| Real-time notifications to companies | Monthly batch reporting is sufficient; real-time adds complexity for no stated need |

---

## Users

### Campus Member (primary)
A person who works at one of the companies housed at ITC1. They use the shared coffee machine or fridge regularly throughout the day. They are not technical administrators and may be in a hurry.

### Campus Administrator (secondary)
The ITC1 campus CEO or an assigned manager. They receive the monthly report and use it to bill companies. They also manage the list of companies, members, and available items in the system.

---

## User Stories

### Campus Member

- As a campus member, I want to quickly select my name and what I consumed so that the log is filled in without disrupting my workflow.
- As a campus member, I want to see a confirmation after I log a purchase so that I know it was recorded correctly.
- As a campus member, I want to use the app on any device (iPad on the wall, my phone, my laptop) so that I am not dependent on a specific piece of hardware.
- As a campus member, I want to correct a mistake I just made so that the log stays accurate without needing admin involvement.

### Campus Administrator

- As an administrator, I want to receive a formatted monthly email report so that I can bill companies without manually aggregating anything.
- As an administrator, I want the report grouped by company and then by person so that I can issue company-level bills.
- As an administrator, I want to trigger the report manually at any point so that I have flexibility on exact billing dates.
- As an administrator, I want to view all transactions in the current month so that I can spot errors or unusual activity before the report is sent.
- As an administrator, I want to manage the list of companies, members, and items so that the system stays accurate as the campus evolves.
- As an administrator, I want the database to archive the current month's data before resetting so that historical records are never permanently lost.

---

## Requirements

### P0 — Must-Have (MVP cannot ship without these)

**Member Logging Flow**

- [ ] The app presents a list of campus members grouped by company; the member selects their name
- [ ] The app presents a list of available items (espresso, cappuccino, beer, snack, etc.) with price or unit label; the member selects one or more
- [ ] On confirmation, the transaction is written to the database with: timestamp (UTC), member ID, company ID, item ID, quantity
- [ ] A success screen is shown for 2–3 seconds, then the app resets to the start screen automatically
- [ ] The flow works entirely without login or account creation

**Admin Panel**

- [ ] A separate `/admin` route is protected by a simple numeric PIN (configurable in environment variables)
- [ ] Admin can view all transactions for the current month in a table: date, member name, company, item, quantity
- [ ] Admin can manually trigger the monthly report email
- [ ] Admin can add, edit, or deactivate companies, members, and items
- [ ] Admin can view a company-level summary (total per company) for the current month

**Monthly Report Email**

- [ ] On trigger (manual or cron), the system computes the full month's transactions
- [ ] Email is sent to the configured admin email address via Resend
- [ ] Email contains: reporting period, per-company breakdown, per-member breakdown within each company, item-level detail, and a total
- [ ] After the email is confirmed sent, the current month's records are archived (moved to a history table) and the live table is cleared

**PWA Baseline**

- [ ] The app is installable as a PWA (manifest, service worker, icon set)
- [ ] The member-facing flow is usable on a 10-inch iPad in landscape mode without horizontal scrolling
- [ ] The app loads and is interactive in under 3 seconds on a standard WiFi connection

---

### P1 — Nice-to-Have

- [ ] **Quick-log shortcut**: a "same as last time" button for members who always get the same thing
- [ ] **Undo window**: after logging, a 10-second undo button appears before the screen resets
- [ ] **Item search / filter**: useful once the item list grows beyond ~10 entries
- [ ] **CSV export**: admin can download current month's transactions as a CSV in addition to the email report
- [ ] **Monthly cron fallback**: if admin forgets to trigger manually, an automated cron job sends the report on the last day of the month at 23:00 CET
- [ ] **Basic analytics view**: admin sees a simple chart of top consumers and top items for the month
- [ ] **Multi-language**: German-first UI with an English toggle (member flow in German by default)

---

### P2 — Future Considerations

- Company self-service portal: each company gets a read-only view of their own consumption
- Member self-registration without admin involvement
- Item photo next to each item to reduce selection errors
- Multi-campus support: extend the data model for multiple locations
- Read-only API so companies can pull their own data into internal tools

---

## Data Model (simplified)

```
companies: id, name, active
members: id, company_id, name, active
items: id, name, unit_label, price_cents, active
transactions: id, member_id, company_id, item_id, quantity, logged_at
transactions_archive: same schema + archived_at, report_month
```

Full schema: `supabase/migrations/001_initial_schema.sql`

---

## Stack

| Layer | Tool | Tier |
|---|---|---|
| Frontend | React + Vite + TypeScript | — |
| Styling | Tailwind CSS | — |
| Hosting | Vercel | Free |
| Database | Supabase (PostgreSQL) | Free |
| Email | Resend | Free (3,000/mo) |
| Cron (optional) | Vercel Cron Jobs | Free |

---

## Success Metrics

### Leading (measurable within days of launch)

- **Adoption rate:** % of active campus members who log at least one transaction in week 1 → target: 60%
- **Log completion rate:** % of sessions that reach the confirmation screen without abandonment → target: 90%
- **Time to log:** median time from app open to confirmation screen → target: under 15 seconds

### Lagging (measurable after first monthly cycle)

- **Admin report time:** time the administrator spends on end-of-month data aggregation → target: under 5 minutes (vs. estimated 60+ minutes with paper)
- **Data accuracy:** number of disputes or corrections raised after a report is sent → target: zero in first quarter
- **System uptime:** availability of the member-facing flow during campus business hours → target: 99.5%

---

## Open Questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| 1 | How many companies and members are currently at ITC1? | Admin / ITC1 CEO | No |
| 2 | Should members log multiple items in a single session, or one item at a time? | UX / Admin | Yes |
| 3 | What is the exact list of items available on campus today (types, prices)? | Admin | Yes |
| 4 | Is the admin email a single address or a distribution list? | Admin | No |
| 5 | Should archived data be permanently retained or deleted after a retention period? | Admin / Legal | No |
| 6 | Is PIN-only admin protection sufficient for GDPR compliance? | Admin / Legal | No |
| 7 | Does the monthly cron fire on the last calendar day, or is the date manually configured? | Admin | No |

---

## Timeline

| Milestone | Target |
|---|---|
| PRD approved | 2026-05-08 |
| Data model and Supabase schema | 2026-05-08 |
| Member logging flow — working in browser | 2026-05-08 (hackathon day 1) |
| Admin panel — read + manual report trigger | 2026-05-09 morning |
| Email report functional | 2026-05-09 |
| PWA manifest + installable | 2026-05-09 |
| Final pitch demo | 2026-05-09, 12:00 |
