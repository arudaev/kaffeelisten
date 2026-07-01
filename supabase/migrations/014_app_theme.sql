-- Migration: 014_app_theme
-- Global app appearance: the admin's default mode and brand palette, applied to
-- every visitor (member flow + admin). Kept in a SEPARATE table from app_settings
-- because — unlike the PIN/secrets there — the theme is NOT secret and must be
-- readable by the anon browser client so the member PWA can paint the right
-- colours on load. Per-device Light/Dark/System choice lives in localStorage;
-- this row only sets the default and the brand palette.
--
--   default_mode   — initial appearance when a device has no saved preference
--   active_palette — 'bayerwald' | 'espresso' | 'wald' | 'custom-1|2|3'
--   custom         — up to 3 custom palettes: { "custom-1": { name, light:{accent,…}, dark:{…} }, … }

create table if not exists app_theme (
  id             smallint primary key default 1 check (id = 1),
  default_mode   text not null default 'system' check (default_mode in ('system', 'light', 'dark')),
  active_palette text not null default 'bayerwald',
  custom         jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);

comment on table app_theme is
  'Singleton (id=1) global appearance: default mode + active brand palette + custom palettes. Public-readable (anon SELECT) — not secret.';

insert into app_theme (id) values (1) on conflict (id) do nothing;

-- RLS on: anon/authenticated may READ (theme is not secret); writes go through
-- the PIN-protected serverless function using the service-role key.
alter table app_theme enable row level security;

drop policy if exists app_theme_anon_read on app_theme;
create policy app_theme_anon_read on app_theme
  for select to anon, authenticated using (true);

grant select on app_theme to anon, authenticated;
grant select, insert, update on app_theme to service_role;
