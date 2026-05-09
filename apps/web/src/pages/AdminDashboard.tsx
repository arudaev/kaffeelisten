// Admin dashboard: month-to-date summary, transaction log, report trigger
// Protected — requires valid session token from AdminLogin PIN flow

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/admin/Sidebar'
import { Topbar, MonthSelector } from '../components/admin/Topbar'
import SummaryCard from '../components/admin/SummaryCard'
import DataTable, { Column } from '../components/admin/DataTable'
import Modal from '../components/admin/Modal'
import AdminButton from '../components/admin/AdminButton'
import Badge from '../components/admin/Badge'
import AdminIcon from '../components/admin/AdminIcon'
import ItemsPage from './admin/ItemsPage'
import CompaniesPage from './admin/CompaniesPage'
import MembersPage from './admin/MembersPage'

type PageId = 'dashboard' | 'log' | 'companies' | 'members' | 'items' | 'settings'

interface TransactionRow {
  id: string
  logged_at: string
  member_name: string
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

function currentMonthLabel(): string {
  return new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [companies, setCompanies] = useState<CompanySummaryRow[]>([])
  const [loading, setLoading] = useState(true)
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

      const txRes = await supabase
        .from('transactions')
        .select('*')
        .order('logged_at', { ascending: false })

      const [membersRes, companiesRes, itemsRes] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('companies').select('*').eq('active', true).order('name'),
        supabase.from('items').select('*'),
      ])

      if (txRes.data && membersRes.data && companiesRes.data && itemsRes.data) {
        const memberMap = new Map(membersRes.data.map(m => [m.id, m.name]))
        const companyMap = new Map(companiesRes.data.map(c => [c.id, c.name]))
        const itemMap = new Map(
          itemsRes.data.map(i => [i.id, { name: i.name, price_cents: i.price_cents }])
        )

        const rows: TransactionRow[] = txRes.data.map(t => {
          const item = itemMap.get(t.item_id)
          return {
            id: t.id,
            logged_at: t.logged_at,
            member_name: memberMap.get(t.member_id) ?? '—',
            company_name: companyMap.get(t.company_id) ?? '—',
            company_id: t.company_id,
            item_name: item?.name ?? '—',
            quantity: t.quantity,
            price_cents: (item?.price_cents ?? 0) * t.quantity,
          }
        })
        setTransactions(rows)

        const coRows: CompanySummaryRow[] = companiesRes.data.map(c => {
          const total = rows
            .filter(r => r.company_id === c.id)
            .reduce((acc, r) => acc + r.price_cents, 0)
          return { id: c.id, name: c.name, month_total_cents: total, active: c.active }
        })
        setCompanies(coRows)
      }

      setLoading(false)
    }
    fetchData()
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const handleSendReport = async () => {
    setReportSending(true)
    try {
      const pin = sessionStorage.getItem('adminPin') ?? ''
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'x-admin-pin': pin },
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

  // Filtered log rows (client-side)
  const filteredTransactions = useMemo(() => {
    let rows = transactions
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
  }, [transactions, filterCompanyId, filterName, filterItemName, logSortDir])

  const handleExportCsv = () => {
    const header = ['Zeitpunkt', 'Person', 'Unternehmen', 'Item', 'Menge', 'Betrag (€)']
    const rows = filteredTransactions.map(r => [
      formatDateTime(r.logged_at),
      r.member_name,
      r.company_name,
      r.item_name,
      String(r.quantity),
      (r.price_cents / 100).toFixed(2).replace('.', ','),
    ])
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kaffeelisten-${new Date().toISOString().slice(0, 7)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalCents = transactions.reduce((acc, t) => acc + t.price_cents, 0)
  const monthLabel = currentMonthLabel()

  const itemCounts: Record<string, number> = {}
  for (const t of transactions) {
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
      key: 'month_total_cents', label: monthLabel, align: 'right', mono: true,
      render: r => <span className="font-semibold">{formatPrice(r.month_total_cents)}</span>,
    },
    {
      key: 'active', label: 'Status',
      render: () => <Badge kind="active">Aktiv</Badge>,
    },
  ]

  // Unique companies present in current transaction set (for log filter dropdown)
  const logCompanyOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const t of transactions) {
      if (!seen.has(t.company_id)) seen.set(t.company_id, t.company_name)
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [transactions])

  const logItemOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const t of transactions) seen.add(t.item_name)
    return [...seen].sort()
  }, [transactions])

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar
        active={activePage}
        onNavigate={setActivePage}
        onSendReport={() => setReportOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0 bg-stone-50 overflow-y-auto">

        {/* ── Dashboard ── */}
        {activePage === 'dashboard' && (
          <>
            <Topbar
              title="Übersicht"
              eyebrow={monthLabel}
              onMenuClick={() => setSidebarOpen(true)}
              right={
                <>
                  <MonthSelector value={monthLabel} onChange={() => {}} />
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
                    <div key={i} className="h-28 rounded-xl bg-stone-100 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard label="Einträge diesen Monat" metric={transactions.length} sub="Alle Unternehmen" />
                  <SummaryCard
                    label="Umsatz diesen Monat"
                    metric={formatPrice(totalCents)}
                    sub={`${new Set(transactions.map(t => t.member_name)).size} Konsumierende aktiv`}
                  />
                  <SummaryCard label="Beliebtestes Item" metric={topItem} sub={`${topItemCount} × diesen Monat`} accent="stone" />
                  <SummaryCard label="Unternehmen" metric={companies.length} sub="mit Einträgen" accent="stone" />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-stone-900">Letzte Einträge</h2>
                  <AdminButton variant="ghost" size="sm" onClick={() => setActivePage('log')}>
                    Alle anzeigen →
                  </AdminButton>
                </div>
                <DataTable
                  columns={txColumns}
                  rows={transactions.slice(0, 6)}
                  empty={{ title: 'Noch keine Einträge.', body: 'Sobald jemand etwas einträgt, erscheint es hier.' }}
                />
              </div>

              {companies.length > 0 && (
                <div>
                  <h2 className="text-base font-semibold text-stone-900 mb-3">
                    Übersicht nach Unternehmen
                  </h2>
                  <DataTable columns={companyColumns} rows={companies} />
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
              eyebrow={monthLabel}
              onMenuClick={() => setSidebarOpen(true)}
              right={
                <>
                  <MonthSelector value={monthLabel} onChange={() => {}} />
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
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <AdminIcon name="search" size={16} strokeWidth={1.5} />
                  </span>
                  <input
                    className="h-9 pl-8 pr-3 bg-white border border-stone-200 rounded-md text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-colors w-52"
                    placeholder="Person suchen…"
                    value={filterName}
                    onChange={e => setFilterName(e.target.value)}
                  />
                </div>
                <select
                  className="h-9 px-3 bg-white border border-stone-200 rounded-md text-sm text-stone-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-colors"
                  value={filterCompanyId}
                  onChange={e => setFilterCompanyId(e.target.value)}
                >
                  <option value="">Alle Unternehmen</option>
                  {logCompanyOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  className="h-9 px-3 bg-white border border-stone-200 rounded-md text-sm text-stone-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-colors"
                  value={filterItemName}
                  onChange={e => setFilterItemName(e.target.value)}
                >
                  <option value="">Alle Items</option>
                  {logItemOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setLogSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                  className="inline-flex items-center gap-1.5 h-9 px-3 bg-white border border-stone-200 rounded-md text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  Datum {logSortDir === 'desc' ? '↓' : '↑'}
                </button>
                {(filterCompanyId || filterName || filterItemName) && (
                  <button
                    type="button"
                    onClick={() => { setFilterCompanyId(''); setFilterName(''); setFilterItemName('') }}
                    className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
                  >
                    Filter zurücksetzen
                  </button>
                )}
                <span className="ml-auto text-sm text-stone-500">
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
          <>
            <Topbar title="Einstellungen" onMenuClick={() => setSidebarOpen(true)} />
            <div className="p-4 md:p-8">
              <DataTable
                columns={[{ key: 'k', label: '' }]}
                rows={[]}
                empty={{ title: 'Einstellungen', body: 'Konfiguration folgt in einer späteren Version.' }}
              />
            </div>
          </>
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
        Der Bericht für <strong>{monthLabel}</strong> ({transactions.length} Einträge,{' '}
        {formatPrice(totalCents)}) wird per E-Mail versendet. Nach dem Senden werden die Einträge
        archiviert und die Tabelle zurückgesetzt.
      </Modal>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-stone-900 text-white px-4 py-3 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2.5 z-50">
          <AdminIcon name="check" size={18} strokeWidth={2.5} />
          {toast}
        </div>
      )}
    </div>
  )
}
