// GET /api/admin/pin-meta — public, returns only the expected PIN length.
// The length is not a secret; it lets the login keypad render the right number
// of dots without hard-coding. Never returns any hash or token.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient } from '../_lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = makeAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('pin_length')
      .eq('id', 1)
      .single()
    if (error) throw new Error(error.message)
    return res.status(200).json({ pin_length: data.pin_length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[pin-meta]', message)
    // Fall back to the default so login still works if settings are unreachable.
    return res.status(200).json({ pin_length: 6 })
  }
}
