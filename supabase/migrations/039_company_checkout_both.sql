-- Migration 039: mixed checkout — named people AND a shared company account.
--
-- deploy: pre
--
-- ITC1, PBI and Level51 have both named rows and unnamed rows on the paper tally
-- sheet. 'company' (migration 034) removes the person step entirely; 'both'
-- keeps it and adds a "Für die Firma buchen" tile that books on the company's
-- house account. Everything the house account books is billed to the company,
-- so the admin API only allows 'both' (like 'company') for company_paid
-- companies with a billing contact (documentMatrix.ts companyConfigError).
--
-- Additive: the old bundle never sends 'both', and log_order / register_member
-- already only refuse 'company', so named people in a 'both' company keep working.

alter table public.companies
  drop constraint if exists companies_checkout_mode_check;
alter table public.companies
  add constraint companies_checkout_mode_check check (checkout_mode in ('member', 'company', 'both'));

comment on column public.companies.checkout_mode is
  'member = people pick their name; company = shared account only, no person step; both = people plus a shared account (039).';

-- log_company_order: accept 'both'. Body identical to migration 034 apart from
-- the checkout guard; `create or replace` keeps the grants from migration 038.
create or replace function public.log_company_order(p_company_id uuid, p_items jsonb)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_active boolean;
  v_checkout   text;
  v_member_id  uuid;
  v_max        int;
  v_total      int := 0;
  v_item       jsonb;
  v_item_id    uuid;
  v_qty        int;
  v_item_active boolean;
  v_ids        uuid[];
begin
  select active, checkout_mode into v_company_active, v_checkout
    from companies where id = p_company_id;
  if v_company_active is null then
    raise exception 'unknown_company' using errcode = 'P0001';
  end if;
  if not v_company_active then
    raise exception 'inactive_company' using errcode = 'P0001';
  end if;
  if v_checkout not in ('company', 'both') then
    raise exception 'member_checkout_required' using errcode = 'P0001';
  end if;

  select id into v_member_id
    from members
   where company_id = p_company_id and kind = 'house' and active = true;
  if v_member_id is null then
    raise exception 'no_house_account' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_item_id := (v_item->>'item_id')::uuid;
    v_qty     := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'bad_quantity' using errcode = 'P0001';
    end if;
    select active into v_item_active from items where id = v_item_id;
    if v_item_active is null then
      raise exception 'unknown_item' using errcode = 'P0001';
    end if;
    if not v_item_active then
      raise exception 'inactive_item' using errcode = 'P0001';
    end if;
    v_total := v_total + v_qty;
  end loop;

  select max_items_per_order into v_max from app_settings where id = 1;
  if v_max is not null and v_total > v_max then
    raise exception 'over_limit' using errcode = 'P0001';
  end if;

  with ins as (
    insert into transactions (member_id, company_id, item_id, quantity, unit_price_cents, logged_at)
    select v_member_id, p_company_id, i.id, (e->>'quantity')::int, i.price_cents, now()
    from jsonb_array_elements(p_items) e
    join items i on i.id = (e->>'item_id')::uuid
    returning id
  )
  select array_agg(id) into v_ids from ins;

  return v_ids;
end;
$$;
