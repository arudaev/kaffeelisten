// Admin settings, grouped into five tabs that each save on their own:
//
//   Abrechnung   who receives which document, recipients, invoice mode, texts
//   Versand      automatic monthly sending
//   Zahlungen    the paid-tracking grid
//   iPad         the member flow (order limit)
//   System       appearance and admin PIN
//
// The page used to be one column of thirteen cards with a single Save button:
// "who receives what" was split across four cards with the PIN, the paid grid and
// the schedule in between. The settings API accepts partial updates, so each tab
// sends only its own fields and cannot disturb unsaved edits in another tab.

import { matrixMode } from '../../lib/invoiceMatrix'
import DocumentPreview from '../../components/admin/DocumentPreview'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Topbar } from '../../components/admin/Topbar'
import Modal from '../../components/admin/Modal'
import AdminButton from '../../components/admin/AdminButton'
import AdminField from '../../components/admin/AdminField'
import AdminIcon from '../../components/admin/AdminIcon'
import Badge from '../../components/admin/Badge'
import Toggle from '../../components/admin/Toggle'
import PinInput from '../../components/admin/PinInput'
import Tabs from '../../components/admin/Tabs'
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
  onNavigate?: (page: 'documents' | 'members') => void
  onSendReport?: () => void
}

type TabId = 'billing' | 'sending' | 'payments' | 'ipad' | 'system'

type CustomMap = Record<string, { name: string; light: string; dark: string }>

interface SettingsData {
  report_recipients: string[]
  bootstrap_recipients: string[]
  ceo_email: string | null
  cc_ceo_on_reports: boolean
  member_statements_enabled: boolean
  company_documents_enabled: boolean
  company_paid_member_reports_enabled: boolean
  member_paid_grid_enabled: boolean
  auto_report_enabled: boolean
  auto_report_day: number | null
  max_items_per_order: number | null
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
  invoice_mode_authorized: boolean
  invoice_authority_note: string | null
  pin_length: number
  pin_updated_at: string | null
  pin_is_set: boolean
}

interface Form {
  recipients: string[]
  ceoEmail: string
  ceoCc: boolean
  memberDocs: boolean
  companyDocs: boolean
  infoCopies: boolean
  paidGrid: boolean
  autoEnabled: boolean
  autoDay: number | null
  maxItems: string
  includePdf: boolean
  includeExcel: boolean
  reportSubject: string
  reportIntro: string
  memberSubject: string
  memberIntro: string
  issueInvoices: boolean
  issuerLegalName: string
  issuerAddress: string
  issuerVatId: string
  issuerIban: string
  issuerBic: string
  invoiceNumberPrefix: string
  invoicePaymentTerms: string
  invoiceVatRate: string
  authorized: boolean
  authorityNote: string
}

interface Theme {
  mode: ThemeMode
  palette: string
  custom: CustomMap
}

const EMPTY_FORM: Form = {
  recipients: [], ceoEmail: '', ceoCc: true, memberDocs: true, companyDocs: true, infoCopies: true,
  paidGrid: true, autoEnabled: true, autoDay: null, maxItems: '', includePdf: true, includeExcel: true,
  reportSubject: '', reportIntro: '', memberSubject: '', memberIntro: '', issueInvoices: false,
  issuerLegalName: '', issuerAddress: '', issuerVatId: '', issuerIban: '', issuerBic: '',
  invoiceNumberPrefix: '', invoicePaymentTerms: '', invoiceVatRate: '19', authorized: false, authorityNote: '',
}

function formFromData(d: SettingsData): Form {
  return {
    recipients: d.report_recipients ?? [],
    ceoEmail: d.ceo_email ?? '',
    ceoCc: d.cc_ceo_on_reports,
    memberDocs: d.member_statements_enabled,
    companyDocs: d.company_documents_enabled,
    infoCopies: d.company_paid_member_reports_enabled ?? true,
    paidGrid: d.member_paid_grid_enabled,
    autoEnabled: d.auto_report_enabled,
    autoDay: d.auto_report_day,
    maxItems: d.max_items_per_order != null ? String(d.max_items_per_order) : '',
    includePdf: d.report_include_pdf,
    includeExcel: d.report_include_excel,
    reportSubject: d.report_subject ?? '',
    reportIntro: d.report_intro ?? '',
    memberSubject: d.member_subject ?? '',
    memberIntro: d.member_intro ?? '',
    issueInvoices: d.issue_invoices,
    issuerLegalName: d.issuer_legal_name ?? '',
    issuerAddress: d.issuer_address ?? '',
    issuerVatId: d.issuer_vat_id ?? '',
    issuerIban: d.issuer_iban ?? '',
    issuerBic: d.issuer_bic ?? '',
    invoiceNumberPrefix: d.invoice_number_prefix ?? '',
    invoicePaymentTerms: d.invoice_payment_terms ?? '',
    invoiceVatRate: d.invoice_vat_rate != null ? String(d.invoice_vat_rate) : '19',
    authorized: d.invoice_mode_authorized ?? false,
    authorityNote: d.invoice_authority_note ?? '',
  }
}

// Which form fields each tab owns, and the API body it sends.
const TAB_KEYS: Record<Exclude<TabId, 'system'>, (keyof Form)[]> = {
  billing: [
    'recipients', 'ceoEmail', 'ceoCc', 'memberDocs', 'companyDocs', 'infoCopies', 'includePdf', 'includeExcel',
    'reportSubject', 'reportIntro', 'memberSubject', 'memberIntro', 'issueInvoices', 'issuerLegalName',
    'issuerAddress', 'issuerVatId', 'issuerIban', 'issuerBic', 'invoiceNumberPrefix', 'invoicePaymentTerms',
    'invoiceVatRate', 'authorized', 'authorityNote',
  ],
  sending: ['autoEnabled', 'autoDay'],
  payments: ['paidGrid'],
  ipad: ['maxItems'],
}

const text = (s: string) => s.trim() || null

function tabPayload(tab: Exclude<TabId, 'system'>, f: Form): Record<string, unknown> {
  switch (tab) {
    case 'billing':
      return {
        report_recipients: f.recipients,
        ceo_email: text(f.ceoEmail),
        cc_ceo_on_reports: f.ceoCc,
        member_statements_enabled: f.memberDocs,
        company_documents_enabled: f.companyDocs,
        company_paid_member_reports_enabled: f.infoCopies,
        report_include_pdf: f.includePdf,
        report_include_excel: f.includeExcel,
        report_subject: text(f.reportSubject),
        report_intro: text(f.reportIntro),
        member_subject: text(f.memberSubject),
        member_intro: text(f.memberIntro),
        issue_invoices: f.issueInvoices,
        issuer_legal_name: text(f.issuerLegalName),
        issuer_address: text(f.issuerAddress),
        issuer_vat_id: text(f.issuerVatId),
        issuer_iban: text(f.issuerIban),
        issuer_bic: text(f.issuerBic),
        invoice_number_prefix: text(f.invoiceNumberPrefix),
        invoice_payment_terms: text(f.invoicePaymentTerms),
        invoice_vat_rate: f.invoiceVatRate.trim() === '' ? 19 : Number(f.invoiceVatRate.replace(',', '.')),
        invoice_mode_authorized: f.authorized,
        invoice_authority_note: text(f.authorityNote),
      }
    case 'sending':
      return { auto_report_enabled: f.autoEnabled, auto_report_day: f.autoDay }
    case 'payments':
      return { member_paid_grid_enabled: f.paidGrid }
    case 'ipad':
      return { max_items_per_order: f.maxItems.trim() === '' ? null : Number(f.maxItems) }
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'System' },
]

function formatDay(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

// The report covers the previous, closed month and goes out on `autoDay` (default
// 1) of the following month. Display hint only — the cron decides in Europe/Berlin.
function nextSendLabel(autoDay: number | null): string {
  const now = new Date()
  const daysThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dueDay = Math.max(1, Math.min(autoDay ?? 1, daysThisMonth))
  const monthOffset = now.getDate() <= dueDay ? 0 : 1
  const next = new Date(now.getFullYear(), now.getMonth() + monthOffset, dueDay)
  return next.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Compact colour + hex row used by the custom-palette editor.
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} aria-label={label}
          className="h-11 w-14 rounded border border-border bg-surface cursor-pointer p-1" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} aria-label={`${label} Hex`}
          className="h-11 w-28 px-3 rounded border border-border bg-surface-2 focus:bg-surface text-base text-fg outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent font-mono" />
      </div>
    </label>
  )
}

function Section({ title, description, children, aside }: { title: string; description?: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h3 className="text-lg font-semibold text-fg">{title}</h3>
          {description && <p className="text-sm text-fg-muted leading-relaxed">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Textarea({ label, value, onChange, placeholder, rows = 2, required, error, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; required?: boolean; error?: string; hint?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">{label}{required && <span className="text-error"> *</span>}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className={['w-full border rounded bg-surface-2 focus:bg-surface px-3 py-2 text-base text-fg outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent resize-y', error ? 'border-error' : 'border-border'].join(' ')} />
      {error ? <span className="text-xs text-error">{error}</span> : hint ? <span className="text-xs text-fg-muted">{hint}</span> : null}
    </label>
  )
}

export default function SettingsPage({ onToast, onMenuClick, onNavigate, onSendReport }: Props) {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('billing')
  const [savingTab, setSavingTab] = useState<TabId | null>(null)

  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [saved, setSaved] = useState<Form>(EMPTY_FORM)
  const [bootstrapRecipients, setBootstrapRecipients] = useState<string[]>([])
  const [pin, setPin] = useState({ length: 6, updatedAt: null as string | null, isSet: false })

  const { setPalette, setMode, palette: currentPalette } = useTheme()
  const [theme, setTheme] = useState<Theme>({ mode: 'system', palette: currentPalette.id, custom: {} })
  const [savedTheme, setSavedTheme] = useState<Theme>(theme)
  const [themeReady, setThemeReady] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  // The request is built once when a preview opens, so its tabs share the same unsaved settings.
  const [preview, setPreview] = useState<{ title: string; request: Record<string, unknown> } | null>(null)

  const [pinModal, setPinModal] = useState(false)
  const [curPin, setCurPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [changeError, setChangeError] = useState('')
  const [changeSaving, setChangeSaving] = useState(false)

  const set = useCallback(<K extends keyof Form>(key: K, value: Form[K]) => setForm(f => ({ ...f, [key]: value })), [])

  const applyServer = (d: SettingsData, onlyTab?: Exclude<TabId, 'system'>) => {
    const next = formFromData(d)
    setSaved(next)
    // A tab save refreshes only that tab's fields, keeping unsaved edits elsewhere.
    setForm(f => {
      if (!onlyTab) return next
      const merged = { ...f }
      for (const k of TAB_KEYS[onlyTab]) (merged as Record<keyof Form, unknown>)[k] = next[k]
      return merged
    })
    setBootstrapRecipients(d.bootstrap_recipients ?? [])
    setPin({ length: d.pin_length, updatedAt: d.pin_updated_at, isSet: d.pin_is_set })
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [res, tRes] = await Promise.all([fetch('/api/admin/settings'), fetch('/api/admin/theme')])
        if (res.ok) {
          const data = (await res.json()) as SettingsData
          if (!cancelled) applyServer(data)
        } else if (!cancelled) {
          onToast('Einstellungen konnten nicht geladen werden.')
        }
        if (tRes.ok && !cancelled) {
          const t = (await tRes.json()) as { default_mode: ThemeMode; active_palette: string; custom: Record<string, unknown> }
          const cm: CustomMap = {}
          for (const p of customPalettes(t.custom)) cm[p.id] = { name: p.name, light: p.lightAccent, dark: p.darkAccent }
          const loaded = { mode: t.default_mode, palette: t.active_palette, custom: cm }
          setTheme(loaded)
          setSavedTheme(loaded)
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

  // Live preview of the palette while choosing; saved with the System tab.
  useEffect(() => {
    if (!themeReady) return
    setPalette(findPalette(theme.palette, theme.custom))
  }, [themeReady, theme.palette, theme.custom, setPalette])

  const dirty = useMemo(() => ({
    billing: JSON.stringify(tabPayload('billing', form)) !== JSON.stringify(tabPayload('billing', saved)),
    sending: JSON.stringify(tabPayload('sending', form)) !== JSON.stringify(tabPayload('sending', saved)),
    payments: JSON.stringify(tabPayload('payments', form)) !== JSON.stringify(tabPayload('payments', saved)),
    ipad: JSON.stringify(tabPayload('ipad', form)) !== JSON.stringify(tabPayload('ipad', saved)),
    system: JSON.stringify(theme) !== JSON.stringify(savedTheme),
  }), [form, saved, theme, savedTheme])

  // Mandatory issuer fields once invoice mode is switched on (mirrors the server).
  const issuerMissing = form.issueInvoices
    ? [
        !form.issuerLegalName.trim() && 'Aussteller-Name',
        !form.issuerVatId.trim() && 'USt-IdNr',
        !form.issuerIban.trim() && 'IBAN',
        !form.issuerBic.trim() && 'BIC',
      ].filter(Boolean) as string[]
    : []

  // Where invoice mode actually stands — the three conditions resolveIssuer checks.
  const invoiceState: 'off' | 'incomplete' | 'unauthorized' | 'active' = !form.issueInvoices
    ? 'off'
    : issuerMissing.length > 0
      ? 'incomplete'
      : !form.authorized
        ? 'unauthorized'
        : 'active'
  // The matrix follows the chosen mode; `pendingNotice` explains when it is not live yet.
  const { showInvoices: invoicing, pendingNotice: invoicePending } = matrixMode(invoiceState, issuerMissing)

  const tabProblem = (t: TabId): string | null => {
    if (t === 'billing') {
      if (form.ceoEmail.trim() && !EMAIL_RE.test(form.ceoEmail.trim())) return 'Die E-Mail der Geschäftsführung ist ungültig.'
      if (issuerMissing.length > 0) return `Rechnungsmodus braucht vollständige Ausstellerdaten. Fehlt: ${issuerMissing.join(', ')}.`
      if (form.authorized && !form.authorityNote.trim()) return 'Die Freigabe braucht einen Vermerk, wer sie wann erteilt hat.'
    }
    if (t === 'ipad' && form.maxItems.trim() !== '') {
      const n = Number(form.maxItems)
      if (!Number.isInteger(n) || n < 1 || n > 999) return 'Das Limit muss zwischen 1 und 999 liegen.'
    }
    return null
  }

  const saveTab = async (t: TabId) => {
    const problem = tabProblem(t)
    if (problem) { onToast(problem); return }
    setSavingTab(t)
    try {
      if (t === 'system') {
        const res = await fetch('/api/admin/theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ default_mode: theme.mode, active_palette: theme.palette, custom: theme.custom }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          onToast(err.error ?? 'Erscheinungsbild konnte nicht gespeichert werden.')
          return
        }
        setSavedTheme(theme)
        onToast('Erscheinungsbild gespeichert.')
        return
      }
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tabPayload(t, form)),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        onToast(body.error ?? 'Speichern fehlgeschlagen.')
        return
      }
      applyServer(body as SettingsData, t)
      onToast('Gespeichert.')
    } catch {
      onToast('Speichern fehlgeschlagen.')
    } finally {
      setSavingTab(null)
    }
  }

  const discardTab = (t: TabId) => {
    if (t === 'system') {
      setTheme(savedTheme)
      setMode(savedTheme.mode)
      return
    }
    setForm(f => {
      const merged = { ...f }
      for (const k of TAB_KEYS[t]) (merged as Record<keyof Form, unknown>)[k] = saved[k]
      return merged
    })
  }

  const addRecipient = () => {
    const v = newEmail.trim()
    if (!EMAIL_RE.test(v)) { setEmailError('Bitte eine gültige E-Mail-Adresse eingeben.'); return }
    if (form.recipients.includes(v)) { setEmailError('Diese Adresse ist bereits hinterlegt.'); return }
    set('recipients', [...form.recipients, v])
    setNewEmail('')
    setEmailError('')
  }

  const openPreview = (type: 'admin' | 'company' | 'member', variant: 'report' | 'invoice' | 'info', title: string) => {
    const f = form
    setPreview({
      title,
      request: {
        type,
        variant,
        format: {
          report_subject: text(f.reportSubject), report_intro: text(f.reportIntro),
          report_include_pdf: f.includePdf, report_include_excel: f.includeExcel,
          member_subject: text(f.memberSubject), member_intro: text(f.memberIntro),
        },
        issuer: {
          issue_invoices: f.issueInvoices, issuer_legal_name: f.issuerLegalName, issuer_address: f.issuerAddress,
          issuer_vat_id: f.issuerVatId, issuer_iban: f.issuerIban, issuer_bic: f.issuerBic,
          invoice_number_prefix: f.invoiceNumberPrefix, invoice_payment_terms: f.invoicePaymentTerms,
          invoice_vat_rate: f.invoiceVatRate.trim() === '' ? 19 : Number(f.invoiceVatRate.replace(',', '.')),
        },
      },
    })
  }

  const submitPinChange = async () => {
    if (nextPin.length !== pin.length) { setChangeError(`Die neue PIN muss ${pin.length}-stellig sein.`); return }
    if (nextPin !== confirmPin) { setChangeError('Die neue PIN stimmt nicht mit der Bestätigung überein.'); return }
    setChangeSaving(true)
    setChangeError('')
    try {
      const res = await fetch('/api/admin/auth?action=change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: curPin, newPin: nextPin }),
      })
      if (res.ok) {
        // The session cookie is not tied to the PIN value, so it stays valid.
        setPinModal(false)
        onToast('PIN erfolgreich geändert.')
        const s = await fetch('/api/admin/settings')
        if (s.ok) {
          const d = (await s.json()) as SettingsData
          setPin({ length: d.pin_length, updatedAt: d.pin_updated_at, isSet: d.pin_is_set })
        }
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

  const lockedBootstrap = bootstrapRecipients.filter(e => !form.recipients.includes(e))
  const dot = (d: boolean) => (d ? <span aria-label="ungespeicherte Änderungen" className="w-1.5 h-1.5 rounded-full bg-accent" /> : undefined)

  const saveBar = (t: TabId) => (
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 px-[18px] py-3.5 bg-surface border border-border rounded-lg shadow-[0_-6px_16px_-8px_rgba(28,25,23,0.12)]">
      <span className={['text-[13px]', dirty[t] ? 'text-fg font-medium' : 'text-fg-muted'].join(' ')}>
        {tabProblem(t) ?? (dirty[t] ? 'Ungespeicherte Änderungen in diesem Bereich.' : 'Alles gespeichert.')}
      </span>
      <div className="flex gap-2">
        {dirty[t] && <AdminButton variant="ghost" onClick={() => discardTab(t)} disabled={savingTab === t}>Verwerfen</AdminButton>}
        <AdminButton onClick={() => saveTab(t)} disabled={!dirty[t] || savingTab === t || !!tabProblem(t)}>
          {savingTab === t ? 'Speichern…' : 'Speichern'}
        </AdminButton>
      </div>
    </div>
  )

  // What each party receives, given the current (unsaved) choices.
  const cell = (label: string, detail: string, previewFn?: () => void, muted = false, warn = false) => (
    <div className={['flex flex-col gap-1 p-3 rounded-md border', warn ? 'border-error bg-error-subtle' : muted ? 'border-dashed border-border bg-bg' : 'border-border bg-surface-2'].join(' ')}>
      <span className={['text-sm font-semibold', warn ? 'text-error' : muted ? 'text-fg-subtle' : 'text-fg'].join(' ')}>{label}</span>
      <span className="text-xs text-fg-muted leading-relaxed">{detail}</span>
      {previewFn && (
        <button type="button" onClick={previewFn} className="self-start text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
          Vorschau
        </button>
      )}
    </div>
  )

  return (
    <>
      <Topbar title="Einstellungen" eyebrow="Administration" onMenuClick={onMenuClick} />

      <div className="p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-[860px]">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-lg bg-surface-2 animate-pulse" />)}
            </div>
          ) : (
            <Tabs<TabId>
              ariaLabel="Einstellungsbereiche"
              active={tab}
              onChange={setTab}
              tabs={[
                { id: 'billing', label: 'Abrechnung', badge: dot(dirty.billing) },
                { id: 'sending', label: 'Versand', badge: dot(dirty.sending) },
                { id: 'payments', label: 'Zahlungen', badge: dot(dirty.payments) },
                { id: 'ipad', label: 'iPad', badge: dot(dirty.ipad) },
                { id: 'system', label: 'System', badge: dot(dirty.system) },
              ]}
            >
              {/* ── Abrechnung ─────────────────────────────────────────────── */}
              {tab === 'billing' && (
                <div className="flex flex-col gap-6">
                  <Section
                    title="Wer bekommt was?"
                    description="Wer zahlt, bekommt die Rechnung, die andere Seite eine Übersicht. Die E-Mail selbst bleibt kurz: Im PDF steht die Abrechnung, in der Excel-Datei jede einzelne Buchung mit Datum und Uhrzeit."
                  >
                    <div className="flex flex-col gap-3">
                      <Toggle checked={form.memberDocs} onChange={v => set('memberDocs', v)} label="Personen erhalten ein eigenes Monatsdokument" />
                      <div className="ml-[54px]">
                        <Toggle
                          checked={form.infoCopies && form.memberDocs}
                          disabled={!form.memberDocs}
                          onChange={v => set('infoCopies', v)}
                          label="…auch Mitarbeitende von Firmen, die zahlen (nur zur Information)"
                        />
                      </div>
                      <Toggle checked={form.companyDocs} onChange={v => set('companyDocs', v)} label="Unternehmen erhalten ein Monatsdokument an ihren Kontakt" />
                    </div>

                    {invoicePending && (
                      <p role="status" className="text-sm text-fg bg-accent-subtle border border-accent rounded-lg px-4 py-3 leading-relaxed">
                        {invoicePending}
                      </p>
                    )}

                    <div className="overflow-x-auto -mx-1 px-1">
                      <div className="grid grid-cols-[7.5rem_minmax(12rem,1fr)_minmax(12rem,1fr)] gap-2 min-w-[34rem]">
                        <span />
                        <span className="text-xs font-medium text-fg-muted uppercase tracking-wide px-1">Jede Person zahlt</span>
                        <span className="text-xs font-medium text-fg-muted uppercase tracking-wide px-1">Firma zahlt</span>

                        <span className="text-sm font-semibold text-fg self-center">Person</span>
                        {form.memberDocs
                          ? cell(invoicing ? 'Rechnung' : 'Aufstellung', invoicing ? 'Mit Rechnungsnummer und Zahlungsdaten.' : 'Eigener Verzehr, zusammengefasst je Artikel – zum Bezahlen.', () => openPreview('member', invoicing ? 'invoice' : 'report', invoicing ? 'Rechnung an Person' : 'Aufstellung an Person'))
                          : cell('Nichts', 'Personen-Dokumente sind aus.', undefined, true)}
                        {form.memberDocs && form.infoCopies
                          ? cell('Information', 'Eigener Verzehr zur Info – ohne Zahlungsdaten, die Firma zahlt.', () => openPreview('member', 'info', 'Information an Person'))
                          : cell('Nichts', form.memberDocs ? 'Info-Kopien sind aus.' : 'Personen-Dokumente sind aus.', undefined, true)}

                        <span className="text-sm font-semibold text-fg self-center">Firmenkontakt</span>
                        {form.companyDocs
                          ? cell('Aufstellung', 'Summe je Person, im PDF mit dem Verzehr jeder Person. Kopien der Einzeldokumente nur, wenn beim Unternehmen aktiviert.', () => openPreview('company', 'report', 'Aufstellung an Firma'))
                          : cell('Nichts', 'Firmen-Dokumente sind aus.', undefined, true)}
                        {form.companyDocs
                          ? cell(invoicing ? 'Rechnung' : 'Aufstellung', `${invoicing ? 'Sammelrechnung' : 'Abrechnung'} über den Gesamtbetrag – im PDF aufgeschlüsselt je Person.`, () => openPreview('company', invoicing ? 'invoice' : 'report', invoicing ? 'Rechnung an Firma' : 'Aufstellung an Firma'))
                          : cell('Nichts – Firma wird nicht abgerechnet', 'Zahlende Firmen erhalten so keine Abrechnung.', undefined, false, true)}

                        <span className="text-sm font-semibold text-fg self-center">Verwaltung</span>
                        <div className="col-span-2">
                          {cell('Monatsbericht', 'Kennzahlen mit Vormonat, meistverbrauchte Artikel zum Nachbestellen und Hinweise auf Probleme. Anhänge: PDF, Excel und Campus-Auswertung.', () => openPreview('admin', 'report', 'Monatsbericht an die Verwaltung'))}
                        </div>

                        <span className="text-sm font-semibold text-fg self-center">Geschäfts&shy;führung</span>
                        <div className="col-span-2">
                          {cell('Archiv (ZIP)', 'Nur an die Geschäftsführung: unveränderte Kopien aller versendeten Dokumente mit Versandliste – für Rückfragen zu einzelnen Rechnungen.', undefined)}
                        </div>
                      </div>
                    </div>
                  </Section>

                  <Section title="Empfänger des Monatsberichts" description="Die Verwaltung erhält den Monatsbericht. Das Archiv mit den Kopien aller Dokumente geht nur an die Adresse der Geschäftsführung.">
                    {form.recipients.length > 0 || lockedBootstrap.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {form.recipients.map(email => (
                            <span key={email} className="inline-flex items-center gap-2 bg-surface-2 border border-border rounded-md pl-3 pr-2 py-1.5 text-sm font-medium text-fg">
                              {email}
                              <button type="button" onClick={() => set('recipients', form.recipients.filter(e => e !== email))} aria-label={`${email} entfernen`}
                                className="inline-flex items-center justify-center w-[22px] h-[22px] rounded text-fg-subtle hover:bg-border hover:text-fg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                                <AdminIcon name="close" size={14} strokeWidth={2} />
                              </button>
                            </span>
                          ))}
                          {lockedBootstrap.map(email => (
                            <span key={email} title="Aus der Serverkonfiguration (ADMIN_EMAIL)"
                              className="inline-flex items-center gap-2 bg-bg border border-dashed border-border-strong rounded-md pl-3 pr-2.5 py-1.5 text-sm font-medium text-fg-subtle">
                              {email}
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle bg-border/70 rounded px-1.5 py-0.5">Server</span>
                            </span>
                          ))}
                        </div>
                        {lockedBootstrap.length > 0 && (
                          <p className="text-[13px] text-fg-muted leading-relaxed">
                            {form.recipients.length > 0
                              ? 'Grau hinterlegte Adressen stammen aus der Serverkonfiguration und sind inaktiv, solange eigene Empfänger hinterlegt sind.'
                              : 'Grau hinterlegte Adressen stammen aus der Serverkonfiguration und erhalten den Bericht, bis du eigene Empfänger hinzufügst.'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p role="alert" className="text-sm font-medium text-accent bg-accent-subtle border border-accent rounded-lg px-4 py-3">
                        Noch keine Empfänger – der Monatsbericht würde an niemanden gehen.
                      </p>
                    )}
                    <div className="flex gap-2.5 items-start">
                      <div className="flex-1 min-w-0">
                        <AdminField type="email" placeholder="name@itc1.de" aria-label="Empfänger hinzufügen" value={newEmail}
                          onChange={e => { setNewEmail(e.target.value); setEmailError('') }}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRecipient() } }}
                          error={emailError || undefined} />
                      </div>
                      <AdminButton variant="secondary" onClick={addRecipient}>Hinzufügen</AdminButton>
                    </div>
                    <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end border-t border-border pt-4">
                      <AdminField label="Geschäftsführung (E-Mail)" type="email" placeholder="geschaeftsfuehrung@itc1.de"
                        value={form.ceoEmail} onChange={e => set('ceoEmail', e.target.value)} />
                      <div className="pb-2.5">
                        <Toggle checked={form.ceoCc} onChange={v => set('ceoCc', v)} label="Monatsbericht zusätzlich in Kopie" />
                      </div>
                    </div>
                  </Section>

                  <Section
                    title="Rechnungsmodus"
                    description="Rechnungen werden im Namen von ITC1 ausgestellt. Das setzt ITC1s schriftliche Vollmacht und die Freigabe durch die Steuerberatung voraus."
                    aside={
                      invoiceState === 'active' ? <Badge kind="active">Aktiv</Badge>
                        : invoiceState === 'off' ? <Badge kind="inactive">Aus</Badge>
                          : <Badge kind="warn">{invoiceState === 'incomplete' ? 'Unvollständig' : 'Nicht freigegeben'}</Badge>
                    }
                  >
                    <Toggle checked={form.issueInvoices} onChange={v => set('issueInvoices', v)} label="Rechnungen statt Aufstellungen versenden" />
                    {form.issueInvoices && (
                      <div className="flex flex-col gap-4 border-t border-border pt-4">
                        <AdminField label="Aussteller (Firmenname)" required value={form.issuerLegalName} onChange={e => set('issuerLegalName', e.target.value)} placeholder="ITC Innovations Technologie Campus GmbH" />
                        <Textarea label="Adresse" value={form.issuerAddress} onChange={v => set('issuerAddress', v)} placeholder={'Ulrichsberger Str. 17\n94469 Deggendorf'} />
                        <div className="grid sm:grid-cols-2 gap-4">
                          <AdminField label="USt-IdNr" required value={form.issuerVatId} onChange={e => set('issuerVatId', e.target.value)} placeholder="DE207285819" />
                          <AdminField label="USt-Satz (%)" inputMode="decimal" value={form.invoiceVatRate} onChange={e => set('invoiceVatRate', e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="19" />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <AdminField label="IBAN (Empfangskonto)" required value={form.issuerIban} onChange={e => set('issuerIban', e.target.value)} placeholder="DE33 7415 0000 0380 0093 40" hint="ITC1s Konto – hierhin wird überwiesen." />
                          <AdminField label="BIC" required value={form.issuerBic} onChange={e => set('issuerBic', e.target.value)} placeholder="BYLADEM1DEG" />
                        </div>
                        <AdminField label="Rechnungsnummer-Präfix" value={form.invoiceNumberPrefix} onChange={e => set('invoiceNumberPrefix', e.target.value)} placeholder="K-" hint="Die laufende Nummer wird angehängt, z. B. K-000042." />
                        <Textarea label="Zahlungsbedingungen" value={form.invoicePaymentTerms} onChange={v => set('invoicePaymentTerms', v)} placeholder="Zahlung ohne Abzug innerhalb 14 Tagen nach Rechnungsstellung." />

                        <div className={['flex flex-col gap-3 rounded-lg border p-4', form.authorized ? 'border-success' : 'border-accent bg-accent-subtle'].join(' ')}>
                          <Toggle checked={form.authorized} onChange={v => set('authorized', v)} label="Schriftliche Vollmacht von ITC1 liegt vor – Rechnungsmodus freigeben" />
                          <Textarea
                            label="Vermerk zur Freigabe"
                            required={form.authorized}
                            value={form.authorityNote}
                            onChange={v => set('authorityNote', v)}
                            placeholder="z. B. Vollmacht von Sabine Zellner, ITC1, unterzeichnet am 01.10.2026; Steuerberatung zugestimmt am …"
                            error={form.authorized && !form.authorityNote.trim() ? 'Wer hat die Vollmacht erteilt, und wann?' : undefined}
                            hint="Wird gespeichert und belegt, auf welcher Grundlage Rechnungen ausgestellt werden."
                          />
                          {!form.authorized && (
                            <p className="text-[13px] text-fg leading-relaxed">
                              Solange die Freigabe fehlt, gehen weiterhin Aufstellungen statt Rechnungen raus – auch wenn alle Ausstellerdaten ausgefüllt sind.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </Section>

                  <Section title="Texte und Anhänge" description="Betreff und Einleitung der E-Mails. Klicke auf die Platzhalter, um sie einzufügen – das Beispiel zeigt das Ergebnis.">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Anhänge des Monatsberichts</span>
                      <Toggle checked={form.includePdf} onChange={v => set('includePdf', v)} label="PDF anhängen" />
                      <Toggle checked={form.includeExcel} onChange={v => set('includeExcel', v)} label="Excel anhängen" />
                      <p className="text-[13px] text-fg-muted leading-relaxed">
                        Die Campus-Auswertung mit Vormonatsvergleich hängt immer an. Die Akzentfarbe folgt der Palette unter „System“.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border pt-4">
                      <span className="text-sm font-semibold text-fg">Monatsbericht an Geschäftsführung</span>
                      <TemplateField label="Betreff" value={form.reportSubject} onChange={v => set('reportSubject', v)} placeholders={COMPANY_PLACEHOLDERS}
                        placeholder="Kaffeelisten – Monatsbericht {monat}" emptyExample="Kaffeelisten – Monatsbericht {monat}" />
                      <TemplateField label="Einleitung" multiline value={form.reportIntro} onChange={v => set('reportIntro', v)} placeholders={COMPANY_PLACEHOLDERS}
                        placeholder="Anbei der Monatsbericht für {monat} mit allen Einträgen des ITC1-Campus."
                        emptyExample="Anbei der Monatsbericht für {monat} mit allen Einträgen des ITC1-Campus." />
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border pt-4">
                      <span className="text-sm font-semibold text-fg">Dokumente an Personen</span>
                      <TemplateField label="Betreff" value={form.memberSubject} onChange={v => set('memberSubject', v)} placeholders={MEMBER_PLACEHOLDERS}
                        placeholder="Kaffeelisten – Deine Aufstellung {monat}" emptyExample="Kaffeelisten – Deine Aufstellung {monat}" />
                      <TemplateField label="Einleitung (nach „Hallo {name},“)" multiline value={form.memberIntro} onChange={v => set('memberIntro', v)} placeholders={MEMBER_PLACEHOLDERS}
                        placeholder="hier ist deine persönliche Aufstellung für {monat}."
                        emptyExample="hier ist deine persönliche Aufstellung für {monat}." />
                    </div>
                  </Section>

                  {saveBar('billing')}
                </div>
              )}

              {/* ── Versand ────────────────────────────────────────────────── */}
              {tab === 'sending' && (
                <div className="flex flex-col gap-6">
                  <Section
                    title="Automatischer Monatsversand"
                    description="Der Versand umfasst immer den abgeschlossenen Vormonat und geht am gewählten Tag des Folgemonats abends raus. Wird ein Tag verpasst, holt das System den Versand nach."
                    aside={<Badge kind={saved.autoEnabled ? 'active' : 'inactive'}>{saved.autoEnabled ? 'Aktiv' : 'Aus'}</Badge>}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 border border-border px-4 py-3">
                      <span className="text-sm text-fg-muted">Nächster automatischer Versand</span>
                      <span className="text-sm font-semibold text-fg">{saved.autoEnabled ? nextSendLabel(saved.autoDay) : 'keiner – automatischer Versand ist aus'}</span>
                    </div>
                    <Toggle checked={form.autoEnabled} onChange={v => set('autoEnabled', v)} label="Monatsbericht automatisch senden" />
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Versandtag im Folgemonat</span>
                      <DayGridPicker value={form.autoDay} onChange={v => set('autoDay', v)} disabled={!form.autoEnabled} />
                    </div>
                  </Section>

                  {onSendReport && (
                    <Section title="Jetzt senden" description="Versendet den Monat sofort von Hand, zum Beispiel nach einer Korrektur. Bereits vergebene Rechnungsnummern bleiben erhalten.">
                      <div>
                        <AdminButton variant="secondary" icon={<AdminIcon name="send" size={16} />} onClick={onSendReport}>Monatsversand starten…</AdminButton>
                      </div>
                    </Section>
                  )}

                  {saveBar('sending')}
                </div>
              )}

              {/* ── Zahlungen ──────────────────────────────────────────────── */}
              {tab === 'payments' && (
                <div className="flex flex-col gap-6">
                  <Section title="Bezahlt-Übersicht" description="Kästchen für die letzten drei Monate in „Mitarbeitende“: pro Person, die selbst zahlt, und einmal pro Firma, die für ihre Leute zahlt.">
                    <Toggle checked={form.paidGrid} onChange={v => set('paidGrid', v)} label="Bezahlt-Spalte in „Mitarbeitende“ anzeigen" />
                    {onNavigate && (
                      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                        <AdminButton variant="secondary" size="sm" onClick={() => onNavigate('members')}>Zu Mitarbeitende</AdminButton>
                        <AdminButton variant="secondary" size="sm" onClick={() => onNavigate('documents')}>Rechnungen unter Dokumente</AdminButton>
                      </div>
                    )}
                    <p className="text-[13px] text-fg-muted leading-relaxed">
                      Ob eine Rechnung bezahlt ist, wird direkt unter „Dokumente“ abgehakt.
                    </p>
                  </Section>
                  {saveBar('payments')}
                </div>
              )}

              {/* ── iPad ───────────────────────────────────────────────────── */}
              {tab === 'ipad' && (
                <div className="flex flex-col gap-6">
                  <Section title="Bestellung am iPad" description="Begrenzt, wie viele Artikel eine Person in einer Bestellung erfassen kann – schützt vor Vertippern.">
                    <div className="max-w-[240px]">
                      <AdminField label="Max. Artikel pro Bestellung" inputMode="numeric" value={form.maxItems}
                        onChange={e => set('maxItems', e.target.value.replace(/[^0-9]/g, ''))} placeholder="Unbegrenzt" hint="Leer lassen für unbegrenzt." />
                    </div>
                  </Section>
                  {saveBar('ipad')}
                </div>
              )}

              {/* ── System ─────────────────────────────────────────────────── */}
              {tab === 'system' && (
                <div className="flex flex-col gap-6">
                  <Section title="Erscheinungsbild" description="Standard-Modus und Farbpalette – gilt am iPad und im Admin-Bereich. Änderungen sind sofort als Vorschau sichtbar.">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Standard-Modus</span>
                      <SegmentedControl ariaLabel="Standard-Modus" value={theme.mode} onChange={m => { setTheme(t => ({ ...t, mode: m })); setMode(m) }} options={MODE_OPTIONS} />
                      <p className="text-[13px] text-fg-muted leading-relaxed">„Hell“ und „Dunkel“ gelten für alle; „System“ folgt dem jeweiligen Gerät.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Farbpalette</span>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {allPalettes(theme.custom).map(p => (
                          <PalettePreviewCard key={p.id} palette={p} selected={theme.palette === p.id} onSelect={() => setTheme(t => ({ ...t, palette: p.id }))} />
                        ))}
                      </div>
                      {(CUSTOM_SLOTS as readonly string[]).includes(theme.palette) && (
                        <div className="mt-1 flex flex-col gap-3 border border-border rounded-lg p-4 bg-surface-2">
                          <AdminField label="Name der Palette" value={theme.custom[theme.palette]?.name ?? ''}
                            onChange={e => setTheme(t => ({ ...t, custom: { ...t.custom, [t.palette]: { ...(t.custom[t.palette] ?? { light: '#D97706', dark: '#F59E0B' }), name: e.target.value } } }))}
                            placeholder="z. B. Firmenfarben" />
                          <div className="flex flex-wrap gap-6">
                            <ColorRow label="Akzent (Hell)" value={theme.custom[theme.palette]?.light ?? '#D97706'}
                              onChange={v => setTheme(t => ({ ...t, custom: { ...t.custom, [t.palette]: { ...(t.custom[t.palette] ?? { name: '', dark: '#F59E0B' }), light: v } } }))} />
                            <ColorRow label="Akzent (Dunkel)" value={theme.custom[theme.palette]?.dark ?? '#F59E0B'}
                              onChange={v => setTheme(t => ({ ...t, custom: { ...t.custom, [t.palette]: { ...(t.custom[t.palette] ?? { name: '', light: '#D97706' }), dark: v } } }))} />
                          </div>
                        </div>
                      )}
                    </div>
                  </Section>

                  {saveBar('system')}

                  <Section
                    title="Admin-PIN"
                    description={pin.isSet
                      ? `${pin.length}-stellig${pin.updatedAt ? ` · zuletzt geändert am ${formatDay(pin.updatedAt)}` : ''}`
                      : `${pin.length}-stellig · Standard-PIN aktiv – bitte ändern`}
                    aside={!pin.isSet ? <Badge kind="warn">Standard</Badge> : undefined}
                  >
                    <div>
                      <AdminButton variant="secondary" onClick={() => { setCurPin(''); setNextPin(''); setConfirmPin(''); setChangeError(''); setPinModal(true) }}>
                        PIN ändern
                      </AdminButton>
                    </div>
                    <p className="text-[13px] text-fg-muted leading-relaxed">
                      PIN vergessen? Die Zurücksetzung per E-Mail-Code erfolgt auf der Anmeldeseite („PIN vergessen?“). Wird sofort gespeichert.
                    </p>
                  </Section>
                </div>
              )}
            </Tabs>
          )}
        </div>
      </div>

      <Modal
        open={pinModal}
        onClose={() => setPinModal(false)}
        title="PIN ändern"
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setPinModal(false)}>Abbrechen</AdminButton>
            <AdminButton variant="primary" onClick={submitPinChange} disabled={changeSaving}>{changeSaving ? 'Speichern…' : 'Speichern'}</AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-fg-muted">Gib deine aktuelle PIN ein und wähle eine neue {pin.length}-stellige PIN.</p>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Aktuelle PIN</span>
            <PinInput value={curPin} onChange={setCurPin} length={pin.length} autoFocus ariaLabel="Aktuelle PIN" invalid={!!changeError && !curPin} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Neue PIN</span>
            <PinInput value={nextPin} onChange={setNextPin} length={pin.length} ariaLabel="Neue PIN" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Neue PIN bestätigen</span>
            <PinInput value={confirmPin} onChange={setConfirmPin} length={pin.length} ariaLabel="Neue PIN bestätigen" />
          </div>
          {changeError && <p className="text-[13px] text-error">{changeError}</p>}
        </div>
      </Modal>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        size="lg"
        title={preview ? `Vorschau · ${preview.title}` : 'Vorschau'}
        actions={<AdminButton variant="secondary" onClick={() => setPreview(null)}>Schließen</AdminButton>}
      >
        {preview && (
          <div className="flex flex-col gap-3">
            <DocumentPreview request={preview.request} onError={onToast} />
            <p className="text-xs text-fg-muted">
              Zeigt die aktuellen – auch ungespeicherten – Einstellungen mit echten Daten dieses Monats. Fehlende Ausstellerdaten erscheinen als Platzhalter.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
