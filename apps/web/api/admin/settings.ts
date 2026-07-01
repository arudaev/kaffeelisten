// GET  /api/admin/settings — read the non-secret admin configuration
// PUT  /api/admin/settings — update recipients, CEO email/CC, member toggle
//
// PIN-protected (x-admin-pin header). Never returns admin_pin_hash or the reset
// token. Service-role only — see docs/phase-2-production.md §F.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient, verifyAdminPin, pinFromHeader, isDbPinSet } from '../_lib/adminAuth'
import type { Database } from '../../src/lib/database.types'

type SettingsUpdate = Database['public']['Tables']['app_settings']['Update']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface SettingsBody {
  report_recipients?: unknown
  ceo_email?: unknown
  cc_ceo_on_reports?: unknown
  member_statements_enabled?: unknown
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
      const body = (req.body ?? {}) as SettingsBody
      const update: SettingsUpdate = { updated_at: new Date().toISOString() }

      if (body.report_recipients !== undefined) {
        if (!Array.isArray(body.report_recipients)) {
          return res.status(400).json({ error: 'report_recipients muss eine Liste sein.' })
        }
        const recipients = body.report_recipients.map(e => String(e).trim()).filter(Boolean)
        const invalid = recipients.find(e => !EMAIL_RE.test(e))
        if (invalid) {
          return res.status(400).json({ error: `Ungültige E-Mail-Adresse: ${invalid}` })
        }
        update.report_recipients = Array.from(new Set(recipients))
      }

      if (body.ceo_email !== undefined) {
        const ceo = body.ceo_email === null ? '' : String(body.ceo_email).trim()
        if (ceo && !EMAIL_RE.test(ceo)) {
          return res.status(400).json({ error: 'Ungültige CEO-E-Mail-Adresse.' })
        }
        update.ceo_email = ceo || null
      }

      if (body.cc_ceo_on_reports !== undefined) {
        update.cc_ceo_on_reports = Boolean(body.cc_ceo_on_reports)
      }

      if (body.member_statements_enabled !== undefined) {
        update.member_statements_enabled = Boolean(body.member_statements_enabled)
      }

      const { error } = await supabase.from('app_settings').update(update).eq('id', 1)
      if (error) throw new Error(error.message)
    }

    // Return the current non-secret settings (for both GET and after a PUT).
    const { data, error } = await supabase
      .from('app_settings')
      .select(
        'report_recipients, ceo_email, cc_ceo_on_reports, member_statements_enabled, pin_length, pin_updated_at',
      )
      .eq('id', 1)
      .single()
    if (error) throw new Error(error.message)

    return res.status(200).json({
      report_recipients: data.report_recipients ?? [],
      ceo_email: data.ceo_email ?? null,
      cc_ceo_on_reports: data.cc_ceo_on_reports,
      member_statements_enabled: data.member_statements_enabled,
      pin_length: data.pin_length,
      pin_updated_at: data.pin_updated_at,
      pin_is_set: await isDbPinSet(supabase),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[settings]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
