-- One sorted line per schema fact in `public`: columns, constraints, indexes,
-- functions, policies, RLS flags and API-role grants. Used by
-- scripts/db/schema-drift.sh to compare a live project with a database built
-- from supabase/migrations. Read-only.
\pset format unaligned
\pset tuples_only on
with facts as (
  select 'column ' || table_name || '.' || column_name || ' ' || data_type
         || case when is_nullable = 'NO' then ' not null' else '' end
         || coalesce(' default ' || column_default, '') as fact
    from information_schema.columns where table_schema = 'public'
  union all
  select 'constraint ' || conrelid::regclass || ' ' || conname || ' ' || pg_get_constraintdef(oid)
    from pg_constraint where connamespace = 'public'::regnamespace
  union all
  select 'index ' || indexname || ' ' || indexdef from pg_indexes where schemaname = 'public'
  union all
  select 'function ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') '
         || case when p.prosecdef then 'security definer' else 'invoker' end
         || ' md5:' || md5(p.prosrc)
    from pg_proc p where p.pronamespace = 'public'::regnamespace
  union all
  select 'policy ' || tablename || '.' || policyname || ' ' || cmd || ' ' || array_to_string(roles, ',')
         || ' using ' || coalesce(qual, '-') || ' check ' || coalesce(with_check, '-')
    from pg_policies where schemaname = 'public'
  union all
  select 'rls ' || relname || ' ' || relrowsecurity
    from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
  union all
  select 'grant ' || table_name || ' ' || grantee || ' ' || privilege_type
    from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
  union all
  select 'grant function ' || routine_name || ' ' || grantee
    from information_schema.role_routine_grants
   where routine_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
)
select distinct fact from facts order by fact;
