-- Runs first, on a database built from migrations only, with no seed applied.
-- Proves rule 2 in docs/environments.md: everything production needs in order to
-- start is created by a migration, never by a seed file.

do $$
declare
  fn text;
begin
  if not exists (select 1 from public.app_settings where id = 1) then
    raise exception 'bare schema: app_settings singleton row is missing (must come from a migration)';
  end if;

  foreach fn in array array[
    'log_order', 'log_company_order', 'undo_order', 'register_member', 'confirm_member_email',
    'ensure_house_member', 'next_billing_document_number', 'prune_reported_transactions',
    'verify_admin_pin', 'set_admin_pin'
  ] loop
    if not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = fn
    ) then
      raise exception 'bare schema: function public.% is missing', fn;
    end if;
  end loop;

  if exists (select 1 from public.companies) or exists (select 1 from public.members)
     or exists (select 1 from public.transactions) then
    raise exception 'bare schema: a migration inserted tenant data; that belongs in a seed';
  end if;

  raise notice 'ok  bare schema has settings and RPCs, and no tenant data';
end $$;
