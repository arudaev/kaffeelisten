// GET  /api/admin/settings — read the non-secret admin configuration
// PUT  /api/admin/settings — update recipients, CEO email/CC, member toggle
//
// Session-protected via requireAdmin (signed HttpOnly cookie). Never returns
// admin_pin_hash or the reset token. Service-role only — see
// docs/phase-2-production.md §F.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient, requireAdmin, isDbPinSet } from '../_lib/adminAuth'
import type { Database } from '../../src/lib/database.types'

type SettingsUpdate = Database['public']['Tables']['app_settings']['Update']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEX_RE = /^#[0-9a-fA-F]{6}$/
// IBAN: 2 country letters, 2 check digits, up to 30 alphanumerics (spaces stripped).
const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/
// BIC/SWIFT: 8 or 11 alphanumerics.
const BIC_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/
const SUBJECT_MAX = 200
const INTRO_MAX = 1000
const ISSUER_NAME_MAX = 200
const ISSUER_ADDR_MAX = 500
const PREFIX_MAX = 20
const TERMS_MAX = 300

interface SettingsBody {
  report_recipients?: unknown
  ceo_email?: unknown
  cc_ceo_on_reports?: unknown
  member_statements_enabled?: unknown
  company_documents_enabled?: unknown
  auto_report_enabled?: unknown
  auto_report_day?: unknown
  report_accent?: unknown
  report_subject?: unknown
  report_intro?: unknown
  report_include_pdf?: unknown
  report_include_excel?: unknown
  member_subject?: unknown
  member_intro?: unknown
  max_items_per_order?: unknown
  issue_invoices?: unknown
  issuer_legal_name?: unknown
  issuer_address?: unknown
  issuer_vat_id?: unknown
  issuer_iban?: unknown
  issuer_bic?: unknown
  invoice_number_prefix?: unknown
  invoice_payment_terms?: unknown
  invoice_vat_rate?: unknown
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
    const auth = await requireAdmin(req.headers)
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

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

      if (body.company_documents_enabled !== undefined) {
        update.company_documents_enabled = Boolean(body.company_documents_enabled)
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

      // ── Order limit ──
      if (body.max_items_per_order !== undefined) {
        if (body.max_items_per_order === null || body.max_items_per_order === '') {
          update.max_items_per_order = null
        } else {
          const max = Number(body.max_items_per_order)
          if (!Number.isInteger(max) || max < 1 || max > 999) {
            return res.status(400).json({ error: 'Limit muss zwischen 1 und 999 liegen (oder leer für unbegrenzt).' })
          }
          update.max_items_per_order = max
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

      // ── Invoice mode + ITC1 issuer block ──
      // The document is always ITC1's — these are ITC1's own details, entered by
      // the admin (never a developer's). See docs/prd-billing-commercial-addendum.md.
      for (const [key, max] of [
        ['issuer_legal_name', ISSUER_NAME_MAX],
        ['issuer_address', ISSUER_ADDR_MAX],
        ['invoice_number_prefix', PREFIX_MAX],
        ['invoice_payment_terms', TERMS_MAX],
      ] as const) {
        if (body[key] !== undefined) {
          const parsed = optText(body[key], max)
          if ('error' in parsed) return res.status(400).json({ error: parsed.error })
          update[key] = parsed.value
        }
      }
      if (body.issuer_vat_id !== undefined) {
        const vat = body.issuer_vat_id === null ? '' : String(body.issuer_vat_id).replace(/\s+/g, '').toUpperCase()
        if (vat && (vat.length < 4 || vat.length > 20)) {
          return res.status(400).json({ error: 'USt-IdNr ist ungültig.' })
        }
        update.issuer_vat_id = vat || null
      }
      if (body.issuer_iban !== undefined) {
        const iban = body.issuer_iban === null ? '' : String(body.issuer_iban).replace(/\s+/g, '').toUpperCase()
        if (iban && !IBAN_RE.test(iban)) {
          return res.status(400).json({ error: 'IBAN ist ungültig.' })
        }
        update.issuer_iban = iban || null
      }
      if (body.issuer_bic !== undefined) {
        const bic = body.issuer_bic === null ? '' : String(body.issuer_bic).replace(/\s+/g, '').toUpperCase()
        if (bic && !BIC_RE.test(bic)) {
          return res.status(400).json({ error: 'BIC ist ungültig.' })
        }
        update.issuer_bic = bic || null
      }
      if (body.invoice_vat_rate !== undefined) {
        const rate = Number(body.invoice_vat_rate)
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
          return res.status(400).json({ error: 'USt-Satz muss zwischen 0 und 100 liegen.' })
        }
        update.invoice_vat_rate = rate
      }
      if (body.issue_invoices !== undefined) {
        update.issue_invoices = Boolean(body.issue_invoices)
      }

      // Guard: invoice mode may only be ON when the mandatory issuer fields are
      // set (in this request or already stored). Prevents issuing a document with
      // no issuer, VAT id, or receiving account.
      const willInvoice =
        update.issue_invoices !== undefined ? update.issue_invoices : undefined
      if (willInvoice === true || update.issuer_iban !== undefined || update.issuer_bic !== undefined
        || update.issuer_vat_id !== undefined || update.issuer_legal_name !== undefined) {
        const { data: cur, error: curErr } = await supabase
          .from('app_settings')
          .select('issue_invoices, issuer_legal_name, issuer_vat_id, issuer_iban, issuer_bic')
          .eq('id', 1).single()
        if (curErr) throw new Error(curErr.message)
        const eff = (k: 'issuer_legal_name' | 'issuer_vat_id' | 'issuer_iban' | 'issuer_bic') =>
          (k in update ? (update[k] as string | null) : cur[k])
        const effOn = update.issue_invoices !== undefined ? update.issue_invoices : cur.issue_invoices
        if (effOn) {
          const labels: Record<string, string> = {
            issuer_legal_name: 'Aussteller-Name',
            issuer_vat_id: 'USt-IdNr',
            issuer_iban: 'IBAN',
            issuer_bic: 'BIC',
          }
          const missing = (['issuer_legal_name', 'issuer_vat_id', 'issuer_iban', 'issuer_bic'] as const)
            .filter((k) => !eff(k))
            .map((k) => labels[k])
          if (missing.length > 0) {
            return res.status(400).json({
              error: `Rechnungsmodus benötigt vollständige Ausstellerdaten. Fehlt: ${missing.join(', ')}.`,
            })
          }
        }
      }

      const { error } = await supabase.from('app_settings').update(update).eq('id', 1)
      if (error) throw new Error(error.message)
    }

    // Return the current non-secret settings (for both GET and after a PUT).
    const { data, error } = await supabase
      .from('app_settings')
      .select('report_recipients, ceo_email, cc_ceo_on_reports, member_statements_enabled, company_documents_enabled, auto_report_enabled, auto_report_day, report_accent, report_subject, report_intro, report_include_pdf, report_include_excel, member_subject, member_intro, max_items_per_order, issue_invoices, issuer_legal_name, issuer_address, issuer_vat_id, issuer_iban, issuer_bic, invoice_number_prefix, invoice_payment_terms, invoice_vat_rate, pin_length, pin_updated_at')
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
      company_documents_enabled: data.company_documents_enabled,
      auto_report_enabled: data.auto_report_enabled,
      auto_report_day: data.auto_report_day,
      report_accent: data.report_accent,
      report_subject: data.report_subject,
      report_intro: data.report_intro,
      report_include_pdf: data.report_include_pdf,
      report_include_excel: data.report_include_excel,
      member_subject: data.member_subject,
      member_intro: data.member_intro,
      max_items_per_order: data.max_items_per_order,
      issue_invoices: data.issue_invoices,
      issuer_legal_name: data.issuer_legal_name,
      issuer_address: data.issuer_address,
      issuer_vat_id: data.issuer_vat_id,
      issuer_iban: data.issuer_iban,
      issuer_bic: data.issuer_bic,
      invoice_number_prefix: data.invoice_number_prefix,
      invoice_payment_terms: data.invoice_payment_terms,
      invoice_vat_rate: data.invoice_vat_rate,
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
