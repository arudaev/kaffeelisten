// Admin shell: sidebar, page switching, the shared live-entries data, the manual
// report send and the toast. Each page lives in pages/admin/.
// Protected — requires a valid session from the AdminLogin PIN flow.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, type AdminCompany, type AdminItem } from '../lib/adminApi'
import { toEntryRows, type EntryRow } from '../lib/entries'
import { monthLabel, todayBerlin } from '../lib/dates'
import Sidebar, { type PageId } from '../components/admin/Sidebar'
import Modal from '../components/admin/Modal'
import AdminButton from '../components/admin/AdminButton'
import AdminIcon from '../components/admin/AdminIcon'
import Toast from '../components/admin/Toast'
import OverviewPage from './admin/OverviewPage'
import EntriesPage from './admin/EntriesPage'
import DocumentsPage from './admin/DocumentsPage'
import ItemsPage from './admin/ItemsPage'
import CompaniesPage from './admin/CompaniesPage'
import MembersPage from './admin/MembersPage'
import SettingsPage from './admin/SettingsPage'
import { formatEuro as euro } from '../lib/money'

interface SendResult {
  sent: number
  failed: number
  skipped: { recipient: 'member' | 'company'; name: string; reason: string }[]
  missingFiles: { pdf: number; xlsx: number }
}

const SKIP_REASON: Record<string, string> = {
  no_email: 'keine E-Mail-Adresse',
  no_billing_contact: 'kein Rechnungskontakt',
  unknown_company: 'Unternehmen fehlt',
  house_account: 'Firmen-Checkout',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rows, setRows] = useState<EntryRow[]>([])
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [items, setItems] = useState<AdminItem[]>([])
  const [members, setMembers] = useState<{ id: string; name: string; company_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState<string>(todayBerlin().slice(0, 7))
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSending, setReportSending] = useState(false)
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Session guard
  useEffect(() => {
    if (!sessionStorage.getItem('adminSession')) navigate('/admin', { replace: true })
  }, [navigate])

  // Stable identity so child effects that depend on it (e.g. SettingsPage's
  // initial load) don't re-run every time a toast is shown/cleared.
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const [dashboard, companyList, itemList, memberList] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getCompanies(),
        adminApi.getItems(),
        adminApi.getMembers(),
      ])
      setRows(toEntryRows(dashboard))
      setCompanies(companyList)
      setItems(itemList)
      setMembers(memberList.map(m => ({ id: m.id, name: m.name, company_id: m.company_id })))
    } catch {
      showToast('Daten konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { loadEntries() }, [loadEntries])

  // Refresh the shared data when returning to a page that shows it, so edits made
  // on the catalogue pages are reflected.
  const navigateTo = (page: PageId) => {
    setActivePage(page)
    setSidebarOpen(false)
    if (page === 'dashboard' || page === 'log') loadEntries()
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth?action=logout', { method: 'POST' })
    } catch {
      /* clear locally regardless */
    }
    sessionStorage.removeItem('adminSession')
    navigate('/admin', { replace: true })
  }

  // Months that have live entries, newest first, always including the current one.
  const months = useMemo(() => {
    const set = new Set(rows.map(r => r.month))
    set.add(todayBerlin().slice(0, 7))
    return [...set].sort().reverse()
  }, [rows])

  const monthRows = rows.filter(r => r.month === month)
  const monthTotal = monthRows.reduce((s, r) => s + r.total_cents, 0)

  const handleSendReport = async () => {
    setReportSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        showToast(body?.error ? `Fehler beim Senden: ${body.error}` : 'Fehler beim Senden. Bitte erneut versuchen.')
        return
      }
      if (body.status === 'skipped') {
        setReportOpen(false)
        showToast('Für diesen Monat läuft bereits ein Versand.')
        return
      }
      setSendResult({
        sent: body.memberStatements?.sent ?? 0,
        failed: body.memberStatements?.failed ?? 0,
        skipped: body.skipped ?? [],
        missingFiles: body.missingFiles ?? { pdf: 0, xlsx: 0 },
      })
    } catch {
      showToast('Fehler beim Senden. Bitte erneut versuchen.')
    } finally {
      setReportSending(false)
    }
  }

  const closeReport = () => {
    setReportOpen(false)
    setSendResult(null)
  }

  const openMenu = () => setSidebarOpen(true)

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      <Sidebar
        active={activePage}
        onNavigate={navigateTo}
        onSendReport={() => setReportOpen(true)}
        onLogout={handleLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0 bg-bg overflow-y-auto">
        {activePage === 'dashboard' && (
          <OverviewPage
            rows={rows}
            loading={loading}
            month={month}
            months={months}
            onMonthChange={setMonth}
            companies={companies}
            onNavigate={navigateTo}
            onSendReport={() => setReportOpen(true)}
            onMenuClick={openMenu}
          />
        )}
        {activePage === 'log' && (
          <EntriesPage
            rows={rows}
            loading={loading}
            month={month}
            months={months}
            onMonthChange={setMonth}
            companies={companies}
            members={members}
            items={items}
            onToast={showToast}
            onMenuClick={openMenu}
          />
        )}
        {activePage === 'documents' && <DocumentsPage onToast={showToast} onMenuClick={openMenu} />}
        {activePage === 'companies' && <CompaniesPage onToast={showToast} onMenuClick={openMenu} />}
        {activePage === 'members' && <MembersPage onToast={showToast} onMenuClick={openMenu} />}
        {activePage === 'items' && <ItemsPage onToast={showToast} onMenuClick={openMenu} />}
        {activePage === 'settings' && (
          <SettingsPage onToast={showToast} onMenuClick={openMenu} onNavigate={navigateTo} onSendReport={() => setReportOpen(true)} />
        )}
      </main>

      <Modal
        open={reportOpen}
        onClose={closeReport}
        title={sendResult ? 'Monatsversand abgeschlossen' : 'Monatsbericht senden'}
        actions={
          sendResult ? (
            <>
              <AdminButton variant="secondary" onClick={() => { closeReport(); navigateTo('documents') }}>Dokumente ansehen</AdminButton>
              <AdminButton onClick={closeReport}>Schließen</AdminButton>
            </>
          ) : (
            <>
              <AdminButton variant="secondary" onClick={closeReport} disabled={reportSending}>Abbrechen</AdminButton>
              <AdminButton onClick={handleSendReport} disabled={reportSending} icon={<AdminIcon name="send" size={16} />}>
                {reportSending ? 'Wird gesendet… (kann einige Minuten dauern)' : 'Senden'}
              </AdminButton>
            </>
          )
        }
      >
        {sendResult ? (
          <div className="flex flex-col gap-3 text-fg">
            <p>
              <strong>{sendResult.sent}</strong> Dokumente versendet
              {sendResult.failed > 0 && <>, <strong className="text-error">{sendResult.failed} fehlgeschlagen</strong></>}.
              Die Geschäftsführung erhält das Archiv mit Kopien aller Dokumente.
            </p>
            {(sendResult.missingFiles.pdf > 0 || sendResult.missingFiles.xlsx > 0) && (
              <p className="text-error text-sm">
                Ohne Anhang versendet: {sendResult.missingFiles.pdf} × PDF, {sendResult.missingFiles.xlsx} × Excel.
                Unter „Dokumente“ lassen sie sich einzeln erneut senden.
              </p>
            )}
            {sendResult.skipped.length > 0 && (
              <div className="text-sm">
                <p className="font-medium">Nicht zustellbar ({sendResult.skipped.length}):</p>
                <ul className="list-disc pl-5 mt-1 text-fg-muted">
                  {sendResult.skipped.slice(0, 8).map((s, i) => (
                    <li key={i}>{s.name} – {SKIP_REASON[s.reason] ?? s.reason}</li>
                  ))}
                  {sendResult.skipped.length > 8 && <li>und {sendResult.skipped.length - 8} weitere</li>}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <>
            Der Versand für <strong className="text-fg">{monthLabel(month)}</strong> ({monthRows.length} Einträge, {euro(monthTotal)})
            geht an alle Personen, Unternehmen und die Geschäftsführung – jeweils mit PDF und Excel.
            Die Einträge bleiben erhalten.
          </>
        )}
      </Modal>

      <Toast message={toast} />
    </div>
  )
}
