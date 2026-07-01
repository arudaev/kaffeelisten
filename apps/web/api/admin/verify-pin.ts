import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAdminPin, rateLimit, clientKey } from '../_lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  // Best-effort brute-force speed bump on the 6-digit space.
  if (!rateLimit(`verify:${clientKey(req.headers)}`, 10, 60_000)) {
    return res.status(429).json({ error: 'Zu viele Versuche. Bitte kurz warten.' })
  }

  const { pin } = (req.body ?? {}) as { pin?: string }

  try {
    if (await verifyAdminPin(pin)) {
      return res.status(200).json({ ok: true })
    }
    return res.status(403).json({ error: 'Ungültige PIN' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[verify-pin]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
