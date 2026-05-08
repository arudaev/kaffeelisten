// Admin dashboard: month-to-date summary, transaction log, report trigger
// Protected — requires valid session token from AdminLogin PIN flow

import { useEffect, useState } from 'react'
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

type PageId = 'dashboard' | 'log' | 'companies' | 'members' | 'items' | 'settings'

interface TransactionRow {
  id: string
  logged_at: string
  member_name: string
  company_name: string
  item_name: string
  quantity: number
  price_cents: number
}

interface CompanyRow {
  id: string
  name: string
  month_total_cents: number
  active: boolean
}

function formatPrice(cents: number): string {
  return '€ ' + (cents / 100).toFixed(2).replace('.', ',')
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
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Session guard
  useEffect(() => {
    if (!sessionStorage.getItem('adminSession')) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  // Load data using separate queries to avoid complex join typing
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
        const itemMap = new Map(itemsRes.data.map(i => [i.id, { name: i.name, price_cents: i.price_cents }]))

        const rows: TransactionRow[] = txRes.data.map(t => {
          const item = itemMap.get(t.item_id)
          return {
            id: t.id,
            logged_at: t.logged_at,
            member_name: memberMap.get(t.member_id) ?? '—',
            company_name: companyMap.get(t.company_id) ?? '—',
            item_name: item?.name ?? '—',
            quantity: t.quantity,
            price_cents: (item?.price_cents ?? 0) * t.quantity,
          }
        })
        setTransactions(rows)

        const coRows: CompanyRow[] = companiesRes.data.map(c => {
          const total = rows
            .filter(r => r.company_name === c.name)
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
      const res = await fetch('/api/send-report', { method: 'POST' })
      setReportOpen(false)
      showToast(res.ok ? 'Bericht wurde erfolgreich gesendet.' : 'Fehler beim Senden. Bitte erneut versuchen.')
    } catch {
      showToast('Fehler beim Senden. Bitte erneut versuchen.')
    } finally {
      setReportSending(false)
    }
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
    { key: 'logged_at', label: 'Zeitpunkt', mono: true, muted: true, render: r => formatDateTime(r.logged_at) },
    { key: 'member_name', label: 'Person' },
    { key: 'company_name', label: 'Unternehmen', muted: true },
    { key: 'item_name', label: 'Item' },
    { key: 'quantity', label: 'Menge', align: 'right', mono: true },
    {
      key: 'price_cents', label: 'Betrag', align: 'right', mono: true,
      render: r => <span className="font-semibold">{formatPrice(r.price_cents)}</span>,
    },
  ]

  const companyColumns: Column<CompanyRow>[] = [
    { key: 'name', label: 'Unternehmen', render: r => <span className="font-semibold">{r.name}</span> },
    {
      key: 'month_total_cents', label: monthLabel, align: 'right', mono: true,
      render: r => <span className="font-semibold">{formatPrice(r.month_total_cents)}</span>,
    },
    { key: 'active', label: 'Status', render: () => <Badge kind="active">Aktiv</Badge> },
    {
      key: 'actions', label: '', align: 'right',
      render: () => (
        <div className="inline-flex gap-1">
          <button type="button" className="text-stone-500 hover:text-stone-700 p-1 rounded transition-colors">
            <AdminIcon name="edit" size={16} />
          </button>
          <button type="button" className="text-stone-500 hover:text-red-600 p-1 rounded transition-colors">
            <AdminIcon name="delete" size={16} />
          </button>
        </div>
      ),
    },
  ]

  const logColumns: Column<TransactionRow>[] = [
    ...txColumns,
    {
      key: 'delete', label: '', align: 'right',
      render: () => (
        <button type="button" className="text-stone-500 hover:text-red-600 p-1 rounded transition-colors">
          <AdminIcon name="delete" size={16} />
        </button>
      ),
    },
  ]

  return (
    <div className="flex min-h-screen font-sans">
      <Sidebar active={activePage} onNavigate={setActivePage} onSendReport={() => setReportOpen(true)} />

      <main className="flex-1 min-w-0 bg-stone-50">
        {activePage === 'dashboard' && (
          <>
            <Topbar
              title="Übersicht"
              eyebrow={monthLabel}
              right={
                <>
                  <MonthSelector value={monthLabel} onChange={() => {}} />
                  <AdminButton variant="secondary" icon={<AdminIcon name="download" size={16} />}>
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
            <div className="p-8 flex flex-col gap-6">
              {loading ? (
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 rounded-xl bg-stone-100 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4 xl:grid-cols-4 lg:grid-cols-2">
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
            </div>
          </>
        )}

        {activePage === 'log' && (
          <>
            <Topbar
              title="Einträge"
              eyebrow={monthLabel}
              right={
                <>
                  <MonthSelector value={monthLabel} onChange={() => {}} />
                  <AdminButton variant="secondary" icon={<AdminIcon name="filter" size={16} />}>Filter</AdminButton>
                  <AdminButton variant="secondary" icon={<AdminIcon name="download" size={16} />}>Export</AdminButton>
                </>
              }
            />
            <div className="p-8">
              <DataTable
                columns={logColumns}
                rows={transactions}
                empty={{ title: 'Keine Einträge diesen Monat.' }}
              />
            </div>
          </>
        )}

        {activePage === 'companies' && (
          <>
            <Topbar
              title="Unternehmen"
              right={
                <AdminButton variant="primary" icon={<AdminIcon name="add" size={16} />}>
                  Hinzufügen
                </AdminButton>
              }
            />
            <div className="p-8">
              <DataTable
                columns={companyColumns}
                rows={companies}
                empty={{ title: 'Keine Unternehmen.', body: 'Unternehmen können hier hinzugefügt werden.' }}
              />
            </div>
          </>
        )}

        {activePage === 'members' && (
          <>
            <Topbar title="Mitarbeitende" right={<AdminButton variant="primary" icon={<AdminIcon name="add" size={16} />}>Hinzufügen</AdminButton>} />
            <div className="p-8">
              <DataTable
                columns={[{ key: 'name', label: 'Name' }]}
                rows={[]}
                empty={{ title: 'Noch keine Mitarbeitenden.', body: 'Mitarbeitende werden hier verwaltet.' }}
              />
            </div>
          </>
        )}

        {activePage === 'items' && (
          <>
            <Topbar title="Items" right={<AdminButton variant="primary" icon={<AdminIcon name="add" size={16} />}>Hinzufügen</AdminButton>} />
            <div className="p-8">
              <DataTable
                columns={[{ key: 'name', label: 'Name' }]}
                rows={[]}
                empty={{ title: 'Noch keine Items.', body: 'Items können hier hinzugefügt werden.' }}
              />
            </div>
          </>
        )}

        {activePage === 'settings' && (
          <>
            <Topbar title="Einstellungen" />
            <div className="p-8">
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
