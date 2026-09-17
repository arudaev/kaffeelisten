-- Minimal stand-in for a Supabase project's bootstrap, enough to apply the
-- kaffeelisten migrations to a plain Postgres: the three API roles and
-- Supabase's default grants. Used only by scripts/test-migrations.sh — never
-- apply this to a real Supabase project, which already has all of it.

-- Roles are cluster-wide, so they survive the per-run database drop.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase grants ALL on public tables, functions and sequences to the API roles
-- by default and relies on RLS to restrict them. This is the grant that makes a
-- missing GRANT in a migration harmless and a missing REVOKE dangerous — the
-- archive DELETE revoked by migration 042 exists only because of it.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
