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
| `name` | text | Display name |
| `active` | boolean | Soft delete — inactive members are hidden from member flow |
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

7. **Quantity** — currently one item per log event. The P0 flow does not support multi-item carts. Quantity field is included for P1 expansion.

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

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/log` | POST | None | Create a transaction |
| `/api/admin/verify-pin` | POST | None | Validate PIN, return session token |
| `/api/admin/transactions` | GET | Admin token | List current-month transactions |
| `/api/admin/summary` | GET | Admin token | Company-level summary |
| `/api/admin/send-report` | POST | Admin token | Trigger report email + archive |
| `/api/admin/companies` | GET/POST | Admin token | List / create companies |
| `/api/admin/companies/:id` | PATCH/DELETE | Admin token | Update / deactivate company |
| `/api/admin/members` | GET/POST | Admin token | List / create members |
| `/api/admin/members/:id` | PATCH/DELETE | Admin token | Update / deactivate member |
| `/api/admin/items` | GET/POST | Admin token | List / create items |
| `/api/admin/items/:id` | PATCH/DELETE | Admin token | Update / deactivate item |
| `/api/cron/monthly-report` | POST | Cron secret | Called by Vercel Cron (same as send-report) |

---

## Supabase RLS policy intent

The client (browser) has read-only access to:
- `companies` (active only)
- `members` (active only)
- `items` (active only)

The client can insert into:
- `transactions`

All admin reads, writes, and the archive operation run through Vercel serverless functions using the Supabase service-role key, which is never exposed to the browser.

---

## Seed data (dev)

See `supabase/seed.sql` for sample companies, members, and items representing a realistic ITC1 campus.
