// POST /api/admin/reset-pin — { code, newPin }
// `code` is either the one-time email code (verified + consumed in the DB) or
// the ADMIN_RECOVERY_PIN env backstop. On success the new PIN hash is stored.
// Service-role only. See docs/phase-2-production.md §C.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  makeAdminClient,
  isValidPinFormat,
  rateLimit,
  clientKey,
} from '../_lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!rateLimit(`reset:${clientKey(req.headers)}`, 10, 60_000)) {
    return res.status(429).json({ error: 'Zu viele Versuche. Bitte kurz warten.' })
  }

  const { code, newPin } = (req.body ?? {}) as { code?: string; newPin?: string }

  try {
    const supabase = makeAdminClient()
    const { data, error: readErr } = await supabase
      .from('app_settings')
      .select('pin_length')
      .eq('id', 1)
      .single()
    if (readErr) throw new Error(readErr.message)

    if (typeof newPin !== 'string' || !isValidPinFormat(newPin, data.pin_length)) {
      return res
        .status(400)
        .json({ error: `Neue PIN muss ${data.pin_length}-stellig sein (nur Ziffern).` })
    }
    if (typeof code !== 'string' || code.length === 0) {
      return res.status(400).json({ error: 'Code fehlt.' })
    }

    // Env recovery backstop — bypasses the email code when email is down.
    const recoveryPin = process.env.ADMIN_RECOVERY_PIN
    if (recoveryPin && code === recoveryPin) {
      const { error } = await supabase.rpc('set_admin_pin', { p_pin: newPin })
      if (error) throw new Error(error.message)
      return res.status(200).json({ ok: true })
    }

    // Otherwise verify + consume the one-time email code atomically.
    const { data: ok, error } = await supabase.rpc('consume_pin_reset', {
      p_code: code,
      p_new_pin: newPin,
    })
    if (error) throw new Error(error.message)

    if (ok !== true) {
      return res.status(403).json({ error: 'Code ungültig oder abgelaufen.' })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[reset-pin]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
