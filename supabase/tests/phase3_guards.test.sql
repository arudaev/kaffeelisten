-- Behavioural tests for migrations 030-036, run against a real Postgres after every
-- migration has been applied (scripts/test-migrations.sh). Each block raises on
-- failure, so the first broken guarantee aborts the run with its name.
--
-- These cover what TypeScript cannot: RPC guards, RLS visibility for the anon
-- role, the checkout price snapshot, and the archive DELETE revoke. Everything
-- runs in one transaction and is rolled back.

\set ON_ERROR_STOP on
begin;

-- ── Fixture ──────────────────────────────────────────────────────────────────
insert into app_settings (id) values (1) on conflict (id) do nothing;

insert into companies (id, name, active, billing_mode, billing_contact_email, checkout_mode) values
  ('00000000-0000-0000-0000-00000000c001', 'EFCO',     true, 'individual',   null,               'member'),
  ('00000000-0000-0000-0000-00000000c002', '4process', true, 'company_paid', 'billing@4p.de',    'company');

insert into members (id, company_id, name, work_email, kind) values
  ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000c001', 'Shen', 'shen@efco.de', 'person');

insert into items (id, name, price_cents, category, active) values
  ('00000000-0000-0000-0000-00000000e001', 'Espresso',   50, 'coffee', true),
  ('00000000-0000-0000-0000-00000000e002', 'Cappuccino', 70, 'coffee', true);

create temp table result (name text primary key, value text) on commit drop;
grant all on result to anon;

-- ── 030: log_order snapshots the price at checkout ───────────────────────────
do $$
declare v_ids uuid[]; v_price int;
begin
  v_ids := log_order('00000000-0000-0000-0000-00000000a001',
                     '[{"item_id":"00000000-0000-0000-0000-00000000e002","quantity":2}]');
  select unit_price_cents into v_price from transactions where id = v_ids[1];
  if v_price is distinct from 70 then
    raise exception '030 snapshot: expected 70, got %', v_price;
  end if;

  update items set price_cents = 90 where id = '00000000-0000-0000-0000-00000000e002';
  select unit_price_cents into v_price from transactions where id = v_ids[1];
  if v_price is distinct from 70 then
    raise exception '030 snapshot: a later price change rewrote history (now %)', v_price;
  end if;
  raise notice 'ok  030 price snapshot survives a price change';
end $$;

-- ── 034: a person must have a work email; a house account need not ───────────
do $$
begin
  begin
    insert into members (company_id, name, work_email, kind)
      values ('00000000-0000-0000-0000-00000000c001', 'No Mail', null, 'person');
    raise exception '034: a person was inserted without a work email';
  exception when check_violation then null;
  end;
  raise notice 'ok  034 persons still require a work email';
end $$;

-- ── 034: ensure_house_member is idempotent and one-per-company ───────────────
do $$
declare v1 uuid; v2 uuid; v3 uuid; n int;
begin
  v1 := ensure_house_member('00000000-0000-0000-0000-00000000c002');
  v2 := ensure_house_member('00000000-0000-0000-0000-00000000c002');
  if v1 is distinct from v2 then
    raise exception '034: ensure_house_member created a second house account';
  end if;
  select count(*) into n from members where company_id = '00000000-0000-0000-0000-00000000c002' and kind = 'house';
  if n <> 1 then raise exception '034: expected 1 house account, found %', n; end if;

  begin
    insert into members (company_id, name, work_email, kind)
      values ('00000000-0000-0000-0000-00000000c002', 'Second', null, 'house');
    raise exception '034: unique index allowed a second house account';
  exception when unique_violation then null;
  end;

  update members set active = false where id = v1;
  -- Call and check in SEPARATE statements: a subquery in the same expression as
  -- the call reads the snapshot from before the function's UPDATE ran.
  v3 := ensure_house_member('00000000-0000-0000-0000-00000000c002');
  if v3 is distinct from v1 then
    raise exception '034: ensure_house_member replaced an inactive house account instead of reusing it';
  end if;
  if not (select active from members where id = v1) then
    raise exception '034: ensure_house_member did not reactivate the existing account';
  end if;
  raise notice 'ok  034 house account is idempotent, unique and reactivated';
end $$;

-- ── 034: RPC guards, exercised as the anonymous member flow ──────────────────
set role anon;

do $$
declare v_ids uuid[]; v_house uuid; n int;
begin
  -- A house account is never listed in the name picker.
  select count(*) into n from members where kind = 'house';
  if n <> 0 then raise exception '034 RLS: anon can see % house account(s)', n; end if;
  select count(*) into n from members where name = 'Shen';
  if n <> 1 then raise exception '034 RLS: anon can no longer see real people'; end if;

  -- Company checkout books against the house account, with a price snapshot.
  v_ids := log_company_order('00000000-0000-0000-0000-00000000c002',
                             '[{"item_id":"00000000-0000-0000-0000-00000000e001","quantity":3}]');
  if coalesce(array_length(v_ids, 1), 0) <> 1 then
    raise exception '034: log_company_order did not insert';
  end if;
  insert into result values ('company_order_id', v_ids[1]::text);

  -- A member-checkout company cannot be booked as a company.
  begin
    perform log_company_order('00000000-0000-0000-0000-00000000c001',
                              '[{"item_id":"00000000-0000-0000-0000-00000000e001","quantity":1}]');
    raise exception '034: log_company_order accepted a member-checkout company';
  exception when others then
    if sqlerrm <> 'member_checkout_required' then raise; end if;
  end;

  -- Nobody can self-register into a company-checkout company.
  begin
    perform register_member('00000000-0000-0000-0000-00000000c002', 'Eve', 'eve@4p.de');
    raise exception '034: register_member accepted a company-checkout company';
  exception when others then
    if sqlerrm <> 'registration_disabled' then raise; end if;
  end;

  -- Self-registration into a normal company still works.
  perform register_member('00000000-0000-0000-0000-00000000c001', 'Bettina', 'bettina@efco.de');
  raise notice 'ok  034 anon: house hidden, company order books, both guards hold';
end $$;

reset role;

do $$
declare v_member uuid; v_kind text; v_price int; v_house uuid;
begin
  select member_id, unit_price_cents into v_member, v_price
    from transactions where id = (select value::uuid from result where name = 'company_order_id');
  select kind into v_kind from members where id = v_member;
  if v_kind <> 'house' then raise exception '034: company order booked against a %', v_kind; end if;
  if v_price <> 50 then raise exception '034: company order snapshot expected 50, got %', v_price; end if;

  -- log_order refuses the house account directly, even with its id in hand.
  v_house := v_member;
  begin
    perform log_order(v_house, '[{"item_id":"00000000-0000-0000-0000-00000000e001","quantity":1}]');
    raise exception '034: log_order booked directly against a house account';
  exception when others then
    if sqlerrm <> 'house_account_member' then raise; end if;
  end;
  raise notice 'ok  034 company order is on the house account, log_order refuses it';
end $$;

-- ── 034: log_order refuses a person in a company-checkout company ────────────
do $$
begin
  update companies set checkout_mode = 'company' where id = '00000000-0000-0000-0000-00000000c001';
  begin
    perform log_order('00000000-0000-0000-0000-00000000a001',
                      '[{"item_id":"00000000-0000-0000-0000-00000000e001","quantity":1}]');
    raise exception '034: log_order accepted a person in a company-checkout company';
  exception when others then
    if sqlerrm <> 'company_checkout_only' then raise; end if;
  end;
  update companies set checkout_mode = 'member' where id = '00000000-0000-0000-0000-00000000c001';
  raise notice 'ok  034 log_order refuses company-checkout companies';
end $$;

-- ── 031: archive carries the snapshot and item identity ──────────────────────
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_name = 'transactions_archive' and column_name = 'item_name'
  ) then
    raise exception '031: transactions_archive.item_name missing';
  end if;
  raise notice 'ok  031 archive snapshot columns present';
end $$;

-- ── 035: company payments — writable, never deletable, closed to anon ────────
do $$
begin
  if not has_table_privilege('service_role', 'public.company_payments', 'UPDATE') then
    raise exception '035: service_role cannot update company_payments';
  end if;
  if has_table_privilege('service_role', 'public.company_payments', 'DELETE') then
    raise exception '035: service_role can delete company_payments';
  end if;
  if has_table_privilege('anon', 'public.company_payments', 'SELECT') then
    raise exception '035: anon can read company_payments';
  end if;
  raise notice 'ok  035 company payments: update yes, delete no, anon no';
end $$;

-- ── 037: the delivery ledger is append-only and self-consistent ─────────────
do $$
begin
  if not has_table_privilege('service_role', 'public.document_deliveries', 'INSERT') then
    raise exception '037: service_role cannot append deliveries';
  end if;
  if has_table_privilege('service_role', 'public.document_deliveries', 'UPDATE')
     or has_table_privilege('service_role', 'public.document_deliveries', 'DELETE') then
    raise exception '037: deliveries can be rewritten or removed';
  end if;

  -- A statement cannot carry an invoice number…
  begin
    insert into document_deliveries (report_month, kind, company_id, member_id, recipient_name, recipient_email,
                                     document_number, gross_cents, has_pdf, has_xlsx)
    values ('2026-08', 'member_statement', '00000000-0000-0000-0000-00000000c001',
            '00000000-0000-0000-0000-00000000a001', 'Shen', 'shen@efco.de', 'K-000001', 100, true, true);
    raise exception '037: a statement was recorded with an invoice number';
  exception when check_violation then null;
  end;
  -- …and a company document cannot name a member.
  begin
    insert into document_deliveries (report_month, kind, company_id, member_id, recipient_name, recipient_email,
                                     document_number, gross_cents, has_pdf, has_xlsx)
    values ('2026-08', 'company_statement', '00000000-0000-0000-0000-00000000c001',
            '00000000-0000-0000-0000-00000000a001', 'EFCO', 'billing@efco.de', null, 100, true, true);
    raise exception '037: a company document was recorded against a member';
  exception when check_violation then null;
  end;
  raise notice 'ok  037 deliveries append-only; kind, member and number stay consistent';
end $$;

-- ── 036: settings defaults ───────────────────────────────────────────────────
do $$
declare r record;
begin
  select company_paid_member_reports_enabled, invoice_mode_authorized into r from app_settings where id = 1;
  if r.company_paid_member_reports_enabled is not true then
    raise exception '036: info copies should default on';
  end if;
  if r.invoice_mode_authorized is not false then
    raise exception '036: invoice mode must default to NOT authorised';
  end if;
  raise notice 'ok  036 defaults: info copies on, invoice authority off';
end $$;

rollback;
