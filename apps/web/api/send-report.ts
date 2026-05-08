import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMonthlyReport } from './_lib/report'

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    await runMonthlyReport()
    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[send-report]', message)
    return res.status(500).json({ error: message })
  }
}
