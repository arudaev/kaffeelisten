import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function makeSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase credentials')
  return createClient(url, key)
}

async function getEffectivePin(supabase: SupabaseClient): Promise<string | null> {
  try {
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

  const { currentPin, newPin } = (req.body ?? {}) as { currentPin?: string; newPin?: string }
  if (typeof currentPin !== 'string' || typeof newPin !== 'string') {
    return res.status(400).json({ error: 'currentPin and newPin required' })
  }
  if (!/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ error: 'PIN must be exactly 4 digits' })
  }

  const supabase = makeSupabase()
  const effectivePin = await getEffectivePin(supabase)

  if (!effectivePin || currentPin !== effectivePin) {
    return res.status(403).json({ error: 'Aktuelle PIN ist falsch' })
  }

  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key: 'admin_pin', value: newPin, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
