import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchAndEnrich, archiveTransactions, pruneOldTransactions } from '../_lib/report'

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const adminPin = process.env.ADMIN_PIN
  if (!adminPin || req.headers['x-admin-pin'] !== adminPin) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { month } = (req.body ?? {}) as { month?: string }
    const { transactions, reportMonth } = await fetchAndEnrich(month)
    await archiveTransactions(transactions, reportMonth)
    await pruneOldTransactions()
    return res.status(200).json({ ok: true, archivedCount: transactions.length, reportMonth })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/archive]', message)
    return res.status(500).json({ error: message })
  }
}
