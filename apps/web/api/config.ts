// GET /api/config — public, non-sensitive runtime config for the member flow.
//
// app_settings is service-role only (it holds the PIN hash and reset token), so
// the anonymous browser bundle cannot read it directly. This endpoint exposes
// ONLY the non-sensitive fields the member flow needs — currently the per-order
// item cap. No PIN required; never add secret fields here.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient } from './_lib/adminAuth'
import { isDemoDeployment } from '../shared/environment'

/**
 * The demo's flag and, only on the demo, its admin PIN.
 *
 * A demo that hides its own credential is a demo nobody gets into, so the PIN is
 * shown on the login screen. It is published deliberately and only here: when
 * DEMO_MODE is off both fields are omitted entirely, so a campus instance can
 * never leak its PIN through this endpoint however it is configured.
 */
function demoFields(): { demo: boolean; demoPin?: string } {
  if (!isDemoDeployment(process.env.DEMO_MODE)) return { demo: false }
  const pin = process.env.DEMO_ADMIN_PIN?.trim()
  return pin ? { demo: true, demoPin: pin } : { demo: true }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const supabase = makeAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('max_items_per_order')
      .eq('id', 1)
      .maybeSingle()
    if (error) throw new Error(error.message)

    // Small cache: this changes rarely and the value is non-sensitive.
    res.setHeader('Cache-Control', 'public, max-age=60')
    return res.status(200).json({
      maxItemsPerOrder: data?.max_items_per_order ?? null,
      // The client hides what the demo switches off, rather than rendering
      // controls whose endpoints answer 410.
      ...demoFields(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[config]', message)
    // Fail open: an unavailable config must not break logging. Null = unlimited.
    return res.status(200).json({ maxItemsPerOrder: null, ...demoFields() })
  }
}
