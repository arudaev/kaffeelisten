import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Topbar } from '../../components/admin/Topbar'
import DataTable, { Column } from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import AdminButton from '../../components/admin/AdminButton'
import Badge from '../../components/admin/Badge'
import AdminIcon from '../../components/admin/AdminIcon'

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
}

export default function CompaniesPage({ onToast }: Props) {
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(true)
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
      <div className="p-8">
        {loading ? (
          <div className="h-48 bg-stone-100 rounded-xl animate-pulse" />
        ) : (
          <DataTable
            columns={columns}
            rows={companies}
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
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Name
            </span>
            <input
              className="h-11 px-3 bg-stone-100 border border-stone-200 rounded text-stone-900 text-base focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:bg-white outline-none transition-colors"
              value={form.name}
              onChange={e => setForm({ name: e.target.value })}
              placeholder="z. B. Beispiel GmbH"
              autoFocus
            />
          </label>
        </div>
      </Modal>
    </>
  )
}
