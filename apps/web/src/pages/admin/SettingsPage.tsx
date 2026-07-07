// Admin Settings page (Phase 2, workstream F).
// Report recipients, CEO CC, per-member statement toggle, and admin-PIN
// management (change + reset). All persistence goes through the PIN-protected
// serverless endpoints in apps/web/api/admin/* — see docs/phase-2-production.md.

import { useEffect, useState } from 'react'
import { Topbar } from '../../components/admin/Topbar'
import Modal from '../../components/admin/Modal'
import AdminButton from '../../components/admin/AdminButton'
import AdminField from '../../components/admin/AdminField'
import AdminIcon from '../../components/admin/AdminIcon'
import Badge from '../../components/admin/Badge'
import Toggle from '../../components/admin/Toggle'
import AdminSelect from '../../components/admin/AdminSelect'
import PinInput from '../../components/admin/PinInput'
import { adminApi, type BillingDocument } from '../../lib/adminApi'
import TemplateField from '../../components/admin/TemplateField'
import DayGridPicker from '../../components/admin/DayGridPicker'
import SegmentedControl from '../../components/admin/SegmentedControl'
import PalettePreviewCard from '../../components/admin/PalettePreviewCard'
import { COMPANY_PLACEHOLDERS, MEMBER_PLACEHOLDERS } from '../../lib/reportPlaceholders'
import { allPalettes, findPalette, customPalettes, CUSTOM_SLOTS } from '../../lib/palettes'
import { useTheme } from '../../lib/theme-context'
import type { ThemeMode } from '../../lib/theme-context'

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

type CustomMap = Record<string, { name: string; light: string; dark: string }>

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'System' },
]

// Compact colour + hex row used by the custom-palette editor.
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-label={label}
          className="h-11 w-14 rounded border border-border bg-surface cursor-pointer p-1"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-label={`${label} Hex`}
          className="h-11 w-28 px-3 rounded border border-border bg-surface-2 focus:bg-surface text-base text-fg outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent font-mono"
        />
      </div>
    </label>
  )
}

interface SettingsData {
  report_recipients: string[]
  bootstrap_recipients: string[]
  ceo_email: string | null
  cc_ceo_on_reports: boolean
  member_statements_enabled: boolean
  company_documents_enabled: boolean
  member_paid_grid_enabled: boolean
  auto_report_enabled: boolean
  auto_report_day: number | null
  max_items_per_order: number | null
  report_accent: string
  report_subject: string | null
  report_intro: string | null
  report_include_pdf: boolean
  report_include_excel: boolean
  member_subject: string | null
  member_intro: string | null
  issue_invoices: boolean
  issuer_legal_name: string | null
  issuer_address: string | null
  issuer_vat_id: string | null
  issuer_iban: string | null
  issuer_bic: string | null
  invoice_number_prefix: string | null
  invoice_payment_terms: string | null
  invoice_vat_rate: number
  pin_length: number
  pin_updated_at: string | null
  pin_is_set: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatDay(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function euro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

// The report always covers the previous, closed month; `autoDay` (default 1) is
// the day of the following month it goes out. This shows the next such send date:
// the configured day of the current month if still ahead, otherwise next month.
// Display hint only — the cron evaluates the authoritative check in Europe/Berlin.
function nextSendLabel(autoDay: number | null): string {
  const now = new Date()
  const daysThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dueDay = Math.max(1, Math.min(autoDay ?? 1, daysThisMonth))
  const monthOffset = now.getDate() <= dueDay ? 0 : 1
  const next = new Date(now.getFullYear(), now.getMonth() + monthOffset, dueDay)
  return next.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function SettingsPage({ onToast, onMenuClick }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable settings state
  const [recipients, setRecipients] = useState<string[]>([])
  const [bootstrapRecipients, setBootstrapRecipients] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [ceoEmail, setCeoEmail] = useState('')
  const [ceoCc, setCeoCc] = useState(true)
  const [memberReport, setMemberReport] = useState(true)
  const [companyDocs, setCompanyDocs] = useState(true)
  const [paidGridEnabled, setPaidGridEnabled] = useState(false)

  // Scheduling
  const [autoEnabled, setAutoEnabled] = useState(true)
  const [autoDay, setAutoDay] = useState<number | null>(null)
  // Per-order item cap ('' = unlimited).
  const [maxItemsInput, setMaxItemsInput] = useState('')

  // Format
  const [includePdf, setIncludePdf] = useState(true)
  const [includeExcel, setIncludeExcel] = useState(true)
  const [reportSubject, setReportSubject] = useState('')
  const [reportIntro, setReportIntro] = useState('')
  const [memberSubject, setMemberSubject] = useState('')
  const [memberIntro, setMemberIntro] = useState('')

  // Invoice mode + ITC1 issuer block (these are ITC1's own details).
  const [issueInvoices, setIssueInvoices] = useState(false)
  const [issuerLegalName, setIssuerLegalName] = useState('')
  const [issuerAddress, setIssuerAddress] = useState('')
  const [issuerVatId, setIssuerVatId] = useState('')
  const [issuerIban, setIssuerIban] = useState('')
  const [issuerBic, setIssuerBic] = useState('')
  const [invoiceNumberPrefix, setInvoiceNumberPrefix] = useState('')
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState('')
  const [invoiceVatRate, setInvoiceVatRate] = useState('19')

  // Invoice ledger — paid/unpaid status (feature E). The card only appears once
  // at least one invoice run has produced documents.
  const [billingMonths, setBillingMonths] = useState<string[]>([])
  const [billingMonth, setBillingMonth] = useState<string>('')
  const [billingDocs, setBillingDocs] = useState<BillingDocument[]>([])
  const [billingLoading, setBillingLoading] = useState(false)

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  // Read-only PIN metadata
  const [pinLength, setPinLength] = useState(6)
  const [pinUpdatedAt, setPinUpdatedAt] = useState<string | null>(null)
  const [pinIsSet, setPinIsSet] = useState(false)

  // Appearance / theme
  const { setPalette, setMode, palette: currentPalette } = useTheme()
  const [themeDefaultMode, setThemeDefaultMode] = useState<ThemeMode>('system')
  // Start from the currently-active palette so the picker highlights it and the
  // live-preview effect never resets to the default while the theme loads.
  const [activePalette, setActivePalette] = useState(currentPalette.id)
  const [customMap, setCustomMap] = useState<CustomMap>({})
  const [themeReady, setThemeReady] = useState(false)

  // Modals
  const [modal, setModal] = useState<'change' | null>(null)

  // PIN change form
  const [curPin, setCurPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [changeError, setChangeError] = useState('')
  const [changeSaving, setChangeSaving] = useState(false)

  const applySettings = (d: SettingsData) => {
    setRecipients(d.report_recipients ?? [])
    setBootstrapRecipients(d.bootstrap_recipients ?? [])
    setCeoEmail(d.ceo_email ?? '')
    setCeoCc(d.cc_ceo_on_reports)
    setMemberReport(d.member_statements_enabled)
    setCompanyDocs(d.company_documents_enabled)
    setPaidGridEnabled(d.member_paid_grid_enabled)
    setAutoEnabled(d.auto_report_enabled)
    setAutoDay(d.auto_report_day)
    setMaxItemsInput(d.max_items_per_order != null ? String(d.max_items_per_order) : '')
    setIncludePdf(d.report_include_pdf)
    setIncludeExcel(d.report_include_excel)
    setReportSubject(d.report_subject ?? '')
    setReportIntro(d.report_intro ?? '')
    setMemberSubject(d.member_subject ?? '')
    setMemberIntro(d.member_intro ?? '')
    setIssueInvoices(d.issue_invoices)
    setIssuerLegalName(d.issuer_legal_name ?? '')
    setIssuerAddress(d.issuer_address ?? '')
    setIssuerVatId(d.issuer_vat_id ?? '')
    setIssuerIban(d.issuer_iban ?? '')
    setIssuerBic(d.issuer_bic ?? '')
    setInvoiceNumberPrefix(d.invoice_number_prefix ?? '')
    setInvoicePaymentTerms(d.invoice_payment_terms ?? '')
    setInvoiceVatRate(d.invoice_vat_rate != null ? String(d.invoice_vat_rate) : '19')
    setPinLength(d.pin_length)
    setPinUpdatedAt(d.pin_updated_at)
    setPinIsSet(d.pin_is_set)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [res, tRes] = await Promise.all([
          fetch('/api/admin/settings'),
          fetch('/api/admin/theme'),
        ])
        if (res.ok) {
          const data = (await res.json()) as SettingsData
          if (!cancelled) applySettings(data)
        } else if (!cancelled) {
          onToast('Einstellungen konnten nicht geladen werden.')
        }
        if (tRes.ok && !cancelled) {
          const t = (await tRes.json()) as {
            default_mode: ThemeMode
            active_palette: string
            custom: Record<string, unknown>
          }
          setThemeDefaultMode(t.default_mode)
          setActivePalette(t.active_palette)
          const cm: CustomMap = {}
          for (const p of customPalettes(t.custom)) cm[p.id] = { name: p.name, light: p.lightAccent, dark: p.darkAccent }
          setCustomMap(cm)
          setThemeReady(true)
        }
      } catch {
        if (!cancelled) onToast('Einstellungen konnten nicht geladen werden.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [onToast])

  // Live preview: reflect the selected palette / custom edits app-wide immediately.
  // Gated until the theme has loaded, so we never momentarily apply the default
  // palette while the fetch is in flight.
  useEffect(() => {
    if (!themeReady) return
    setPalette(findPalette(activePalette, customMap))
  }, [themeReady, activePalette, customMap, setPalette])

  const updateCustom = (slot: string, patch: Partial<{ name: string; light: string; dark: string }>) =>
    setCustomMap(m => {
      const base = m[slot] ?? { name: '', light: '#D97706', dark: '#F59E0B' }
      return { ...m, [slot]: { ...base, ...patch } }
    })

  // ── Invoice ledger (paid status) ──
  const loadBilling = async (month?: string) => {
    setBillingLoading(true)
    try {
      const { documents, months } = await adminApi.getBillingDocuments(month)
      setBillingMonths(months)
      setBillingDocs(documents)
      setBillingMonth(documents[0]?.report_month ?? month ?? months[0] ?? '')
    } catch {
      /* the ledger is optional — ignore if it isn't reachable */
    } finally {
      setBillingLoading(false)
    }
  }

  useEffect(() => { void loadBilling() }, [])

  const changeBillingMonth = (m: string) => { setBillingMonth(m); void loadBilling(m) }

  const togglePaid = async (doc: BillingDocument) => {
    const next = !doc.paid
    setBillingDocs(docs => docs.map(d => (d.id === doc.id ? { ...d, paid: next } : d)))
    try {
      await adminApi.setBillingPaid(doc.id, next)
    } catch {
      setBillingDocs(docs => docs.map(d => (d.id === doc.id ? { ...d, paid: doc.paid } : d)))
      onToast('Status konnte nicht gespeichert werden.')
    }
  }

  const addRecipient = () => {
    const v = newEmail.trim()
    if (!EMAIL_RE.test(v)) {
      setEmailError('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    if (recipients.includes(v)) {
      setEmailError('Diese Adresse ist bereits hinterlegt.')
      return
    }
    setRecipients(r => [...r, v])
    setNewEmail('')
    setEmailError('')
  }

  const removeRecipient = (email: string) => setRecipients(r => r.filter(e => e !== email))

  // The format fields as the API expects them (used for both save and preview).
  const formatPayload = () => ({
    report_subject: reportSubject.trim() || null,
    report_intro: reportIntro.trim() || null,
    report_include_pdf: includePdf,
    report_include_excel: includeExcel,
    member_subject: memberSubject.trim() || null,
    member_intro: memberIntro.trim() || null,
  })

  // Mandatory issuer fields when invoice mode is on (mirrors the server guard).
  const invoiceMissing = issueInvoices
    ? [
        !issuerLegalName.trim() && 'Aussteller-Name',
        !issuerVatId.trim() && 'USt-IdNr',
        !issuerIban.trim() && 'IBAN',
        !issuerBic.trim() && 'BIC',
      ].filter(Boolean) as string[]
    : []

  const save = async () => {
    if (ceoEmail.trim() && !EMAIL_RE.test(ceoEmail.trim())) {
      onToast('Ungültige CEO-E-Mail-Adresse.')
      return
    }
    if (invoiceMissing.length > 0) {
      onToast(`Rechnungsmodus benötigt vollständige Ausstellerdaten. Fehlt: ${invoiceMissing.join(', ')}.`)
      return
    }
    setSaving(true)
    try {
      // Save the report settings and the appearance (theme) together.
      const [res, tRes] = await Promise.all([
        fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_recipients: recipients,
            ceo_email: ceoEmail.trim() || null,
            cc_ceo_on_reports: ceoCc,
            member_statements_enabled: memberReport,
            company_documents_enabled: companyDocs,
            member_paid_grid_enabled: paidGridEnabled,
            auto_report_enabled: autoEnabled,
            auto_report_day: autoDay,
            max_items_per_order: maxItemsInput.trim() === '' ? null : Number(maxItemsInput),
            ...formatPayload(),
            issue_invoices: issueInvoices,
            issuer_legal_name: issuerLegalName.trim() || null,
            issuer_address: issuerAddress.trim() || null,
            issuer_vat_id: issuerVatId.trim() || null,
            issuer_iban: issuerIban.trim() || null,
            issuer_bic: issuerBic.trim() || null,
            invoice_number_prefix: invoiceNumberPrefix.trim() || null,
            invoice_payment_terms: invoicePaymentTerms.trim() || null,
            invoice_vat_rate: invoiceVatRate.trim() === '' ? 19 : Number(invoiceVatRate),
          }),
        }),
        fetch('/api/admin/theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            default_mode: themeDefaultMode,
            active_palette: activePalette,
            custom: customMap,
          }),
        }),
      ])
      if (res.ok) applySettings((await res.json()) as SettingsData)
      if (res.ok && tRes.ok) {
        onToast('Einstellungen gespeichert.')
      } else {
        const err = await res.json().catch(() => ({}))
        onToast(err.error ?? 'Speichern fehlgeschlagen.')
      }
    } catch {
      onToast('Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  // The ITC1 issuer fields as the preview API expects them (unsaved values, so the
  // invoice preview reflects what the admin is currently typing).
  const issuerPayload = () => ({
    issue_invoices: issueInvoices,
    issuer_legal_name: issuerLegalName,
    issuer_address: issuerAddress,
    issuer_vat_id: issuerVatId,
    issuer_iban: issuerIban,
    issuer_bic: issuerBic,
    invoice_number_prefix: invoiceNumberPrefix,
    invoice_payment_terms: invoicePaymentTerms,
    invoice_vat_rate: invoiceVatRate.trim() === '' ? 19 : Number(invoiceVatRate),
  })

  // ── Preview ─────────────────────────────────────────────────────────────────
  const openPreview = async (
    type: 'admin' | 'company' | 'member',
    variant: 'report' | 'invoice',
    title: string,
  ) => {
    setPreviewOpen(true)
    setPreviewTitle(title)
    setPreviewLoading(true)
    setPreviewHtml('')
    setPreviewSubject('')
    try {
      const res = await fetch('/api/admin/preview-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, variant, format: formatPayload(), issuer: issuerPayload() }),
      })
      if (res.ok) {
        const data = (await res.json()) as { html: string; subject: string }
        setPreviewHtml(data.html)
        setPreviewSubject(data.subject)
      } else {
        onToast('Vorschau konnte nicht geladen werden.')
        setPreviewOpen(false)
      }
    } catch {
      onToast('Vorschau konnte nicht geladen werden.')
      setPreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── PIN change ──────────────────────────────────────────────────────────────
  const openChange = () => {
    setCurPin(''); setNextPin(''); setConfirmPin(''); setChangeError('')
    setModal('change')
  }

  const submitChange = async () => {
    if (nextPin.length !== pinLength) {
      setChangeError(`Die neue PIN muss ${pinLength}-stellig sein.`)
      return
    }
    if (nextPin !== confirmPin) {
      setChangeError('Die neue PIN stimmt nicht mit der Bestätigung überein.')
      return
    }
    setChangeSaving(true)
    setChangeError('')
    try {
      const res = await fetch('/api/admin/auth?action=change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: curPin, newPin: nextPin }),
      })
      if (res.ok) {
        // The session cookie stays valid across a PIN change (it isn't tied to
        // the PIN value), so no client-side credential needs updating.
        setModal(null)
        onToast('PIN erfolgreich geändert.')
        void refreshPinMeta()
      } else {
        const err = await res.json().catch(() => ({}))
        setChangeError(err.error ?? 'PIN konnte nicht geändert werden.')
      }
    } catch {
      setChangeError('PIN konnte nicht geändert werden.')
    } finally {
      setChangeSaving(false)
    }
  }

  const refreshPinMeta = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) applySettings((await res.json()) as SettingsData)
    } catch { /* non-fatal */ }
  }

  // Env fallback recipients not already in the editable list — shown read-only.
  const lockedBootstrap = bootstrapRecipients.filter(e => !recipients.includes(e))

  const pinSubtitle = pinIsSet
    ? `PIN-Länge: ${pinLength}-stellig${pinUpdatedAt ? ` · zuletzt geändert am ${formatDay(pinUpdatedAt)}` : ''}`
    : `PIN-Länge: ${pinLength}-stellig · Standard-PIN aktiv (noch nicht geändert)`

  return (
    <>
      <Topbar title="Einstellungen" eyebrow="Administration" onMenuClick={onMenuClick} />

      <div className="p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-[720px] flex flex-col gap-6">

          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 rounded-lg bg-surface-2 animate-pulse" />
              ))}
            </>
          ) : (
            <>
              {/* Card 0 — Erscheinungsbild / Theme */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Erscheinungsbild</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Standard-Modus und Marken-Palette der App — gilt für den Mitglieder- und den Admin-Bereich.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Standard-Modus</span>
                  <SegmentedControl
                    ariaLabel="Standard-Modus"
                    value={themeDefaultMode}
                    onChange={m => { setThemeDefaultMode(m); setMode(m) }}
                    options={MODE_OPTIONS}
                  />
                  <p className="text-[13px] text-fg-muted leading-relaxed">
                    Gilt für alle: „Hell“ bzw. „Dunkel“ erzwingt das Erscheinungsbild für Mitglieder und Admins; „System“ folgt dem Gerät der jeweiligen Person.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Marken-Palette</span>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {allPalettes(customMap).map(p => (
                      <PalettePreviewCard
                        key={p.id}
                        palette={p}
                        selected={activePalette === p.id}
                        onSelect={() => setActivePalette(p.id)}
                      />
                    ))}
                  </div>
                  {(CUSTOM_SLOTS as readonly string[]).includes(activePalette) && (
                    <div className="mt-1 flex flex-col gap-3 border border-border rounded-lg p-4 bg-surface-2">
                      <AdminField
                        label="Name der Palette"
                        value={customMap[activePalette]?.name ?? ''}
                        onChange={e => updateCustom(activePalette, { name: e.target.value })}
                        placeholder="z. B. Firmenfarben"
                      />
                      <div className="flex flex-wrap gap-6">
                        <ColorRow
                          label="Akzent (Hell)"
                          value={customMap[activePalette]?.light ?? '#D97706'}
                          onChange={v => updateCustom(activePalette, { light: v })}
                        />
                        <ColorRow
                          label="Akzent (Dunkel)"
                          value={customMap[activePalette]?.dark ?? '#F59E0B'}
                          onChange={v => updateCustom(activePalette, { dark: v })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[13px] text-fg-muted leading-relaxed border-t border-border pt-4">
                  Änderungen erscheinen sofort in der Vorschau. Mit „Speichern“ unten werden sie für alle wirksam.
                </p>
              </section>

              {/* Card 1 — Berichts-Empfänger */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-[18px]">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Berichts-Empfänger</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">Diese Adressen erhalten den monatlichen Bericht.</p>
                </div>

                {recipients.length > 0 || lockedBootstrap.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {recipients.map(email => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-2 bg-surface-2 border border-border rounded-md pl-3 pr-2 py-1.5 text-sm font-medium text-fg"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeRecipient(email)}
                            aria-label={`${email} entfernen`}
                            className="inline-flex items-center justify-center w-[22px] h-[22px] rounded text-fg-subtle hover:bg-border hover:text-fg-muted transition-colors"
                          >
                            <AdminIcon name="close" size={14} strokeWidth={2} />
                          </button>
                        </span>
                      ))}
                      {/* Read-only fallback recipients from the ADMIN_EMAIL env var. */}
                      {lockedBootstrap.map(email => (
                        <span
                          key={email}
                          title="Aus der Serverkonfiguration (ADMIN_EMAIL)"
                          className="inline-flex items-center gap-2 bg-bg border border-dashed border-border-strong rounded-md pl-3 pr-2.5 py-1.5 text-sm font-medium text-fg-subtle"
                        >
                          {email}
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle bg-border/70 rounded px-1.5 py-0.5">
                            Server
                          </span>
                        </span>
                      ))}
                    </div>
                    {lockedBootstrap.length > 0 && (
                      <p className="text-[13px] text-fg-muted leading-relaxed">
                        {recipients.length > 0
                          ? 'Grau hinterlegte Adressen stammen aus der Serverkonfiguration (ADMIN_EMAIL) und sind inaktiv, solange eigene Empfänger hinterlegt sind.'
                          : 'Grau hinterlegte Adressen stammen aus der Serverkonfiguration (ADMIN_EMAIL) und erhalten den Bericht, bis du eigene Empfänger hinzufügst.'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-3 items-start bg-accent-subtle border border-accent rounded-lg px-4 py-3.5">
                    <span className="flex-none w-5 h-5 rounded-full bg-accent text-white text-[13px] font-bold leading-5 text-center">!</span>
                    <p className="text-sm font-medium text-accent leading-relaxed">
                      Noch keine Empfänger — der Bericht wird sonst an niemanden gesendet.
                    </p>
                  </div>
                )}

                <div className="flex gap-2.5 items-start">
                  <div className="flex-1 min-w-0">
                    <AdminField
                      type="email"
                      placeholder="name@firma.de"
                      value={newEmail}
                      onChange={e => { setNewEmail(e.target.value); setEmailError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRecipient() } }}
                      error={emailError || undefined}
                    />
                  </div>
                  <AdminButton variant="primary" onClick={addRecipient}>Hinzufügen</AdminButton>
                </div>
              </section>

              {/* Card 2 — Geschäftsführung (CEO) */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-[18px]">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Geschäftsführung (CEO)</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Die Geschäftsführung wird bei jedem Versand automatisch in Kopie gesetzt.
                  </p>
                </div>
                <AdminField
                  label="CEO-E-Mail (in Kopie bei jedem Bericht)"
                  type="email"
                  placeholder="geschaeftsfuehrung@firma.de"
                  value={ceoEmail}
                  onChange={e => setCeoEmail(e.target.value)}
                />
                <div className="flex flex-col gap-2 pt-0.5">
                  <Toggle checked={ceoCc} onChange={setCeoCc} label="Geschäftsführung bei jedem Bericht in CC" />
                  <p className="ml-[54px] text-[13px] text-fg-muted leading-relaxed">
                    Gilt sowohl für den manuellen als auch für den automatischen Monatsende-Versand.
                  </p>
                </div>
              </section>

              {/* Card 3 — Mitglieder-Monatsbericht */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Mitglieder-Monatsbericht</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Persönliche Aufstellung für jede Person zusätzlich zum Firmenbericht.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-0.5">
                  <Toggle checked={memberReport} onChange={setMemberReport} label="Jede Person erhält am Monatsende ihre eigene Aufstellung" />
                  <p className="ml-[54px] text-[13px] text-fg-muted leading-relaxed">
                    Zusätzlich zum Firmenbericht. Nur Personen mit hinterlegter Arbeits-E-Mail werden angeschrieben.
                  </p>
                </div>
              </section>

              {/* Card 3b — Zahlungsübersicht (inline paid grid) */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Zahlungsübersicht</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Zeigt in der Liste „Mitarbeitende“ pro Person die letzten drei Monate als
                    Bezahlt-Kästchen — zum schnellen Abhaken, wer bezahlt hat.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-0.5">
                  <Toggle checked={paidGridEnabled} onChange={setPaidGridEnabled} label="Bezahlt-Spalte in „Mitarbeitende“ anzeigen" />
                  <p className="ml-[54px] text-[13px] text-fg-muted leading-relaxed">
                    Standardmäßig aus. Die ausführliche Monatsübersicht pro Person bleibt über die
                    Schaltfläche „Zahlungen“ immer erreichbar.
                  </p>
                </div>
              </section>

              {/* Card 4 — Sicherheit / Admin-PIN */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-[18px]">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Sicherheit — Admin-PIN</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">{pinSubtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <AdminButton variant="secondary" onClick={openChange}>PIN ändern</AdminButton>
                </div>
                <p className="text-[13px] text-fg-muted leading-relaxed">
                  PIN vergessen oder ausgesperrt? Die Zurücksetzung per E-Mail-Code erfolgt direkt auf der{' '}
                  <span className="font-medium text-fg">Anmeldeseite</span> („PIN vergessen?“).
                </p>
              </section>

              {/* Card 5 — Bericht-Status */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-fg">Bericht-Status</h3>
                  <Badge kind="active">Automatisch aktiv</Badge>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-border">
                    <span className="text-sm text-fg-muted">Nächster automatischer Versand</span>
                    <span className="text-sm font-semibold text-fg">{nextSendLabel(autoDay)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-fg-muted">Mitglieder-Aufstellungen</span>
                    <span className="text-sm font-semibold text-fg">{memberReport ? 'Aktiv' : 'Inaktiv'}</span>
                  </div>
                </div>
              </section>

              {/* Card 6 — Automatischer Versand */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-[18px]">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Automatischer Versand</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Steuere, ob und wann der Monatsbericht automatisch versendet wird.
                  </p>
                </div>
                <Toggle checked={autoEnabled} onChange={setAutoEnabled} label="Monatsbericht automatisch senden" />
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Versandtag</span>
                  <DayGridPicker value={autoDay} onChange={setAutoDay} disabled={!autoEnabled} />
                  <p className="text-[13px] text-fg-muted leading-relaxed">
                    Der Bericht umfasst immer den abgeschlossenen Vormonat und geht am gewählten
                    Tag des Folgemonats abends (22:00) raus. Wird ein Tag verpasst, holt das
                    System den Versand automatisch nach.
                  </p>
                </div>
              </section>

              {/* Card 6b — Bestellung */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-[18px]">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Bestellung</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Begrenze, wie viele Artikel eine Person in einer Bestellung erfassen kann.
                  </p>
                </div>
                <div className="max-w-[220px]">
                  <AdminField
                    label="Max. Artikel pro Bestellung"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={999}
                    value={maxItemsInput}
                    onChange={e => setMaxItemsInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Unbegrenzt"
                    hint="Leer lassen für unbegrenzt."
                  />
                </div>
              </section>

              {/* Card 6b2 — Firmendokumente (per-company report/invoice) */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Firmendokumente</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Zusätzlich zum Admin-/CEO-Bericht erhält jede Firma mit hinterlegtem Rechnungskontakt
                    ihr eigenes Monatsdokument: eine Aufstellung, oder eine Rechnung, wenn die Firma den
                    Kaffee übernimmt („Firma zahlt“ unter Unternehmen).
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-0.5">
                  <Toggle checked={companyDocs} onChange={setCompanyDocs} label="Jede Firma erhält ihr eigenes Monatsdokument" />
                  <p className="ml-[54px] text-[13px] text-fg-muted leading-relaxed">
                    Firmen ohne Rechnungskontakt werden übersprungen. Rechnungen erscheinen nur, wenn die
                    Rechnungsstellung unten ausgefüllt ist — sonst wird eine Aufstellung versendet.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="text-sm font-semibold text-fg">Vorschau Firmendokument</span>
                  <div className="flex gap-2">
                    <AdminButton variant="secondary" size="sm" onClick={() => openPreview('company', 'report', 'Firmen-Aufstellung')}>Aufstellung</AdminButton>
                    <AdminButton variant="secondary" size="sm" onClick={() => openPreview('company', 'invoice', 'Firmen-Rechnung')}>Rechnung</AdminButton>
                  </div>
                </div>
              </section>

              {/* Card 6c — Rechnungsstellung */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Rechnungsstellung</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Versende die monatlichen E-Mails als Rechnung von ITC1 statt als reine Aufstellung —
                    mit Rechnungsnummer und Zahlungsdaten. Alle Felder sind ITC1s eigene Ausstellerdaten
                    (aus der Kaffeerechnung-Vorlage übernehmbar).
                  </p>
                </div>
                <Toggle
                  checked={issueInvoices}
                  onChange={setIssueInvoices}
                  label="Rechnungen statt Aufstellungen versenden"
                />
                {issueInvoices && (
                  <div className="flex flex-col gap-4 border-t border-border pt-4">
                    <AdminField
                      label="Aussteller (Firmenname)"
                      value={issuerLegalName}
                      onChange={e => setIssuerLegalName(e.target.value)}
                      placeholder="ITC Innovations Technologie Campus GmbH"
                      required
                    />
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Adresse</span>
                      <textarea
                        value={issuerAddress}
                        onChange={e => setIssuerAddress(e.target.value)}
                        rows={2}
                        placeholder={'Ulrichsberger Str. 17\n94469 Deggendorf'}
                        className="w-full border border-border rounded bg-surface-2 focus:bg-surface px-3 py-2 text-base text-fg outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent resize-y"
                      />
                    </label>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <AdminField
                        label="USt-IdNr"
                        value={issuerVatId}
                        onChange={e => setIssuerVatId(e.target.value)}
                        placeholder="DE207285819"
                        required
                      />
                      <AdminField
                        label="USt-Satz (%)"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        value={invoiceVatRate}
                        onChange={e => setInvoiceVatRate(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder="19"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <AdminField
                        label="IBAN (Empfangskonto)"
                        value={issuerIban}
                        onChange={e => setIssuerIban(e.target.value)}
                        placeholder="DE33 7415 0000 0380 0093 40"
                        hint="ITC1s Konto — hierhin überweisen die Mitarbeitenden."
                        required
                      />
                      <AdminField
                        label="BIC"
                        value={issuerBic}
                        onChange={e => setIssuerBic(e.target.value)}
                        placeholder="BYLADEM1DEG"
                        required
                      />
                    </div>
                    <AdminField
                      label="Rechnungsnummer-Präfix"
                      value={invoiceNumberPrefix}
                      onChange={e => setInvoiceNumberPrefix(e.target.value)}
                      placeholder="K-"
                      hint="Die laufende Nummer wird angehängt, z. B. K-000042."
                    />
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Zahlungsbedingungen</span>
                      <textarea
                        value={invoicePaymentTerms}
                        onChange={e => setInvoicePaymentTerms(e.target.value)}
                        rows={2}
                        placeholder="Zahlung ohne Abzug innerhalb 14 Tagen nach Rechnungsstellung."
                        className="w-full border border-border rounded bg-surface-2 focus:bg-surface px-3 py-2 text-base text-fg outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent resize-y"
                      />
                    </label>
                    {invoiceMissing.length > 0 && (
                      <p className="text-[13px] text-error">Pflichtangaben fehlen: {invoiceMissing.join(', ')}.</p>
                    )}
                    <p className="text-[13px] text-fg-muted leading-relaxed border-t border-border pt-3">
                      Hinweis: Kaffeelisten erstellt die Rechnung im Auftrag von ITC1 (Rechnungssteller).
                      Wortlaut, USt und Aufbewahrung mit ITC1s Steuerberatung abstimmen.
                    </p>
                  </div>
                )}
              </section>

              {/* Card 7 — Berichts-/Rechnungs-Format */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">{issueInvoices ? 'Rechnungs-Format' : 'Berichts-Format'}</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Betreff und Einleitung der E-Mails, plus Anhänge des Firmenberichts. Klicke auf die
                    Platzhalter, um sie einzufügen — die Beispielzeile zeigt das fertige Ergebnis.
                  </p>
                </div>

                {/* Attachments */}
                <div className="flex flex-col gap-2 pt-0.5">
                  <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Anhänge (Firmenbericht)</span>
                  <Toggle checked={includePdf} onChange={setIncludePdf} label="PDF anhängen" />
                  <Toggle checked={includeExcel} onChange={setIncludeExcel} label="Excel anhängen" />
                  <p className="text-[13px] text-fg-muted leading-relaxed">
                    Die Akzentfarbe der E-Mails folgt der Marken-Palette unter „Erscheinungsbild“.
                  </p>
                </div>

                {/* Company report copy */}
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-fg">Admin-/CEO-Bericht (alle Firmen)</span>
                    <AdminButton variant="secondary" size="sm" onClick={() => openPreview('admin', 'report', 'Admin-/CEO-Bericht')}>Vorschau</AdminButton>
                  </div>
                  <TemplateField
                    label="Betreff"
                    value={reportSubject}
                    onChange={setReportSubject}
                    placeholders={COMPANY_PLACEHOLDERS}
                    placeholder="Kaffeelisten – Monatsbericht {monat}"
                    emptyExample="Kaffeelisten – Monatsbericht {monat}"
                  />
                  <TemplateField
                    label="Einleitung"
                    multiline
                    value={reportIntro}
                    onChange={setReportIntro}
                    placeholders={COMPANY_PLACEHOLDERS}
                    placeholder="Anbei der Monatsbericht für {monat} mit allen Einträgen des ITC1-Campus."
                    emptyExample="Anbei der Monatsbericht für {monat} mit allen Einträgen des ITC1-Campus."
                  />
                </div>

                {/* Member statement copy */}
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-fg">Mitglieder-Dokument</span>
                    <div className="flex gap-2">
                      <AdminButton variant="secondary" size="sm" onClick={() => openPreview('member', 'report', 'Mitglieder-Aufstellung')}>Aufstellung</AdminButton>
                      <AdminButton variant="secondary" size="sm" onClick={() => openPreview('member', 'invoice', 'Mitglieder-Rechnung')}>Rechnung</AdminButton>
                    </div>
                  </div>
                  <TemplateField
                    label="Betreff"
                    value={memberSubject}
                    onChange={setMemberSubject}
                    placeholders={MEMBER_PLACEHOLDERS}
                    placeholder="Kaffeelisten – Deine Aufstellung {monat}"
                    emptyExample="Kaffeelisten – Deine Aufstellung {monat}"
                  />
                  <TemplateField
                    label="Einleitung (nach „Hallo {name},“)"
                    multiline
                    value={memberIntro}
                    onChange={setMemberIntro}
                    placeholders={MEMBER_PLACEHOLDERS}
                    placeholder="hier ist deine persönliche Aufstellung für {monat}."
                    emptyExample="hier ist deine persönliche Aufstellung für {monat}."
                  />
                </div>
              </section>

              {/* Card 8 — Rechnungen: Zahlungsstatus (feature E) */}
              {billingMonths.length > 0 && (
                <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-lg font-semibold text-fg">Rechnungen — Zahlungsstatus</h3>
                      <p className="text-sm text-fg-muted leading-relaxed">
                        Markiere, welche Rechnungen bezahlt wurden. Wird sofort gespeichert.
                      </p>
                    </div>
                    <AdminSelect
                      variant="filter"
                      aria-label="Abrechnungsmonat"
                      value={billingMonth}
                      onChange={e => changeBillingMonth(e.target.value)}
                      options={billingMonths.map(m => ({ value: m, label: m }))}
                    />
                  </div>
                  {billingLoading ? (
                    <div className="h-24 bg-surface-2 rounded-lg animate-pulse" />
                  ) : billingDocs.length === 0 ? (
                    <p className="text-sm text-fg-muted">Keine Rechnungen für diesen Monat.</p>
                  ) : (
                    <div className="flex flex-col divide-y divide-border">
                      {billingDocs.map(d => (
                        <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-fg truncate">
                              {d.recipient_name}{' '}
                              <span className="text-fg-subtle font-mono text-xs">· {d.document_number}</span>
                            </p>
                            <p className="text-xs text-fg-muted truncate">
                              {euro(d.total_cents)} · {d.status === 'sent' ? 'gesendet' : d.status}
                            </p>
                          </div>
                          <Toggle
                            checked={d.paid}
                            onChange={() => togglePaid(d)}
                            label={d.paid ? 'Bezahlt' : 'Offen'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Sticky save bar */}
              <div className="sticky bottom-0 mt-1 flex items-center justify-between gap-4 px-[18px] py-3.5 bg-surface border border-border rounded-lg shadow-[0_-6px_16px_-8px_rgba(28,25,23,0.12)]">
                <span className="text-[13px] text-fg-muted">Änderungen wirken ab dem nächsten Versand.</span>
                <AdminButton variant="primary" onClick={save} disabled={saving}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </AdminButton>
              </div>
            </>
          )}
        </div>
      </div>

      {/* PIN ändern modal */}
      <Modal
        open={modal === 'change'}
        onClose={() => setModal(null)}
        title="PIN ändern"
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setModal(null)}>Abbrechen</AdminButton>
            <AdminButton variant="primary" onClick={submitChange} disabled={changeSaving}>
              {changeSaving ? 'Speichern…' : 'Speichern'}
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-fg-muted">
            Gib deine aktuelle PIN ein und wähle eine neue {pinLength}-stellige PIN.
          </p>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Aktuelle PIN</span>
            <PinInput value={curPin} onChange={setCurPin} length={pinLength} autoFocus ariaLabel="Aktuelle PIN" invalid={!!changeError && !curPin} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Neue PIN</span>
            <PinInput value={nextPin} onChange={setNextPin} length={pinLength} ariaLabel="Neue PIN" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Neue PIN bestätigen</span>
            <PinInput value={confirmPin} onChange={setConfirmPin} length={pinLength} ariaLabel="Neue PIN bestätigen" />
          </div>
          {changeError && <p className="text-[13px] text-error">{changeError}</p>}
        </div>
      </Modal>

      {/* Report preview overlay (wider than the standard modal to fit a 600px email) */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-surface rounded-2xl shadow-lg w-full max-w-[680px] max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                  {previewTitle} · Vorschau
                </p>
                <p className="text-sm font-semibold text-fg truncate">{previewSubject || '—'}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Schließen"
                className="text-fg-muted hover:text-fg p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <AdminIcon name="close" size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-surface-2">
              {previewLoading ? (
                <div className="h-[60vh] flex items-center justify-center text-sm text-fg-muted">
                  Vorschau wird geladen…
                </div>
              ) : (
                <iframe
                  title="Berichts-Vorschau"
                  srcDoc={previewHtml}
                  sandbox=""
                  className="w-full h-[70vh] bg-surface border-0"
                />
              )}
            </div>
            <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-border">
              <span className="text-[13px] text-fg-muted">Zeigt die aktuellen — auch ungespeicherten — Einstellungen.</span>
              <AdminButton variant="secondary" onClick={() => setPreviewOpen(false)}>Schließen</AdminButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
