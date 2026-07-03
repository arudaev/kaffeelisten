-- Migration 018: make the validated RPCs the ONLY anon write path.
--
-- Revokes the direct anon INSERTs on transactions and members that migrations
-- 002/004 granted. After this, anonymous writes must go through log_order /
-- register_member (migration 017), which validate everything server-side.
--
-- ⚠️ DEPLOY ORDER: apply this ONLY after the app code that calls the RPCs
-- (migration 017 functions) is deployed. Until then the member flow still does
-- direct inserts and needs these grants. Applying this too early breaks logging
-- and self-registration — the same deploy-order hazard as migration 015.

drop policy if exists anon_insert_transactions on public.transactions;
revoke insert on public.transactions from anon, authenticated;

drop policy if exists anon_insert_members on public.members;
revoke insert on public.members from anon, authenticated;
