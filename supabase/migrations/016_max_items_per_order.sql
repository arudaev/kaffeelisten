-- Migration 016: configurable per-order item cap.
--
-- Adds an admin-configurable limit on how many items a single person may log in
-- one go (the sum of quantities in one confirm). NULL means unlimited (the
-- previous behaviour), so this is a no-op until an admin sets a value.
--
-- The member flow reads this via the public /api/config endpoint (the settings
-- table itself stays service-role only). Note: enforcement is currently in the
-- client; server-side enforcement arrives with the validated transaction RPC
-- (write-abuse hardening follow-up).

alter table app_settings
  add column if not exists max_items_per_order integer
    check (max_items_per_order is null or max_items_per_order >= 1);

comment on column app_settings.max_items_per_order is
  'Max total quantity a member may log in one order. NULL = unlimited.';
