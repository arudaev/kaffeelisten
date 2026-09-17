-- Migration 038: the public (anon) key can only do what the iPad flow needs.
-- The harness bootstrap mirrors Supabase's permissive defaults, so these checks
-- prove the migrations themselves lock the schema down.

do $$
declare
  fn text;
  tbl text;
begin
  foreach fn in array array[
    'public.verify_admin_pin(text)', 'public.set_admin_pin(text)',
    'public.set_pin_reset_token(text, integer)', 'public.consume_pin_reset(text, text)',
    'public.pin_rate_consume(text, integer, integer, integer)', 'public.pin_rate_reset(text)',
    'public.set_member_email_token(uuid, text, integer)', 'public.confirm_member_email(uuid, text)',
    'public.prune_reported_transactions(timestamptz)', 'public.next_billing_document_number()',
    'public.ensure_house_member(uuid)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') or has_function_privilege('authenticated', fn, 'execute') then
      raise exception '038: % is callable with the public key', fn;
    end if;
    if not has_function_privilege('service_role', fn, 'execute') then
      raise exception '038: service_role lost execute on %', fn;
    end if;
  end loop;

  foreach fn in array array[
    'public.log_order(uuid, jsonb)', 'public.log_company_order(uuid, jsonb)',
    'public.undo_order(uuid[])', 'public.register_member(uuid, text, text)'
  ] loop
    if not has_function_privilege('anon', fn, 'execute') then
      raise exception '038: member flow can no longer call %', fn;
    end if;
  end loop;

  for tbl in select format('public.%I', relname) from pg_class
              where relnamespace = 'public'::regnamespace and relkind = 'r' loop
    if has_table_privilege('anon', tbl, 'insert') or has_table_privilege('anon', tbl, 'update')
       or has_table_privilege('anon', tbl, 'delete') or has_table_privilege('anon', tbl, 'truncate') then
      raise exception '038: anon can write to %', tbl;
    end if;
  end loop;

  if has_column_privilege('anon', 'public.members', 'work_email', 'select') then
    raise exception '038: anon can read members.work_email';
  end if;
  if not has_column_privilege('anon', 'public.members', 'kind', 'select') then
    raise exception '038: anon cannot read members.kind, which the house-account policy needs';
  end if;
  if has_table_privilege('anon', 'public.app_settings', 'select')
     or has_table_privilege('anon', 'public.billing_documents', 'select')
     or has_table_privilege('anon', 'public.transactions_archive', 'select') then
    raise exception '038: anon can read admin-only tables';
  end if;

  raise notice 'ok  038 public key limited to the member flow';
end $$;

-- A function added by a later migration without grants must stay private.
do $$
begin
  create function public.__privilege_probe() returns int language sql as 'select 1';
  if has_function_privilege('anon', 'public.__privilege_probe()', 'execute') then
    raise exception '038: new functions are executable by anon by default';
  end if;
  drop function public.__privilege_probe();
  raise notice 'ok  038 new functions are private by default';
end $$;
