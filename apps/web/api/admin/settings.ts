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
const HEX_RE = /^#[0-9a-fA-F]{6}$/
const SUBJECT_MAX = 200
const INTRO_MAX = 1000

interface SettingsBody {
  report_recipients?: unknown
  ceo_email?: unknown
  cc_ceo_on_reports?: unknown
  member_statements_enabled?: unknown
  auto_report_enabled?: unknown
  auto_report_day?: unknown
  report_accent?: unknown
  report_subject?: unknown
  report_intro?: unknown
  report_include_pdf?: unknown
  report_include_excel?: unknown
  member_subject?: unknown
  member_intro?: unknown
}

/** Normalize an optional text field to a trimmed string, null, or an error. */
function optText(value: unknown, max: number): { value: string | null } | { error: string } {
  if (value === null) return { value: null }
  const s = String(value).trim()
  if (s.length === 0) return { value: null }
  if (s.length > max) return { error: `Text ist zu lang (max. ${max} Zeichen).` }
  return { value: s }
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

      // ── Scheduling ──
      if (body.auto_report_enabled !== undefined) {
        update.auto_report_enabled = Boolean(body.auto_report_enabled)
      }
      if (body.auto_report_day !== undefined) {
        if (body.auto_report_day === null || body.auto_report_day === '') {
          update.auto_report_day = null
        } else {
          const day = Number(body.auto_report_day)
          if (!Number.isInteger(day) || day < 1 || day > 28) {
            return res.status(400).json({ error: 'Versandtag muss zwischen 1 und 28 liegen (oder leer für den letzten Tag).' })
          }
          update.auto_report_day = day
        }
      }

      // ── Format ──
      if (body.report_accent !== undefined) {
        const accent = String(body.report_accent).trim()
        if (!HEX_RE.test(accent)) {
          return res.status(400).json({ error: 'Akzentfarbe muss ein Hex-Wert sein (z. B. #D97706).' })
        }
        update.report_accent = accent
      }
      if (body.report_include_pdf !== undefined) {
        update.report_include_pdf = Boolean(body.report_include_pdf)
      }
      if (body.report_include_excel !== undefined) {
        update.report_include_excel = Boolean(body.report_include_excel)
      }
      for (const [key, max] of [
        ['report_subject', SUBJECT_MAX],
        ['report_intro', INTRO_MAX],
        ['member_subject', SUBJECT_MAX],
        ['member_intro', INTRO_MAX],
      ] as const) {
        if (body[key] !== undefined) {
          const parsed = optText(body[key], max)
          if ('error' in parsed) return res.status(400).json({ error: parsed.error })
          update[key] = parsed.value
        }
      }

      const { error } = await supabase.from('app_settings').update(update).eq('id', 1)
      if (error) throw new Error(error.message)
    }

    // Return the current non-secret settings (for both GET and after a PUT).
    const { data, error } = await supabase
      .from('app_settings')
      .select('report_recipients, ceo_email, cc_ceo_on_reports, member_statements_enabled, auto_report_enabled, auto_report_day, report_accent, report_subject, report_intro, report_include_pdf, report_include_excel, member_subject, member_intro, pin_length, pin_updated_at')
      .eq('id', 1)
      .single()
    if (error) throw new Error(error.message)

    // Bootstrap recipients from the ADMIN_EMAIL env var. These are the fallback
    // the report uses while report_recipients is empty. Surfaced (read-only) so
    // the admin can see who currently receives reports even before configuring
    // their own list.
    const bootstrapRecipients = (process.env.ADMIN_EMAIL ?? '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)

    return res.status(200).json({
      report_recipients: data.report_recipients ?? [],
      bootstrap_recipients: bootstrapRecipients,
      ceo_email: data.ceo_email ?? null,
      cc_ceo_on_reports: data.cc_ceo_on_reports,
      member_statements_enabled: data.member_statements_enabled,
      auto_report_enabled: data.auto_report_enabled,
      auto_report_day: data.auto_report_day,
      report_accent: data.report_accent,
      report_subject: data.report_subject,
      report_intro: data.report_intro,
      report_include_pdf: data.report_include_pdf,
      report_include_excel: data.report_include_excel,
      member_subject: data.member_subject,
      member_intro: data.member_intro,
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
