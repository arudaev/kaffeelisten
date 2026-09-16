-- Migration 032: transactions_archive is permanent.
--
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
-- DEPLOY ORDER: ship the report.ts change that stops deleting from the archive
-- BEFORE applying this migration. Applied first, the still-deployed old code's
-- archive delete would fail with "permission denied" and abort the monthly run
-- after the reports were already sent.
--
-- Why an explicit revoke and not just "never granting it": no migration ever
-- granted DELETE on this table, yet the old delete worked, because Supabase's
-- project bootstrap grants ALL on public tables to service_role. Omitting a grant
-- therefore protects nothing; only a revoke does.

revoke delete on public.transactions_archive from service_role;
revoke delete on public.transactions_archive from anon, authenticated;

comment on table public.transactions_archive is
  'Permanent record of reported transactions. Never pruned; DELETE revoked from every API role (migration 032).';
