-- Migration: 021_member_email_verification
-- Proof-of-ownership for member work emails. A member receives a one-time
-- confirmation link; clicking it marks their email verified. Mirrors the bcrypt
-- token pattern used for PIN reset (migration 012): the clear token is emailed
-- once and never stored — only a pgcrypto/bcrypt hash plus a TTL is persisted.
--
-- Security model: the public confirmation page never talks to the DB directly;
-- it calls the /api/confirm-email serverless function, which uses the
-- service-role key. So EXECUTE on both functions is revoked from PUBLIC / anon /
-- authenticated and granted to service_role only — the token surface stays
-- closed. work_email and these columns remain hidden from anon by the
-- column-level grant in migration 015.

create extension if not exists "pgcrypto";   -- already enabled; idempotent

-- ── columns ──────────────────────────────────────────────────────────────────
alter table public.members add column if not exists email_verified_at     timestamptz;
alter table public.members add column if not exists email_verify_token_hash text;
alter table public.members add column if not exists email_verify_expires_at timestamptz;

-- ── set_member_email_token ───────────────────────────────────────────────────
-- Hash and store a one-time confirmation token with a TTL. Does NOT touch
-- email_verified_at: the API resets that explicitly when the address changes.
create or replace function set_member_email_token(
  p_member_id uuid,
  p_token text,
  p_ttl_minutes int default 20160  -- 14 days
)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  update members
     set email_verify_token_hash = crypt(p_token, gen_salt('bf')),
         email_verify_expires_at = now() + make_interval(mins => p_ttl_minutes)
   where id = p_member_id;
$$;

-- ── confirm_member_email ─────────────────────────────────────────────────────
-- Verify a token against the stored hash and expiry for one member; on success
-- stamp email_verified_at, clear the token atomically, and return the member's
-- name (used to greet them on the confirmation page). Returns NULL on any
-- failure (unknown member, wrong token, expired, or already consumed).
create or replace function confirm_member_email(p_member_id uuid, p_token text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text;
  v_ok   boolean;
begin
  select name,
         (email_verify_token_hash is not null
          and email_verify_expires_at > now()
          and email_verify_token_hash = crypt(p_token, email_verify_token_hash))
    into v_name, v_ok
  from members
  where id = p_member_id;

  if coalesce(v_ok, false) then
    update members
       set email_verified_at       = now(),
           email_verify_token_hash = null,
           email_verify_expires_at = null
     where id = p_member_id;
    return v_name;
  end if;

  return null;
end;
$$;

-- Lock down execution: both functions touch the confirmation-token secret, so
-- only the service-role key (used by the serverless functions) may run them.
revoke execute on function set_member_email_token(uuid, text, int) from public;
revoke execute on function confirm_member_email(uuid, text)        from public;

grant execute on function set_member_email_token(uuid, text, int) to service_role;
grant execute on function confirm_member_email(uuid, text)        to service_role;
