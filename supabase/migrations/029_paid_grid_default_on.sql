-- Migration 029: turn the inline paid grid on by default.
--
-- The Bezahlt column (per-member paid checkboxes) started opt-in (migration 028),
-- but it is the primary way to track who has paid, so it should be visible out of
-- the box. Flip the column default and enable it on the existing singleton row.
-- Admins can still hide it from Einstellungen → Zahlungsübersicht.

alter table public.app_settings
  alter column member_paid_grid_enabled set default true;

update public.app_settings
  set member_paid_grid_enabled = true
  where id = 1;
