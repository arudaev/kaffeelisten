import { useEffect, useMemo, useState } from 'react'
import { tickState } from '../../lib/paidTicks'
import { adminApi, type AdminCompany, type AdminItem, type MemberPaymentMonth, type PaidCell, type PaidGrid } from '../../lib/adminApi'
import { Topbar } from '../../components/admin/Topbar'
import DataTable, { Column, DataGroup } from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import AdminButton from '../../components/admin/AdminButton'
import Badge from '../../components/admin/Badge'
import AdminIcon from '../../components/admin/AdminIcon'
import AdminField from '../../components/admin/AdminField'
import AdminSelect from '../../components/admin/AdminSelect'
import Toggle from '../../components/admin/Toggle'
import FilterBar from '../../components/admin/FilterBar'
import ExportDialog from '../../components/admin/ExportDialog'
import { monthLabel } from '../../lib/dates'
import { formatEuro as euro } from '../../lib/money'

interface MemberRow {
  id: string
  name: string
  company_id: string
  company_name: string
  company_pays: boolean
  work_email: string | null
  active: boolean
  email_verified: boolean
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


function monthAbbrev(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('de-DE', { month: 'short' }).replace('.', '')
}

const EMPTY_GRID: PaidGrid = { enabled: false, months: [], rows: {}, companies: {}, summary: [] }

// One tick per month. The most recent month is emphasised.
function PaidTicks({
  months,
  cells,
  onToggle,
  subject,
}: {
  months: string[]
  cells: Record<string, PaidCell> | undefined
  onToggle: (month: string, current: boolean) => void
  subject: string
}) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {months.map((m, i) => {
        const isCurrent = i === months.length - 1
        const cell = cells?.[m]
        const state = tickState(cell)
        const checked = state === 'paid'
        const owes = (cell?.amount_cents ?? 0) > 0
        if (state === 'none') {
          return (
            <span key={m} className="w-6 h-6 flex items-center justify-center text-fg-subtle" title={`${subject} · ${monthLabel(m)}: kein Verzehr`}>
              <span aria-hidden="true">–</span>
              <span className="sr-only">{`${subject}, ${monthLabel(m)}: kein Verzehr`}</span>
            </span>
          )
        }
        return (
          <button
            key={m}
            type="button"
            onClick={() => onToggle(m, checked)}
            title={`${subject} · ${monthLabel(m)}: ${owes ? euro(cell!.amount_cents) : 'kein Verzehr'} · ${checked ? 'bezahlt' : 'offen'}`}
            aria-label={`${subject}, ${monthLabel(m)}: ${checked ? 'bezahlt' : 'offen'}`}
            aria-pressed={checked}
            className={[
              'w-6 h-6 rounded-md border flex items-center justify-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              checked
                ? isCurrent ? 'bg-accent border-accent text-white' : 'bg-accent/70 border-accent/70 text-white'
                : owes
                  ? isCurrent ? 'border-border-strong text-transparent hover:border-accent' : 'border-border text-transparent hover:border-border-strong'
                  : 'border-dashed border-border text-transparent opacity-60 hover:opacity-100',
            ].join(' ')}
          >
            <AdminIcon name="check" size={14} strokeWidth={2.5} />
          </button>
        )
      })}
    </div>
  )
}

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

export default function MembersPage({ onToast, onMenuClick }: Props) {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [items, setItems] = useState<AdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [filterName, setFilterName] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<MemberForm>({ firstName: '', lastName: '', workEmail: '', company_id: '', active: true })
  const [saving, setSaving] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  // Per-member payment history (migration 027)
  const [payMember, setPayMember] = useState<MemberRow | null>(null)
  const [payMonths, setPayMonths] = useState<MemberPaymentMonth[]>([])
  const [payLoading, setPayLoading] = useState(false)

  // Last three months: individual payers in `rows`, paying companies in `companies`.
  const [paidGrid, setPaidGrid] = useState<PaidGrid>(EMPTY_GRID)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [memberList, companyList, grid, itemList] = await Promise.all([
        adminApi.getMembers(),
        adminApi.getCompanies(),
        adminApi.getPaidGrid(),
        adminApi.getItems(),
      ])
      const companyById = new Map(companyList.map(c => [c.id, c]))
      setCompanies(companyList)
      setItems(itemList)
      setPaidGrid(grid)
      setMembers(memberList.map(m => {
        const company = companyById.get(m.company_id)
        return {
          id: m.id,
          name: m.name,
          company_id: m.company_id,
          company_name: company?.name ?? '—',
          company_pays: company?.billing_mode === 'company_paid',
          work_email: m.work_email ?? null,
          active: m.active,
          email_verified: !!m.email_verified_at,
        }
      }))
    } catch {
      onToast('Mitarbeitende konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [])

  const activeCompanies = useMemo(() => companies.filter(c => c.active), [companies])

  const openAdd = () => {
    setForm({ firstName: '', lastName: '', workEmail: '', company_id: filterCompanyId || activeCompanies[0]?.id || '', active: true })
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
    // monthly document.
    if (!firstName || !lastName || !workEmail || !form.company_id) return
    if (!isValidEmail(workEmail)) {
      onToast('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    setSaving(true)
    const payload = { name: `${firstName} ${lastName}`, company_id: form.company_id, work_email: workEmail, active: form.active }
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

  // Optimistically set a paid flag in the grid, keeping the derived amount, and
  // recompute the summary so "X von Y bezahlt" moves with the click.
  function setGridPaid(scope: 'rows' | 'companies', id: string, month: string, paid: boolean, fallbackAmount = 0) {
    setPaidGrid(g => {
      const bucket = g[scope]
      const cur = bucket[id]?.[month]
      const next = { ...g, [scope]: { ...bucket, [id]: { ...(bucket[id] ?? {}), [month]: { amount_cents: cur?.amount_cents ?? fallbackAmount, paid } } } }
      return { ...next, summary: summarise(next) }
    })
  }

  const togglePaid = async (month: MemberPaymentMonth) => {
    if (!payMember) return
    const next = !month.paid
    setPayMonths(ms => ms.map(m => (m.report_month === month.report_month ? { ...m, paid: next } : m)))
    setGridPaid('rows', payMember.id, month.report_month, next, month.amount_cents)
    try {
      await adminApi.setMemberPaid(payMember.id, month.report_month, next)
    } catch {
      setPayMonths(ms => ms.map(m => (m.report_month === month.report_month ? { ...m, paid: month.paid } : m)))
      setGridPaid('rows', payMember.id, month.report_month, month.paid, month.amount_cents)
      onToast('Status konnte nicht gespeichert werden.')
    }
  }

  const toggleMemberTick = async (memberId: string, month: string, current: boolean) => {
    setGridPaid('rows', memberId, month, !current)
    try {
      await adminApi.setMemberPaid(memberId, month, !current)
    } catch {
      setGridPaid('rows', memberId, month, current)
      onToast('Status konnte nicht gespeichert werden.')
    }
  }

  const toggleCompanyTick = async (companyId: string, month: string, current: boolean) => {
    setGridPaid('companies', companyId, month, !current)
    try {
      await adminApi.setCompanyPaid(companyId, month, !current)
    } catch (err) {
      setGridPaid('companies', companyId, month, current)
      onToast(err instanceof Error ? err.message : 'Status konnte nicht gespeichert werden.')
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

  const filtered = useMemo(() => {
    let rows = members
    if (filterCompanyId) rows = rows.filter(m => m.company_id === filterCompanyId)
    if (filterStatus !== 'all') rows = rows.filter(m => m.active === (filterStatus === 'active'))
    const q = filterName.trim().toLowerCase()
    if (q) rows = rows.filter(m => m.name.toLowerCase().includes(q) || (m.work_email ?? '').toLowerCase().includes(q))
    return rows
  }, [members, filterCompanyId, filterStatus, filterName])

  const currentMonth = paidGrid.months[paidGrid.months.length - 1]
  const memberAmount = (r: MemberRow) => (currentMonth ? paidGrid.rows[r.id]?.[currentMonth]?.amount_cents ?? 0 : 0)

  // Companies in name order, each with its matching members. A company's header
  // carries its paid ticks when it pays for its people.
  const groups: DataGroup<MemberRow>[] = useMemo(() => {
    const byCompany = new Map<string, MemberRow[]>()
    for (const m of filtered) {
      const list = byCompany.get(m.company_id) ?? []
      list.push(m)
      byCompany.set(m.company_id, list)
    }
    // A company that checks out as a whole has no people, but its paid tick must
    // still be reachable — it gets a header of its own while filters allow it.
    const q = filterName.trim().toLowerCase()
    const sharedAccount = (c: AdminCompany) =>
      c.checkout_mode === 'company' &&
      (filterStatus === 'all' || c.active === (filterStatus === 'active')) &&
      (!filterCompanyId || filterCompanyId === c.id) &&
      (!q || c.name.toLowerCase().includes(q))
    return companies
      .filter(c => byCompany.has(c.id) || sharedAccount(c))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .map(c => {
        const pays = c.billing_mode === 'company_paid'
        const companyMonth = currentMonth ? paidGrid.companies[c.id]?.[currentMonth]?.amount_cents ?? 0 : 0
        return {
          key: c.id,
          label: (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              {c.name}
              {pays && <Badge kind="warn">Firma zahlt</Badge>}
              {c.checkout_mode === 'company' && <Badge kind="inactive">Firmen-Checkout</Badge>}
            </span>
          ),
          rows: byCompany.get(c.id) ?? [],
          note: byCompany.has(c.id) ? undefined : 'gemeinsames Konto, keine Personen',
          cells: pays
            ? {
                month: <span className="font-semibold">{euro(companyMonth)}</span>,
                bezahlt: (
                  <PaidTicks
                    months={paidGrid.months}
                    cells={paidGrid.companies[c.id]}
                    subject={c.name}
                    onToggle={(month, current) => toggleCompanyTick(c.id, month, current)}
                  />
                ),
              }
            : undefined,
        }
      })
    // toggleCompanyTick only closes over stable setters and the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, companies, paidGrid, currentMonth, filterName, filterStatus, filterCompanyId])

  const allColumns: Column<MemberRow>[] = [
    {
      key: 'name',
      label: 'Name',
      sortValue: r => r.name,
      render: r => (
        <span className="flex flex-col">
          <span>{r.name}</span>
          {r.work_email && <span className="text-xs font-normal text-fg-muted">{r.work_email}</span>}
        </span>
      ),
    },
    {
      key: 'email_verified',
      label: 'E-Mail',
      sortValue: r => (r.email_verified ? 1 : 0),
      render: r => (
        <Badge kind={r.email_verified ? 'verified' : 'pending'}>
          {r.email_verified ? 'Bestätigt' : 'Unbestätigt'}
        </Badge>
      ),
    },
    {
      key: 'active',
      label: 'Status',
      sortValue: r => (r.active ? 1 : 0),
      render: r => <Badge kind={r.active ? 'active' : 'inactive'}>{r.active ? 'Aktiv' : 'Inaktiv'}</Badge>,
    },
    {
      key: 'month',
      label: currentMonth ? monthLabel(currentMonth) : 'Monat',
      align: 'right',
      mono: true,
      sortValue: memberAmount,
      render: r => {
        const cents = memberAmount(r)
        if (r.company_pays) return <span className="text-fg-muted">über Firma</span>
        return cents > 0 ? euro(cents) : <span className="text-fg-subtle">—</span>
      },
    },
    {
      key: 'bezahlt',
      align: 'center',
      label: (
        <div className="flex items-center justify-center gap-1.5">
          {paidGrid.months.map((m, i) => (
            <span key={m} className={['w-6 text-center', i === paidGrid.months.length - 1 ? 'text-fg-muted' : 'text-fg-subtle'].join(' ')}>
              {monthAbbrev(m)}
            </span>
          ))}
        </div>
      ),
      render: r =>
        r.company_pays ? (
          // Their company is ticked once, on the company row above.
          <span className="text-xs font-normal text-fg-subtle">über Firma</span>
        ) : (
          <PaidTicks
            months={paidGrid.months}
            cells={paidGrid.rows[r.id]}
            subject={r.name}
            onToggle={(month, current) => toggleMemberTick(r.id, month, current)}
          />
        ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: r => (
        <div className="inline-flex gap-1 font-normal">
          <button type="button" onClick={() => openPayments(r)} title="Zahlungsverlauf" aria-label={`Zahlungsverlauf ${r.name}`}
            className="text-fg-muted hover:text-accent p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <AdminIcon name="report" size={16} />
          </button>
          {!r.email_verified && (
            <button type="button" onClick={() => sendConfirmation(r)} title="Bestätigungs-E-Mail erneut senden" aria-label={`Bestätigung an ${r.name} senden`}
              className="text-fg-muted hover:text-accent p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <AdminIcon name="send" size={16} />
            </button>
          )}
          <button type="button" onClick={() => openEdit(r)} title="Bearbeiten" aria-label={`${r.name} bearbeiten`}
            className="text-fg-muted hover:text-fg p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <AdminIcon name="edit" size={16} />
          </button>
          <button type="button" onClick={() => toggleActive(r)} title={r.active ? 'Deaktivieren' : 'Aktivieren'} aria-label={`${r.name} ${r.active ? 'deaktivieren' : 'aktivieren'}`}
            className={['p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              r.active ? 'text-fg-muted hover:text-error' : 'text-fg-muted hover:text-success'].join(' ')}>
            <AdminIcon name={r.active ? 'archive' : 'check'} size={16} />
          </button>
        </div>
      ),
    },
  ]
  // The paid grid can be hidden in Einstellungen → Zahlungen.
  const columns = allColumns.filter(c => (c.key !== 'bezahlt' && c.key !== 'month') || paidGrid.enabled)

  const unverified = members.filter(m => m.active && !m.email_verified).length
  const filtersActive = !!filterCompanyId || filterStatus !== 'active' || !!filterName

  return (
    <>
      <Topbar
        title="Mitarbeitende"
        onMenuClick={onMenuClick}
        right={
          <div className="flex gap-2">
            <AdminButton variant="secondary" icon={<AdminIcon name="download" size={16} />} onClick={() => setExportOpen(true)}>
              Export
            </AdminButton>
            <AdminButton variant="primary" icon={<AdminIcon name="add" size={16} />} onClick={openAdd}>
              Hinzufügen
            </AdminButton>
          </div>
        }
      />
      <div className="p-4 md:p-8 flex flex-col gap-4">
        {!loading && paidGrid.enabled && paidGrid.summary.some(s => s.owe > 0) && (
          <div className="grid gap-3 sm:grid-cols-3">
            {paidGrid.summary.map((s, i) => {
              const isCurrent = i === paidGrid.summary.length - 1
              const allPaid = s.owe > 0 && s.paid === s.owe
              return (
                <div key={s.month} className={['rounded-xl border p-4 flex flex-col gap-1', isCurrent ? 'bg-surface border-border-strong' : 'bg-surface-2 border-border'].join(' ')}>
                  <span className="text-xs font-medium text-fg-muted">{monthLabel(s.month)}</span>
                  <span className="text-lg font-semibold text-fg">
                    {s.paid}
                    <span className="text-fg-muted font-normal"> / {s.owe} bezahlt</span>
                  </span>
                  <span className={['text-xs', allPaid ? 'text-success' : 'text-fg-muted'].join(' ')}>
                    {s.owe === 0 ? 'Kein Verzehr' : allPaid ? 'Alle bezahlt' : `${euro(s.outstanding_cents)} offen`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        {!loading && paidGrid.enabled && (
          <p className="text-xs text-fg-muted -mt-1">
            Gezählt wird jede zahlende Stelle einmal: Personen, die selbst zahlen, und Firmen, die für ihre Leute zahlen.
            Mitarbeitende einer zahlenden Firma sind <strong className="font-semibold text-fg">fett</strong> markiert und
            werden über die Firmenzeile abgehakt.
          </p>
        )}

        {unverified > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-accent bg-accent-subtle px-3 py-2 text-sm text-fg">
            <span className="text-accent mt-0.5"><AdminIcon name="warning" size={16} /></span>
            <span>
              {unverified} aktive {unverified === 1 ? 'Person hat' : 'Personen haben'} die E-Mail-Adresse noch nicht bestätigt.
              Monatsdokumente gehen trotzdem raus – eine falsche Adresse fällt aber erst dann auf.
            </span>
          </div>
        )}

        <FilterBar
          search={{ value: filterName, onChange: setFilterName, placeholder: 'Name oder E-Mail suchen…' }}
          onReset={() => { setFilterCompanyId(''); setFilterStatus('active'); setFilterName('') }}
          resetVisible={filtersActive}
          trailing={<span className="text-sm text-fg-muted">{filtered.length} {filtered.length === 1 ? 'Person' : 'Personen'}</span>}
        >
          <AdminSelect
            variant="filter"
            aria-label="Unternehmen filtern"
            value={filterCompanyId}
            onChange={e => setFilterCompanyId(e.target.value)}
            options={[{ value: '', label: 'Alle Unternehmen' }, ...companies.map(c => ({ value: c.id, label: c.name }))]}
          />
          <AdminSelect
            variant="filter"
            aria-label="Status filtern"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            options={[
              { value: 'active', label: 'Aktive' },
              { value: 'inactive', label: 'Inaktive' },
              { value: 'all', label: 'Alle Status' },
            ]}
          />
        </FilterBar>

        {loading ? (
          <div className="h-48 bg-surface-2 rounded-xl animate-pulse" />
        ) : (
          <DataTable
            columns={columns}
            groups={groups}
            rowKey={r => r.id}
            rowClassName={r => (r.company_pays ? 'font-semibold' : '')}
            defaultSort={{ key: 'name', dir: 'asc' }}
            empty={
              members.length === 0
                ? { title: 'Noch keine Mitarbeitenden.', body: 'Personen können sich am iPad selbst registrieren oder hier hinzugefügt werden.' }
                : { title: 'Keine Treffer.', body: 'Passe die Filter an.' }
            }
          />
        )}
      </div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initial={filterCompanyId ? { company_id: filterCompanyId } : undefined}
        companies={companies}
        members={members}
        items={items}
        onToast={onToast}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'add' ? 'Mitarbeitende(n) hinzufügen' : 'Mitarbeitende(n) bearbeiten'}
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</AdminButton>
            <AdminButton
              variant="primary"
              onClick={handleSubmit}
              disabled={saving || !form.firstName.trim() || !form.lastName.trim() || !form.workEmail.trim() || !form.company_id}
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Vorname" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="z. B. Anna" autoFocus />
            <AdminField label="Nachname" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="z. B. Müller" />
          </div>
          <AdminField
            label="Arbeits-E-Mail"
            type="email"
            required
            value={form.workEmail}
            onChange={e => setForm(f => ({ ...f, workEmail: e.target.value }))}
            placeholder="z. B. anna.mueller@firma.de"
            hint="Die Person erhält eine E-Mail, um die Adresse zu bestätigen."
          />
          <AdminSelect label="Unternehmen" required value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}>
            <option value="" disabled>Unternehmen wählen</option>
            {activeCompanies.filter(c => c.checkout_mode !== 'company').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </AdminSelect>
          {modalMode === 'edit' && (
            <Toggle label="Aktiv" checked={form.active} onChange={active => setForm(f => ({ ...f, active }))} />
          )}
        </div>
      </Modal>

      {/* Per-member payment history (migration 027) */}
      <Modal
        open={!!payMember}
        onClose={() => setPayMember(null)}
        title={payMember ? `Zahlungen — ${payMember.name}` : 'Zahlungen'}
        actions={<AdminButton variant="secondary" onClick={() => setPayMember(null)}>Schließen</AdminButton>}
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
                  Die Firma übernimmt den Kaffee dieser Person. Bezahlt wird einmal pro Monat über die Firmenzeile.
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

// Client-side mirror of api/_lib/paidGrid.ts summarisePaidGrid, used only to
// update the cards immediately after an optimistic tick. The server's summary
// replaces it on the next load.
function summarise(grid: PaidGrid): PaidGrid['summary'] {
  return grid.months.map(month => {
    let owe = 0
    let paid = 0
    let outstanding = 0
    for (const bucket of [grid.rows, grid.companies]) {
      for (const cells of Object.values(bucket)) {
        const c = cells[month]
        if (!c || c.amount_cents <= 0) continue
        owe++
        if (c.paid) paid++
        else outstanding += c.amount_cents
      }
    }
    return { month, owe, paid, outstanding_cents: outstanding }
  })
}
