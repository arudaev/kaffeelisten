-- Migration: 012_pin_functions
-- SECURITY DEFINER helpers that keep all PIN and reset-token hashing inside the
-- database (pgcrypto / bcrypt), so the serverless functions never see or handle
-- a clear PIN hash. They operate only on the app_settings singleton (id = 1).
--
-- Security model: app_settings is service-role only (see migration 010). These
-- functions touch the same secrets, so EXECUTE is revoked from PUBLIC / anon /
-- authenticated and granted to service_role only. They are called via PostgREST
-- RPC using the service-role key from apps/web/api/admin/*. See
-- docs/phase-2-production.md §C.

create extension if not exists "pgcrypto";   -- already enabled; idempotent

-- ── verify_admin_pin ─────────────────────────────────────────────────────────
-- True only when a PIN hash is set AND the supplied PIN matches it. Returns
-- false when no PIN has been set yet (admin_pin_hash IS NULL) — the caller then
-- falls back to the ADMIN_PIN env bootstrap.
create or replace function verify_admin_pin(p_pin text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select coalesce(admin_pin_hash = crypt(p_pin, admin_pin_hash), false)
  from app_settings
  where id = 1;
$$;

-- ── set_admin_pin ────────────────────────────────────────────────────────────
-- Store a fresh bcrypt hash and stamp pin_updated_at. Also clears any pending
-- reset token so a used/obsolete token can't be replayed.
create or replace function set_admin_pin(p_pin text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update app_settings
     set admin_pin_hash       = crypt(p_pin, gen_salt('bf')),
         pin_updated_at       = now(),
         pin_reset_token_hash = null,
         pin_reset_expires_at = null,
         updated_at           = now()
   where id = 1;
$$;

-- ── set_pin_reset_token ──────────────────────────────────────────────────────
-- Hash and store a one-time reset code with a TTL. The clear code is emailed
-- once by the caller and never persisted.
create or replace function set_pin_reset_token(p_code text, p_ttl_minutes int default 15)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update app_settings
     set pin_reset_token_hash = crypt(p_code, gen_salt('bf')),
         pin_reset_expires_at = now() + make_interval(mins => p_ttl_minutes),
         updated_at           = now()
   where id = 1;
$$;

-- ── consume_pin_reset ────────────────────────────────────────────────────────
-- Verify a reset code against the stored hash and expiry; on success set the new
-- PIN and clear the token atomically. Returns whether the reset was applied.
create or replace function consume_pin_reset(p_code text, p_new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ok boolean;
begin
  select (pin_reset_token_hash is not null
          and pin_reset_expires_at > now()
          and pin_reset_token_hash = crypt(p_code, pin_reset_token_hash))
    into ok
  from app_settings
  where id = 1;

  if coalesce(ok, false) then
    update app_settings
       set admin_pin_hash       = crypt(p_new_pin, gen_salt('bf')),
           pin_updated_at       = now(),
           pin_reset_token_hash = null,
           pin_reset_expires_at = null,
           updated_at           = now()
     where id = 1;
    return true;
  end if;

  return false;
end;
$$;

-- Lock down execution: these functions read/write secrets, so only the
-- service-role key (used by the PIN-protected serverless functions) may run them.
revoke execute on function verify_admin_pin(text)             from public;
revoke execute on function set_admin_pin(text)                from public;
revoke execute on function set_pin_reset_token(text, int)     from public;
revoke execute on function consume_pin_reset(text, text)      from public;

grant execute on function verify_admin_pin(text)             to service_role;
grant execute on function set_admin_pin(text)                to service_role;
grant execute on function set_pin_reset_token(text, int)     to service_role;
grant execute on function consume_pin_reset(text, text)      to service_role;
