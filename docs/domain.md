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
| `email` | text \| null | Work email — **Phase 1 addition** (migration required). Collected during self-registration and admin edit. **Never rendered** in the member flow tile, transaction log, or summary cards. Visible only in the admin Mitarbeitende edit form. Included in the monthly report CSV/email for billing cross-reference. |
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

Most data operations go directly through the Supabase REST API (anon key + RLS). The serverless functions below handle operations that require server-side secrets.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/admin/verify-pin` | POST | None | Validate PIN against `ADMIN_PIN` env var |
| `/api/send-report` | POST | Admin cookie or `CRON_SECRET` header | Compute monthly summary, send email via Resend, archive + clear transactions |

The member logging flow (batch insert into `transactions`) and all admin CRUD use the Supabase client with the anon key and RLS policies. The service-role key is used only inside `/api/send-report` for the archive operation.

---

## Supabase RLS policy intent

The client (browser, anon key) can:
- **SELECT** `companies` (active only)
- **SELECT** `members` (active only, per company)
- **SELECT** `items` (active only)
- **SELECT** `transactions` (admin dashboard reads via anon key — migration 003)
- **INSERT** `transactions` (member logging — migration 001)
- **INSERT** `members` (member self-registration — migration 004)

All admin writes, the archive operation, and the monthly report email run through Vercel serverless functions using the Supabase service-role key, which is never exposed to the browser.

---

## Seed data (dev)

See `supabase/seed.sql` for sample companies, members, and items representing a realistic ITC1 campus.
