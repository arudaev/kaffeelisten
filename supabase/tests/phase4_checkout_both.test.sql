-- Migration 039: a 'both' company books named people AND its shared account.
-- Self-contained and rolled back, like phase3_guards.test.sql.

begin;

insert into items (id, name, price_cents, category, active)
values ('00000000-0000-0000-0000-00000000e039', 'Espresso', 50, 'coffee', true);
insert into companies (id, name, active, billing_mode, billing_contact_email, checkout_mode)
values ('00000000-0000-0000-0000-00000000c039', 'ITC1 both', true, 'company_paid', 'office@itc1.example.com', 'both');
insert into members (id, company_id, name, work_email, active)
values ('00000000-0000-0000-0000-00000000a039', '00000000-0000-0000-0000-00000000c039', 'Alex Rudaev', 'alex@example.com', true);
select ensure_house_member('00000000-0000-0000-0000-00000000c039');

set role anon;

do $$
declare v_ids uuid[]; n int;
begin
  -- The person picker still hides the house account but shows the person.
  select count(*) into n from members where company_id = '00000000-0000-0000-0000-00000000c039';
  if n <> 1 then raise exception '039 RLS: expected only the person to be visible, saw %', n; end if;

  -- The shared account books.
  v_ids := log_company_order('00000000-0000-0000-0000-00000000c039',
                             '[{"item_id":"00000000-0000-0000-0000-00000000e039","quantity":2}]');
  if coalesce(array_length(v_ids, 1), 0) <> 1 then raise exception '039: shared account did not book'; end if;

  -- And the named person books for themselves.
  v_ids := log_order('00000000-0000-0000-0000-00000000a039',
                     '[{"item_id":"00000000-0000-0000-0000-00000000e039","quantity":1}]');
  if coalesce(array_length(v_ids, 1), 0) <> 1 then raise exception '039: person in a both-company could not book'; end if;

  -- People can still register themselves.
  perform register_member('00000000-0000-0000-0000-00000000c039', 'Neu', 'neu@example.com');
  raise notice 'ok  039 both: shared account and people book, registration open';
end $$;

reset role;

do $$
begin
  begin
    update companies set checkout_mode = 'everyone' where id = '00000000-0000-0000-0000-00000000c039';
    raise exception '039: invalid checkout_mode accepted';
  exception when check_violation then null;
  end;
  raise notice 'ok  039 checkout_mode constraint';
end $$;

rollback;
