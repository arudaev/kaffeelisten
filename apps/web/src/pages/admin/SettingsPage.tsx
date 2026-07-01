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
import PinInput from '../../components/admin/PinInput'
import TemplateField from '../../components/admin/TemplateField'
import DayGridPicker from '../../components/admin/DayGridPicker'
import { COMPANY_PLACEHOLDERS, MEMBER_PLACEHOLDERS } from '../../lib/reportPlaceholders'

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

interface SettingsData {
  report_recipients: string[]
  bootstrap_recipients: string[]
  ceo_email: string | null
  cc_ceo_on_reports: boolean
  member_statements_enabled: boolean
  auto_report_enabled: boolean
  auto_report_day: number | null
  report_accent: string
  report_subject: string | null
  report_intro: string | null
  report_include_pdf: boolean
  report_include_excel: boolean
  member_subject: string | null
  member_intro: string | null
  pin_length: number
  pin_updated_at: string | null
  pin_is_set: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function adminPin(): string {
  return sessionStorage.getItem('adminPin') ?? ''
}

function formatDay(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function lastDayOfMonthLabel(): string {
  const now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return last.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
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

  // Scheduling
  const [autoEnabled, setAutoEnabled] = useState(true)
  const [autoDay, setAutoDay] = useState<number | null>(null)

  // Format
  const [accent, setAccent] = useState('#D97706')
  const [includePdf, setIncludePdf] = useState(true)
  const [includeExcel, setIncludeExcel] = useState(true)
  const [reportSubject, setReportSubject] = useState('')
  const [reportIntro, setReportIntro] = useState('')
  const [memberSubject, setMemberSubject] = useState('')
  const [memberIntro, setMemberIntro] = useState('')

  // Preview
  const [previewType, setPreviewType] = useState<'company' | 'member' | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  // Read-only PIN metadata
  const [pinLength, setPinLength] = useState(6)
  const [pinUpdatedAt, setPinUpdatedAt] = useState<string | null>(null)
  const [pinIsSet, setPinIsSet] = useState(false)

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
    setAutoEnabled(d.auto_report_enabled)
    setAutoDay(d.auto_report_day)
    setAccent(d.report_accent || '#D97706')
    setIncludePdf(d.report_include_pdf)
    setIncludeExcel(d.report_include_excel)
    setReportSubject(d.report_subject ?? '')
    setReportIntro(d.report_intro ?? '')
    setMemberSubject(d.member_subject ?? '')
    setMemberIntro(d.member_intro ?? '')
    setPinLength(d.pin_length)
    setPinUpdatedAt(d.pin_updated_at)
    setPinIsSet(d.pin_is_set)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/settings', { headers: { 'x-admin-pin': adminPin() } })
        if (res.ok) {
          const data = (await res.json()) as SettingsData
          if (!cancelled) applySettings(data)
        } else if (!cancelled) {
          onToast('Einstellungen konnten nicht geladen werden.')
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
    report_accent: accent,
    report_subject: reportSubject.trim() || null,
    report_intro: reportIntro.trim() || null,
    report_include_pdf: includePdf,
    report_include_excel: includeExcel,
    member_subject: memberSubject.trim() || null,
    member_intro: memberIntro.trim() || null,
  })

  const save = async () => {
    if (ceoEmail.trim() && !EMAIL_RE.test(ceoEmail.trim())) {
      onToast('Ungültige CEO-E-Mail-Adresse.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': adminPin() },
        body: JSON.stringify({
          report_recipients: recipients,
          ceo_email: ceoEmail.trim() || null,
          cc_ceo_on_reports: ceoCc,
          member_statements_enabled: memberReport,
          auto_report_enabled: autoEnabled,
          auto_report_day: autoDay,
          ...formatPayload(),
        }),
      })
      if (res.ok) {
        applySettings((await res.json()) as SettingsData)
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

  // ── Preview ─────────────────────────────────────────────────────────────────
  const openPreview = async (type: 'company' | 'member') => {
    setPreviewType(type)
    setPreviewLoading(true)
    setPreviewHtml('')
    setPreviewSubject('')
    try {
      const res = await fetch('/api/admin/preview-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': adminPin() },
        body: JSON.stringify({ type, format: formatPayload() }),
      })
      if (res.ok) {
        const data = (await res.json()) as { html: string; subject: string }
        setPreviewHtml(data.html)
        setPreviewSubject(data.subject)
      } else {
        onToast('Vorschau konnte nicht geladen werden.')
        setPreviewType(null)
      }
    } catch {
      onToast('Vorschau konnte nicht geladen werden.')
      setPreviewType(null)
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
      const res = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: curPin, newPin: nextPin }),
      })
      if (res.ok) {
        // The changed PIN becomes the session PIN so other admin calls keep working.
        sessionStorage.setItem('adminPin', nextPin)
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
      const res = await fetch('/api/admin/settings', { headers: { 'x-admin-pin': adminPin() } })
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
                    <span className="text-sm font-semibold text-fg">{lastDayOfMonthLabel()}</span>
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
                <Toggle checked={autoEnabled} onChange={setAutoEnabled} label="Bericht automatisch am Monatsende senden" />
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Versandtag</span>
                  <DayGridPicker value={autoDay} onChange={setAutoDay} disabled={!autoEnabled} />
                  <p className="text-[13px] text-fg-muted leading-relaxed">
                    Der Versand erfolgt abends (22:00). „Letzter Tag“ passt sich an kurze Monate an.
                  </p>
                </div>
              </section>

              {/* Card 7 — Berichts-Format */}
              <section className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-fg">Berichts-Format</h3>
                  <p className="text-sm text-fg-muted leading-relaxed">
                    Betreff und Einleitung der E-Mails, plus Anhänge des Firmenberichts. Klicke auf die
                    Platzhalter, um sie einzufügen — die Beispielzeile zeigt das fertige Ergebnis.
                  </p>
                </div>

                {/* Attachments + accent */}
                <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
                  <div className="flex flex-col gap-2 pt-0.5">
                    <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Anhänge (Firmenbericht)</span>
                    <Toggle checked={includePdf} onChange={setIncludePdf} label="PDF anhängen" />
                    <Toggle checked={includeExcel} onChange={setIncludeExcel} label="Excel anhängen" />
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Akzentfarbe</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accent}
                        onChange={e => setAccent(e.target.value)}
                        aria-label="Akzentfarbe wählen"
                        className="h-11 w-14 rounded border border-border bg-surface cursor-pointer p-1"
                      />
                      <input
                        type="text"
                        value={accent}
                        onChange={e => setAccent(e.target.value)}
                        aria-label="Akzentfarbe (Hex)"
                        className="h-11 w-28 px-3 rounded border border-border bg-surface-2 focus:bg-surface text-base text-fg outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent font-mono"
                      />
                    </div>
                    <span className="text-[11px] text-fg-subtle">Zieht später in die Theme-Einstellungen um.</span>
                  </label>
                </div>

                {/* Company report copy */}
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-fg">Firmenbericht (Admin + CEO)</span>
                    <AdminButton variant="secondary" size="sm" onClick={() => openPreview('company')}>Vorschau</AdminButton>
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
                    <span className="text-sm font-semibold text-fg">Mitglieder-Aufstellung</span>
                    <AdminButton variant="secondary" size="sm" onClick={() => openPreview('member')}>Vorschau</AdminButton>
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
      {previewType && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setPreviewType(null)}
        >
          <div
            className="bg-surface rounded-2xl shadow-lg w-full max-w-[680px] max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                  {previewType === 'company' ? 'Firmenbericht (Admin + CEO)' : 'Mitglieder-Aufstellung'} · Vorschau
                </p>
                <p className="text-sm font-semibold text-fg truncate">{previewSubject || '—'}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewType(null)}
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
              <AdminButton variant="secondary" onClick={() => setPreviewType(null)}>Schließen</AdminButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
