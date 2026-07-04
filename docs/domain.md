# Domain Model — Kaffeelisten

Entities, relationships, business rules, and data contracts.

---

## Core entities

### Company

A company or organization that leases space at ITC1 campus.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Company display name |
| `active` | boolean | Soft delete — inactive companies are hidden from member flow |
| `created_at` | timestamptz | — |

### Member

A person who works at a company on campus.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `company_id` | uuid | FK → companies |
| `name` | text | Display name (standardised format: "Vorname N.") |
| `work_email` | text | Work email. Collected during self-registration and admin edit; deliverability-checked (MX/A) on save. **Never rendered** in the member flow tile, transaction log, or summary cards — reachable only through the service-role admin API (the anon key cannot read this column, see migration 015). Included in the monthly report CSV/email for billing cross-reference. |
| `email_verified_at` | timestamptz \| null | Set when the member confirms ownership via the one-time email link (migration 021). `null` = unverified (flagged in admin, never skipped). |
| `active` | boolean | Soft delete — inactive members hidden from member flow; auto-deactivated after 90 days of inactivity (Phase 2) |
| `created_at` | timestamptz | — |

### Item

A consumable available on campus (coffee, drink, snack).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Display name (German) |
| `unit_label` | text | e.g. "Tasse", "Flasche", "Stück" |
| `price_cents` | integer | Price in euro cents; 0 = complimentary |
| `category` | text | "coffee" | "drink" | "snack" | "other" |
| `active` | boolean | Soft delete |
| `created_at` | timestamptz | — |

### Transaction

A single consumption log event.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `member_id` | uuid | FK → members |
| `company_id` | uuid | Denormalized from member at log time — survives member moves |
| `item_id` | uuid | FK → items |
| `quantity` | integer | Default 1; minimum 1 |
| `logged_at` | timestamptz | UTC; set by the server, not the client |

### Transaction Archive

Completed months' data. Identical schema to `transactions` plus audit fields.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | Original transaction ID |
| `member_id` | uuid | — |
| `company_id` | uuid | — |
| `item_id` | uuid | — |
| `quantity` | integer | — |
| `logged_at` | timestamptz | Original timestamp |
| `archived_at` | timestamptz | When the archive ran |
| `report_month` | text | ISO format: "2026-05" |

---

## Relationships

```
companies 1 ──< members
companies 1 ──< transactions (denormalized)
members   1 ──< transactions
items     1 ──< transactions
```

---

## Business rules

1. **No deletion** — companies, members, and items are soft-deleted (set `active = false`). Transactions are never deleted from the live table; they are archived.

2. **Company denormalization** — `company_id` is stored directly on the transaction at log time, not derived from the member's current company. This ensures historical accuracy if a member switches companies.

3. **Timestamp authority** — `logged_at` is set server-side (Supabase default `now()`). The client sends no timestamp.

4. **Archive is final** — once transactions are archived, the archive records are immutable. Only append operations are allowed on `transactions_archive`.

5. **Report month** — stored as `"YYYY-MM"` string (e.g. `"2026-05"`). Used to group archive records and prevent double-archiving.

6. **Inactive filtering** — the member flow only shows active companies and members. Items marked inactive do not appear in the item selection screen.

7. **Multi-item sessions** — a member can select multiple different items in one session, each with its own quantity. Each item produces a separate `transactions` row on submit (batch insert). The `quantity` field on each row reflects how many units of that specific item were taken.

8. **Member inactivity auto-deactivation** (Phase 2) — a monthly cron job soft-deletes any member with zero transactions in the past 90 days (`MEMBER_INACTIVITY_DAYS` env var, default `90`). Deactivated members are hidden from the member flow but remain in the admin Members list for manual reactivation.

9. **Archive retention** (Phase 2) — records in `transactions_archive` older than 90 days are purged after each monthly report is sent (`ARCHIVE_RETENTION_DAYS` env var, default `90`). The live `transactions` table is cleared monthly as part of the normal report cycle, not on this schedule.

---

## State machines

### Transaction lifecycle

```
[member submits] → created in transactions
                         ↓
              [end of month: archive triggered]
                         ↓
              copied to transactions_archive
                         ↓
              deleted from transactions (live table cleared)
```

### Report trigger

```
[manual: admin clicks "Bericht senden"]
[automatic: Vercel Cron on last day of month, 23:00 CET]
         ↓
[API: POST /api/send-report]
         ↓
compute month summary
         ↓
send email via Resend
         ↓
on success: archive transactions → clear live table
on failure: abort — do not archive, alert admin
```

---

## API surface (Vercel serverless functions)

The RLS lockdown (migration 015) deliberately narrowed the anon key to a thin
member-flow slice (see below). Everything else — every admin read/write, the PII
columns, and the report — flows through the serverless functions, which use the
service-role key server-side only. The Vercel Hobby plan caps a deployment at 12
functions, so related endpoints are consolidated behind an `action`/`resource`
query param rather than one file each.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/admin/auth?action=verify\|change\|reset\|request-reset\|meta` | POST / GET | PIN (verify/reset) → issues session cookie; `meta` is public | Consolidated admin auth: verify PIN + issue signed HttpOnly session cookie, rotate PIN, email/consume reset code |
| `/api/admin/data?resource=companies\|items\|members\|dashboard` | GET / POST / PATCH | Session cookie | All admin catalogue reads and writes, plus the dashboard aggregate and member-confirmation resend. Server-side validation |
| `/api/admin/settings` | GET / PUT | Session cookie | Non-secret admin config (recipients, CEO email/CC, per-order cap, member toggle). Never returns the PIN hash or reset token |
| `/api/admin/theme` | GET / PUT | Session cookie | Global appearance (mode + palette). `app_theme` is public-readable, service-role write only |
| `/api/admin/preview-report?type=company\|member` | GET | Session cookie | Renders the report email as it would send, using current settings + live data |
| `/api/config` | GET | Public | Non-sensitive member-flow config (currently the per-order item cap) — the anon bundle cannot read `app_settings` directly |
| `/api/confirm-email?mid=&token=` | GET | Public (one-time token) | Verifies a member's email-confirmation link via the `confirm_member_email` RPC (migration 021); IP rate-limited |
| `/api/send-report` | POST | Admin PIN or `CRON_SECRET` header | Compute monthly summary, send via Resend, then archive + prune transactions |
| `/api/cron/monthly-report` | GET | `CRON_SECRET` | Nightly cron: sends the previous closed month if due; idempotent per `report_month` (auto catch-up) |

The **member logging flow** does not write tables directly. It calls the
`SECURITY DEFINER` RPCs `log_order`, `undo_order` and `register_member`
(migration 017), the only anon write path — they derive `company_id`/`logged_at`
server-side, reject unknown/inactive members/items, and bound quantity.

---

## Supabase RLS / grants policy intent

After migration 015 the **anon key** (shipped in the browser bundle) can ONLY:
- **SELECT** `companies` / `items` (active only) — the selectors
- **SELECT** the non-PII columns `(id, name, company_id, active)` of active
  `members` — the name picker. `work_email` is NOT reachable with the anon key
- **EXECUTE** `log_order` / `undo_order` / `register_member` — the only anon
  write path (migration 018 revoked the old direct anon `INSERT`s)

The **service_role** key (server-side only, never in the browser) bypasses RLS
but still needs object-level `GRANT`s to run queries. It holds `SELECT` on all
tables the functions read and `INSERT`/`UPDATE` on every table they write —
`transactions`, `transactions_archive`, `app_settings`, `app_theme`,
`report_runs`, `auth_throttle`, and the catalogue tables `members` / `companies`
/ `items`.

> **Grant invariant (learned the hard way — migration 022):** moving a write
> from the anon key to the service-role API is only half the job. The
> `service_role` grant must move with it, or reads keep working while writes fail
> with `permission denied`. `apps/web/test/migration-grants.test.ts` replays the
> migrations in CI and asserts service_role has the privileges the catalogue API
> needs — extend its `REQUIRED` map whenever a new service-role write table is
> added.

---

## Seed data (dev)

See `supabase/seed.sql` for sample companies, members, and items representing a realistic ITC1 campus.
