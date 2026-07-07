-- Migration 028: toggle for the inline paid grid in Mitarbeitende.
--
-- The per-member "Bezahlt" checkbox column (last 3 months) is a convenience view.
-- Some admins won't want it in the table, so it is opt-in: default OFF. The
-- per-member Zahlungen modal (full history) is unaffected by this flag.
--
-- Service-role only, same as the rest of app_settings (migration 010).

alter table public.app_settings
  add column if not exists member_paid_grid_enabled boolean not null default false;
