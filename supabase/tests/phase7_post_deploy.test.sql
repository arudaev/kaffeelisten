-- ── 042: the archive cannot be deleted from by any API role ──────────────────
do $$
begin
  if has_table_privilege('service_role', 'public.transactions_archive', 'DELETE') then
    raise exception '042: service_role can still DELETE from transactions_archive';
  end if;
  if has_table_privilege('anon', 'public.transactions_archive', 'DELETE') then
    raise exception '042: anon can DELETE from transactions_archive';
  end if;
  if not has_table_privilege('service_role', 'public.transactions_archive', 'INSERT') then
    raise exception '042: revoke went too far — service_role can no longer archive';
  end if;
  raise notice 'ok  042 archive DELETE revoked, INSERT kept';
end $$;

-- ── 042: anon cannot read company billing contacts ───────────────────────────
do $$
begin
  if has_column_privilege('anon', 'public.companies', 'billing_contact_email', 'select')
     or has_column_privilege('anon', 'public.companies', 'billing_notes', 'select') then
    raise exception '042: anon can read company billing contacts';
  end if;
  if not has_column_privilege('anon', 'public.companies', 'checkout_mode', 'select') then
    raise exception '042: anon lost the company picker columns';
  end if;
  raise notice 'ok  042 anon reads only the company picker columns';
end $$;
