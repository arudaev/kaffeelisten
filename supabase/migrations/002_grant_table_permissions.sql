-- Migration: 002_grant_table_permissions
-- Grant table-level privileges to the anon and authenticated roles.
-- RLS policies alone are not sufficient — Postgres requires explicit GRANT
-- before RLS is evaluated. Without these, PostgREST returns 401 for all
-- anon requests even when a valid SELECT policy exists.

-- Anon (browser client via VITE_SUPABASE_ANON_KEY)
grant select on public.companies  to anon;
grant select on public.members    to anon;
grant select on public.items      to anon;
grant select on public.transactions to anon;
grant insert on public.transactions to anon;

-- Authenticated (future use — same read surface as anon for now)
grant select on public.companies  to authenticated;
grant select on public.members    to authenticated;
grant select on public.items      to authenticated;
grant select on public.transactions to authenticated;
grant insert on public.transactions to authenticated;

-- Service role bypasses RLS and needs no explicit grant.
