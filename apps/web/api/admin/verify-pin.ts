import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const { pin } = req.body as { pin?: string }
  const adminPin = process.env.ADMIN_PIN

  if (!adminPin) {
    return res.status(500).json({ error: 'ADMIN_PIN not configured' })
  }

  if (typeof pin === 'string' && pin === adminPin) {
    return res.status(200).json({ ok: true })
  }

  return res.status(403).json({ error: 'Ungültige PIN' })
}
