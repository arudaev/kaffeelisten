-- ─────────────────────────────────────────────────────────────────────────────
-- Kaffeelisten — clear demo / hackathon data
-- File: supabase/maintenance/clear_demo_data.sql
--
-- Wipes ALL operational data (companies, members, items, live + archived
-- transactions) so the project can be re-seeded with the real ITC1 campus
-- companies, members, items and prices for the internal demo.
--
-- What it does NOT touch:
--   • schema / tables / RLS policies / grants
--   • app_settings (admin PIN hash, CEO email, recipients, toggles) — config survives
--
-- This is destructive and irreversible. There is no automatic backup.
-- BEFORE RUNNING: export anything worth keeping
--   (e.g. `select * from transactions_archive` → CSV).
--
-- How to run (pick one):
--   • Supabase Studio → SQL Editor → paste → Run
--   • psql "$SUPABASE_DB_URL" -f supabase/maintenance/clear_demo_data.sql
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- TRUNCATE all data tables together so FK dependencies don't block the order.
-- CASCADE is included as a safety net for any FK we might add later.
truncate table
  transactions,
  transactions_archive,
  members,
  items,
  companies
cascade;

-- Sanity check — every data table must be empty after this runs.
do $$
declare
  n int;
begin
  select
    (select count(*) from companies)
  + (select count(*) from members)
  + (select count(*) from items)
  + (select count(*) from transactions)
  + (select count(*) from transactions_archive)
  into n;
  if n <> 0 then
    raise exception 'clear_demo_data: expected 0 rows across data tables, found %', n;
  end if;
  raise notice 'clear_demo_data: all data tables empty. Ready for production seed.';
end $$;

commit;

-- Next steps:
--   1. Seed real data — fill in supabase/seed_production.template.sql and run it.
--   2. Apply migration 011 to lock members.work_email NOT NULL.
--   See docs/phase-2-production.md §Migration order.
