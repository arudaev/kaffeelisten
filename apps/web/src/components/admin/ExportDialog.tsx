import { useEffect, useState } from 'react'
import Modal from './Modal'
import AdminButton from './AdminButton'
import AdminField from './AdminField'
import AdminSelect from './AdminSelect'
import AdminIcon from './AdminIcon'
import SegmentedControl from './SegmentedControl'
import { adminApi, type ExportQuery } from '../../lib/adminApi'
import { monthRange, shiftMonth, todayBerlin } from '../../lib/dates'

export interface ExportScope {
  company_id?: string
  member_id?: string
  item_id?: string
  from?: string
  to?: string
}

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  // Pre-filled scope, e.g. the filters currently applied on the page.
  initial?: ExportScope
  companies: { id: string; name: string }[]
  members: { id: string; name: string; company_id: string }[]
  items: { id: string; name: string }[]
  onToast: (msg: string) => void
}

type Format = ExportQuery['format']

const FORMATS: { value: Format; label: string }[] = [
  { value: 'xlsx', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
]

/**
 * Export entries for any date range — including months already archived, which
 * the Einträge table deliberately does not show — scoped by company, person and
 * item. Shared by every admin tab.
 */
export default function ExportDialog({ open, onClose, initial, companies, members, items, onToast }: ExportDialogProps) {
  const current = todayBerlin().slice(0, 7)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [itemId, setItemId] = useState('')
  const [format, setFormat] = useState<Format>('xlsx')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-seed from the caller's scope each time the dialog opens.
  useEffect(() => {
    if (!open) return
    const fallback = monthRange(current)
    setFrom(initial?.from ?? fallback.from)
    setTo(initial?.to ?? fallback.to)
    setCompanyId(initial?.company_id ?? '')
    setMemberId(initial?.member_id ?? '')
    setItemId(initial?.item_id ?? '')
    setError(null)
  }, [open, initial, current])

  const presets: { label: string; month: string }[] = [
    { label: 'Dieser Monat', month: current },
    { label: 'Letzter Monat', month: shiftMonth(current, 1) },
  ]
  const setMonth = (month: string) => {
    const r = monthRange(month)
    setFrom(r.from)
    setTo(r.to)
  }
  const setYear = () => {
    setFrom(`${current.slice(0, 4)}-01-01`)
    setTo(todayBerlin())
  }

  const scopedMembers = companyId ? members.filter(m => m.company_id === companyId) : members
  const rangeInvalid = !from || !to || from > to

  const submit = async () => {
    if (rangeInvalid) return
    setBusy(true)
    setError(null)
    try {
      await adminApi.exportEntries({
        from, to, format,
        company_id: companyId || undefined,
        member_id: memberId || undefined,
        item_id: itemId || undefined,
      })
      onToast('Export heruntergeladen.')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Einträge exportieren"
      actions={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={busy}>Abbrechen</AdminButton>
          <AdminButton
            onClick={submit}
            disabled={busy || rangeInvalid}
            icon={<AdminIcon name="download" size={16} />}
          >
            {busy ? 'Wird erstellt…' : 'Herunterladen'}
          </AdminButton>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-fg">
        <p className="text-sm text-fg-muted">
          Umfasst auch bereits abgerechnete, archivierte Monate, die in „Einträge“ nicht mehr angezeigt werden.
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => setMonth(p.month)}
                className="h-8 px-2.5 text-[13px] rounded-md border border-border text-fg-muted hover:text-fg hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={setYear}
              className="h-8 px-2.5 text-[13px] rounded-md border border-border text-fg-muted hover:text-fg hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Dieses Jahr
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Von" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} />
            <AdminField
              label="Bis"
              type="date"
              value={to}
              min={from || undefined}
              onChange={e => setTo(e.target.value)}
              error={from && to && from > to ? 'Liegt vor dem Startdatum.' : undefined}
            />
          </div>
        </div>

        <AdminSelect
          label="Unternehmen"
          value={companyId}
          onChange={e => { setCompanyId(e.target.value); setMemberId('') }}
          options={[{ value: '', label: 'Alle Unternehmen' }, ...companies.map(c => ({ value: c.id, label: c.name }))]}
        />
        <AdminSelect
          label="Person"
          value={memberId}
          onChange={e => setMemberId(e.target.value)}
          options={[{ value: '', label: 'Alle Personen' }, ...scopedMembers.map(m => ({ value: m.id, label: m.name }))]}
        />
        <AdminSelect
          label="Artikel"
          value={itemId}
          onChange={e => setItemId(e.target.value)}
          options={[{ value: '', label: 'Alle Artikel' }, ...items.map(i => ({ value: i.id, label: i.name }))]}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Format</span>
          <SegmentedControl options={FORMATS} value={format} onChange={setFormat} ariaLabel="Exportformat" />
          <span className="text-xs text-fg-muted">
            {format === 'xlsx' && 'Alle Einträge plus Zusammenfassung pro Unternehmen und Person.'}
            {format === 'csv' && 'Semikolon-getrennt, für Excel und Buchhaltungssoftware.'}
            {format === 'pdf' && 'Druckbare Liste, bis 2.000 Einträge.'}
          </span>
        </div>

        {error && (
          <p role="alert" className="text-sm text-error bg-error-subtle rounded-md px-3 py-2">{error}</p>
        )}
      </div>
    </Modal>
  )
}
