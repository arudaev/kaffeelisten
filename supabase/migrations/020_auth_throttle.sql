-- Migration 020: durable, cross-instance rate limiting for admin auth.
--
-- The previous limiter lived in per-instance serverless memory, so it did almost
-- nothing against a distributed brute force of the 6-digit PIN — and only
-- /verify-pin used it, while /api/admin/data, settings, theme, preview and
-- send-report verified the PIN with no throttle at all. This moves the counter
-- into the database so every function and every instance shares one view.
--
-- Service-role only (the admin functions call it with the service key).

create table if not exists auth_throttle (
  key          text primary key,       -- e.g. "verify:<ip>", "reset:<ip>"
  attempts     integer not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);

comment on table auth_throttle is
  'Cross-instance rate-limit counters for admin auth endpoints. Service-role only.';

alter table auth_throttle enable row level security;   -- no policies → anon/authenticated denied
grant select, insert, update, delete on public.auth_throttle to service_role;

-- pin_rate_consume — records one attempt for a key and returns whether it is
-- allowed to proceed. Locks the key for p_lock_secs once attempts exceed p_max
-- within the p_window_secs window. Row-locked to avoid lost updates under
-- concurrent attempts.
create or replace function public.pin_rate_consume(
  p_key text, p_max int, p_window_secs int, p_lock_secs int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row auth_throttle;
  v_now timestamptz := now();
begin
  select * into v_row from auth_throttle where key = p_key for update;

  if not found then
    insert into auth_throttle (key, attempts, window_start, updated_at)
      values (p_key, 1, v_now, v_now);
    return true;
  end if;

  -- Currently locked out.
  if v_row.locked_until is not null and v_row.locked_until > v_now then
    return false;
  end if;

  -- Window elapsed → start a fresh window.
  if v_now - v_row.window_start > make_interval(secs => p_window_secs) then
    update auth_throttle
       set attempts = 1, window_start = v_now, locked_until = null, updated_at = v_now
     where key = p_key;
    return true;
  end if;

  -- Within the window → count this attempt; lock if it exceeds the cap.
  if v_row.attempts + 1 > p_max then
    update auth_throttle
       set attempts = v_row.attempts + 1,
           locked_until = v_now + make_interval(secs => p_lock_secs),
           updated_at = v_now
     where key = p_key;
    return false;
  end if;

  update auth_throttle
     set attempts = v_row.attempts + 1, updated_at = v_now
   where key = p_key;
  return true;
end;
$$;

-- pin_rate_reset — clears a key after a successful auth so honest users are never
-- progressively throttled.
create or replace function public.pin_rate_reset(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth_throttle where key = p_key;
$$;

revoke execute on function public.pin_rate_consume(text, int, int, int) from public;
revoke execute on function public.pin_rate_reset(text)                  from public;
grant  execute on function public.pin_rate_consume(text, int, int, int) to service_role;
grant  execute on function public.pin_rate_reset(text)                  to service_role;
