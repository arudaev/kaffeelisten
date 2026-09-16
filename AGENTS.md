# AGENTS.md — Kaffeelisten

Canonical context file for every coding agent (Codex, Claude Code, others). `CLAUDE.md` imports this file; edit rules here, not there. Read this before touching any file.

## What this is

Kaffeelisten is a PWA that replaces the paper coffee-consumption sheet at ITC1 Deggendorf campus. Campus members log what they consumed (coffee, drinks, snacks). At the end of each month, the admin receives a formatted email report grouped by company and person. The database then archives and resets.

Originally built for the Kaffeelisten Challenge ITC1 at the B4Y3RW4LD Hackathon (May 8–9 2026). The project is now being developed toward a real production deployment for the ITC1 campus, so treat it as a maintained product, not a throwaway prototype: prefer durable, well-typed, documented changes over quick hacks.

## Stack

- **Frontend:** React 18 + Vite + TypeScript, Tailwind CSS
- **PWA:** vite-plugin-pwa (Workbox)
- **Database:** Supabase (PostgreSQL) — separate **production** and **staging** projects, see `docs/environments.md`
- **Hosting:** Vercel (Pro team `arudaev-projects`, project `kaffeelisten`)
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
- The monthly report logic lives in `apps/web/api/_lib/report.ts`; `api/send-report.ts` (manual) and `api/cron/monthly-report.ts` (cron) are thin entry points.
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
- Do not add payment processing (card, SEPA debit, online payment). Billing documents exist, but **invoice mode is legally gated**: it must never be enabled in production until ITC1 gives written authority (`invoice_mode_authorized` + authority note). See `docs/prd-billing-commercial-addendum.md`.
- Do not build for multiple locations (single ITC1 campus only in v1).
- Do not use lorem ipsum in UI copy — use realistic German copy.
- Do not expose `ADMIN_PIN` or `RESEND_API_KEY` in the client bundle.
- Do not delete `transactions` records — always archive first, then clear. Never delete from `transactions_archive`; history is kept indefinitely.


## Environments and database migrations

Full procedure: `docs/environments.md`. The rules every agent follows:

1. **`supabase/migrations/*.sql` is the only way the schema changes.** Never edit schema in Supabase Studio, on staging or production.
2. **If production needs it to work, it is a migration, not a seed.** Settings rows, defaults, grants, RLS, RPCs and required reference data go in migrations. Seeds are disposable test data only. CI builds the schema from migrations with no seeds and runs the SQL guards on it.
3. **Every migration starts with a phase tag**: `-- deploy: pre` (additive/backwards-compatible, applied before the code ships) or `-- deploy: post` (only after the code is live). A post-deploy migration goes in its own follow-up PR, because the Supabase CLI applies pending migrations strictly in order.
4. **Agents may migrate staging, never production.** Production migrations run only through the `Database - production` GitHub workflow, which runs automatically when a merge to `main` changes `supabase/migrations`.
5. **Previews and local dev use staging.** Vercel Preview/Development env vars point at the staging Supabase project. Outgoing mail outside production is restricted to `MAIL_ALLOWLIST` (default `example.com`), and non-production deployments refuse to run against the production database.
6. **Real people's data never enters the repo** (it is public). Staging rosters live in gitignored `supabase/seeds/*.local.sql`.
7. Every migration also needs: an update to the hand-maintained `apps/web/src/lib/database.types.ts`, `service_role` grant assertions in `apps/web/test/migration-grants.test.ts`, and a passing `scripts/test-migrations.sh`.

## Git workflow

### Branching pattern

```
main              — production-ready, protected
hotfix/<slug>     — urgent fixes that go directly to main (e.g. hotfix/ci-working-directory)
feat/<slug>       — new features (e.g. feat/member-flow)
fix/<slug>        — non-urgent bug fixes
chore/<slug>      — tooling, deps, CI, docs (e.g. chore/update-deps)
```

Always branch off `main`. Open a PR; never push directly to `main`. Now that the hackathon sprint is over, `main` is treated as production: PRs should be reviewed before merge, and the CI gate must pass. Reserve direct-to-`main` hotfixes for genuine production emergencies, and open a follow-up PR documenting the fix.

### Commit style (Conventional Commits)

```
<type>(<scope>): <short imperative summary>

[optional body — WHY, not WHAT]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`  
Scope is optional but helpful: `ui`, `api`, `db`, `ci`, `pwa`

Examples:
```
feat(ui): add company selector screen
fix(api): handle missing CRON_SECRET env var
ci: fix working-directory for apps/web monorepo
chore(deps): bump vite to 5.3
```

- Subject line ≤ 72 chars, lowercase after the colon, no trailing period.
- Body only when the why isn't obvious from the diff.

### Agent workflow

1. **Read first** — always read `AGENTS.md` and the relevant source files before editing.
2. **Branch** — create a branch with the right prefix before any code change.
3. **Small commits** — one logical change per commit; commit as soon as a unit of work is done.
4. **Update CHANGELOG** — before the final commit on every `feat/*`, `fix/*`, or `hotfix/*` branch, add an entry to `CHANGELOG.md` under `[Unreleased]`. List every user-visible addition, fix, or breaking change introduced on that branch. Do not document internal refactors or CI tweaks unless they affect behaviour.
5. **Check CI** — after pushing, use the GitHub PAT (see `apps/web/.env.local`) to poll `GET /repos/arudaev/kaffeelisten/actions/runs` and inspect failures before declaring the task done.
6. **No direct `main` pushes** — open a PR; the CI gate must pass.
7. **No generated secrets in commits** — `apps/web/.env.local` is gitignored; secrets live there only.
8. **Before every commit** run `npm run typecheck`, `npm run typecheck:api`, `npm run lint`, `npm test`, `npm run build` and, when SQL changed, `scripts/test-migrations.sh`.

> **Monorepo note:** This is an npm workspaces repo. Run `npm install` / `npm ci` from the **repo root**, not from `apps/web`. The root `package.json` proxies all scripts (`dev`, `build`, `lint`, `typecheck`) to the workspace. `package-lock.json` lives at the root.

## Environment variables and `.env.local`

`apps/web/.env.local` is gitignored. It holds the real secrets and tokens used locally and by agents, pointing at **staging** for anything the app connects to. `apps/web/.env.example` (committed) shows the required keys with placeholder values.

### For a teammate's agent

When a teammate's agent session starts on a fresh clone:

1. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the real values (share via a secure channel — never commit them).
2. The agent reads `apps/web/.env.local` via the shell automatically — no extra setup needed.
3. Keys the agent actively uses:
   - `GITHUB_TOKEN` — checking and re-triggering GitHub Actions workflow runs.
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — frontend Supabase client (also needed for `vite build` in CI via repo secrets).
   - `SUPABASE_SERVICE_ROLE_KEY` — only needed if running migration scripts or the report API locally.
   - `VERCEL_TOKEN` — Vercel CLI (`vercel env`, `vercel dev`, deploy inspection) with `--scope arudaev-projects`.
   - `SUPABASE_ACCESS_TOKEN` — Supabase Management API: `node scripts/db/migrate.mjs --project-ref <staging ref>` applies migrations to staging; `scripts/db/drift.mjs` compares schemas read-only. The migrator refuses production outside GitHub Actions.
   - `STAGING_SUPABASE_*` / `PROD_SUPABASE_*` — project URLs and keys. Local runs use the staging values only.
4. The agent must **never** commit `.env.local`, print secret values in responses, or embed them in source files.

## Useful references

- PRD: `docs/prd.md`
- Design foundation: `docs/design-foundation.md`
- Design system: `docs/design-system.md`
- Domain model: `docs/domain.md`
- Environments and migrations: `docs/environments.md`
- Phase 3 billing documents: `docs/phase-3-billing.md`
- Design-system sync inputs: `.design-sync/` (config, tokens, component previews, `NOTES.md`)
- Hackathon-era docs (archived): `docs/archive/`
- Supabase docs: https://supabase.com/docs
- Resend docs: https://resend.com/docs
- Vite PWA plugin: https://vite-pwa-org.netlify.app/
