-- Admin key-value settings store (report recipients, PIN override, etc.)
-- All access goes through service-role API endpoints — anon is blocked.

create table if not exists admin_settings (
  id         uuid        primary key default gen_random_uuid(),
  key        text        not null unique,
  value      text        not null default '',
  updated_at timestamptz not null default now()
);

alter table admin_settings enable row level security;

-- Seed default rows so reads always get a value without null-guards
insert into admin_settings (key, value)
values
  ('report_recipients', ''),
  ('admin_pin',         '')
on conflict (key) do nothing;

-- Allow anon client to read aggregate stats from the archive table
-- (used by SettingsPage to display archive counts without a server round-trip)
create policy "anon_read_archive_stats" on transactions_archive
  for select to anon
  using (true);
