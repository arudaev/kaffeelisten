import { useEffect, useMemo, useState } from 'react'
import { adminApi, type MemberPaymentMonth, type PaidGrid } from '../../lib/adminApi'
import { Topbar } from '../../components/admin/Topbar'
import DataTable, { Column } from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import AdminButton from '../../components/admin/AdminButton'
import Badge from '../../components/admin/Badge'
import AdminIcon from '../../components/admin/AdminIcon'
import AdminField from '../../components/admin/AdminField'
import AdminSelect from '../../components/admin/AdminSelect'
import Toggle from '../../components/admin/Toggle'

interface MemberRow {
  id: string
  name: string
  company_id: string
  company_name: string
  work_email: string | null
  active: boolean
  email_verified: boolean
}

interface CompanyOption {
  id: string
  name: string
}

interface MemberForm {
  firstName: string
  lastName: string
  workEmail: string
  company_id: string
  active: boolean
}

// Preserve the admin's casing verbatim — only trim and collapse internal
// whitespace. Force-title-casing corrupts international names (McDonald,
// van der Berg, de la Cruz, O'Brien), and the admin knows the correct spelling.
function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

// Basic email shape check — the server/DB is the source of truth, this just
// catches obvious typos before save.
function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

function euro(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

function monthAbbrev(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'short' }).replace('.', '')
}

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

export default function MembersPage({ onToast, onMenuClick }: Props) {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [filterName, setFilterName] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortKey, setSortKey] = useState<'name' | 'company'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<MemberForm>({
    firstName: '',
    lastName: '',
    workEmail: '',
    company_id: '',
    active: true,
  })
  const [saving, setSaving] = useState(false)

  // Per-member payment tracking (migration 027)
  const [payMember, setPayMember] = useState<MemberRow | null>(null)
  const [payMonths, setPayMonths] = useState<MemberPaymentMonth[]>([])
  const [payLoading, setPayLoading] = useState(false)

  // Inline last-3-months paid grid + per-company billing mode (for the Firma marker).
  const [paidGrid, setPaidGrid] = useState<PaidGrid>({ enabled: false, months: [], rows: {} })
  const [companyMode, setCompanyMode] = useState<Record<string, 'individual' | 'company_paid'>>({})

  const fetchData = async () => {
    setLoading(true)
    try {
      const [memberList, companyList, grid] = await Promise.all([
        adminApi.getMembers(),
        adminApi.getCompanies(),
        adminApi.getPaidGrid(),
      ])
      const activeCompanies: CompanyOption[] = companyList
        .filter(c => c.active)
        .map(c => ({ id: c.id, name: c.name }))
      const companyMap = new Map(companyList.map(c => [c.id, c.name]))
      const modeMap: Record<string, 'individual' | 'company_paid'> = {}
      for (const c of companyList) modeMap[c.id] = c.billing_mode ?? 'individual'
      setCompanyMode(modeMap)
      setPaidGrid(grid)
      const rows: MemberRow[] = memberList.map(m => ({
        id: m.id,
        name: m.name,
        company_id: m.company_id,
        company_name: companyMap.get(m.company_id) ?? '—',
        work_email: m.work_email ?? null,
        active: m.active,
        email_verified: !!m.email_verified_at,
      }))
      setMembers(rows)
      setCompanies(activeCompanies)
    } catch {
      onToast('Mitarbeitende konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [])

  const openAdd = () => {
    setForm({
      firstName: '',
      lastName: '',
      workEmail: '',
      company_id: companies[0]?.id ?? '',
      active: true,
    })
    setModalMode('add')
    setEditId(null)
    setModalOpen(true)
  }

  const openEdit = (member: MemberRow) => {
    const parts = member.name.trim().split(/\s+/)
    setForm({
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
      workEmail: member.work_email ?? '',
      company_id: member.company_id,
      active: member.active,
    })
    setModalMode('edit')
    setEditId(member.id)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const firstName = normalizeName(form.firstName)
    const lastName = normalizeName(form.lastName)
    const workEmail = form.workEmail.trim()
    // All identity fields are mandatory: every member must be reachable for the
    // per-member monthly statement.
    if (!firstName || !lastName || !workEmail || !form.company_id) return
    if (!isValidEmail(workEmail)) {
      onToast('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    const name = `${firstName} ${lastName}`
    setSaving(true)
    const payload = {
      name,
      company_id: form.company_id,
      work_email: workEmail,
      active: form.active,
    }
    try {
      if (modalMode === 'add') await adminApi.createMember(payload)
      else await adminApi.updateMember(editId!, payload)
      setModalOpen(false)
      onToast(modalMode === 'add' ? 'Mitarbeitende(r) hinzugefügt.' : 'Mitarbeitende(r) aktualisiert.')
      fetchData()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Fehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  const sendConfirmation = async (member: MemberRow) => {
    try {
      await adminApi.sendMemberConfirmation(member.id)
      onToast('Bestätigungs-E-Mail gesendet.')
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'E-Mail konnte nicht gesendet werden.')
    }
  }

  const openPayments = async (member: MemberRow) => {
    setPayMember(member)
    setPayLoading(true)
    setPayMonths([])
    try {
      setPayMonths(await adminApi.getMemberPayments(member.id))
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Zahlungen konnten nicht geladen werden.')
    } finally {
      setPayLoading(false)
    }
  }

  const togglePaid = async (month: MemberPaymentMonth) => {
    if (!payMember) return
    const next = !month.paid
    setPayMonths(ms => ms.map(m => (m.report_month === month.report_month ? { ...m, paid: next } : m)))
    // Keep the inline grid in sync if this month is one of its last-3.
    setGridPaid(payMember.id, month.report_month, next, month.amount_cents)
    try {
      await adminApi.setMemberPaid(payMember.id, month.report_month, next)
    } catch {
      setPayMonths(ms => ms.map(m => (m.report_month === month.report_month ? { ...m, paid: month.paid } : m)))
      setGridPaid(payMember.id, month.report_month, month.paid, month.amount_cents)
      onToast('Status konnte nicht gespeichert werden.')
    }
  }

  // Set a grid cell's paid flag, preserving the derived amount.
  function setGridPaid(memberId: string, month: string, paid: boolean, fallbackAmount = 0) {
    setPaidGrid(g => {
      const cur = g.rows[memberId]?.[month]
      return {
        ...g,
        rows: {
          ...g.rows,
          [memberId]: { ...(g.rows[memberId] ?? {}), [month]: { amount_cents: cur?.amount_cents ?? fallbackAmount, paid } },
        },
      }
    })
  }

  // Inline grid toggle (Bezahlt column). Optimistic with rollback.
  const toggleGridPaid = async (memberId: string, month: string, current: boolean) => {
    const next = !current
    setGridPaid(memberId, month, next)
    try {
      await adminApi.setMemberPaid(memberId, month, next)
    } catch {
      setGridPaid(memberId, month, current)
      onToast('Status konnte nicht gespeichert werden.')
    }
  }

  const toggleActive = async (member: MemberRow) => {
    try {
      await adminApi.updateMember(member.id, { active: !member.active })
      onToast(member.active ? 'Mitarbeitende(r) deaktiviert.' : 'Mitarbeitende(r) aktiviert.')
      fetchData()
    } catch {
      onToast('Fehler beim Aktualisieren.')
    }
  }

  const displayed = useMemo(() => {
    let rows = members
    if (filterCompanyId) rows = rows.filter(m => m.company_id === filterCompanyId)
    if (filterStatus !== 'all') rows = rows.filter(m => m.active === (filterStatus === 'active'))
    if (filterName.trim()) {
      const q = filterName.trim().toLowerCase()
      rows = rows.filter(m => m.name.toLowerCase().includes(q))
    }
    return [...rows].sort((a, b) => {
      const av = sortKey === 'name' ? a.name : a.company_name
      const bv = sortKey === 'name' ? b.name : b.company_name
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [members, filterCompanyId, filterStatus, filterName, sortKey, sortDir])

  // Per-month "X von Y bezahlt" — Y = billable people (not Firma zahlt) who owe
  // money that month; X = those marked paid; plus the € still outstanding.
  const paidSummary = useMemo(
    () =>
      paidGrid.months.map(month => {
        let owe = 0
        let paid = 0
        let outstanding = 0
        for (const m of members) {
          if (companyMode[m.company_id] === 'company_paid') continue
          const cell = paidGrid.rows[m.id]?.[month]
          if (!cell || cell.amount_cents <= 0) continue
          owe++
          if (cell.paid) paid++
          else outstanding += cell.amount_cents
        }
        return { month, owe, paid, outstanding }
      }),
    [members, companyMode, paidGrid],
  )

  const allColumns: Column<MemberRow>[] = [
    {
      key: 'name',
      label: 'Name',
      render: r => <span className="font-semibold">{r.name}</span>,
    },
    { key: 'company_name', label: 'Unternehmen', muted: true },
    {
      key: 'email_verified',
      label: 'E-Mail',
      render: r => (
        <Badge kind={r.email_verified ? 'verified' : 'pending'}>
          {r.email_verified ? 'Bestätigt' : 'Ausstehend'}
        </Badge>
      ),
    },
    {
      key: 'active',
      label: 'Status',
      render: r => (
        <Badge kind={r.active ? 'active' : 'inactive'}>
          {r.active ? 'Aktiv' : 'Inaktiv'}
        </Badge>
      ),
    },
    {
      key: 'bezahlt',
      align: 'center',
      label: (
        <div className="flex items-center justify-center gap-1.5">
          {paidGrid.months.map((m, i) => (
            <span
              key={m}
              className={[
                'w-6 text-center',
                i === paidGrid.months.length - 1 ? 'text-fg-muted' : 'text-fg-subtle',
              ].join(' ')}
            >
              {monthAbbrev(m)}
            </span>
          ))}
        </div>
      ),
      render: r => {
        if (companyMode[r.company_id] === 'company_paid') {
          return <span className="text-xs text-fg-subtle">Firma</span>
        }
        const memberRows = paidGrid.rows[r.id] ?? {}
        return (
          <div className="flex items-center justify-center gap-1.5">
            {paidGrid.months.map((m, i) => {
              const isCurrent = i === paidGrid.months.length - 1
              const checked = !!memberRows[m]?.paid
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleGridPaid(r.id, m, checked)}
                  title={`${monthLabel(m)}: ${checked ? 'bezahlt' : 'offen'}`}
                  aria-label={`${monthLabel(m)} ${checked ? 'bezahlt' : 'offen'}`}
                  aria-pressed={checked}
                  className={[
                    'w-6 h-6 rounded-md border flex items-center justify-center transition-colors',
                    checked
                      ? isCurrent
                        ? 'bg-accent border-accent text-white'
                        : 'bg-accent/70 border-accent/70 text-white'
                      : isCurrent
                        ? 'border-border-strong text-transparent hover:border-accent'
                        : 'border-border text-transparent hover:border-border-strong',
                  ].join(' ')}
                >
                  <AdminIcon name="check" size={14} strokeWidth={2.5} />
                </button>
              )
            })}
          </div>
        )
      },
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: r => (
        <div className="inline-flex gap-1">
          <button
            type="button"
            onClick={() => openPayments(r)}
            title="Zahlungen"
            className="text-fg-muted hover:text-accent p-1 rounded transition-colors"
          >
            <AdminIcon name="report" size={16} />
          </button>
          <button
            type="button"
            onClick={() => sendConfirmation(r)}
            title="Bestätigungs-E-Mail senden"
            className="text-fg-muted hover:text-accent p-1 rounded transition-colors"
          >
            <AdminIcon name="send" size={16} />
          </button>
          <button
            type="button"
            onClick={() => openEdit(r)}
            title="Bearbeiten"
            className="text-fg-muted hover:text-fg p-1 rounded transition-colors"
          >
            <AdminIcon name="edit" size={16} />
          </button>
          <button
            type="button"
            onClick={() => toggleActive(r)}
            title={r.active ? 'Deaktivieren' : 'Aktivieren'}
            className={[
              'p-1 rounded transition-colors',
              r.active
                ? 'text-fg-muted hover:text-error'
                : 'text-fg-muted hover:text-success',
            ].join(' ')}
          >
            <AdminIcon name={r.active ? 'delete' : 'check'} size={16} />
          </button>
        </div>
      ),
    },
  ]
  // The inline paid grid is opt-in (Settings → migration 028); hide the column
  // entirely when disabled.
  const columns = allColumns.filter(c => c.key !== 'bezahlt' || paidGrid.enabled)

  return (
    <>
      <Topbar
        title="Mitarbeitende"
        onMenuClick={onMenuClick}
        right={
          <AdminButton
            variant="primary"
            icon={<AdminIcon name="add" size={16} />}
            onClick={openAdd}
          >
            Hinzufügen
          </AdminButton>
        }
      />
      <div className="p-4 md:p-8 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <AdminField
            variant="filter"
            className="w-44"
            placeholder="Name suchen…"
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
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </AdminSelect>
          <AdminSelect
            variant="filter"
            aria-label="Status filtern"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            options={[
              { value: 'all', label: 'Alle Status' },
              { value: 'active', label: 'Aktiv' },
              { value: 'inactive', label: 'Inaktiv' },
            ]}
          />
          <AdminSelect
            variant="filter"
            aria-label="Sortieren"
            value={`${sortKey}-${sortDir}`}
            onChange={e => {
              const [k, d] = e.target.value.split('-') as ['name' | 'company', 'asc' | 'desc']
              setSortKey(k); setSortDir(d)
            }}
            options={[
              { value: 'name-asc', label: 'Name A→Z' },
              { value: 'name-desc', label: 'Name Z→A' },
              { value: 'company-asc', label: 'Unternehmen A→Z' },
              { value: 'company-desc', label: 'Unternehmen Z→A' },
            ]}
          />
          {(filterCompanyId || filterStatus !== 'all' || filterName) && (
            <button
              type="button"
              onClick={() => { setFilterCompanyId(''); setFilterStatus('all'); setFilterName('') }}
              className="text-xs text-fg-muted hover:text-fg transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
          <span className="ml-auto text-sm text-fg-muted">
            {displayed.length} {displayed.length === 1 ? 'Person' : 'Personen'}
          </span>
        </div>

        {!loading && paidGrid.enabled && paidSummary.some(s => s.owe > 0) && (
          <div className="grid gap-3 sm:grid-cols-3">
            {paidSummary.map((s, i) => {
              const isCurrent = i === paidSummary.length - 1
              const allPaid = s.owe > 0 && s.paid === s.owe
              return (
                <div
                  key={s.month}
                  className={[
                    'rounded-xl border p-4 flex flex-col gap-1',
                    isCurrent ? 'bg-surface border-border-strong' : 'bg-surface-2 border-border',
                  ].join(' ')}
                >
                  <span className="text-xs font-medium text-fg-muted">{monthLabel(s.month)}</span>
                  <span className="text-lg font-semibold text-fg">
                    {s.paid}
                    <span className="text-fg-muted font-normal"> / {s.owe} bezahlt</span>
                  </span>
                  <span className={['text-xs', allPaid ? 'text-success' : 'text-fg-muted'].join(' ')}>
                    {allPaid ? 'Alle bezahlt' : `${euro(s.outstanding)} offen`}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {loading ? (
          <div className="h-48 bg-surface-2 rounded-xl animate-pulse" />
        ) : (
          <DataTable
            columns={columns}
            rows={displayed}
            empty={{
              title: 'Noch keine Mitarbeitenden.',
              body: 'Füge die erste Person hinzu.',
            }}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          modalMode === 'add'
            ? 'Mitarbeitende(n) hinzufügen'
            : 'Mitarbeitende(n) bearbeiten'
        }
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={handleSubmit}
              disabled={
                saving ||
                !form.firstName.trim() ||
                !form.lastName.trim() ||
                !form.workEmail.trim() ||
                !form.company_id
              }
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <AdminField
              label="Vorname"
              required
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              placeholder="z. B. Anna"
              autoFocus
            />
            <AdminField
              label="Nachname"
              required
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              placeholder="z. B. Müller"
            />
          </div>
          <AdminField
            label="Arbeits-E-Mail"
            type="email"
            required
            value={form.workEmail}
            onChange={e => setForm(f => ({ ...f, workEmail: e.target.value }))}
            placeholder="z. B. anna.mueller@firma.de"
          />
          <AdminSelect
            label="Unternehmen"
            required
            value={form.company_id}
            onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
          >
            <option value="" disabled>Unternehmen wählen</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </AdminSelect>
          {modalMode === 'edit' && (
            <Toggle
              label="Aktiv"
              checked={form.active}
              onChange={active => setForm(f => ({ ...f, active }))}
            />
          )}
        </div>
      </Modal>

      {/* Per-member payment tracking (migration 027) */}
      <Modal
        open={!!payMember}
        onClose={() => setPayMember(null)}
        title={payMember ? `Zahlungen — ${payMember.name}` : 'Zahlungen'}
        actions={
          <AdminButton variant="secondary" onClick={() => setPayMember(null)}>
            Schließen
          </AdminButton>
        }
      >
        <div className="flex flex-col mt-1">
          {payLoading ? (
            <div className="h-24 bg-surface-2 rounded-lg animate-pulse" />
          ) : payMonths.length === 0 ? (
            <p className="text-sm text-fg-muted py-2">Noch keine erfassten Monate für diese Person.</p>
          ) : payMonths[0].covered_by_company ? (
            <>
              <div className="bg-accent-subtle border border-accent rounded-lg px-4 py-3 mb-2">
                <p className="text-sm font-medium text-accent leading-relaxed">
                  Die Firma übernimmt den Kaffee dieser Person — es gibt keine persönliche Zahlung.
                </p>
              </div>
              {payMonths.map(m => (
                <div key={m.report_month} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">{monthLabel(m.report_month)}</p>
                    <p className="text-xs text-fg-muted">{euro(m.amount_cents)} · von Firma übernommen</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            payMonths.map(m => (
              <div key={m.report_month} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{monthLabel(m.report_month)}</p>
                  <p className="text-xs text-fg-muted">{euro(m.amount_cents)}</p>
                </div>
                <Toggle checked={m.paid} onChange={() => togglePaid(m)} label={m.paid ? 'Bezahlt' : 'Offen'} />
              </div>
            ))
          )}
        </div>
      </Modal>
    </>
  )
}
