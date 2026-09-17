-- One sorted line per schema fact in `public`: columns, constraints, indexes,
-- functions, policies, RLS flags and API-role grants. Used by
-- scripts/db/schema-drift.sh to compare a live project with a database built
-- from supabase/migrations. Read-only.
--
-- Reads pg_catalog only: information_schema filters rows by the caller's own
-- privileges, so a read-only role would see an incomplete schema.
\pset format unaligned
\pset tuples_only on
with rels as (
  select c.oid, c.relname, c.relkind, c.relrowsecurity, c.relacl
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'p')
), facts as (
  select 'column ' || r.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
         || case when a.attnotnull then ' not null' else '' end
         || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '') as fact
    from rels r
    join pg_attribute a on a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid = r.oid and d.adnum = a.attnum
  union all
  select 'constraint ' || r.relname || ' ' || con.conname || ' ' || pg_get_constraintdef(con.oid)
    from pg_constraint con join rels r on r.oid = con.conrelid
  union all
  select 'index ' || i.relname || ' ' || pg_get_indexdef(i.oid)
    from pg_index x join pg_class i on i.oid = x.indexrelid join rels r on r.oid = x.indrelid
  union all
  select 'function ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') '
         || case when p.prosecdef then 'security definer' else 'invoker' end
         || ' md5:' || md5(p.prosrc)
    from pg_proc p where p.pronamespace = 'public'::regnamespace
  union all
  select 'policy ' || r.relname || '.' || pol.polname || ' ' || pol.polcmd::text || ' '
         || coalesce((select string_agg(case when role_oid = 0 then 'public' else pg_get_userbyid(role_oid) end, ',' order by 1)
                        from unnest(pol.polroles) as role_oid), '')
         || ' using ' || coalesce(pg_get_expr(pol.polqual, pol.polrelid), '-')
         || ' check ' || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '-')
    from pg_policy pol join rels r on r.oid = pol.polrelid
  union all
  select 'rls ' || relname || ' ' || relrowsecurity::text from rels where relkind = 'r'
  union all
  select 'grant ' || r.relname || ' ' || pg_get_userbyid(acl.grantee) || ' ' || acl.privilege_type
    from rels r, aclexplode(r.relacl) acl
   where acl.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated', 'service_role'))
  union all
  select 'grant function ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') '
         || pg_get_userbyid(acl.grantee)
    from pg_proc p, aclexplode(p.proacl) acl
   where p.pronamespace = 'public'::regnamespace
     and acl.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated', 'service_role'))
)
select distinct fact from facts order by fact;
