-- Migration 038: make the API privilege model explicit, so every database built
-- from these migrations is as locked down as production.
--
-- deploy: pre
--
-- WHY. Production was tightened by hand at some point: its `postgres` default
-- privileges in `public` give anon/authenticated nothing useful and new
-- functions are private to postgres. None of that is in a migration. A fresh
-- Supabase project (the staging project, a branch, a disaster-recovery rebuild)
-- keeps Supabase's defaults instead, and a schema built from 001-037 there let
-- `anon` — i.e. anyone holding the public key shipped in the web bundle —
-- EXECUTE set_admin_pin, verify_admin_pin, prune_reported_transactions,
-- next_billing_document_number and ensure_house_member, and INSERT/UPDATE/DELETE
-- most tables. Compared against production on 2026-09-16 with
-- scripts/db/drift.mjs.
--
-- On production this is tightening only: it removes TRUNCATE/REFERENCES/TRIGGER/
-- MAINTAIN from anon/authenticated, which the API can never use. Every privilege
-- the currently deployed member flow needs is granted back below, so the old and
-- the new bundle both keep working.
--
-- NOT HERE (post-deploy, follow-up PR): anon still holds table-level SELECT on
-- `companies`, which exposes billing_contact_email/_name/billing_notes to the
-- public key. This release's iPad selects explicit columns; once it is live
-- (including cached PWA bundles), the follow-up narrows the grant to those columns.

-- ── 1. Future objects created by migrations are private by default ────────────
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
-- EXECUTE for PUBLIC on new functions is a global default, and a per-schema entry
-- can only add to global defaults, never remove from them. Revoke it globally.
alter default privileges for role postgres
  revoke execute on functions from public;

-- ── 2. Existing objects: remove every API-role privilege… ─────────────────────
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Column privileges are separate from table privileges; clear the ones we re-grant.
revoke select (id, name, company_id, active, kind) on public.members from anon, authenticated;

-- ── 3. …then grant back exactly what the anonymous member flow uses ───────────
-- Theme colours for the public pages.
grant select on public.app_theme to anon, authenticated;
-- Catalogue for the iPad. Items carry no personal data.
grant select on public.items to anon;
-- Companies: table-level for now (the deployed bundle selects *); narrowed to
-- (id, name, active, checkout_mode) by the post-deploy follow-up.
grant select on public.companies to anon;
-- Members: the non-PII columns (migration 015) plus kind for the house-account policy (034).
grant select (id, name, company_id, active, kind) on public.members to anon, authenticated;

-- Member-flow RPCs (SECURITY DEFINER; they validate their own input).
grant execute on function public.log_order(uuid, jsonb)          to anon, authenticated;
grant execute on function public.log_company_order(uuid, jsonb)  to anon, authenticated;
grant execute on function public.undo_order(uuid[])              to anon, authenticated;
grant execute on function public.register_member(uuid, text, text) to anon, authenticated;

-- ── 4. Server-only RPCs: service_role, explicitly (no longer via PUBLIC) ──────
grant execute on function public.verify_admin_pin(text)                          to service_role;
grant execute on function public.set_admin_pin(text)                             to service_role;
grant execute on function public.set_pin_reset_token(text, integer)              to service_role;
grant execute on function public.consume_pin_reset(text, text)                   to service_role;
grant execute on function public.pin_rate_consume(text, integer, integer, integer) to service_role;
grant execute on function public.pin_rate_reset(text)                            to service_role;
grant execute on function public.set_member_email_token(uuid, text, integer)     to service_role;
grant execute on function public.confirm_member_email(uuid, text)                to service_role;
grant execute on function public.prune_reported_transactions(timestamptz)        to service_role;
grant execute on function public.next_billing_document_number()                  to service_role;
grant execute on function public.ensure_house_member(uuid)                       to service_role;
