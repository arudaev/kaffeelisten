-- Migration 017: validated write RPCs for the anonymous member flow.
--
-- Migration 015 left the anon INSERT paths (transactions, self-registration)
-- table-scoped but unvalidated: quantity had no bound, logged_at/company_id were
-- client-supplied and forgeable, member↔company links were unchecked, and
-- inactive items could be charged. This replaces those raw inserts with three
-- SECURITY DEFINER functions that validate everything server-side, and revokes
-- the direct anon INSERTs so the RPCs are the ONLY write path.
--
-- The functions run as their owner (which bypasses RLS on these tables), so they
-- keep working after the anon INSERT grants are revoked. EXECUTE is granted to
-- anon (the member flow calls them via PostgREST rpc()).
--
-- These also enable: server-side enforcement of app_settings.max_items_per_order,
-- and a real "Rückgängig" (undo) that deletes the just-logged rows — anon has no
-- direct DELETE, so undo must go through undo_order().

-- ── log_order ────────────────────────────────────────────────────────────────
-- Validates the member, each line item, and the per-order cap, then inserts the
-- transactions with a server-derived company_id and timestamp. Returns the new
-- transaction ids so the client can offer an undo.
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

  with ins as (
    insert into transactions (member_id, company_id, item_id, quantity, logged_at)
    select p_member_id, v_company_id, (e->>'item_id')::uuid, (e->>'quantity')::int, now()
    from jsonb_array_elements(p_items) e
    returning id
  )
  select array_agg(id) into v_ids from ins;

  return v_ids;
end;
$$;

-- ── undo_order ───────────────────────────────────────────────────────────────
-- Deletes the given transactions, but ONLY rows logged within the last 10 minutes
-- and matching the exact ids. The ids are unguessable UUIDs returned by
-- log_order, so knowing them is the capability. Returns the number deleted.
create or replace function public.undo_order(p_ids uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if p_ids is null or array_length(p_ids, 1) is null then
    return 0;
  end if;
  delete from transactions
   where id = any(p_ids)
     and logged_at > now() - interval '10 minutes';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── register_member ──────────────────────────────────────────────────────────
-- Self-registration. Validates the company (must exist + be active), the name,
-- and the email, then inserts the member. Returns only the non-PII columns the
-- member flow needs (never echoes work_email back to the anon client).
create or replace function public.register_member(p_company_id uuid, p_name text, p_email text)
returns table (id uuid, name text, company_id uuid, active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_active boolean;
  v_name  text := btrim(p_name);
  v_email text := btrim(p_email);
  v_id    uuid;
begin
  select active into v_company_active from companies where companies.id = p_company_id;
  if v_company_active is null then
    raise exception 'unknown_company' using errcode = 'P0001';
  end if;
  if not v_company_active then
    raise exception 'inactive_company' using errcode = 'P0001';
  end if;
  if length(v_name) = 0 or length(v_name) > 120 then
    raise exception 'bad_name' using errcode = 'P0001';
  end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email) > 120 then
    raise exception 'bad_email' using errcode = 'P0001';
  end if;

  insert into members (company_id, name, work_email, active)
    values (p_company_id, v_name, v_email, true)
    returning members.id into v_id;

  return query
    select m.id, m.name, m.company_id, m.active from members m where m.id = v_id;
end;
$$;

-- NOTE: this migration is additive — it does NOT yet revoke the direct anon
-- INSERTs. That happens in migration 018, which must be applied only AFTER the
-- app code that calls these RPCs is deployed. Splitting the two avoids a
-- member-write outage during the deploy window (the lesson from 015).

-- ── EXECUTE grants ───────────────────────────────────────────────────────────
revoke execute on function public.log_order(uuid, jsonb)               from public;
revoke execute on function public.undo_order(uuid[])                   from public;
revoke execute on function public.register_member(uuid, text, text)    from public;

grant execute on function public.log_order(uuid, jsonb)                to anon, authenticated;
grant execute on function public.undo_order(uuid[])                    to anon, authenticated;
grant execute on function public.register_member(uuid, text, text)     to anon, authenticated;
