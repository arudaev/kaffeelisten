// Public, unauthenticated endpoint that a member's confirmation link points at.
//
//   GET /api/confirm-email?mid=<member id>&token=<one-time token>
//
// The clicked link lands on the /email-bestaetigen page, which calls this. We
// use the service-role client and the confirm_member_email RPC (migration 021),
// which verifies the token hash + expiry and stamps email_verified_at. The raw
// token is never stored; a wrong/expired/consumed token returns a generic 400.
// Rate-limited by IP to blunt token guessing.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient, clientKey, consumeRateLimit } from './_lib/adminAuth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const mid = String((Array.isArray(req.query.mid) ? req.query.mid[0] : req.query.mid) ?? '').trim()
  const token = String((Array.isArray(req.query.token) ? req.query.token[0] : req.query.token) ?? '').trim()
  if (!mid || !token) return res.status(400).json({ ok: false, error: 'Ungültiger Link.' })

  // Token guessing is expensive per attempt but still worth throttling.
  if (!(await consumeRateLimit(`confirm:${clientKey(req.headers)}`, { max: 20, windowSecs: 600, lockSecs: 900 }))) {
    return res.status(429).json({ ok: false, error: 'Zu viele Versuche. Bitte später erneut versuchen.' })
  }

  try {
    const supabase = makeAdminClient()
    const { data, error } = await supabase.rpc('confirm_member_email', { p_member_id: mid, p_token: token })
    if (error) throw new Error(error.message)
    // RPC returns the member name on success, NULL on any failure.
    if (typeof data === 'string' && data.length > 0) {
      return res.status(200).json({ ok: true, name: data })
    }
    return res.status(400).json({ ok: false, error: 'Link ungültig oder abgelaufen.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[confirm-email]', message)
    return res.status(500).json({ ok: false, error: 'Serverfehler' })
  }
}
