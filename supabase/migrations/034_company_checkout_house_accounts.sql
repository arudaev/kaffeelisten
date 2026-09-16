-- Migration 034: company-level checkout via a house account.
--
-- Some tenants (4process first) will not register individuals: everyone books on
-- one shared account and the company is billed as a unit. The member flow for
-- such a company skips "Wer bist du?" entirely.
--
-- WHY A HOUSE MEMBER, NOT A NULLABLE transactions.member_id
-- transactions.member_id is NOT NULL with a foreign key, and every consumer groups
-- on it: report enrichment and summaries, archiving, the paid grid, the live-table
-- prune. Making it nullable would ripple through all of them. Instead each
-- company-checkout company owns exactly one hidden member row of kind 'house',
-- and its transactions book against that. None of the consumers change.
--
-- WHAT THIS ENFORCES
--   • members.kind        'person' (default) | 'house'
--   • a person still MUST have a work email (the migration 011 guarantee), now as
--     a check constraint; only a house account may have none — it has no inbox
--   • at most one house account per company
--   • companies.checkout_mode 'member' (default) | 'company'
--   • house accounts are invisible to the anonymous member flow
--   • log_company_order: the only way to book against a house account
--   • log_order refuses house accounts and company-checkout companies
--   • register_member refuses company-checkout companies (no person step exists)
--   • ensure_house_member: idempotent provisioning for the admin API
--
-- The same rules are mirrored as tested TypeScript predicates in
-- api/_lib/documentMatrix.ts and enforced again in api/admin/data.ts, because
-- this repository has no SQL test harness.
--
-- DEPLOY ORDER: purely additive for existing callers — log_order and
-- register_member keep their signatures and grants, and no existing company is in
-- 'company' mode. Apply before deploying the code that reads members.kind and
-- companies.checkout_mode.

-- ── Columns ──────────────────────────────────────────────────────────────────

alter table public.members
  add column if not exists kind text not null default 'person';

alter table public.members
  drop constraint if exists members_kind_check;
alter table public.members
  add constraint members_kind_check check (kind in ('person', 'house'));

-- Relax migration 011's NOT NULL without losing its guarantee for real people.
alter table public.members
  alter column work_email drop not null;
alter table public.members
  drop constraint if exists members_work_email_required;
alter table public.members
  add constraint members_work_email_required check (work_email is not null or kind = 'house');

create unique index if not exists members_one_house_per_company_uidx
  on public.members (company_id) where kind = 'house';

alter table public.companies
  add column if not exists checkout_mode text not null default 'member';

alter table public.companies
  drop constraint if exists companies_checkout_mode_check;
alter table public.companies
  add constraint companies_checkout_mode_check check (checkout_mode in ('member', 'company'));

comment on column public.members.kind is
  'person = a registered individual; house = the hidden shared account of a company-checkout company.';
comment on column public.companies.checkout_mode is
  'member = pick your name at checkout; company = everyone books on the company house account.';

-- ── Anonymous read: never show a house account in the name picker ─────────────

drop policy if exists anon_read_members_public on public.members;
create policy anon_read_members_public on public.members
  for select to anon
  using (active = true and kind = 'person');

-- The policy references `kind`; granting it keeps the column visible to the
-- role evaluating the policy. It is not personal data.
grant select (kind) on public.members to anon, authenticated;

-- ── log_order: persons in member-checkout companies only ─────────────────────
-- Body is migration 030's (price snapshot) plus the two new guards.

create or replace function public.log_order(p_member_id uuid, p_items jsonb)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_active     boolean;
  v_kind       text;
  v_checkout   text;
  v_max        int;
  v_total      int := 0;
  v_item       jsonb;
  v_item_id    uuid;
  v_qty        int;
  v_item_active boolean;
  v_ids        uuid[];
begin
  select m.company_id, m.active, m.kind, c.checkout_mode
    into v_company_id, v_active, v_kind, v_checkout
    from members m
    join companies c on c.id = m.company_id
   where m.id = p_member_id;
  if v_company_id is null then
    raise exception 'unknown_member' using errcode = 'P0001';
  end if;
  if not v_active then
    raise exception 'inactive_member' using errcode = 'P0001';
  end if;
  -- A house account is booked only through log_company_order.
  if v_kind = 'house' then
    raise exception 'house_account_member' using errcode = 'P0001';
  end if;
  -- A company-checkout company books everything on its house account.
  if v_checkout = 'company' then
    raise exception 'company_checkout_only' using errcode = 'P0001';
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
    select p_member_id, v_company_id, i.id, (e->>'quantity')::int, i.price_cents, now()
    from jsonb_array_elements(p_items) e
    join items i on i.id = (e->>'item_id')::uuid
    returning id
  )
  select array_agg(id) into v_ids from ins;

  return v_ids;
end;
$$;

-- ── log_company_order: book on a company's house account ─────────────────────

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
  if v_checkout <> 'company' then
    raise exception 'member_checkout_required' using errcode = 'P0001';
  end if;

  select id into v_member_id
    from members
   where company_id = p_company_id and kind = 'house' and active = true;
  if v_member_id is null then
    -- Provisioned by the admin API when the company is switched to company
    -- checkout. Refuse rather than create one from an anonymous request.
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

revoke execute on function public.log_company_order(uuid, jsonb) from public;
grant  execute on function public.log_company_order(uuid, jsonb) to anon, authenticated;

-- ── register_member: no self-registration into a company-checkout company ────
-- Body is migration 017's plus the checkout guard.

create or replace function public.register_member(p_company_id uuid, p_name text, p_email text)
returns table (id uuid, name text, company_id uuid, active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_active boolean;
  v_checkout text;
  v_name  text := btrim(p_name);
  v_email text := btrim(p_email);
  v_id    uuid;
begin
  select companies.active, companies.checkout_mode into v_company_active, v_checkout
    from companies where companies.id = p_company_id;
  if v_company_active is null then
    raise exception 'unknown_company' using errcode = 'P0001';
  end if;
  if not v_company_active then
    raise exception 'inactive_company' using errcode = 'P0001';
  end if;
  if v_checkout = 'company' then
    raise exception 'registration_disabled' using errcode = 'P0001';
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

-- ── ensure_house_member: idempotent provisioning (admin API only) ─────────────

create or replace function public.ensure_house_member(p_company_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from companies where id = p_company_id) then
    raise exception 'unknown_company' using errcode = 'P0001';
  end if;

  select id into v_id from members where company_id = p_company_id and kind = 'house';
  if v_id is null then
    insert into members (company_id, name, work_email, kind, active)
      values (p_company_id, 'Sammelkonto', null, 'house', true)
      returning id into v_id;
  else
    update members set active = true where id = v_id and active = false;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.ensure_house_member(uuid) from public;
grant  execute on function public.ensure_house_member(uuid) to service_role;
