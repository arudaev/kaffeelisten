import { useEffect, useMemo, useState } from 'react'
import { Topbar } from '../../components/admin/Topbar'
import SummaryCard from '../../components/admin/SummaryCard'
import DataTable, { Column } from '../../components/admin/DataTable'
import AdminButton from '../../components/admin/AdminButton'
import AdminIcon from '../../components/admin/AdminIcon'
import Badge from '../../components/admin/Badge'
import { MonthPicker } from './MonthPicker'
import { adminApi, type AdminCompany, type DocumentDelivery } from '../../lib/adminApi'
import { monthFigures, type EntryRow } from '../../lib/entries'
import { monthLabel, percentChange, shiftMonth, todayBerlin } from '../../lib/dates'
import { formatEuro as euro } from '../../lib/money'
import { summariseDeliveries } from '../../lib/deliveries'

function change(current: number, previous: number, against: string): string | undefined {
  const pct = percentChange(current, previous)
  if (pct === null) return previous === 0 && current > 0 ? `neu gegenüber ${against}` : undefined
  return `${pct > 0 ? '+' : ''}${pct} % gegenüber ${against}`
}

interface CompanyRow {
  id: string
  name: string
  active: boolean
  billing_mode?: AdminCompany['billing_mode']
  entries: number
  totalCents: number
  previousCents: number
}

interface Props {
  rows: EntryRow[]
  loading: boolean
  month: string
  months: string[]
  onMonthChange: (m: string) => void
  companies: AdminCompany[]
  onNavigate: (page: 'log' | 'documents') => void
  onSendReport: () => void
  onMenuClick: () => void
}

export default function OverviewPage({ rows, loading, month, months, onMonthChange, companies, onNavigate, onSendReport, onMenuClick }: Props) {
  const previous = shiftMonth(month, 1)
  // The month in progress is compared with the same days of the previous month;
  // a finished month with the whole previous month.
  const today = todayBerlin()
  const inProgress = today.slice(0, 7) === month
  const throughDay = inProgress ? Number(today.slice(8, 10)) : undefined
  const previousName = monthLabel(previous).split(' ')[0]
  const against = inProgress ? `1.–${throughDay}. ${previousName}` : previousName
  const now = useMemo(() => monthFigures(rows, month), [rows, month])
  const before = useMemo(() => monthFigures(rows, previous, { throughDay }), [rows, previous, throughDay])

  // What the most recent monthly run actually sent.
  const [deliveries, setDeliveries] = useState<{ month: string | null; list: DocumentDelivery[] } | null>(null)
  useEffect(() => {
    adminApi.getDeliveries()
      .then(r => setDeliveries({ month: r.month, list: r.deliveries }))
      .catch(() => setDeliveries({ month: null, list: [] }))
  }, [])

  const companyRows: CompanyRow[] = useMemo(() => companies
    .map(c => ({
      id: c.id,
      name: c.name,
      active: c.active,
      billing_mode: c.billing_mode,
      entries: now.byCompany.get(c.id)?.entries ?? 0,
      totalCents: now.byCompany.get(c.id)?.totalCents ?? 0,
      previousCents: before.byCompany.get(c.id)?.totalCents ?? 0,
    }))
    .filter(c => c.totalCents > 0 || c.previousCents > 0), [companies, now, before])

  const companyColumns: Column<CompanyRow>[] = [
    {
      key: 'name', label: 'Unternehmen', sortValue: r => r.name,
      render: r => (
        <span className="inline-flex items-center gap-2 font-semibold">
          {r.name}
          {r.billing_mode === 'company_paid' && <Badge kind="warn">Firma zahlt</Badge>}
          {!r.active && <Badge kind="inactive">Inaktiv</Badge>}
        </span>
      ),
    },
    { key: 'entries', label: 'Einträge', align: 'right', mono: true, sortValue: r => r.entries },
    { key: 'previous', label: inProgress ? `${previousName} 1.–${throughDay}.` : monthLabel(previous), align: 'right', mono: true, muted: true, sortValue: r => r.previousCents, render: r => euro(r.previousCents) },
    { key: 'total', label: monthLabel(month), align: 'right', mono: true, sortValue: r => r.totalCents, render: r => <span className="font-semibold">{euro(r.totalCents)}</span> },
    {
      key: 'change', label: 'Veränderung', align: 'right', mono: true,
      sortValue: r => percentChange(r.totalCents, r.previousCents) ?? (r.totalCents > 0 ? Infinity : -Infinity),
      render: r => {
        const pct = percentChange(r.totalCents, r.previousCents)
        if (pct === null) return r.totalCents > 0 ? <span className="text-success">neu</span> : <span className="text-fg-subtle">—</span>
        return <span className={pct > 0 ? 'text-success' : pct < 0 ? 'text-error' : 'text-fg-muted'}>{pct > 0 ? '+' : ''}{pct} %</span>
      },
    },
  ]

  const sent = deliveries ? summariseDeliveries(deliveries.list) : null

  return (
    <>
      <Topbar
        title="Übersicht"
        eyebrow={monthLabel(month)}
        onMenuClick={onMenuClick}
        right={
          <>
            <MonthPicker value={month} months={months} onChange={onMonthChange} />
            <AdminButton variant="primary" icon={<AdminIcon name="send" size={16} />} onClick={onSendReport}>
              <span className="hidden sm:inline">Bericht senden</span>
            </AdminButton>
          </>
        }
      />
      <div className="p-4 md:p-8 flex flex-col gap-6">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-surface-2 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Umsatz" metric={euro(now.totalCents)} sub={change(now.totalCents, before.totalCents, against)} />
            <SummaryCard label="Einträge" metric={now.entries} sub={change(now.entries, before.entries, against)} />
            <SummaryCard
              label="Aktive Personen"
              metric={now.consumers}
              sub={`in ${now.companiesWithEntries} ${now.companiesWithEntries === 1 ? 'Unternehmen' : 'Unternehmen'}`}
              accent="stone"
            />
            <SummaryCard
              label="Beliebtester Artikel"
              metric={now.topItem?.name ?? '—'}
              sub={now.topItem ? `${now.topItem.quantity} × im Monat` : undefined}
              accent="stone"
            />
          </div>
        )}

        {deliveries && deliveries.month && sent && (
          <section className="bg-surface border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-fg">Letzter Versand · {monthLabel(deliveries.month)}</h2>
              <p className="text-sm text-fg-muted mt-1">
                {sent.documents} Dokumente versendet: {sent.invoices} Rechnungen, {sent.statements} Aufstellungen,
                {' '}{sent.infos} Informationen{sent.resends > 0 ? ` · ${sent.resends} erneut gesendet` : ''}.
              </p>
              {sent.unresolvedMissing > 0 && (
                <p className="text-sm text-error mt-1 inline-flex items-center gap-1.5">
                  <AdminIcon name="warning" size={16} />
                  {sent.unresolvedMissing} {sent.unresolvedMissing === 1 ? 'Dokument fehlt' : 'Dokumenten fehlt'} noch ein Anhang.
                </p>
              )}
            </div>
            <AdminButton variant="secondary" onClick={() => onNavigate('documents')}>Dokumente ansehen</AdminButton>
          </section>
        )}

        {companyRows.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-fg mb-3">Unternehmen im Vergleich</h2>
            <DataTable columns={companyColumns} rows={companyRows} rowKey={r => r.id} defaultSort={{ key: 'total', dir: 'desc' }} />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-fg">Letzte Einträge</h2>
            <AdminButton variant="ghost" size="sm" onClick={() => onNavigate('log')}>Alle anzeigen →</AdminButton>
          </div>
          <DataTable
            columns={[
              { key: 'when', label: 'Zeitpunkt', mono: true, muted: true, render: (r: EntryRow) => new Date(r.logged_at).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
              { key: 'member_name', label: 'Person' },
              { key: 'company_name', label: 'Unternehmen', muted: true },
              { key: 'item_name', label: 'Artikel' },
              { key: 'total', label: 'Betrag', align: 'right', mono: true, render: (r: EntryRow) => euro(r.total_cents) },
            ]}
            rows={rows.filter(r => r.month === month).slice().sort((a, b) => b.logged_at.localeCompare(a.logged_at)).slice(0, 6)}
            rowKey={r => r.id}
            empty={{ title: 'Noch keine Einträge.', body: 'Sobald jemand etwas einträgt, erscheint es hier.' }}
          />
        </div>
      </div>
    </>
  )
}
