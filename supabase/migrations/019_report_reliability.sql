-- Migration 019: report reliability — run ledger + safe prune.
--
-- Two data-integrity fixes for the monthly report:
--   1. report_runs — a per-month ledger so a completed month isn't sent/archived
--      twice on a retry or accidental re-invocation (idempotency at the run level;
--      Resend idempotency keys handle the per-email layer).
--   2. prune_reported_transactions — deletes only live transactions that have
--      actually been archived, so a missed/never-reported month can never be
--      silently deleted by the rolling prune.
--
-- Both are service-role only (the report runs server-side with the service key).

-- ── report_runs ledger ───────────────────────────────────────────────────────
create table if not exists report_runs (
  report_month text primary key,                 -- e.g. "2026-05"
  status       text not null default 'running'
                 check (status in ('running', 'completed', 'failed')),
  attempts     integer not null default 0,
  last_error   text,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  updated_at   timestamptz not null default now()
);

comment on table report_runs is
  'Per-month monthly-report run ledger. Prevents duplicate sends/archival on retry. Service-role only.';

alter table report_runs enable row level security;   -- no policies → anon/authenticated denied
grant select, insert, update on public.report_runs to service_role;

-- ── prune_reported_transactions ──────────────────────────────────────────────
-- Deletes live transactions older than the cutoff, but ONLY those already copied
-- into transactions_archive. Never deletes unreported data. Returns the count.
create or replace function public.prune_reported_transactions(p_cutoff timestamptz)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from transactions t
   where t.logged_at < p_cutoff
     and exists (select 1 from transactions_archive a where a.id = t.id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.prune_reported_transactions(timestamptz) from public;
grant  execute on function public.prune_reported_transactions(timestamptz) to service_role;
