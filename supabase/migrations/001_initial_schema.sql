-- Kaffeelisten — initial schema
-- Migration: 001_initial_schema

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Companies
-- ─────────────────────────────────────────────
create table if not exists companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table companies is 'Organizations that lease space at ITC1 campus.';

-- ─────────────────────────────────────────────
-- Members
-- ─────────────────────────────────────────────
create table if not exists members (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id),
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table members is 'Individuals who work at a company on campus.';

create index if not exists members_company_id_idx on members(company_id);

-- ─────────────────────────────────────────────
-- Items
-- ─────────────────────────────────────────────
create table if not exists items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  unit_label   text not null default 'Stück',
  price_cents  integer not null default 0 check (price_cents >= 0),
  category     text not null default 'other'
                 check (category in ('coffee', 'drink', 'snack', 'food', 'other')),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

comment on table items is 'Consumables available on campus (coffee, drinks, snacks).';

-- ─────────────────────────────────────────────
-- Transactions (live — current month)
-- ─────────────────────────────────────────────
create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id),
  company_id  uuid not null references companies(id),
  item_id     uuid not null references items(id),
  quantity    integer not null default 1 check (quantity > 0),
  logged_at   timestamptz not null default now()
);

comment on table transactions is
  'Live consumption log for the current month. Archived and cleared at month-end.';

create index if not exists transactions_company_id_idx   on transactions(company_id);
create index if not exists transactions_member_id_idx    on transactions(member_id);
create index if not exists transactions_logged_at_idx    on transactions(logged_at);

-- ─────────────────────────────────────────────
-- Transactions archive (immutable historical record)
-- ─────────────────────────────────────────────
create table if not exists transactions_archive (
  id            uuid not null,
  member_id     uuid not null,
  company_id    uuid not null,
  item_id       uuid not null,
  quantity      integer not null,
  logged_at     timestamptz not null,
  archived_at   timestamptz not null default now(),
  report_month  text not null,            -- e.g. "2026-05"
  primary key (id, report_month)
);

comment on table transactions_archive is
  'Immutable copy of transactions after each monthly report. Never modified after insert.';

create index if not exists archive_company_id_idx    on transactions_archive(company_id);
create index if not exists archive_report_month_idx  on transactions_archive(report_month);

-- ─────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────

-- Enable RLS on all tables
alter table companies            enable row level security;
alter table members              enable row level security;
alter table items                enable row level security;
alter table transactions         enable row level security;
alter table transactions_archive enable row level security;

-- Anon (browser client): read active companies, members, items; insert transactions
create policy "anon_read_active_companies" on companies
  for select to anon
  using (active = true);

create policy "anon_read_active_members" on members
  for select to anon
  using (active = true);

create policy "anon_read_active_items" on items
  for select to anon
  using (active = true);

create policy "anon_insert_transactions" on transactions
  for insert to anon
  with check (true);

-- Service role (Vercel serverless functions): full access via service-role key
-- No RLS policy needed — service role bypasses RLS by default in Supabase.
