import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMonthlyReport } from './_lib/report'
import { verifyAdminPin, pinFromHeader } from './_lib/adminAuth'

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth against the DB PIN (with ADMIN_PIN env fallback until a PIN is set),
  // so the manual send keeps working after the admin changes their PIN.
  if (!(await verifyAdminPin(pinFromHeader(req.headers)))) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { month } = (req.body ?? {}) as { month?: string }
    await runMonthlyReport(month)
    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[send-report]', message)
    return res.status(500).json({ error: message })
  }
}
