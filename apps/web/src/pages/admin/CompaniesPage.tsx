import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../lib/adminApi'
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
  billing_mode?: 'individual' | 'company_paid'
  billing_contact_name?: string | null
  billing_contact_email?: string | null
  billing_notes?: string | null
}

interface CompanyForm {
  name: string
  billing_mode: 'individual' | 'company_paid'
  billing_contact_name: string
  billing_contact_email: string
  billing_notes: string
}

const EMPTY_FORM: CompanyForm = {
  name: '',
  billing_mode: 'individual',
  billing_contact_name: '',
  billing_contact_email: '',
  billing_notes: '',
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
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      setCompanies(await adminApi.getCompanies())
    } catch {
      onToast('Unternehmen konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCompanies() }, [])

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setModalMode('add')
    setEditId(null)
    setModalOpen(true)
  }

  const openEdit = (company: CompanyRow) => {
    setForm({
      name: company.name,
      billing_mode: company.billing_mode ?? 'individual',
      billing_contact_name: company.billing_contact_name ?? '',
      billing_contact_email: company.billing_contact_email ?? '',
      billing_notes: company.billing_notes ?? '',
    })
    setModalMode('edit')
    setEditId(company.id)
    setModalOpen(true)
  }

  // company_paid requires a billing contact email (mirrors the server rule).
  const formValid =
    form.name.trim().length > 0 &&
    (form.billing_mode !== 'company_paid' || form.billing_contact_email.trim().length > 0)

  const handleSubmit = async () => {
    if (!formValid) return
    setSaving(true)
    const values = {
      name: form.name.trim(),
      billing_mode: form.billing_mode,
      billing_contact_name: form.billing_contact_name.trim() || null,
      billing_contact_email: form.billing_contact_email.trim() || null,
      billing_notes: form.billing_notes.trim() || null,
    }
    try {
      if (modalMode === 'add') await adminApi.createCompany(values)
      else await adminApi.updateCompany(editId!, values)
      setModalOpen(false)
      onToast(modalMode === 'add' ? 'Unternehmen hinzugefügt.' : 'Unternehmen aktualisiert.')
      fetchCompanies()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Fehler beim Speichern.')
    } finally {
      setSaving(false)
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
    try {
      await adminApi.updateCompany(company.id, { active: !company.active })
      onToast(company.active ? 'Unternehmen deaktiviert.' : 'Unternehmen aktiviert.')
      fetchCompanies()
    } catch {
      onToast('Fehler beim Aktualisieren.')
    }
  }

  const columns: Column<CompanyRow>[] = [
    {
      key: 'name',
      label: 'Unternehmen',
      render: r => <span className="font-semibold">{r.name}</span>,
    },
    {
      key: 'billing',
      label: 'Abrechnung',
      render: r =>
        r.billing_mode === 'company_paid' ? (
          <span className="inline-flex flex-col">
            <Badge kind="active">Firma zahlt</Badge>
            {r.billing_contact_email && (
              <span className="text-xs text-fg-muted mt-0.5">{r.billing_contact_email}</span>
            )}
          </span>
        ) : (
          <span className="text-sm text-fg-muted">Einzeln</span>
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
            className="inline-flex items-center gap-1.5 h-9 px-3 bg-surface border border-border rounded-md text-sm text-fg hover:bg-surface-2 transition-colors"
          >
            Name {sortDir === 'asc' ? 'A→Z' : 'Z→A'}
            <AdminIcon name="chevron" size={14} strokeWidth={2} />
          </button>
          {filterStatus !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className="text-xs text-fg-muted hover:text-fg transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
          <span className="ml-auto text-sm text-fg-muted">
            {displayed.length} {displayed.length === 1 ? 'Unternehmen' : 'Unternehmen'}
          </span>
        </div>
        {loading ? (
          <div className="h-48 bg-surface-2 rounded-xl animate-pulse" />
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
              disabled={saving || !formValid}
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
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="z. B. Beispiel GmbH"
            autoFocus
          />
          <AdminSelect
            label="Abrechnung"
            value={form.billing_mode}
            onChange={e => setForm(f => ({ ...f, billing_mode: e.target.value as CompanyForm['billing_mode'] }))}
            options={[
              { value: 'individual', label: 'Jede Person zahlt selbst' },
              { value: 'company_paid', label: 'Firma übernimmt den Kaffee' },
            ]}
          />
          {form.billing_mode === 'company_paid' && (
            <>
              <AdminField
                label="Rechnungskontakt (Name)"
                value={form.billing_contact_name}
                onChange={e => setForm(f => ({ ...f, billing_contact_name: e.target.value }))}
                placeholder="z. B. Anna Bauer"
              />
              <AdminField
                label="Rechnungs-E-Mail"
                type="email"
                value={form.billing_contact_email}
                onChange={e => setForm(f => ({ ...f, billing_contact_email: e.target.value }))}
                placeholder="rechnung@firma.de"
                hint="Pflichtfeld: erhält die Sammelrechnung für alle Mitarbeitenden."
              />
              <AdminField
                label="Notiz (intern)"
                value={form.billing_notes}
                onChange={e => setForm(f => ({ ...f, billing_notes: e.target.value }))}
                placeholder="optional, nur für Admins"
              />
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
