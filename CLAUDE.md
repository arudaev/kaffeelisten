# CLAUDE.md — Kaffeelisten

Context file for Claude Code. Read this before touching any file.

## What this is

Kaffeelisten is a PWA that replaces the paper coffee-consumption sheet at ITC1 Deggendorf campus. Campus members log what they consumed (coffee, drinks, snacks). At the end of each month, the admin receives a formatted email report grouped by company and person. The database then archives and resets.

Built for the Kaffeelisten Challenge ITC1 at B4Y3RW4LD Hackathon, May 8–9 2026.

## Stack

- **Frontend:** React 18 + Vite + TypeScript, Tailwind CSS
- **PWA:** vite-plugin-pwa (Workbox)
- **Database:** Supabase (PostgreSQL, free tier)
- **Hosting:** Vercel (free tier)
- **Email:** Resend (free tier, 3 000/mo)
- **Cron:** Vercel Cron Jobs (fires monthly report if admin forgets)

## Repo layout

```
apps/web/         React PWA — all frontend code lives here
supabase/         SQL migrations and seed
docs/             PRD, design docs, roadmap — read before designing
.github/          CI workflow and issue templates
```

## Key conventions

- TypeScript everywhere. No `any`. No `ts-ignore` without a comment.
- Tailwind for all styling. No inline styles. No CSS modules.
- Supabase client is initialized once in `apps/web/src/lib/supabase.ts`.
- All environment variables are prefixed `VITE_` for the frontend bundle. Server-side vars (used in Vercel serverless functions) are unprefixed.
- Serverless functions live in `apps/web/api/` and are deployed by Vercel automatically.
- The monthly report logic lives in `apps/web/api/send-report.ts`.
- Admin PIN is checked server-side only, never exposed to the client bundle.

## Data model (simplified)

```sql
companies   — id, name, active
members     — id, company_id, name, active
items       — id, name, unit_label, price_cents, active
transactions — id, member_id, company_id, item_id, quantity, logged_at
transactions_archive — same + archived_at, report_month
```

Full schema: `supabase/migrations/001_initial_schema.sql`

## Member-facing flow

Start screen → select company → select member → select item(s) → confirm → success (auto-reset after 3s)

No login. No account. The flow must complete in under 15 seconds on an iPad.

## Admin panel

Route: `/admin` — PIN-protected (server-side check via Vercel function).

Admin can:
- View all current-month transactions (table, filterable)
- See a company-level summary
- Trigger the monthly report email
- Manage companies, members, and items (CRUD)

## Design direction

The visual language is warm, minimal, and grounded in the B4Y3RW4LD / Bavarian Wald / ITC1 Deggendorf context. See `docs/design-foundation.md` for the full creative brief.

Key points:
- German-first UI copy. English only for dev-facing labels and comments.
- Coffee motifs, one-line SVG illustrations, Bavarian warmth — but professional.
- No emojis in UI.
- Tailwind color tokens must match the design system defined in `docs/design-system.md`.

## What NOT to do

- Do not add user authentication for the member-facing flow. The whole point is zero friction.
- Do not use `any` types in TypeScript.
- Do not add payment logic, invoicing, or billing.
- Do not build for multiple locations (single ITC1 campus only in v1).
- Do not use lorem ipsum in UI copy — use realistic German copy.
- Do not expose `ADMIN_PIN` or `RESEND_API_KEY` in the client bundle.
- Do not delete `transactions` records — always archive first, then clear.

## Useful references

- PRD: `docs/prd.md`
- Design foundation: `docs/design-foundation.md`
- Roadmap: `docs/roadmap.md`
- Supabase docs: https://supabase.com/docs
- Resend docs: https://resend.com/docs
- Vite PWA plugin: https://vite-pwa-org.netlify.app/
