# Environments and database migrations

How Kaffeelisten keeps production safe while previews and local runs get a real
database. Agents follow the short rule list in `AGENTS.md`; this is the full
procedure.

## Environments

| | Production | Staging |
| --- | --- | --- |
| Supabase project | `kaffeelisten` (`fdnfdscpefxqvtggbbbr`), eu-west-1 | `kaffeelisten-staging` (`szknrarfnocbkqqjqtse`), eu-west-1 |
| Used by | Vercel **Production** (`kaffeelisten.de`) | Vercel **Preview** (every PR), Vercel **Development**, local runs |
| Data | Real ITC1 data | Disposable. Real company names and example.com people from `supabase/seeds/staging_roster.local.sql` (gitignored) |
| Mail | Delivered | Guarded: only `MAIL_ALLOWLIST` recipients (default `example.com`), all redirected to `MAIL_SINK` (`delivered@resend.dev`), subject prefixed `[STAGING]` |
| Migrations | Only via the `Database - production` workflow | Automatically on PRs (`Database - staging`), or `node scripts/db/migrate.mjs` |

Both projects are on the Supabase **Free** plan. A free project pauses after 7
days without activity; resume it in the Supabase dashboard. Supabase Branching
(a database per PR) needs the Pro plan. Once the project moves to the
ITC1-paid organisation it can replace the staging project; the code already
reads the variable names the Supabase–Vercel integration uses.

## Rules

1. **`supabase/migrations/*.sql` is the only way the schema changes.** Never edit
   schema in Supabase Studio, on either project.
2. **If production needs it to work, it is a migration, not a seed.** Settings
   rows, defaults, grants, RLS, RPCs. Seeds are disposable test data. Business
   data the admin manages (companies, people, items and prices) is not seeded
   into production at all. CI builds the schema from migrations with **no seed**
   and runs the SQL guards on it (`supabase/tests/00_bare_schema.test.sql`).
3. **Every migration from 030 on starts with a phase tag.**
   - `-- deploy: pre` — backwards-compatible with the code currently live; applied
     before or together with the new code.
   - `-- deploy: post` — only works once the new code is live (for example a
     revoke the old code still needs). **It goes in its own follow-up PR**,
     merged after the release that makes it safe. The migrator applies pending
     files strictly in number order, so a post-deploy file cannot sit before
     pre-deploy ones in the same release. `scripts/lint-migrations.mjs` enforces
     this in CI.
4. **Destructive statements** (`drop table/column/schema`, `delete from`,
   `truncate`) need a `-- destructive: approved` line after owner review.
5. **Every migration also updates** the hand-maintained
   `apps/web/src/lib/database.types.ts`, the grant assertions in
   `apps/web/test/migration-grants.test.ts`, and passes `scripts/test-migrations.sh`.
6. **New tables and functions are private by default** (migration 038). Grant
   exactly what the API or the iPad needs, in the same migration.

## The flow for a change that touches the database

```
push to a PR ──► CI "Migrations and SQL guards":
                   migration lint (tags, numbering, destructive statements)
                   all migrations on an empty Postgres 17, no seed
                   SQL behaviour tests (RPC guards, anon privileges, both-checkout)
             ──► "Database - staging": pending migrations → staging
             ──► Vercel preview (reads staging) → test it

merge to main ──► Vercel builds production
              ──► "Database - production" (runs because supabase/migrations changed):
                    plan (dry run, lists pending files)
                    apply to production, each file in one transaction with its history row
                    schema comparison staging ↔ production (informational)
```

Because every migration in a release is `deploy: pre`, it does not matter
whether the Vercel build or the migration finishes first.

### Why this is safe to repeat

- History lives in `supabase_migrations.schema_migrations`, the same table the
  Supabase CLI uses. Production already records 001–029 (checked 2026-09-16).
- `scripts/db/migrate.mjs` refuses to run if the database holds a migration the
  repository does not have, or if a pending file is numbered below one already
  applied.
- It refuses the production project unless it runs inside GitHub Actions with
  `--production`. People and agents never migrate production from a laptop.
- It talks to the Supabase Management API with `SUPABASE_ACCESS_TOKEN`; no
  database password is stored anywhere.

### Checking for drift

```bash
node scripts/db/drift.mjs --a szknrarfnocbkqqjqtse --b fdnfdscpefxqvtggbbbr
```

Read-only. Compares columns, constraints, indexes, function bodies, policies,
RLS flags and API-role grants. Differences are only meaningful when both
projects have applied the same migrations (the tool says so when they have not).
`scripts/db/schema-drift.sh` does the same against a database built locally from
the migration files.

Known production-only leftovers, not in any migration (2026-09-16): the
hackathon table `admin_settings` (two empty rows, unused) and the policy
`transactions_archive.anon_read_archive_stats` (inert: anon has no SELECT grant
on the archive). Remove them with a reviewed `destructive: approved` migration
when convenient.

## Staging tasks

```bash
# Apply pending migrations (safe to repeat)
node scripts/db/migrate.mjs --project-ref szknrarfnocbkqqjqtse

# Reset tenant data to the local roster (refuses production)
node scripts/db/seed-staging.mjs --project-ref szknrarfnocbkqqjqtse
```

A staging database that picked up migrations from an abandoned PR is rebuilt by
deleting and recreating the staging project, then running the two commands
above. Staging holds nothing worth keeping.

## Safety nets in the code

- **Wrong database** (`apps/web/shared/environment.ts`): a build or function that
  is not Vercel Production and points at the production project refuses to
  start (the browser shows *Falsche Datenbank*; the API returns 503).
- **Mail guard and sink** (`apps/web/api/_lib/mail.ts`): outside production only
  allowlisted recipients are kept; with `MAIL_SINK` set they are all delivered to
  that one inbox, with the intended recipients in the subject.
- **Receiving real mail on a preview:** the guard is why a preview send shows
  status 200 in Resend but nothing arrives. To test with your own inbox, add that
  exact address to `MAIL_ALLOWLIST` on Preview **and** remove `MAIL_SINK` there,
  then redeploy. Undo it afterwards; staging data must not reach real people.
- **Schema behind the code** (`apps/web/api/_lib/errors.ts`): a missing column or
  table returns 503 *Die Datenbank ist nicht auf dem Stand dieser Version* instead
  of a bare *Serverfehler*.
- **Never promote a Preview deployment to Production in Vercel.** The browser
  bundle records its Vercel environment at build time, so a promoted preview
  build would refuse the production database. Redeploy `main` instead.

## Environment variables

Names only. Values live in Vercel, GitHub and the gitignored
`apps/web/.env.local`.

| Variable | Production (Vercel) | Preview + Development (Vercel) | Local `.env.local` |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | production URL | staging URL | staging URL |
| `VITE_SUPABASE_ANON_KEY` | production anon key | staging publishable key | staging publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | production service key | staging secret key | staging secret key |
| `ADMIN_PIN`, `ADMIN_RECOVERY_PIN` | production | staging-only values | staging values (`STAGING_ADMIN_PIN`) |
| `ADMIN_SESSION_SECRET`, `CRON_SECRET` | production | staging-only values | any |
| `ADMIN_EMAIL` | real admin addresses | `admin@example.com` | `admin@example.com` |
| `RESEND_API_KEY` | shared | shared (guarded) | shared (guarded) |
| `MAIL_ALLOWLIST` | not set | `example.com` | `example.com` |
| `MAIL_SINK` | not set | `delivered@resend.dev` | `delivered@resend.dev` |
| `RESEND_WEBHOOK_SECRET` | secret of the production webhook | secret of the preview webhook | not needed |
| `CHROMIUM_PATH` | not set | not set | local Chrome, for PDF rendering |

**Resend webhook** (delivery status in the send dialog): in Resend → Webhooks add
one endpoint per environment, `https://kaffeelisten.de/api/resend-webhook` and the
preview URL, with the events `email.delivered`, `email.delivery_delayed`,
`email.bounced`, `email.complained`, `email.failed`. Put each signing secret into
`RESEND_WEBHOOK_SECRET` for that Vercel environment. Without it the dialog still
shows sending progress; deliveries stay *wartet auf Rückmeldung*. Preview
deployments behind Vercel deployment protection need a protection bypass for the
webhook, or use a stable staging domain.

GitHub: repository secret `SUPABASE_ACCESS_TOKEN`, repository variable
`STAGING_PROJECT_REF` (a variable, or a secret — both work), and an Environment `production` holding its own
`SUPABASE_ACCESS_TOKEN` secret (add a required reviewer there if production
migrations should wait for approval).

## Local development

```bash
cd apps/web
npx tsx dev-api.mts          # real API handlers on :3001, against staging
npx vite --config vite.config.local.ts   # UI on :5173, /api proxied to :3001
```

`npx vercel dev` also works once the project is linked
(`npx vercel link --yes --scope arudaev-projects --project kaffeelisten`); it
pulls the Development variables, which point at staging.
