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

/** True when a DB PIN hash has been set (env bootstrap no longer applies). */
export async function isDbPinSet(supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data } = await supabase
    .from('app_settings')
    .select('admin_pin_hash')
    .eq('id', 1)
    .maybeSingle()
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

/**
 * Best-effort in-memory rate limiter. Serverless instances are ephemeral, so
 * this only blunts brute force within a single warm instance — it is a speed
 * bump, not a guarantee. Reset codes/PINs are still single-use and time-boxed.
 */
const attempts = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count += 1
  return true
}

export function clientKey(headers: Record<string, string | string[] | undefined>): string {
  const fwd = headers['x-forwarded-for']
  const ip = Array.isArray(fwd) ? fwd[0] : (fwd ?? 'unknown')
  return String(ip).split(',')[0].trim() || 'unknown'
}
