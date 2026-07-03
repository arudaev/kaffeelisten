import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyAdminPin, consumeRateLimit, resetRateLimit, clientKey } from '../_lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  // Durable, cross-instance brute-force limit on the 6-digit space.
  const rlKey = `verify:${clientKey(req.headers)}`
  if (!(await consumeRateLimit(rlKey))) {
    return res.status(429).json({ error: 'Zu viele Versuche. Bitte später erneut versuchen.' })
  }

  const { pin } = (req.body ?? {}) as { pin?: string }

  try {
    if (await verifyAdminPin(pin)) {
      await resetRateLimit(rlKey)
      return res.status(200).json({ ok: true })
    }
    return res.status(403).json({ error: 'Ungültige PIN' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[verify-pin]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
