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

## Git workflow

### Branching pattern

```
main              — production-ready, protected
hotfix/<slug>     — urgent fixes that go directly to main (e.g. hotfix/ci-working-directory)
feat/<slug>       — new features (e.g. feat/member-flow)
fix/<slug>        — non-urgent bug fixes
chore/<slug>      — tooling, deps, CI, docs (e.g. chore/update-deps)
```

Always branch off `main`. Open a PR; never push directly to `main` except on a hotfix with a peer review waived only during the hackathon sprint.

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

### Claude agent workflow

1. **Read first** — always read `CLAUDE.md` and the relevant source files before editing.
2. **Branch** — create a branch with the right prefix before any code change.
3. **Small commits** — one logical change per commit; commit as soon as a unit of work is done.
4. **Check CI** — after pushing, use the GitHub PAT (see `.env`) to poll `GET /repos/arudaev/kaffeelisten/actions/runs` and inspect failures before declaring the task done.
5. **No direct `main` pushes** — open a PR; the CI gate must pass.
6. **No generated secrets in commits** — `.env` is gitignored; secrets live there only.

> **Monorepo note:** This is an npm workspaces repo. Run `npm install` / `npm ci` from the **repo root**, not from `apps/web`. The root `package.json` proxies all scripts (`dev`, `build`, `lint`, `typecheck`) to the workspace. `package-lock.json` lives at the root.

## Environment variables and `.env`

`.env` lives at the repo root and is gitignored. It holds all real secrets and tokens used locally and by Claude agents. `.env.example` (committed) shows the required keys with placeholder values.

### For a teammate's Claude agent

When a teammate's Claude Code session starts on a fresh clone:

1. Copy `.env.example` to `.env` and fill in the real values (share via a secure channel — never commit them).
2. The agent reads `.env` via the shell automatically — no extra setup needed for Claude Code.
3. Keys the agent actively uses:
   - `GITHUB_TOKEN` — checking and re-triggering GitHub Actions workflow runs.
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — frontend Supabase client (also needed for `vite build` in CI via repo secrets).
   - `SUPABASE_SERVICE_ROLE_KEY` — only needed if running migration scripts or the report API locally.
   - `VERCEL_TOKEN` — only needed if manually triggering a Vercel deploy from the CLI.
4. The agent must **never** commit `.env`, print secret values in responses, or embed them in source files.

## Useful references

- PRD: `docs/prd.md`
- Design foundation: `docs/design-foundation.md`
- Roadmap: `docs/roadmap.md`
- Supabase docs: https://supabase.com/docs
- Resend docs: https://resend.com/docs
- Vite PWA plugin: https://vite-pwa-org.netlify.app/
