// GET  /api/admin/theme — read the global appearance (default mode, palette, custom)
// PUT  /api/admin/theme — update it. PIN-protected; app_theme is public-readable
// but only the service role may write. See docs/phase-2-production.md.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient, verifyAdminPin, pinFromHeader } from '../_lib/adminAuth'
import { PRESET_PALETTES, CUSTOM_SLOTS, isHex } from '../../src/lib/palettes'
import type { Database } from '../../src/lib/database.types'

type ThemeUpdate = Database['public']['Tables']['app_theme']['Update']

const MODES = ['system', 'light', 'dark'] as const
const VALID_PALETTES = new Set<string>([...PRESET_PALETTES.map(p => p.id), ...CUSTOM_SLOTS])

interface ThemeBody {
  default_mode?: unknown
  active_palette?: unknown
  custom?: unknown
}

function sanitizeCustom(input: unknown): Record<string, { name: string; light: string; dark: string }> {
  const out: Record<string, { name: string; light: string; dark: string }> = {}
  if (!input || typeof input !== 'object') return out
  const obj = input as Record<string, unknown>
  for (const slot of CUSTOM_SLOTS) {
    const c = obj[slot]
    if (!c || typeof c !== 'object') continue
    const r = c as Record<string, unknown>
    out[slot] = {
      name: typeof r.name === 'string' ? r.name.trim().slice(0, 40) : '',
      light: isHex(r.light) ? r.light : '#D97706',
      dark: isHex(r.dark) ? r.dark : '#F59E0B',
    }
  }
  return out
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!(await verifyAdminPin(pinFromHeader(req.headers)))) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const supabase = makeAdminClient()

    if (req.method === 'PUT') {
      const body = (req.body ?? {}) as ThemeBody
      const update: ThemeUpdate = { updated_at: new Date().toISOString() }

      if (body.default_mode !== undefined) {
        const m = String(body.default_mode)
        if (!MODES.includes(m as (typeof MODES)[number])) {
          return res.status(400).json({ error: 'Ungültiger Modus.' })
        }
        update.default_mode = m as (typeof MODES)[number]
      }
      if (body.active_palette !== undefined) {
        const p = String(body.active_palette)
        if (!VALID_PALETTES.has(p)) {
          return res.status(400).json({ error: 'Unbekannte Palette.' })
        }
        update.active_palette = p
      }
      if (body.custom !== undefined) {
        update.custom = sanitizeCustom(body.custom)
      }

      const { error } = await supabase.from('app_theme').update(update).eq('id', 1)
      if (error) throw new Error(error.message)
    }

    const { data, error } = await supabase
      .from('app_theme')
      .select('default_mode, active_palette, custom')
      .eq('id', 1)
      .single()
    if (error) throw new Error(error.message)

    return res.status(200).json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[theme]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
