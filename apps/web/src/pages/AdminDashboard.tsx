// Admin dashboard: month-to-date summary, transaction log, report trigger
// Protected — requires valid session token from AdminLogin PIN flow

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../lib/adminApi'
import Sidebar from '../components/admin/Sidebar'
import { Topbar, MonthSelector } from '../components/admin/Topbar'
import SummaryCard from '../components/admin/SummaryCard'
import DataTable, { Column } from '../components/admin/DataTable'
import Modal from '../components/admin/Modal'
import AdminButton from '../components/admin/AdminButton'
import Badge from '../components/admin/Badge'
import AdminIcon from '../components/admin/AdminIcon'
import AdminField from '../components/admin/AdminField'
import AdminSelect from '../components/admin/AdminSelect'
import Toast from '../components/admin/Toast'
import ItemsPage from './admin/ItemsPage'
import CompaniesPage from './admin/CompaniesPage'
import MembersPage from './admin/MembersPage'
import SettingsPage from './admin/SettingsPage'

type PageId = 'dashboard' | 'log' | 'companies' | 'members' | 'items' | 'settings'

interface TransactionRow {
  id: string
  logged_at: string
  member_name: string
  work_email: string | null
  company_name: string
  company_id: string
  item_name: string
  quantity: number
  price_cents: number
}

interface CompanySummaryRow {
  id: string
  name: string
  month_total_cents: number
  active: boolean
}

function formatPrice(cents: number): string {
  return '€ ' + (cents / 100).toFixed(2).replace('.', ',')
}

function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  const last = parts[parts.length - 1]
  return `${parts.slice(0, -1).join(' ')} ${last.charAt(0).toUpperCase()}.`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  )
}

function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(value: string): string {
  const [y, m] = value.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [companies, setCompanies] = useState<CompanySummaryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthValue())

  // Clear log filters when month changes so stale selections don't hide data
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    setFilterCompanyId('')
    setFilterName('')
    setFilterItemName('')
  }
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Log filter state
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [filterName, setFilterName] = useState<string>('')
  const [filterItemName, setFilterItemName] = useState<string>('')
  const [logSortDir, setLogSortDir] = useState<'desc' | 'asc'>('desc')

  // Session guard
  useEffect(() => {
    if (!sessionStorage.getItem('adminSession')) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { transactions: txs, members, companies: cos, items } = await adminApi.getDashboard()

        const memberMap = new Map(members.map(m => [m.id, { name: m.name, work_email: m.work_email ?? null }]))
        const companyMap = new Map(cos.map(c => [c.id, c.name]))
        const itemMap = new Map(items.map(i => [i.id, { name: i.name, price_cents: i.price_cents }]))

        const rows: TransactionRow[] = txs.map(t => {
          const member = memberMap.get(t.member_id)
          const item = itemMap.get(t.item_id)
          return {
            id: t.id,
            logged_at: t.logged_at,
            member_name: member?.name ?? '—',
            work_email: member?.work_email ?? null,
            company_name: companyMap.get(t.company_id) ?? '—',
            company_id: t.company_id,
            item_name: item?.name ?? '—',
            quantity: t.quantity,
            price_cents: (item?.price_cents ?? 0) * t.quantity,
          }
        })
        setTransactions(rows)

        // company totals are computed per-month in the useMemo below
        const coRows: CompanySummaryRow[] = cos.map(c => ({
          id: c.id, name: c.name, month_total_cents: 0, active: c.active,
        }))
        setCompanies(coRows)
      } catch {
        showToast('Daten konnten nicht geladen werden.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Stable identity so child effects that depend on it (e.g. SettingsPage's
  // initial load) don't re-run every time a toast is shown/cleared.
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])

  const handleSendReport = async () => {
    setReportSending(true)
    try {
      const pin = sessionStorage.getItem('adminPin') ?? ''
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ month: selectedMonth }),
      })
      setReportOpen(false)
      showToast(
        res.ok
          ? 'Bericht wurde erfolgreich gesendet.'
          : 'Fehler beim Senden. Bitte erneut versuchen.'
      )
    } catch {
      showToast('Fehler beim Senden. Bitte erneut versuchen.')
    } finally {
      setReportSending(false)
    }
  }

  // Transactions scoped to the selected month
  const monthTransactions = useMemo(
    () => transactions.filter(t => t.logged_at.startsWith(selectedMonth)),
    [transactions, selectedMonth],
  )

  // Company totals recomputed when month changes
  const companiesForMonth = useMemo(
    () => companies.map(c => ({
      ...c,
      month_total_cents: monthTransactions
        .filter(t => t.company_id === c.id)
        .reduce((acc, t) => acc + t.price_cents, 0),
    })),
    [companies, monthTransactions],
  )

  // Filtered log rows (client-side), scoped to selected month
  const filteredTransactions = useMemo(() => {
    let rows = monthTransactions
    if (filterCompanyId) rows = rows.filter(r => r.company_id === filterCompanyId)
    if (filterName.trim()) {
      const q = filterName.trim().toLowerCase()
      rows = rows.filter(r => r.member_name.toLowerCase().includes(q))
    }
    if (filterItemName) rows = rows.filter(r => r.item_name === filterItemName)
    return [...rows].sort((a, b) => {
      const ta = new Date(a.logged_at).getTime()
      const tb = new Date(b.logged_at).getTime()
      return logSortDir === 'desc' ? tb - ta : ta - tb
    })
  }, [monthTransactions, filterCompanyId, filterName, filterItemName, logSortDir])

  const handleExportCsv = () => {
    const header = ['Zeitpunkt', 'Person', 'E-Mail', 'Unternehmen', 'Item', 'Menge', 'Betrag (€)']
    const rows = filteredTransactions.map(r => [
      formatDateTime(r.logged_at),
      r.member_name,
      r.work_email ?? '',
      r.company_name,
      r.item_name,
      String(r.quantity),
      (r.price_cents / 100).toFixed(2).replace('.', ','),
    ])
    // Neutralize spreadsheet formula injection: a cell beginning with = + - @ or
    // a leading control char can be executed as a formula by Excel/Sheets when the
    // CSV is opened. Prefix those with an apostrophe (renders as text), then quote.
    const csvCell = (value: string): string => {
      const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
      return `"${guarded.replace(/"/g, '""')}"`
    }
    const csv = [header, ...rows]
      .map(row => row.map(csvCell).join(';'))
      .join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kaffeelisten-${new Date().toISOString().slice(0, 7)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalCents = monthTransactions.reduce((acc, t) => acc + t.price_cents, 0)
  const selectedMonthLabel = monthLabel(selectedMonth)

  const itemCounts: Record<string, number> = {}
  for (const t of monthTransactions) {
    itemCounts[t.item_name] = (itemCounts[t.item_name] ?? 0) + t.quantity
  }
  const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])
  const topItem = sortedItems[0]?.[0] ?? '—'
  const topItemCount = sortedItems[0]?.[1] ?? 0

  const txColumns: Column<TransactionRow>[] = [
    {
      key: 'logged_at', label: 'Zeitpunkt', mono: true, muted: true,
      render: r => formatDateTime(r.logged_at),
    },
    { key: 'member_name', label: 'Person', render: r => abbreviateName(r.member_name) },
    { key: 'company_name', label: 'Unternehmen', muted: true },
    { key: 'item_name', label: 'Item' },
    { key: 'quantity', label: 'Menge', align: 'right', mono: true },
    {
      key: 'price_cents', label: 'Betrag', align: 'right', mono: true,
      render: r => <span className="font-semibold">{formatPrice(r.price_cents)}</span>,
    },
  ]

  const companyColumns: Column<CompanySummaryRow>[] = [
    {
      key: 'name', label: 'Unternehmen',
      render: r => <span className="font-semibold">{r.name}</span>,
    },
    {
      key: 'month_total_cents', label: selectedMonthLabel, align: 'right', mono: true,
      render: r => <span className="font-semibold">{formatPrice(r.month_total_cents)}</span>,
    },
    {
      key: 'active', label: 'Status',
      render: () => <Badge kind="active">Aktiv</Badge>,
    },
  ]

  // Unique companies/items in the selected month (for log filter dropdowns)
  const logCompanyOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const t of monthTransactions) {
      if (!seen.has(t.company_id)) seen.set(t.company_id, t.company_name)
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [monthTransactions])

  const logItemOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const t of monthTransactions) seen.add(t.item_name)
    return [...seen].sort()
  }, [monthTransactions])

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar
        active={activePage}
        onNavigate={setActivePage}
        onSendReport={() => setReportOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0 bg-bg overflow-y-auto">

        {/* ── Dashboard ── */}
        {activePage === 'dashboard' && (
          <>
            <Topbar
              title="Übersicht"
              eyebrow={selectedMonthLabel}
              onMenuClick={() => setSidebarOpen(true)}
              right={
                <>
                  <MonthSelector value={selectedMonth} onChange={handleMonthChange} />
                  <AdminButton
                    variant="secondary"
                    icon={<AdminIcon name="download" size={16} />}
                    onClick={handleExportCsv}
                  >
                    CSV exportieren
                  </AdminButton>
                  <AdminButton
                    variant="primary"
                    icon={<AdminIcon name="send" size={16} />}
                    onClick={() => setReportOpen(true)}
                  >
                    Bericht senden
                  </AdminButton>
                </>
              }
            />
            <div className="p-4 md:p-8 flex flex-col gap-6">
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 rounded-xl bg-surface-2 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard label="Einträge" metric={monthTransactions.length} sub={selectedMonthLabel} />
                  <SummaryCard
                    label="Umsatz"
                    metric={formatPrice(totalCents)}
                    sub={`${new Set(monthTransactions.map(t => t.member_name)).size} Konsumierende`}
                  />
                  <SummaryCard label="Beliebtestes Item" metric={topItem} sub={`${topItemCount} × im Monat`} accent="stone" />
                  <SummaryCard label="Unternehmen" metric={companies.length} sub="mit Einträgen" accent="stone" />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-fg">Letzte Einträge</h2>
                  <AdminButton variant="ghost" size="sm" onClick={() => setActivePage('log')}>
                    Alle anzeigen →
                  </AdminButton>
                </div>
                <DataTable
                  columns={txColumns}
                  rows={monthTransactions.slice(0, 6)}
                  empty={{ title: 'Noch keine Einträge.', body: 'Sobald jemand etwas einträgt, erscheint es hier.' }}
                />
              </div>

              {companiesForMonth.some(c => c.month_total_cents > 0) && (
                <div>
                  <h2 className="text-base font-semibold text-fg mb-3">
                    Übersicht nach Unternehmen
                  </h2>
                  <DataTable columns={companyColumns} rows={companiesForMonth} />
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Log ── */}
        {activePage === 'log' && (
          <>
            <Topbar
              title="Einträge"
              eyebrow={selectedMonthLabel}
              onMenuClick={() => setSidebarOpen(true)}
              right={
                <>
                  <MonthSelector value={selectedMonth} onChange={handleMonthChange} />
                  <AdminButton
                    variant="secondary"
                    icon={<AdminIcon name="download" size={16} />}
                    onClick={handleExportCsv}
                  >
                    Export
                  </AdminButton>
                </>
              }
            />
            <div className="p-4 md:p-8 flex flex-col gap-4">
              {/* Filter bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <AdminField
                  variant="filter"
                  className="w-52"
                  placeholder="Person suchen…"
                  leading={<AdminIcon name="search" size={16} strokeWidth={1.5} />}
                  value={filterName}
                  onChange={e => setFilterName(e.target.value)}
                />
                <AdminSelect
                  variant="filter"
                  aria-label="Unternehmen filtern"
                  value={filterCompanyId}
                  onChange={e => setFilterCompanyId(e.target.value)}
                >
                  <option value="">Alle Unternehmen</option>
                  {logCompanyOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </AdminSelect>
                <AdminSelect
                  variant="filter"
                  aria-label="Items filtern"
                  value={filterItemName}
                  onChange={e => setFilterItemName(e.target.value)}
                >
                  <option value="">Alle Items</option>
                  {logItemOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </AdminSelect>
                <button
                  type="button"
                  onClick={() => setLogSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  className="inline-flex items-center gap-1.5 h-9 px-3 bg-surface border border-border rounded-md text-sm text-fg hover:bg-surface-2 transition-colors"
                >
                  Datum {logSortDir === 'desc' ? '↓' : '↑'}
                </button>
                {(filterCompanyId || filterName || filterItemName) && (
                  <button
                    type="button"
                    onClick={() => { setFilterCompanyId(''); setFilterName(''); setFilterItemName('') }}
                    className="text-xs text-fg-muted hover:text-fg transition-colors"
                  >
                    Filter zurücksetzen
                  </button>
                )}
                <span className="ml-auto text-sm text-fg-muted">
                  {filteredTransactions.length} Einträge
                </span>
              </div>

              <DataTable
                columns={txColumns}
                rows={filteredTransactions}
                empty={{ title: 'Keine Einträge gefunden.' }}
              />
            </div>
          </>
        )}

        {/* ── CRUD pages ── */}
        {activePage === 'companies' && <CompaniesPage onToast={showToast} onMenuClick={() => setSidebarOpen(true)} />}
        {activePage === 'members' && <MembersPage onToast={showToast} onMenuClick={() => setSidebarOpen(true)} />}
        {activePage === 'items' && <ItemsPage onToast={showToast} onMenuClick={() => setSidebarOpen(true)} />}

        {/* ── Settings ── */}
        {activePage === 'settings' && (
          <SettingsPage onToast={showToast} onMenuClick={() => setSidebarOpen(true)} />
        )}
      </main>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Monatsbericht senden"
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setReportOpen(false)}>Abbrechen</AdminButton>
            <AdminButton
              variant="primary"
              onClick={handleSendReport}
              disabled={reportSending}
              icon={<AdminIcon name="send" size={16} />}
            >
              {reportSending ? 'Senden…' : 'Senden'}
            </AdminButton>
          </>
        }
      >
        Der Bericht für <strong>{selectedMonthLabel}</strong> ({monthTransactions.length} Einträge,{' '}
        {formatPrice(totalCents)}) wird per E-Mail versendet. Die Einträge bleiben erhalten.
      </Modal>

      <Toast message={toast} />
    </div>
  )
}
