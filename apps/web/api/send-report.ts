import type { VercelRequest, VercelResponse } from '@vercel/node'
import { runMonthlyReport } from './_lib/report'
import { requireAdmin } from './_lib/adminAuth'

export const config = { maxDuration: 60 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth against the DB PIN (with ADMIN_PIN env fallback until a PIN is set),
  // so the manual send keeps working after the admin changes their PIN.
  const auth = await requireAdmin(req.headers)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  try {
    const { month } = (req.body ?? {}) as { month?: string }
    // A manual send is an explicit admin action, so force past the "already sent
    // this month" guard. The concurrency lock still prevents a double-click from
    // sending twice.
    const result = await runMonthlyReport(month, { force: true })
    return res.status(200).json({
      ok: true,
      status: result.status,
      memberStatements: result.memberStatements ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[send-report]', message)
    return res.status(500).json({ error: message })
  }
}
