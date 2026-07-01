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

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

interface SettingsData {
  report_recipients: string[]
  ceo_email: string | null
  cc_ceo_on_reports: boolean
  member_statements_enabled: boolean
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
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [ceoEmail, setCeoEmail] = useState('')
  const [ceoCc, setCeoCc] = useState(true)
  const [memberReport, setMemberReport] = useState(true)

  // Read-only PIN metadata
  const [pinLength, setPinLength] = useState(6)
  const [pinUpdatedAt, setPinUpdatedAt] = useState<string | null>(null)
  const [pinIsSet, setPinIsSet] = useState(false)

  // Modals
  const [modal, setModal] = useState<'change' | 'reset' | null>(null)

  // PIN change form
  const [curPin, setCurPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [changeError, setChangeError] = useState('')
  const [changeSaving, setChangeSaving] = useState(false)

  // PIN reset flow
  const [resetStep, setResetStep] = useState<1 | 2>(1)
  const [resetSending, setResetSending] = useState(false)
  const [resetCode, setResetCode] = useState('')
  const [resetNewPin, setResetNewPin] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSaving, setResetSaving] = useState(false)

  const applySettings = (d: SettingsData) => {
    setRecipients(d.report_recipients ?? [])
    setCeoEmail(d.ceo_email ?? '')
    setCeoCc(d.cc_ceo_on_reports)
    setMemberReport(d.member_statements_enabled)
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

  // ── PIN reset ───────────────────────────────────────────────────────────────
  const openReset = () => {
    setResetStep(1); setResetCode(''); setResetNewPin(''); setResetError('')
    setModal('reset')
  }

  const sendResetCode = async () => {
    setResetSending(true)
    setResetError('')
    try {
      await fetch('/api/admin/request-pin-reset', { method: 'POST' })
      // Always advance — the recovery-PIN backstop works even if no email went out.
      setResetStep(2)
    } catch {
      setResetError('Code konnte nicht gesendet werden. Notfall-Code ist weiterhin möglich.')
      setResetStep(2)
    } finally {
      setResetSending(false)
    }
  }

  const submitReset = async () => {
    if (resetNewPin.length !== pinLength) {
      setResetError(`Die neue PIN muss ${pinLength}-stellig sein.`)
      return
    }
    if (!resetCode.trim()) {
      setResetError('Bitte den Code oder Notfall-Code eingeben.')
      return
    }
    setResetSaving(true)
    setResetError('')
    try {
      const res = await fetch('/api/admin/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: resetCode.trim(), newPin: resetNewPin }),
      })
      if (res.ok) {
        sessionStorage.setItem('adminPin', resetNewPin)
        setModal(null)
        onToast('PIN erfolgreich zurückgesetzt.')
        void refreshPinMeta()
      } else {
        const err = await res.json().catch(() => ({}))
        setResetError(err.error ?? 'Zurücksetzen fehlgeschlagen.')
      }
    } catch {
      setResetError('Zurücksetzen fehlgeschlagen.')
    } finally {
      setResetSaving(false)
    }
  }

  const refreshPinMeta = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: { 'x-admin-pin': adminPin() } })
      if (res.ok) applySettings((await res.json()) as SettingsData)
    } catch { /* non-fatal */ }
  }

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
                <div key={i} className="h-40 rounded-lg bg-stone-100 animate-pulse" />
              ))}
            </>
          ) : (
            <>
              {/* Card 1 — Berichts-Empfänger */}
              <section className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col gap-[18px]">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-stone-900">Berichts-Empfänger</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">Diese Adressen erhalten den monatlichen Bericht.</p>
                </div>

                {recipients.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recipients.map(email => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-md pl-3 pr-2 py-1.5 text-sm font-medium text-stone-900"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          aria-label={`${email} entfernen`}
                          className="inline-flex items-center justify-center w-[22px] h-[22px] rounded text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition-colors"
                        >
                          <AdminIcon name="close" size={14} strokeWidth={2} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-lg px-4 py-3.5">
                    <span className="flex-none w-5 h-5 rounded-full bg-amber-600 text-white text-[13px] font-bold leading-5 text-center">!</span>
                    <p className="text-sm font-medium text-amber-700 leading-relaxed">
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
              <section className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col gap-[18px]">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-stone-900">Geschäftsführung (CEO)</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
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
                  <p className="ml-[54px] text-[13px] text-stone-500 leading-relaxed">
                    Gilt sowohl für den manuellen als auch für den automatischen Monatsende-Versand.
                  </p>
                </div>
              </section>

              {/* Card 3 — Mitglieder-Monatsbericht */}
              <section className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-stone-900">Mitglieder-Monatsbericht</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Persönliche Aufstellung für jede Person zusätzlich zum Firmenbericht.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-0.5">
                  <Toggle checked={memberReport} onChange={setMemberReport} label="Jede Person erhält am Monatsende ihre eigene Aufstellung" />
                  <p className="ml-[54px] text-[13px] text-stone-500 leading-relaxed">
                    Zusätzlich zum Firmenbericht. Nur Personen mit hinterlegter Arbeits-E-Mail werden angeschrieben.
                  </p>
                </div>
              </section>

              {/* Card 4 — Sicherheit / Admin-PIN */}
              <section className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col gap-[18px]">
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-lg font-semibold text-stone-900">Sicherheit — Admin-PIN</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{pinSubtitle}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <AdminButton variant="secondary" onClick={openChange}>PIN ändern</AdminButton>
                  <AdminButton variant="ghost" onClick={openReset}>PIN zurücksetzen</AdminButton>
                </div>
              </section>

              {/* Card 5 — Bericht-Status */}
              <section className="bg-white border border-stone-200 rounded-lg shadow-sm p-6 flex flex-col gap-3.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-stone-900">Bericht-Status</h3>
                  <Badge kind="active">Automatisch aktiv</Badge>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-stone-100">
                    <span className="text-sm text-stone-600">Nächster automatischer Versand</span>
                    <span className="text-sm font-semibold text-stone-900">{lastDayOfMonthLabel()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-stone-600">Mitglieder-Aufstellungen</span>
                    <span className="text-sm font-semibold text-stone-900">{memberReport ? 'Aktiv' : 'Inaktiv'}</span>
                  </div>
                </div>
              </section>

              {/* Sticky save bar */}
              <div className="sticky bottom-0 mt-1 flex items-center justify-between gap-4 px-[18px] py-3.5 bg-white border border-stone-200 rounded-lg shadow-[0_-6px_16px_-8px_rgba(28,25,23,0.12)]">
                <span className="text-[13px] text-stone-500">Änderungen wirken ab dem nächsten Versand.</span>
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
          <p className="text-sm text-stone-600">
            Gib deine aktuelle PIN ein und wähle eine neue {pinLength}-stellige PIN.
          </p>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Aktuelle PIN</span>
            <PinInput value={curPin} onChange={setCurPin} length={pinLength} autoFocus ariaLabel="Aktuelle PIN" invalid={!!changeError && !curPin} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Neue PIN</span>
            <PinInput value={nextPin} onChange={setNextPin} length={pinLength} ariaLabel="Neue PIN" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Neue PIN bestätigen</span>
            <PinInput value={confirmPin} onChange={setConfirmPin} length={pinLength} ariaLabel="Neue PIN bestätigen" />
          </div>
          {changeError && <p className="text-[13px] text-red-600">{changeError}</p>}
        </div>
      </Modal>

      {/* PIN zurücksetzen modal (2 steps) */}
      <Modal
        open={modal === 'reset'}
        onClose={() => setModal(null)}
        title="PIN zurücksetzen"
        actions={
          resetStep === 1 ? undefined : (
            <>
              <AdminButton variant="secondary" onClick={() => setModal(null)}>Abbrechen</AdminButton>
              <AdminButton variant="primary" onClick={submitReset} disabled={resetSaving}>
                {resetSaving ? 'Speichern…' : 'PIN speichern'}
              </AdminButton>
            </>
          )
        }
      >
        {resetStep === 1 ? (
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.06em] text-amber-700">Schritt 1 von 2</span>
            <p className="text-sm text-stone-600 leading-relaxed">
              Wir senden einen einmaligen Code an die hinterlegten Berichts-Empfänger. Mit diesem Code kannst du eine neue PIN vergeben.
            </p>
            <div className="bg-stone-100 border border-stone-200 rounded-lg px-3.5 py-3 text-[13px] font-medium text-stone-600 leading-relaxed break-words">
              {recipients.length > 0
                ? `Code geht an: ${recipients.join(', ')}${ceoEmail ? `, ${ceoEmail}` : ''}`
                : 'Keine Empfänger hinterlegt — nutze den Notfall-Code.'}
            </div>
            <AdminButton variant="primary" onClick={sendResetCode} disabled={resetSending}>
              {resetSending ? 'Wird gesendet…' : 'Code senden'}
            </AdminButton>
            <div className="border-t border-stone-100 pt-3.5 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setResetStep(2)}
                className="self-start text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Ich habe einen Notfall-Code
              </button>
              <p className="text-xs text-stone-400 leading-relaxed">
                Der Notfall-Code (Wiederherstellungs-PIN) ist in der Serverkonfiguration hinterlegt.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.06em] text-amber-700">Schritt 2 von 2</span>
            <p className="text-sm text-stone-600 leading-relaxed">
              Gib den Code aus der E-Mail ein oder verwende den Notfall-Code, und wähle eine neue {pinLength}-stellige PIN.
            </p>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Einmaliger Code</span>
              <PinInput value={resetCode} onChange={setResetCode} length={pinLength} reveal autoFocus ariaLabel="Einmaliger Code" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Neue PIN</span>
              <PinInput value={resetNewPin} onChange={setResetNewPin} length={pinLength} ariaLabel="Neue PIN" />
            </div>
            {resetError && <p className="text-[13px] text-red-600">{resetError}</p>}
          </div>
        )}
      </Modal>
    </>
  )
}
