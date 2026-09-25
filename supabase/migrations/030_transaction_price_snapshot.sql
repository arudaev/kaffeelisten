-- Migration 030: snapshot the unit price onto every transaction at checkout.
--
-- deploy: pre
--
-- Amounts were always derived by joining transactions to the CURRENT
-- items.price_cents (report.ts fetchAndEnrich, api/admin/payments.ts). Changing a
-- price therefore silently rewrote every past month's totals, and a re-sent
-- invoice could no longer be reproduced to match the one originally issued.
--
-- The price is now written onto the row when the order is logged, and every
-- reader prefers it (api/_lib/pricing.ts priceOf). The column is nullable: rows
-- logged before this migration carry NULL and fall back to the catalogue price,
-- exactly as before. Migration 031 extends the same snapshot to the archive.
--
-- log_order is replaced with an IDENTICAL signature, so the EXECUTE grants from
-- migration 017 are preserved by CREATE OR REPLACE and no grant churn is needed.
-- The body is migration 017's verbatim except for the insert, which now reads the
-- item's price in the same transaction the line was validated in.

alter table public.transactions
  add column if not exists unit_price_cents integer
    check (unit_price_cents is null or unit_price_cents >= 0);

comment on column public.transactions.unit_price_cents is
  'Item price at checkout (cents). NULL for rows logged before migration 030; readers fall back to items.price_cents.';

create or replace function public.log_order(p_member_id uuid, p_items jsonb)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_active     boolean;
  v_max        int;
  v_total      int := 0;
  v_item       jsonb;
  v_item_id    uuid;
  v_qty        int;
  v_item_active boolean;
  v_ids        uuid[];
begin
  -- Member must exist and be active; company is derived from it (never trusted
  -- from the client).
  select company_id, active into v_company_id, v_active
    from members where id = p_member_id;
  if v_company_id is null then
    raise exception 'unknown_member' using errcode = 'P0001';
  end if;
  if not v_active then
    raise exception 'inactive_member' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order' using errcode = 'P0001';
  end if;

  -- Validate each line and accumulate the total quantity.
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

  -- Enforce the admin-configured per-order cap (NULL = unlimited).
  select max_items_per_order into v_max from app_settings where id = 1;
  if v_max is not null and v_total > v_max then
    raise exception 'over_limit' using errcode = 'P0001';
  end if;

  -- The join reads each item's price inside the same transaction that validated
  -- it, so the snapshot is exactly the price the member saw at checkout.
  with ins as (
    insert into transactions (member_id, company_id, item_id, quantity, unit_price_cents, logged_at)
    select p_member_id, v_company_id, i.id, (e->>'quantity')::int, i.price_cents, now()
    from jsonb_array_elements(p_items) e
    join items i on i.id = (e->>'item_id')::uuid
    returning id
  )
  select array_agg(id) into v_ids from ins;

  return v_ids;
end;
$$;
