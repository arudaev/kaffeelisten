// Shared admin-auth helpers for the PIN-protected serverless functions.
//
// PIN verification lives in the database (bcrypt via pgcrypto, migration 012).
// The clear PIN is only ever compared inside Postgres. `ADMIN_PIN` remains a
// bootstrap fallback, used ONLY while no PIN hash has been set yet — once the
// admin sets a real PIN from the dashboard, the env value stops working.

import { createHmac, timingSafeEqual } from 'node:crypto'
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

// ─── Admin session (stateless, signed HttpOnly cookie) ────────────────────────
//
// After a successful PIN check the login endpoints issue a short-lived session
// cookie; every other admin request is authenticated by that cookie, so the
// clear PIN never has to be stored client-side or sent on each request. The
// token is HMAC-signed with ADMIN_SESSION_SECRET (server-only) and carries an
// expiry — it is not brute-forceable, so requireAdmin no longer rate-limits.

const SESSION_COOKIE = 'kl_admin'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12h

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function sign(payloadB64: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payloadB64).digest())
}

/** Build the signed token `<payload>.<hmac>` for an expiry `expMs` from now. */
function makeToken(secret: string): string {
  const payload = b64url(Buffer.from(JSON.stringify({ v: 1, exp: Date.now() + SESSION_TTL_MS })))
  return `${payload}.${sign(payload, secret)}`
}

function requireSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('Missing ADMIN_SESSION_SECRET')
  return secret
}

/** `Set-Cookie` value that establishes an admin session. */
export function issueSessionCookie(): string {
  const token = makeToken(requireSessionSecret())
  const maxAge = Math.floor(SESSION_TTL_MS / 1000)
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
}

/** `Set-Cookie` value that clears the admin session (logout / 401). */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}

function readCookie(headers: Record<string, string | string[] | undefined>, name: string): string | null {
  const raw = headers['cookie']
  const cookieHeader = Array.isArray(raw) ? raw.join('; ') : raw
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim()
  }
  return null
}

/** True when the request carries a valid, unexpired admin session cookie. */
export function verifySession(headers: Record<string, string | string[] | undefined>, secret: string): boolean {
  try {
    const token = readCookie(headers, SESSION_COOKIE)
    if (!token) return false
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return false

    const expected = sign(payloadB64, secret)
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false

    const payload = JSON.parse(Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString())
    return typeof payload?.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}

export interface AdminAuthResult {
  ok: boolean
  status: number
  error?: string
}

/**
 * Single entry point for authenticating a session-protected admin request:
 * verifies the signed HttpOnly cookie issued at login. Fails CLOSED (500) if the
 * signing secret is not configured, so a misconfigured deploy can never treat
 * requests as authenticated.
 */
export async function requireAdmin(
  headers: Record<string, string | string[] | undefined>,
): Promise<AdminAuthResult> {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    console.error('[requireAdmin] ADMIN_SESSION_SECRET is not set')
    return { ok: false, status: 500, error: 'Serverfehler' }
  }
  return verifySession(headers, secret)
    ? { ok: true, status: 200 }
    : { ok: false, status: 401, error: 'Unauthorized' }
}
