// POST /api/admin/change-pin — { currentPin, newPin }
// Verifies the current PIN, then stores a new bcrypt hash. Length is read from
// app_settings.pin_length (default 6). Service-role only.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  makeAdminClient,
  verifyAdminPin,
  isValidPinFormat,
  consumeRateLimit,
  resetRateLimit,
  clientKey,
  requireAdmin,
} from '../_lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Changing the PIN requires an active admin session AND the current PIN — a
  // stolen session alone can't rotate the credential without knowing it.
  const auth = await requireAdmin(req.headers)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const rlKey = `change:${clientKey(req.headers)}`
  if (!(await consumeRateLimit(rlKey))) {
    return res.status(429).json({ error: 'Zu viele Versuche. Bitte später erneut versuchen.' })
  }

  const { currentPin, newPin } = (req.body ?? {}) as { currentPin?: string; newPin?: string }

  try {
    if (!(await verifyAdminPin(currentPin))) {
      return res.status(403).json({ error: 'Aktuelle PIN ist falsch.' })
    }
    await resetRateLimit(rlKey)

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

    const { error } = await supabase.rpc('set_admin_pin', { p_pin: newPin })
    if (error) throw new Error(error.message)

    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[change-pin]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
