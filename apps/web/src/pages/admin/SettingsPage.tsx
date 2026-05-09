import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Topbar } from '../../components/admin/Topbar'
import AdminButton from '../../components/admin/AdminButton'
import AdminIcon from '../../components/admin/AdminIcon'
import Modal from '../../components/admin/Modal'
import SummaryCard from '../../components/admin/SummaryCard'

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

interface ArchiveStats {
  totalCount: number
  distinctMonths: number
  oldestMonth: string | null
  newestMonth: string | null
}

interface RecipientsState {
  loading: boolean
  emails: string[]
  saving: boolean
}

interface PinState {
  current: string
  next: string
  confirm: string
  saving: boolean
  error: string | null
}

interface DataState {
  liveCount: number | null
  archive: ArchiveStats | null
  loadingStats: boolean
  archiving: boolean
}

const INPUT_CLASS =
  'h-11 px-3 bg-stone-100 border border-stone-200 rounded text-stone-900 text-base ' +
  'focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:bg-white outline-none transition-colors w-full'

const LABEL_CLASS = 'text-xs font-medium text-stone-500 uppercase tracking-wide'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col gap-4">
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      {children}
    </div>
  )
}

function monthRangeLabel(oldest: string | null, newest: string | null): string {
  if (!oldest) return 'Kein Archiv'
  if (oldest === newest) return oldest
  return `${oldest} – ${newest}`
}

export default function SettingsPage({ onToast, onMenuClick }: Props) {
  const [recipients, setRecipients] = useState<RecipientsState>({ loading: true, emails: [], saving: false })
  const [addEmailInput, setAddEmailInput] = useState('')
  const [pinState, setPinState] = useState<PinState>({ current: '', next: '', confirm: '', saving: false, error: null })
  const [dataState, setDataState] = useState<DataState>({ liveCount: null, archive: null, loadingStats: true, archiving: false })
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)

  const pin = () => sessionStorage.getItem('adminPin') ?? ''

  const loadStats = async () => {
    setDataState(prev => ({ ...prev, loadingStats: true }))
    const [liveRes, archiveRes] = await Promise.all([
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('transactions_archive').select('report_month'),
    ])
    const months = [...new Set((archiveRes.data ?? []).map(r => r.report_month as string))].sort()
    setDataState(prev => ({
      ...prev,
      loadingStats: false,
      liveCount: liveRes.count ?? 0,
      archive: {
        totalCount: archiveRes.data?.length ?? 0,
        distinctMonths: months.length,
        oldestMonth: months[0] ?? null,
        newestMonth: months[months.length - 1] ?? null,
      },
    }))
  }

  useEffect(() => {
    // Load recipients
    fetch(`/api/admin/settings?key=report_recipients`, { headers: { 'x-admin-pin': pin() } })
      .then(r => r.json())
      .then((data: { value: string }) => {
        const emails = data.value ? data.value.split(',').map(e => e.trim()).filter(Boolean) : []
        setRecipients(prev => ({ ...prev, loading: false, emails }))
      })
      .catch(() => setRecipients(prev => ({ ...prev, loading: false })))

    loadStats()
  }, [])

  // ── Recipients ──────────────────────────────────────────────────────────────

  const saveRecipients = async (emails: string[]) => {
    setRecipients(prev => ({ ...prev, saving: true }))
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin() },
      body: JSON.stringify({ key: 'report_recipients', value: emails.join(', ') }),
    })
    setRecipients(prev => ({ ...prev, saving: false, emails: res.ok ? emails : prev.emails }))
    onToast(res.ok ? 'Empfänger gespeichert.' : 'Fehler beim Speichern.')
  }

  const handleAddEmail = () => {
    const email = addEmailInput.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      onToast('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    if (recipients.emails.includes(email)) {
      onToast('Diese Adresse ist bereits eingetragen.')
      return
    }
    const updated = [...recipients.emails, email]
    setAddEmailInput('')
    saveRecipients(updated)
  }

  const handleRemoveEmail = (email: string) => {
    saveRecipients(recipients.emails.filter(e => e !== email))
  }

  // ── PIN change ──────────────────────────────────────────────────────────────

  const handleChangePin = async () => {
    if (!/^\d{4}$/.test(pinState.next)) {
      setPinState(s => ({ ...s, error: 'Die neue PIN muss genau 4 Ziffern enthalten.' }))
      return
    }
    if (pinState.next !== pinState.confirm) {
      setPinState(s => ({ ...s, error: 'Die PINs stimmen nicht überein.' }))
      return
    }
    setPinState(s => ({ ...s, saving: true, error: null }))
    const res = await fetch('/api/admin/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin: pinState.current, newPin: pinState.next }),
    })
    const data = await res.json() as { error?: string }
    if (res.ok) {
      sessionStorage.setItem('adminPin', pinState.next)
      setPinState({ current: '', next: '', confirm: '', saving: false, error: null })
      onToast('PIN erfolgreich geändert.')
    } else {
      setPinState(s => ({ ...s, saving: false, error: data.error ?? 'Fehler beim Speichern.' }))
    }
  }

  // ── Manual archive ──────────────────────────────────────────────────────────

  const handleManualArchive = async () => {
    setDataState(prev => ({ ...prev, archiving: true }))
    const res = await fetch('/api/admin/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin() },
      body: JSON.stringify({}),
    })
    const data = await res.json() as { archivedCount?: number; error?: string }
    setDataState(prev => ({ ...prev, archiving: false }))
    setArchiveConfirmOpen(false)
    if (res.ok) {
      onToast(`${data.archivedCount ?? 0} Einträge archiviert.`)
      await loadStats()
    } else {
      onToast('Fehler beim Archivieren.')
    }
  }

  const pinValid = pinState.current.length > 0 && /^\d{4}$/.test(pinState.next) && pinState.next === pinState.confirm

  return (
    <>
      <Topbar title="Einstellungen" onMenuClick={onMenuClick} />
      <div className="p-4 md:p-8 flex flex-col gap-6">

        {/* ── Berichtsempfänger ── */}
        <SectionCard title="Berichtsempfänger">
          <p className="text-sm text-stone-500 -mt-1">
            Diese Adressen erhalten den monatlichen Bericht per E-Mail.
          </p>
          {recipients.loading ? (
            <div className="h-8 bg-stone-100 rounded animate-pulse w-64" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {recipients.emails.length === 0 && (
                <span className="text-sm text-stone-400">Noch keine Empfänger eingetragen.</span>
              )}
              {recipients.emails.map(email => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 text-sm px-3 py-1 rounded-full"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(email)}
                    disabled={recipients.saving}
                    className="text-stone-400 hover:text-red-500 transition-colors disabled:opacity-40"
                  >
                    <AdminIcon name="close" size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="email"
              className="h-9 px-3 bg-white border border-stone-200 rounded-md text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-colors w-72"
              placeholder="name@unternehmen.de"
              value={addEmailInput}
              onChange={e => setAddEmailInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddEmail() }}
              disabled={recipients.saving}
            />
            <AdminButton
              variant="secondary"
              size="sm"
              icon={<AdminIcon name="add" size={16} />}
              onClick={handleAddEmail}
              disabled={!addEmailInput.trim() || recipients.saving}
            >
              Hinzufügen
            </AdminButton>
          </div>
        </SectionCard>

        {/* ── PIN ändern ── */}
        <SectionCard title="PIN ändern">
          <p className="text-sm text-stone-500 -mt-1">
            Die neue PIN muss aus genau 4 Ziffern bestehen.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>Aktuelle PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className={INPUT_CLASS}
                value={pinState.current}
                onChange={e => setPinState(s => ({ ...s, current: e.target.value, error: null }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>Neue PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className={INPUT_CLASS}
                value={pinState.next}
                onChange={e => setPinState(s => ({ ...s, next: e.target.value, error: null }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>Bestätigen</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                className={INPUT_CLASS}
                value={pinState.confirm}
                onChange={e => setPinState(s => ({ ...s, confirm: e.target.value, error: null }))}
              />
            </div>
          </div>
          {pinState.error && (
            <p className="text-sm text-red-600">{pinState.error}</p>
          )}
          <div>
            <AdminButton
              variant="primary"
              onClick={handleChangePin}
              disabled={!pinValid || pinState.saving}
            >
              {pinState.saving ? 'Speichern…' : 'PIN ändern'}
            </AdminButton>
          </div>
        </SectionCard>

        {/* ── Datenverwaltung ── */}
        <SectionCard title="Datenverwaltung">
          {dataState.loadingStats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <SummaryCard
                label="Aktive Einträge"
                metric={dataState.liveCount ?? 0}
                sub="in der Datenbank"
              />
              <SummaryCard
                label="Archiviert"
                metric={dataState.archive?.totalCount ?? 0}
                sub="Einträge gesamt"
                accent="stone"
              />
              <SummaryCard
                label="Archivierte Monate"
                metric={dataState.archive?.distinctMonths ?? 0}
                sub={monthRangeLabel(dataState.archive?.oldestMonth ?? null, dataState.archive?.newestMonth ?? null)}
                accent="stone"
              />
            </div>
          )}
          <div>
            <AdminButton
              variant="secondary"
              icon={<AdminIcon name="download" size={16} />}
              onClick={() => setArchiveConfirmOpen(true)}
              disabled={dataState.archiving || (dataState.liveCount ?? 0) === 0}
            >
              Manuell archivieren
            </AdminButton>
          </div>
        </SectionCard>

        {/* ── Über die App ── */}
        <SectionCard title="Über die App">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-4">
              <dt className={LABEL_CLASS + ' w-32 shrink-0'}>Version</dt>
              <dd className="text-stone-700 font-mono">0.1.0</dd>
            </div>
            <div className="flex items-center gap-4">
              <dt className={LABEL_CLASS + ' w-32 shrink-0'}>Datenschutz</dt>
              <dd>
                <a href="/datenschutz" className="text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors">
                  Datenschutzerklärung ansehen
                </a>
              </dd>
            </div>
            <div className="flex items-center gap-4">
              <dt className={LABEL_CLASS + ' w-32 shrink-0'}>Erstellt für</dt>
              <dd className="text-stone-500">B4Y3RW4LD Hackathon · ITC1 Deggendorf · Mai 2026</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <Modal
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        title="Einträge archivieren"
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setArchiveConfirmOpen(false)}>
              Abbrechen
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={handleManualArchive}
              disabled={dataState.archiving}
              icon={<AdminIcon name="download" size={16} />}
            >
              {dataState.archiving ? 'Archivieren…' : 'Jetzt archivieren'}
            </AdminButton>
          </>
        }
      >
        Die aktuellen{' '}
        <strong>{dataState.liveCount ?? 0} Einträge</strong> werden in das Archiv übertragen und aus der
        Haupttabelle entfernt. Es wird kein Bericht versendet.
      </Modal>
    </>
  )
}
