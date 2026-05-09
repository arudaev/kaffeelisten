import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// DB admin_pin takes precedence; falls back to ADMIN_PIN env var so existing
// deployments keep working without any manual migration step.
async function getEffectivePin(): Promise<string | null> {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return process.env.ADMIN_PIN ?? null

  try {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'admin_pin')
      .single()
    const dbPin = data?.value?.trim() ?? ''
    return dbPin || (process.env.ADMIN_PIN ?? null)
  } catch {
    return process.env.ADMIN_PIN ?? null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { pin } = req.body as { pin?: string }
  const effectivePin = await getEffectivePin()

  if (!effectivePin) {
    return res.status(500).json({ error: 'ADMIN_PIN not configured' })
  }

  if (typeof pin === 'string' && pin === effectivePin) {
    return res.status(200).json({ ok: true })
  }

  return res.status(403).json({ error: 'Ungültige PIN' })
}
