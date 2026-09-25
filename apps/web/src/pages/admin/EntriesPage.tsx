import { useMemo, useState } from 'react'
import { Topbar } from '../../components/admin/Topbar'
import DataTable, { Column } from '../../components/admin/DataTable'
import AdminButton from '../../components/admin/AdminButton'
import AdminIcon from '../../components/admin/AdminIcon'
import AdminField from '../../components/admin/AdminField'
import AdminSelect from '../../components/admin/AdminSelect'
import FilterBar from '../../components/admin/FilterBar'
import ExportDialog from '../../components/admin/ExportDialog'
import { MonthPicker } from './MonthPicker'
import type { EntryRow } from '../../lib/entries'
import { monthLabel, monthRange } from '../../lib/dates'
import { formatEuro as euro } from '../../lib/money'

function dateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })}`
}

const berlinDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })

interface Props {
  rows: EntryRow[]
  loading: boolean
  month: string
  months: string[]
  onMonthChange: (m: string) => void
  companies: { id: string; name: string }[]
  members: { id: string; name: string; company_id: string }[]
  items: { id: string; name: string }[]
  onToast: (msg: string) => void
  onMenuClick: () => void
}

/**
 * The live month's entries. Reported months leave this view once the live table
 * is pruned; they stay retrievable through Export, which reads the archive.
 */
export default function EntriesPage({ rows, loading, month, months, onMonthChange, companies, members, items, onToast, onMenuClick }: Props) {
  const [search, setSearch] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [itemId, setItemId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exportOpen, setExportOpen] = useState(false)

  const range = monthRange(month)
  const effFrom = from || range.from
  const effTo = to || range.to

  const changeMonth = (m: string) => {
    setFrom('')
    setTo('')
    onMonthChange(m)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      const day = berlinDay.format(new Date(r.logged_at))
      return (
        r.month === month &&
        day >= effFrom && day <= effTo &&
        (!companyId || r.company_id === companyId) &&
        (!itemId || r.item_id === itemId) &&
        (!q || r.member_name.toLowerCase().includes(q) || (r.work_email ?? '').toLowerCase().includes(q))
      )
    })
  }, [rows, month, effFrom, effTo, companyId, itemId, search])

  const inMonth = useMemo(() => rows.filter(r => r.month === month), [rows, month])
  const companyOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of inMonth) seen.set(r.company_id, r.company_name)
    return [...seen].sort((a, b) => a[1].localeCompare(b[1], 'de'))
  }, [inMonth])
  const itemOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of inMonth) seen.set(r.item_id, r.item_name)
    return [...seen].sort((a, b) => a[1].localeCompare(b[1], 'de'))
  }, [inMonth])

  const columns: Column<EntryRow>[] = [
    { key: 'logged_at', label: 'Zeitpunkt', mono: true, muted: true, sortValue: r => r.logged_at, render: r => dateTime(r.logged_at) },
    {
      key: 'member_name', label: 'Person', sortValue: r => r.member_name,
      render: r => (
        <span className="flex flex-col">
          <span className={r.is_house ? 'italic text-fg-muted' : ''}>{r.member_name}</span>
          {r.work_email && <span className="text-xs text-fg-muted">{r.work_email}</span>}
        </span>
      ),
    },
    { key: 'company_name', label: 'Unternehmen', muted: true, sortValue: r => r.company_name },
    { key: 'item_name', label: 'Artikel', sortValue: r => r.item_name },
    { key: 'quantity', label: 'Menge', align: 'right', mono: true, sortValue: r => r.quantity },
    { key: 'unit', label: 'Einzelpreis', align: 'right', mono: true, muted: true, sortValue: r => r.unit_price_cents, render: r => euro(r.unit_price_cents) },
    { key: 'total', label: 'Betrag', align: 'right', mono: true, sortValue: r => r.total_cents, render: r => <span className="font-semibold">{euro(r.total_cents)}</span> },
  ]

  const totalQty = filtered.reduce((s, r) => s + r.quantity, 0)
  const totalCents = filtered.reduce((s, r) => s + r.total_cents, 0)
  const filtersActive = !!(search || companyId || itemId || from || to)

  return (
    <>
      <Topbar
        title="Einträge"
        eyebrow={monthLabel(month)}
        onMenuClick={onMenuClick}
        right={
          <>
            <MonthPicker value={month} months={months} onChange={changeMonth} />
            <AdminButton variant="secondary" icon={<AdminIcon name="download" size={16} />} onClick={() => setExportOpen(true)}>
              Export
            </AdminButton>
          </>
        }
      />
      <div className="p-4 md:p-8 flex flex-col gap-4">
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Person oder E-Mail suchen…' }}
          onReset={() => { setSearch(''); setCompanyId(''); setItemId(''); setFrom(''); setTo('') }}
          resetVisible={filtersActive}
          trailing={<span className="text-sm text-fg-muted">{filtered.length} Einträge</span>}
        >
          <AdminSelect
            variant="filter"
            aria-label="Unternehmen filtern"
            value={companyId}
            onChange={e => setCompanyId(e.target.value)}
            options={[{ value: '', label: 'Alle Unternehmen' }, ...companyOptions.map(([id, name]) => ({ value: id, label: name }))]}
          />
          <AdminSelect
            variant="filter"
            aria-label="Artikel filtern"
            value={itemId}
            onChange={e => setItemId(e.target.value)}
            options={[{ value: '', label: 'Alle Artikel' }, ...itemOptions.map(([id, name]) => ({ value: id, label: name }))]}
          />
          <div className="flex items-center gap-1.5">
            <div className="w-[9.5rem]">
              <AdminField variant="filter" type="date" aria-label="Von" min={range.from} max={effTo} value={effFrom} onChange={e => setFrom(e.target.value)} />
            </div>
            <span className="text-fg-muted text-sm">–</span>
            <div className="w-[9.5rem]">
              <AdminField variant="filter" type="date" aria-label="Bis" min={effFrom} max={range.to} value={effTo} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
        </FilterBar>

        {loading ? (
          <div className="h-48 bg-surface-2 rounded-xl animate-pulse" />
        ) : (
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={r => r.id}
            defaultSort={{ key: 'logged_at', dir: 'desc' }}
            footer={filtered.length > 0 ? {
              logged_at: 'Summe',
              quantity: totalQty,
              total: euro(totalCents),
            } : undefined}
            empty={
              inMonth.length === 0
                ? { title: 'Keine Einträge in diesem Monat.', body: 'Frühere, bereits abgerechnete Monate lassen sich über „Export“ herunterladen.' }
                : { title: 'Keine Treffer.', body: 'Passe die Filter an.' }
            }
          />
        )}
      </div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initial={{ from: effFrom, to: effTo, company_id: companyId || undefined, item_id: itemId || undefined }}
        companies={companies}
        members={members}
        items={items}
        onToast={onToast}
      />
    </>
  )
}
