// Shared admin-auth helpers for the PIN-protected serverless functions.
//
// PIN verification lives in the database (bcrypt via pgcrypto, migration 012).
// The clear PIN is only ever compared inside Postgres. `ADMIN_PIN` remains a
// bootstrap fallback, used ONLY while no PIN hash has been set yet — once the
// admin sets a real PIN from the dashboard, the env value stops working.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'

export function makeAdminClient(): SupabaseClient<Database> {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient<Database>(url, key)
}

/**
 * True when a DB PIN hash has been set (env bootstrap no longer applies).
 * Fails CLOSED: a DB read error throws rather than returning false, so a
 * transient failure can never silently re-enable the ADMIN_PIN env bootstrap.
 */
export async function isDbPinSet(supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('admin_pin_hash')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(`isDbPinSet failed: ${error.message}`)
  return !!data?.admin_pin_hash
}

/**
 * Verify a PIN against the stored hash, falling back to the ADMIN_PIN env var
 * only while no PIN has been set in the database.
 */
export async function verifyAdminPin(pin: unknown): Promise<boolean> {
  if (typeof pin !== 'string' || pin.length === 0) return false

  const supabase = makeAdminClient()

  if (await isDbPinSet(supabase)) {
    const { data, error } = await supabase.rpc('verify_admin_pin', { p_pin: pin })
    if (error) throw new Error(`verify_admin_pin failed: ${error.message}`)
    return data === true
  }

  // Bootstrap fallback — DB PIN not set yet.
  const envPin = process.env.ADMIN_PIN
  return !!envPin && pin === envPin
}

/** Read the PIN header from an incoming request (case-insensitive helper). */
export function pinFromHeader(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers['x-admin-pin']
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')
}

/** A PIN is exactly `pin_length` digits (default 6). */
export function isValidPinFormat(pin: string, length: number): boolean {
  return new RegExp(`^\\d{${length}}$`).test(pin)
}

export function clientKey(headers: Record<string, string | string[] | undefined>): string {
  const fwd = headers['x-forwarded-for']
  const ip = Array.isArray(fwd) ? fwd[0] : (fwd ?? 'unknown')
  return String(ip).split(',')[0].trim() || 'unknown'
}

/**
 * Durable, cross-instance rate limiter backed by the auth_throttle table
 * (migration 020). Records one attempt for `key` and returns whether it is
 * allowed. Fails OPEN on infrastructure errors (returns true) so a throttle
 * outage — or a deploy that precedes the migration — never locks admins out;
 * the PIN check still gates access. `key` is namespaced by the caller
 * (e.g. "verify:<ip>", "reset:<ip>", "admin:<ip>").
 */
export async function consumeRateLimit(
  key: string,
  opts: { max: number; windowSecs: number; lockSecs: number } = { max: 8, windowSecs: 600, lockSecs: 900 },
): Promise<boolean> {
  try {
    const supabase = makeAdminClient()
    const { data, error } = await supabase.rpc('pin_rate_consume', {
      p_key: key,
      p_max: opts.max,
      p_window_secs: opts.windowSecs,
      p_lock_secs: opts.lockSecs,
    })
    if (error) {
      console.error('[rate-limit] consume failed (allowing):', error.message)
      return true
    }
    return data !== false
  } catch (err) {
    console.error('[rate-limit] consume threw (allowing):', err instanceof Error ? err.message : err)
    return true
  }
}

/** Clear a rate-limit key after a successful auth. Best-effort. */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    const supabase = makeAdminClient()
    await supabase.rpc('pin_rate_reset', { p_key: key })
  } catch {
    /* non-fatal */
  }
}

export interface AdminAuthResult {
  ok: boolean
  status: number
  error?: string
}

/**
 * Single entry point for authenticating a PIN-protected admin request: applies
 * the durable rate limit, then verifies the PIN. Every admin endpoint should use
 * this so throttling is uniform (previously only /verify-pin was limited). On a
 * correct PIN the limiter is reset so honest admins aren't progressively slowed.
 */
export async function requireAdmin(
  headers: Record<string, string | string[] | undefined>,
): Promise<AdminAuthResult> {
  const key = `admin:${clientKey(headers)}`
  if (!(await consumeRateLimit(key))) {
    return { ok: false, status: 429, error: 'Zu viele Versuche. Bitte später erneut versuchen.' }
  }
  const valid = await verifyAdminPin(pinFromHeader(headers)) // throws on DB error → 500 (fail closed)
  if (!valid) return { ok: false, status: 401, error: 'Unauthorized' }
  await resetRateLimit(key)
  return { ok: true, status: 200 }
}
