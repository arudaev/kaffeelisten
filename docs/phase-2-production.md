# Phase 2 — ITC1 Production Prep

**Status:** planning + scaffolding (branch `feat/itc1-production-prep`)
**Goal:** move Kaffeelisten off the hackathon footing and onto a maintained
internal product for the ITC1 Deggendorf campus, ready for an internal demo.
**Date:** 2026-06-30

> **Verified live (2026-07-01):** all three SQL steps have been applied to the
> production Supabase project (`fdnfdscpefxqvtggbbbr`). `app_settings` exists with
> its singleton row (`pin_length = 6`, toggles on, `report_recipients = []`,
> `ceo_email = null`); `members.work_email` is now NOT NULL (present in PostgREST's
> `required` list); and all data tables (companies, members, items, transactions,
> transactions_archive) are empty — the demo data is cleared and the DB is ready
> for the real ITC1 seed. **Report recipients now live in `app_settings`, not env**
> — the `ADMIN_EMAIL` env value is only a bootstrap fallback until the recipient
> list is filled in from the Settings page (workstream D + F).
>
> **Update:** workstreams C–F have since shipped on `feat/admin-settings`, and
> migration `012_pin_functions.sql` (the PIN/reset RPC helpers) has been applied
> to the same production project. The admin PIN, recipients and CEO CC can now be
> managed from the Settings page.

This document is the single source of truth for what is missing, what needs to
be done, and how. It complements [`prd.md`](prd.md) (the product rationale) and
[`domain.md`](domain.md) (the data model). The SQL and the one front-end change
that ship on this branch are noted as **Done on this branch**; everything else is
**Planned** with enough detail to implement directly.

---

## 1. Why this phase exists

The app currently runs on hackathon demo data: 28 fake companies, ~239 generated
members, made-up item prices, and a synthetic May 2026 transaction history. Admin
configuration (PIN, report recipient) lives in environment variables and can only
be changed by a developer redeploying. The people who will actually run this at
ITC1 asked for more control inside their own product:

- a real, empty database they can fill with real companies / members / items / prices
- a **6-digit** admin PIN they can **change** and **reset** themselves (currently a fixed 4-digit env var)
- the campus **CEO CC'd on every monthly report**
- monthly emails to **each member who consumed that month**, not just the admin
- mandatory identity fields when adding a member (so every member is reachable)

---

## 2. Scope at a glance

| # | What's missing today | What we'll do | Where |
|---|---|---|---|
| A | DB is full of demo data + fake prices | Reset script + production seed template | `supabase/maintenance/`, `supabase/seed_production.template.sql` — **Done on this branch** |
| B | "Add member" only requires first name | All identity fields mandatory (form + DB constraint) | `MembersPage.tsx` **Done**, migration `011` **Done** (apply after reset) |
| C | PIN is a fixed 4-digit env var, dev-only | 6-digit PIN, hashed in DB, change + reset (email + env backstop) | `app_settings` + PIN functions (migrations `010`/`012` **Done**), API endpoints + keypad **Done on `feat/admin-settings`** |
| D | Report goes to admin only; recipients hard-coded | CEO CC + editable recipient list, managed in dashboard | `app_settings` **Done**, report logic + Settings UI **Done on `feat/admin-settings`** |
| E | Members get nothing at month-end | Per-member itemized monthly statement (augments company report) | report logic + email template **Done on `feat/admin-settings`** |
| F | Settings page is an empty placeholder | Real Settings page (PIN, recipients, CEO, toggles) | `pages/admin/SettingsPage.tsx` **Done on `feat/admin-settings`** |

---

## 3. Data model changes

### `app_settings` (migration `010_app_settings.sql` — Done)

A **singleton** table (`id = 1` enforced) that moves admin config out of env vars.
Holds secrets, so it is **service-role only** — RLS is enabled with **no anon
policy and no anon grant**. The browser bundle can never read or write it; all
access goes through the PIN-protected serverless functions using the service-role
key.

| Column | Purpose |
|---|---|
| `admin_pin_hash` | bcrypt hash of the PIN (`crypt(pin, gen_salt('bf'))`). NULL until first set → falls back to `ADMIN_PIN` env. |
| `pin_length` | default 6; lets us change PIN length without a code change |
| `pin_updated_at` | audit |
| `pin_reset_token_hash`, `pin_reset_expires_at` | one-time email reset token (hash only; clear token is emailed once) |
| `report_recipients text[]` | admin inbox(es) for the full company report |
| `ceo_email`, `cc_ceo_on_reports` | CEO CC'd on every report when enabled |
| `member_statements_enabled` | toggle for per-member statements (feature E) |

### `members.work_email` NOT NULL (migration `011_member_fields_required.sql` — Done, apply after reset)

Per-member statements (feature E) require a reachable address, so `work_email`
becomes mandatory. The migration **guards** against existing NULLs and raises a
clear error rather than failing on the raw constraint — so it must be applied
**after** the demo data is cleared or all emails are backfilled (see §7).

---

## 4. Workstreams

### A. Data reset & production seed — Done on this branch

- `supabase/maintenance/clear_demo_data.sql` — truncates `companies`, `members`,
  `items`, `transactions`, `transactions_archive` (keeps schema + `app_settings`).
  Destructive; wrapped in a transaction with a post-condition check.
- `supabase/seed_production.template.sql` — placeholder scaffold to fill with the
  real ITC1 companies, members, items + **real prices** (in cents). Joins members
  to companies by name so no UUID juggling.
- The legacy `supabase/seed.sql` and `supabase/seeds/002_demo_data.sql` remain in
  the repo as dev fixtures but **must not** be run against production.

> ⚠️ The reset has **not** been run against the live Supabase project — it is
> destructive and irreversible. Run it (Studio SQL editor or `psql -f`) once the
> real data is ready, after exporting anything worth keeping.

### B. Mandatory member fields

- **Done:** `MembersPage.tsx` now requires Vorname, Nachname, Arbeits-E-Mail and
  Unternehmen, validates email shape, and disables Save until all are present.
- **Planned (after reset):** apply migration `011` so the constraint can't be
  bypassed via the REST API. Consider the same treatment for companies/items if
  the demo shows a need.

### C. 6-digit PIN — change + reset

**Storage:** DB (`app_settings.admin_pin_hash`), bcrypt via pgcrypto. Never
returned to the client. `ADMIN_PIN` env becomes a bootstrap fallback only (used
when `admin_pin_hash` is NULL).

**Front end:** `PinKeypad.tsx` currently hard-codes `MAX = 4`. Make the length a
prop (default 6) and render the dot/keypad layout from it. `AdminLogin.tsx` reads
the expected length (exposed by a tiny public `GET /api/admin/pin-meta`, or simply
hard-code 6 — length is not a secret).

**New serverless endpoints** (all in `apps/web/api/admin/`, service-role,
PIN-checked unless noted):

| Endpoint | Method | Auth | Does |
|---|---|---|---|
| `verify-pin` (update existing) | POST | none (it *is* the auth) | compare against `admin_pin_hash` via `crypt()`; fall back to `ADMIN_PIN` env when hash is NULL |
| `change-pin` | POST | current PIN | validate new PIN is 6 digits, write `crypt()` hash, set `pin_updated_at` |
| `request-pin-reset` | POST | none | generate one-time code, store its hash + 15-min expiry, email it to `report_recipients` + `ceo_email` via Resend |
| `reset-pin` | POST | reset code **or** `ADMIN_RECOVERY_PIN` env | verify code/expiry (or env recovery PIN), set new PIN hash, clear the token |

**Reset = both paths** (per decision): email one-time code for normal use, plus
the `ADMIN_RECOVERY_PIN` env var as a last-resort backstop if email is down.

**Security notes:** rate-limit `verify-pin`/`reset-pin` (e.g. simple in-memory or
KV counter) to blunt brute force on a 6-digit space; reset codes are single-use
and time-boxed; never log PINs or codes.

### D. CEO CC + recipient management

- `sendEmail()` in `apps/web/api/_lib/report.ts` currently sends `to:` =
  `ADMIN_EMAIL.split(',')`. Change it to read `app_settings`:
  - `to` = `report_recipients` (fall back to `ADMIN_EMAIL` env if empty)
  - `cc` = `[ceo_email]` when `cc_ceo_on_reports` and `ceo_email` is set
- The CEO is CC'd on **every** report — both the admin-triggered send and the
  month-end cron — because both call `runMonthlyReport()`.
- Managed from the Settings page (feature F): recipients list, CEO email, CC toggle.

### E. Per-member monthly statements (augments the company report)

Decision: **keep** the existing admin+CEO company report **and additionally** send
each member who logged ≥1 transaction in the report month their own itemized
statement.

- Add to `runMonthlyReport()`, gated on `member_statements_enabled`, after the
  company report is sent and **before/with** archiving:
  1. group enriched transactions by `member_id`
  2. for each member with a `work_email`, render a personal statement (reuse the
     warm email layout in `report.ts`; new `buildMemberStatementHtml()` in
     `reportHtml.ts`) — itemized lines + total for the month
  3. send via Resend `to: [member.work_email]`
- **Volume:** ~one email per active member per month. Even at the full ITC1 roster
  this is well under Resend's free 3 000/month. Send sequentially or in small
  batches with light throttling to respect Resend rate limits; tolerate individual
  failures (log + continue) so one bad address doesn't abort the run.
- **Privacy:** a member's statement contains only their own consumption, never
  another member's or the company total.
- **No member auth** is introduced — this is a one-way email only, consistent with
  the PRD's zero-friction non-goal.

### F. Expanded admin Settings page

Replace the placeholder in `AdminDashboard.tsx` (`activePage === 'settings'`) with
real controls, all backed by a new `GET/POST /api/admin/settings` (service-role,
PIN-checked; **never** returns `admin_pin_hash` or reset token):

- **PIN:** change PIN (current + new + confirm), "PIN zurücksetzen" entry point
- **Empfänger:** edit `report_recipients`, set `ceo_email`, toggle `cc_ceo_on_reports`
- **Mitglieder-Berichte:** toggle `member_statements_enabled`
- Read-only status: when the last report was sent, current PIN length

---

## 5. New / changed surface area (summary)

```
supabase/migrations/010_app_settings.sql            (new — Done)
supabase/migrations/011_member_fields_required.sql  (new — Done; apply after reset)
supabase/maintenance/clear_demo_data.sql            (new — Done; run manually)
supabase/seed_production.template.sql               (new — Done; fill with real data)

apps/web/src/pages/admin/MembersPage.tsx            (changed — Done; mandatory fields)
apps/web/src/lib/database.types.ts                  (changed — Done; app_settings type)
apps/web/.env.example                               (changed — Done; ADMIN_RECOVERY_PIN, 6-digit notes)

supabase/migrations/012_pin_functions.sql           (new — Done; applied to prod; PIN/reset RPC)
supabase/migrations/013_report_config.sql           (new — Done; apply to prod; scheduling + format)
apps/web/api/admin/preview-report.ts                 (new — Done; company + member preview)
apps/web/api/cron/monthly-report.ts                 (change — Done; reads enabled + day from settings)
apps/web/vercel.json                                (change — Done; cron now daily; function guards day)
apps/web/api/_lib/adminAuth.ts                       (new — Done; verifyAdminPin + service client)
apps/web/api/admin/verify-pin.ts                    (change — Done; DB hash + fallback)
apps/web/api/admin/pin-meta.ts                      (new — Done; public PIN length)
apps/web/api/admin/change-pin.ts                    (new — Done)
apps/web/api/admin/request-pin-reset.ts             (new — Done)
apps/web/api/admin/reset-pin.ts                     (new — Done)
apps/web/api/admin/settings.ts                      (new — Done)
apps/web/api/send-report.ts                         (change — Done; DB-hash auth)
apps/web/api/_lib/report.ts                         (change — Done; CC + member statements)
apps/web/api/_lib/reportHtml.ts                     (change — Done; member statement template)
apps/web/src/components/admin/PinKeypad.tsx         (change — Done; length prop, default 6)
apps/web/src/components/admin/PinInput.tsx          (new — Done; segmented PIN entry)
apps/web/src/pages/AdminLogin.tsx                   (change — Done; fetch pin-meta length)
apps/web/src/pages/admin/SettingsPage.tsx           (new — Done; the Settings page)
apps/web/src/pages/AdminDashboard.tsx               (change — Done; mounts SettingsPage)
```

---

## 6. New environment variables

| Var | Scope | Purpose |
|---|---|---|
| `ADMIN_PIN` (existing) | server | bootstrap PIN until a DB PIN is set; then ignored |
| `ADMIN_RECOVERY_PIN` (new) | server | last-resort PIN reset backstop |
| `ADMIN_EMAIL` (existing) | server | bootstrap report recipient until `report_recipients` is set |

`RESEND_API_KEY`, `CRON_SECRET`, `VITE_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`
are unchanged.

---

## 7. Migration order (runbook)

Run in this exact order against the live Supabase project:

1. **Apply migration `010_app_settings.sql`** — safe anytime; creates the settings
   table and seeds the singleton row. The app keeps working via env fallbacks.
2. **Export** any archive data worth keeping (`transactions_archive` → CSV).
3. **Run `supabase/maintenance/clear_demo_data.sql`** — wipes demo data; config in
   `app_settings` survives.
4. **Seed real data** — fill in `seed_production.template.sql` (real companies,
   members + emails, items + **real prices**) and run it. Keep the filled-in copy
   out of git (`seed_production.local.sql`, gitignored) if it contains real names.
5. **Apply migration `011_member_fields_required.sql`** — now that no NULL
   `work_email` rows remain, locks the constraint.
6. **Set the admin PIN** from the dashboard once feature C ships (until then the
   `ADMIN_PIN` env value is in effect).

> Steps 3–5 are destructive / data-dependent and are intentionally **manual** —
> they are not auto-run by CI or deploys.

---

## 8. Pending inputs (blocking the data steps)

Needed from the ITC1 side before steps 3–4 above:

- [ ] Real company list (names, which are active)
- [ ] Real member list per company (name + **work email** — now mandatory)
- [ ] Real item catalogue with **real prices** (cents) and units
- [ ] CEO email address for report CC
- [ ] Confirm the initial 6-digit PIN (or set it in-dashboard after C ships)

---

## 9. Status checklist

**Done on this branch (`feat/itc1-production-prep`)**
- [x] `app_settings` migration (PIN hash, reset token, recipients, CEO, toggles)
- [x] `members.work_email` NOT NULL migration (guarded; apply after reset)
- [x] Demo-data reset script
- [x] Production seed template
- [x] Mandatory member fields in the admin "Add member" form
- [x] DB types + `.env.example` updated
- [x] This plan

**Done on `feat/admin-settings`**
- [x] C — 6-digit PIN: keypad length prop + `pin-meta`, `verify-pin` DB hash, `change-pin`, reset (email code + `ADMIN_RECOVERY_PIN` backstop), migration `012` PIN functions
- [x] D — CEO CC + recipient list wired into the report (`fetchReportSettings` → `sendEmail` to/cc)
- [x] E — per-member monthly statements (`sendMemberStatements` + `buildMemberStatementHtml`, gated on the toggle)
- [x] F — real admin Settings page (`pages/admin/SettingsPage.tsx`), backed by `GET/PUT /api/admin/settings`

**Also shipped on `feat/admin-settings`**
- [x] Automatic-send scheduling (enable/disable + day of month) — cron reads it from `app_settings`
- [x] Light report-format customization (accent, subject, intro, PDF/Excel attachment toggles)
- [x] In-dashboard report preview (company + member), reflecting unsaved edits

**Planned / manual**
- [x] Apply migration `012_pin_functions.sql` to the live Supabase project
- [ ] Apply migration `013_report_config.sql` to the live Supabase project
- [ ] Run the reset + seed + `011` against production once real data arrives
- [ ] Set the admin PIN from the dashboard once deployed (until then `ADMIN_PIN` env is in effect)
- [ ] Fill in report recipients + CEO email from the Settings page (until then `ADMIN_EMAIL` env is the sole recipient)
