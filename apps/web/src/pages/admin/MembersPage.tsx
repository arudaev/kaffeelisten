import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Topbar } from '../../components/admin/Topbar'
import DataTable, { Column } from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import AdminButton from '../../components/admin/AdminButton'
import Badge from '../../components/admin/Badge'
import AdminIcon from '../../components/admin/AdminIcon'

interface MemberRow {
  id: string
  name: string
  company_id: string
  company_name: string
  active: boolean
}

interface CompanyOption {
  id: string
  name: string
}

interface MemberForm {
  name: string
  company_id: string
  active: boolean
}

interface Props {
  onToast: (msg: string) => void
}

export default function MembersPage({ onToast }: Props) {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCompanyId, setFilterCompanyId] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<MemberForm>({
    name: '',
    company_id: '',
    active: true,
  })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [membersRes, companiesRes] = await Promise.all([
      supabase.from('members').select('id, name, company_id, active').order('name'),
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
      active: m.active,
    }))
    setMembers(rows)
    setCompanies(companiesRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openAdd = () => {
    setForm({
      name: '',
      company_id: companies[0]?.id ?? '',
      active: true,
    })
    setModalMode('add')
    setEditId(null)
    setModalOpen(true)
  }

  const openEdit = (member: MemberRow) => {
    setForm({
      name: member.name,
      company_id: member.company_id,
      active: member.active,
    })
    setModalMode('edit')
    setEditId(member.id)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const name = form.name.trim()
    if (!name || !form.company_id) return
    setSaving(true)
    const payload = {
      name,
      company_id: form.company_id,
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

  const displayed = filterCompanyId
    ? members.filter(m => m.company_id === filterCompanyId)
    : members

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
            className="text-stone-500 hover:text-stone-700 p-1 rounded transition-colors"
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
                ? 'text-stone-500 hover:text-red-600'
                : 'text-stone-500 hover:text-green-600',
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
      <div className="p-8 flex flex-col gap-4">
        {/* Company filter */}
        <div className="flex items-center gap-3">
          <select
            className="h-9 px-3 bg-white border border-stone-200 rounded-md text-sm text-stone-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none transition-colors"
            value={filterCompanyId}
            onChange={e => setFilterCompanyId(e.target.value)}
          >
            <option value="">Alle Unternehmen</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {filterCompanyId && (
            <button
              type="button"
              onClick={() => setFilterCompanyId('')}
              className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
            >
              Zurücksetzen
            </button>
          )}
          <span className="ml-auto text-sm text-stone-500">
            {displayed.length} {displayed.length === 1 ? 'Person' : 'Personen'}
          </span>
        </div>

        {loading ? (
          <div className="h-48 bg-stone-100 rounded-xl animate-pulse" />
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
              disabled={saving || !form.name.trim() || !form.company_id}
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4 mt-1">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Name
            </span>
            <input
              className="h-11 px-3 bg-stone-100 border border-stone-200 rounded text-stone-900 text-base focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:bg-white outline-none transition-colors"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="z. B. Anna Müller"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Unternehmen
            </span>
            <select
              className="h-11 px-3 bg-stone-100 border border-stone-200 rounded text-stone-900 text-base focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:bg-white outline-none transition-colors"
              value={form.company_id}
              onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
            >
              <option value="" disabled>Unternehmen wählen</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {modalMode === 'edit' && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-amber-600"
                checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              />
              <span className="text-sm text-stone-700">Aktiv</span>
            </label>
          )}
        </div>
      </Modal>
    </>
  )
}
