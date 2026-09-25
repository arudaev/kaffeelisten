-- Migration 041: the Verzehrliste is opt-in per company, off by default.
-- Self-contained and rolled back.

begin;

do $$
declare v boolean;
begin
  insert into companies (id, name, active, billing_mode, billing_contact_email)
  values ('00000000-0000-0000-0000-00000000c041', 'PBI list', true, 'company_paid', 'office@pbi.example.com');
  select employee_list_enabled into v from companies where id = '00000000-0000-0000-0000-00000000c041';
  if v is distinct from false then raise exception '041: employee_list_enabled must default to false, got %', v; end if;

  begin
    update companies set employee_list_enabled = null where id = '00000000-0000-0000-0000-00000000c041';
    raise exception '041: employee_list_enabled accepted null';
  exception when not_null_violation then null;
  end;
  raise notice 'ok  041 Verzehrliste opt-in defaults to off';
end $$;

set role service_role;
update companies set employee_list_enabled = true where id = '00000000-0000-0000-0000-00000000c041';
reset role;

rollback;
