import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

function makeSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

function pinOk(req: VercelRequest): boolean {
  const adminPin = process.env.ADMIN_PIN
  return Boolean(adminPin) && req.headers['x-admin-pin'] === adminPin
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!pinOk(req)) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = makeSupabase()

  // GET /api/admin/settings?key=<key>
  if (req.method === 'GET') {
    const { key } = req.query
    if (typeof key !== 'string') return res.status(400).json({ error: 'Missing key' })
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value, updated_at')
      .eq('key', key)
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ key, value: data?.value ?? '', updated_at: data?.updated_at ?? null })
  }

  // POST /api/admin/settings  body: { key, value }
  if (req.method === 'POST') {
    const { key, value } = (req.body ?? {}) as { key?: string; value?: string }
    if (typeof key !== 'string' || typeof value !== 'string') {
      return res.status(400).json({ error: 'Missing key or value' })
    }
    const { error } = await supabase
      .from('admin_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
