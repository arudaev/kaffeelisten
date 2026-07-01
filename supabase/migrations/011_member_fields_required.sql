-- Migration: 011_member_fields_required
-- Makes member identity fields mandatory now that Phase 2 sends each member a
-- personal monthly statement — a member with no work email cannot be reached.
--
-- ORDERING — IMPORTANT:
--   work_email is currently nullable and the demo data leaves some rows NULL.
--   Setting NOT NULL fails if any NULL remains. Run this migration only AFTER
--   the demo data has been cleared (supabase/maintenance/clear_demo_data.sql)
--   OR after every existing member has been given a work_email. See the runbook
--   in docs/phase-2-production.md §Migration order.
--
-- The matching front-end change (Vorname / Nachname / Arbeits-E-Mail / Unternehmen
-- all required in the "Mitarbeitende hinzufügen" form) ships in the same phase;
-- this migration is the server-side guarantee so the constraint cannot be
-- bypassed via the REST API.

-- Guard: refuse to apply while NULL work_email rows still exist, with a clear
-- message instead of a raw constraint-violation error.
do $$
declare
  n_null int;
begin
  select count(*) into n_null from public.members where work_email is null;
  if n_null > 0 then
    raise exception
      'Cannot enforce members.work_email NOT NULL: % member(s) still have a NULL work_email. Clear demo data or backfill emails first (see docs/phase-2-production.md).',
      n_null;
  end if;
end $$;

alter table public.members
  alter column work_email set not null;

-- name was already NOT NULL in 001; no change needed. company_id is NOT NULL
-- with an FK in 001. This migration's sole job is the work_email guarantee.

comment on column public.members.work_email is
  'Work email — required since Phase 2 (used to deliver per-member monthly statements).';
