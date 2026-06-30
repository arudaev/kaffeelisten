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

interface CompanyRow {
  id: string
  name: string
  active: boolean
}

interface CompanyForm {
  name: string
}

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

export default function CompaniesPage({ onToast, onMenuClick }: Props) {
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CompanyForm>({ name: '' })
  const [saving, setSaving] = useState(false)

  const fetchCompanies = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('companies')
      .select('id, name, active')
      .order('name')
    setCompanies(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCompanies() }, [])

  const openAdd = () => {
    setForm({ name: '' })
    setModalMode('add')
    setEditId(null)
    setModalOpen(true)
  }

  const openEdit = (company: CompanyRow) => {
    setForm({ name: company.name })
    setModalMode('edit')
    setEditId(company.id)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const name = form.name.trim()
    if (!name) return
    setSaving(true)
    const { error } =
      modalMode === 'add'
        ? await supabase.from('companies').insert({ name, active: true })
        : await supabase.from('companies').update({ name }).eq('id', editId!)
    setSaving(false)
    if (error) {
      onToast('Fehler beim Speichern.')
    } else {
      setModalOpen(false)
      onToast(modalMode === 'add' ? 'Unternehmen hinzugefügt.' : 'Unternehmen aktualisiert.')
      fetchCompanies()
    }
  }

  const displayed = useMemo(() => {
    let rows = companies
    if (filterStatus !== 'all') rows = rows.filter(r => r.active === (filterStatus === 'active'))
    return [...rows].sort((a, b) =>
      sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    )
  }, [companies, filterStatus, sortDir])

  const toggleActive = async (company: CompanyRow) => {
    const { error } = await supabase
      .from('companies')
      .update({ active: !company.active })
      .eq('id', company.id)
    if (error) {
      onToast('Fehler beim Aktualisieren.')
    } else {
      onToast(company.active ? 'Unternehmen deaktiviert.' : 'Unternehmen aktiviert.')
      fetchCompanies()
    }
  }

  const columns: Column<CompanyRow>[] = [
    {
      key: 'name',
      label: 'Unternehmen',
      render: r => <span className="font-semibold">{r.name}</span>,
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
        title="Unternehmen"
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
          <button
            type="button"
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="inline-flex items-center gap-1.5 h-9 px-3 bg-white border border-stone-200 rounded-md text-sm text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Name {sortDir === 'asc' ? 'A→Z' : 'Z→A'}
            <AdminIcon name="chevron" size={14} strokeWidth={2} />
          </button>
          {filterStatus !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
          <span className="ml-auto text-sm text-stone-500">
            {displayed.length} {displayed.length === 1 ? 'Unternehmen' : 'Unternehmen'}
          </span>
        </div>
        {loading ? (
          <div className="h-48 bg-stone-100 rounded-xl animate-pulse" />
        ) : (
          <DataTable
            columns={columns}
            rows={displayed}
            empty={{
              title: 'Noch keine Unternehmen.',
              body: 'Füge das erste Unternehmen hinzu.',
            }}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          modalMode === 'add'
            ? 'Unternehmen hinzufügen'
            : 'Unternehmen bearbeiten'
        }
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={handleSubmit}
              disabled={saving || !form.name.trim()}
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4 mt-1">
          <AdminField
            label="Name"
            value={form.name}
            onChange={e => setForm({ name: e.target.value })}
            placeholder="z. B. Beispiel GmbH"
            autoFocus
          />
        </div>
      </Modal>
    </>
  )
}
