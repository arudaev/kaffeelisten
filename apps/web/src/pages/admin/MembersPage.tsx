import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
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

function capitalizeName(s: string): string {
  return s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

// Basic email shape check — the server/DB is the source of truth, this just
// catches obvious typos before save.
function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
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

  const fetchData = async () => {
    setLoading(true)
    const [membersRes, companiesRes] = await Promise.all([
      supabase.from('members').select('id, name, company_id, work_email, active').order('name'),
      supabase.from('companies').select('id, name').eq('active', true).order('name'),
    ])
    const companyMap = new Map(
      (companiesRes.data ?? []).map(c => [c.id, c.name])
    )
    const rows: MemberRow[] = (membersRes.data ?? []).map(m => ({
      id: m.id,
      name: m.name,
      company_id: m.company_id,
      company_name: companyMap.get(m.company_id) ?? '—',
      work_email: m.work_email ?? null,
      active: m.active,
    }))
    setMembers(rows)
    setCompanies(companiesRes.data ?? [])
    setLoading(false)
  }

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
    const firstName = capitalizeName(form.firstName)
    const lastName = capitalizeName(form.lastName)
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
    const { error } =
      modalMode === 'add'
        ? await supabase.from('members').insert(payload)
        : await supabase.from('members').update(payload).eq('id', editId!)
    setSaving(false)
    if (error) {
      onToast('Fehler beim Speichern.')
    } else {
      setModalOpen(false)
      onToast(modalMode === 'add' ? 'Mitarbeitende(r) hinzugefügt.' : 'Mitarbeitende(r) aktualisiert.')
      fetchData()
    }
  }

  const toggleActive = async (member: MemberRow) => {
    const { error } = await supabase
      .from('members')
      .update({ active: !member.active })
      .eq('id', member.id)
    if (error) {
      onToast('Fehler beim Aktualisieren.')
    } else {
      onToast(member.active ? 'Mitarbeitende(r) deaktiviert.' : 'Mitarbeitende(r) aktiviert.')
      fetchData()
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

  const columns: Column<MemberRow>[] = [
    {
      key: 'name',
      label: 'Name',
      render: r => <span className="font-semibold">{r.name}</span>,
    },
    { key: 'company_name', label: 'Unternehmen', muted: true },
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
      key: 'actions',
      label: '',
      align: 'right',
      render: r => (
        <div className="inline-flex gap-1">
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
    </>
  )
}
