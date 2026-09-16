-- Migration 040: post-deploy hardening for Phase 3.
--
-- deploy: post
--
-- Apply only after PR #41 (migrations 030-039 and the code that stops pruning the
-- archive) is live in production AND the iPads have loaded the new bundle.
-- Applied earlier: the old report code's archive delete fails with "permission
-- denied" after the reports were sent, and old iPad bundles that select * from
-- companies can no longer list companies.

-- ── 1. transactions_archive is permanent ─────────────────────────────────────
-- Until now the monthly run trimmed transactions_archive to a ~90-day window "to
-- stay within Supabase free-tier storage" (pruneOldTransactions in
-- api/_lib/report.ts). That destroyed all history after two to three months:
-- the archive is the only record of reported months once the live table is
-- pruned, migration 025 names it half of the billing audit trail, and §14b UStG
-- requires invoice copies to be retained for eight years. At ITC1's volume
-- (~2,400 rows a month, a few MB a year) storage was never the real constraint.
--
-- The code no longer deletes from the archive. This revoke makes that a
-- database guarantee rather than a convention.
--
-- Why an explicit revoke and not just "never granting it": no migration ever
-- granted DELETE on this table, yet the old delete worked, because Supabase's
-- project bootstrap grants ALL on public tables to service_role. Omitting a grant
-- therefore protects nothing; only a revoke does.

revoke delete on public.transactions_archive from service_role;
revoke delete on public.transactions_archive from anon, authenticated;

comment on table public.transactions_archive is
  'Permanent record of reported transactions. Never pruned; DELETE revoked from every API role (migration 040).';

-- ── 2. The public key reads only what the company picker needs ───────────────
-- Until now anon held table-level SELECT on companies, which exposed
-- billing_contact_email, billing_contact_name and billing_notes (migration 023)
-- to anyone with the key shipped in the web bundle. The iPad selects exactly
-- these columns since PR #41 (MemberFlow.tsx COMPANY_PUBLIC_COLS).
revoke select on public.companies from anon, authenticated;
grant select (id, name, active, checkout_mode) on public.companies to anon;
