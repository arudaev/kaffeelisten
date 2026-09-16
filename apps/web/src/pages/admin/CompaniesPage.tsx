import { useEffect, useMemo, useState } from 'react'
import { adminApi, type AdminCompany, type AdminItem, type BillingMode, type CheckoutMode } from '../../lib/adminApi'
import { Topbar } from '../../components/admin/Topbar'
import DataTable, { Column } from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import AdminButton from '../../components/admin/AdminButton'
import Badge from '../../components/admin/Badge'
import AdminIcon from '../../components/admin/AdminIcon'
import AdminField from '../../components/admin/AdminField'
import AdminSelect from '../../components/admin/AdminSelect'
import SegmentedControl from '../../components/admin/SegmentedControl'
import Toggle from '../../components/admin/Toggle'
import FilterBar from '../../components/admin/FilterBar'
import ExportDialog from '../../components/admin/ExportDialog'
import { monthFigures, toEntryRows } from '../../lib/entries'
import { monthLabel, todayBerlin } from '../../lib/dates'
import { formatEuro as euro } from '../../lib/money'

interface CompanyRow extends AdminCompany {
  people: number
  monthCents: number
}

interface CompanyForm {
  name: string
  billing_mode: BillingMode
  billing_contact_name: string
  billing_contact_email: string
  billing_notes: string
  member_document_copies_enabled: boolean
  checkout_mode: CheckoutMode
}

const EMPTY_FORM: CompanyForm = {
  name: '',
  billing_mode: 'individual',
  billing_contact_name: '',
  billing_contact_email: '',
  billing_notes: '',
  member_document_copies_enabled: false,
  checkout_mode: 'member',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mirrors api/_lib/documentMatrix.ts companyConfigError, so the form explains a
// problem before the server rejects it.
function formProblem(f: CompanyForm): string | null {
  if (!f.name.trim()) return 'Name fehlt.'
  const email = f.billing_contact_email.trim()
  if (email && !EMAIL_RE.test(email)) return 'Die Kontakt-E-Mail ist ungültig.'
  if (f.billing_mode === 'company_paid' && !email) return 'Wenn die Firma zahlt, ist eine Kontakt-E-Mail Pflicht – dorthin geht die Rechnung.'
  if (f.checkout_mode === 'company' && f.billing_mode !== 'company_paid') return 'Firmen-Checkout geht nur, wenn die Firma zahlt.'
  return null
}

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

export default function CompaniesPage({ onToast, onMenuClick }: Props) {
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [members, setMembers] = useState<{ id: string; name: string; company_id: string }[]>([])
  const [items, setItems] = useState<AdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active')
  const [filterMode, setFilterMode] = useState<'' | BillingMode>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [exportFor, setExportFor] = useState<string | null>(null)

  const month = todayBerlin().slice(0, 7)

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const [companyList, memberList, dashboard, itemList] = await Promise.all([
        adminApi.getCompanies(),
        adminApi.getMembers(),
        adminApi.getDashboard(),
        adminApi.getItems(),
      ])
      const figures = monthFigures(toEntryRows(dashboard), month)
      const people = new Map<string, number>()
      for (const m of memberList) if (m.active) people.set(m.company_id, (people.get(m.company_id) ?? 0) + 1)
      setCompanies(companyList.map(c => ({
        ...c,
        people: people.get(c.id) ?? 0,
        monthCents: figures.byCompany.get(c.id)?.totalCents ?? 0,
      })))
      setMembers(memberList.map(m => ({ id: m.id, name: m.name, company_id: m.company_id })))
      setItems(itemList)
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

  const openEdit = (c: CompanyRow) => {
    setForm({
      name: c.name,
      billing_mode: c.billing_mode ?? 'individual',
      billing_contact_name: c.billing_contact_name ?? '',
      billing_contact_email: c.billing_contact_email ?? '',
      billing_notes: c.billing_notes ?? '',
      member_document_copies_enabled: !!c.member_document_copies_enabled,
      checkout_mode: c.checkout_mode ?? 'member',
    })
    setModalMode('edit')
    setEditId(c.id)
    setModalOpen(true)
  }

  const problem = formProblem(form)

  const handleSubmit = async () => {
    if (problem) return
    setSaving(true)
    const values = {
      name: form.name.trim(),
      billing_mode: form.billing_mode,
      billing_contact_name: form.billing_contact_name.trim() || null,
      billing_contact_email: form.billing_contact_email.trim() || null,
      billing_notes: form.billing_notes.trim() || null,
      // Copies only make sense where people are billed individually.
      member_document_copies_enabled: form.billing_mode === 'individual' && form.member_document_copies_enabled,
      checkout_mode: form.billing_mode === 'company_paid' ? form.checkout_mode : 'member' as CheckoutMode,
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

  const toggleActive = async (c: CompanyRow) => {
    try {
      await adminApi.updateCompany(c.id, { active: !c.active })
      onToast(c.active ? 'Unternehmen deaktiviert.' : 'Unternehmen aktiviert.')
      fetchCompanies()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Fehler beim Aktualisieren.')
    }
  }

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    return companies.filter(c =>
      (filterStatus === 'all' || c.active === (filterStatus === 'active')) &&
      (!filterMode || (c.billing_mode ?? 'individual') === filterMode) &&
      (!q || c.name.toLowerCase().includes(q) || (c.billing_contact_email ?? '').toLowerCase().includes(q)),
    )
  }, [companies, search, filterStatus, filterMode])

  // A paying company with no contact cannot be sent its bill; the monthly run skips it.
  const unreachable = companies.filter(c => c.active && c.billing_mode === 'company_paid' && !c.billing_contact_email)

  const columns: Column<CompanyRow>[] = [
    {
      key: 'name',
      label: 'Unternehmen',
      sortValue: r => r.name,
      render: r => (
        <span className="flex flex-col">
          <span className="font-semibold">{r.name}</span>
          {r.billing_notes && <span className="text-xs text-fg-muted truncate max-w-[16rem]" title={r.billing_notes}>{r.billing_notes}</span>}
        </span>
      ),
    },
    {
      key: 'billing',
      label: 'Wer zahlt',
      sortValue: r => r.billing_mode ?? 'individual',
      render: r => (
        <span className="flex flex-col gap-0.5 items-start">
          {r.billing_mode === 'company_paid' ? <Badge kind="warn">Firma zahlt</Badge> : <span className="text-sm">Jede Person</span>}
          {r.billing_contact_email
            ? <span className="text-xs text-fg-muted">{r.billing_contact_email}</span>
            : r.billing_mode === 'company_paid' && <Badge kind="error">Kein Rechnungskontakt</Badge>}
          {r.member_document_copies_enabled && r.billing_mode !== 'company_paid' && (
            <span className="text-xs text-fg-muted">erhält Kopien der Einzeldokumente</span>
          )}
        </span>
      ),
    },
    {
      key: 'checkout',
      label: 'Checkout',
      sortValue: r => r.checkout_mode ?? 'member',
      render: r => (r.checkout_mode === 'company'
        ? <Badge kind="inactive">Firmen-Checkout</Badge>
        : <span className="text-sm text-fg-muted">pro Person</span>),
    },
    { key: 'people', label: 'Personen', align: 'right', mono: true, sortValue: r => r.people, render: r => (r.checkout_mode === 'company' ? <span className="text-fg-subtle">—</span> : r.people) },
    { key: 'month', label: monthLabel(month), align: 'right', mono: true, sortValue: r => r.monthCents, render: r => (r.monthCents > 0 ? euro(r.monthCents) : <span className="text-fg-subtle">—</span>) },
    { key: 'active', label: 'Status', sortValue: r => (r.active ? 1 : 0), render: r => <Badge kind={r.active ? 'active' : 'inactive'}>{r.active ? 'Aktiv' : 'Inaktiv'}</Badge> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: r => (
        <div className="inline-flex gap-1">
          <button type="button" onClick={() => setExportFor(r.id)} title="Einträge exportieren" aria-label={`Einträge von ${r.name} exportieren`}
            className="text-fg-muted hover:text-accent p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <AdminIcon name="download" size={16} />
          </button>
          <button type="button" onClick={() => openEdit(r)} title="Bearbeiten" aria-label={`${r.name} bearbeiten`}
            className="text-fg-muted hover:text-fg p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <AdminIcon name="edit" size={16} />
          </button>
          <button type="button" onClick={() => toggleActive(r)} title={r.active ? 'Deaktivieren' : 'Aktivieren'} aria-label={`${r.name} ${r.active ? 'deaktivieren' : 'aktivieren'}`}
            className={['p-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent', r.active ? 'text-fg-muted hover:text-error' : 'text-fg-muted hover:text-success'].join(' ')}>
            <AdminIcon name={r.active ? 'archive' : 'check'} size={16} />
          </button>
        </div>
      ),
    },
  ]

  const pays = form.billing_mode === 'company_paid'

  return (
    <>
      <Topbar
        title="Unternehmen"
        onMenuClick={onMenuClick}
        right={
          <AdminButton variant="primary" icon={<AdminIcon name="add" size={16} />} onClick={openAdd}>
            Hinzufügen
          </AdminButton>
        }
      />
      <div className="p-4 md:p-8 flex flex-col gap-4">
        {unreachable.length > 0 && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-error bg-error-subtle px-3 py-2 text-sm text-fg">
            <span className="text-error mt-0.5"><AdminIcon name="warning" size={16} /></span>
            <span>
              <strong>{unreachable.map(c => c.name).join(', ')}</strong>{' '}
              {unreachable.length === 1 ? 'zahlt' : 'zahlen'} für die eigenen Leute, hat aber keinen Rechnungskontakt.
              Beim Monatsversand wird für {unreachable.length === 1 ? 'diese Firma' : 'diese Firmen'} kein Dokument verschickt.
            </span>
          </div>
        )}

        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Name oder Kontakt suchen…' }}
          onReset={() => { setSearch(''); setFilterStatus('active'); setFilterMode('') }}
          resetVisible={!!search || filterStatus !== 'active' || !!filterMode}
          trailing={<span className="text-sm text-fg-muted">{displayed.length} Unternehmen</span>}
        >
          <AdminSelect
            variant="filter"
            aria-label="Wer zahlt"
            value={filterMode}
            onChange={e => setFilterMode(e.target.value as '' | BillingMode)}
            options={[
              { value: '', label: 'Alle Abrechnungsarten' },
              { value: 'company_paid', label: 'Firma zahlt' },
              { value: 'individual', label: 'Jede Person' },
            ]}
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
            rows={displayed}
            rowKey={r => r.id}
            defaultSort={{ key: 'name', dir: 'asc' }}
            empty={companies.length === 0
              ? { title: 'Noch keine Unternehmen.', body: 'Füge das erste Unternehmen hinzu.' }
              : { title: 'Keine Treffer.', body: 'Passe die Filter an.' }}
          />
        )}
      </div>

      <ExportDialog
        open={!!exportFor}
        onClose={() => setExportFor(null)}
        initial={exportFor ? { company_id: exportFor } : undefined}
        companies={companies}
        members={members}
        items={items}
        onToast={onToast}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'add' ? 'Unternehmen hinzufügen' : 'Unternehmen bearbeiten'}
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</AdminButton>
            <AdminButton variant="primary" onClick={handleSubmit} disabled={saving || !!problem}>
              {saving ? 'Speichern…' : 'Speichern'}
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-5 mt-1 text-fg">
          <AdminField label="Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z. B. Beispiel GmbH" autoFocus />

          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-medium text-fg-muted uppercase tracking-wide mb-1.5">Wer zahlt?</legend>
            <SegmentedControl
              ariaLabel="Wer zahlt"
              value={form.billing_mode}
              onChange={billing_mode => setForm(f => ({ ...f, billing_mode, checkout_mode: billing_mode === 'company_paid' ? f.checkout_mode : 'member' }))}
              options={[
                { value: 'individual', label: 'Jede Person selbst' },
                { value: 'company_paid', label: 'Die Firma' },
              ]}
            />
            <p className="text-[13px] text-fg-muted leading-relaxed">
              {pays
                ? 'Die Firma erhält jeden Monat ein Dokument mit allen Einträgen ihrer Leute (bei freigegebenem Rechnungsmodus eine Rechnung). Die Mitarbeitenden bekommen nur eine Übersicht zur Information und zahlen nichts.'
                : 'Jede Person erhält ihr eigenes Dokument (bei freigegebenem Rechnungsmodus eine Rechnung). Die Firma bekommt eine Aufstellung zur Übersicht.'}
            </p>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminField
              label="Kontaktperson"
              value={form.billing_contact_name}
              onChange={e => setForm(f => ({ ...f, billing_contact_name: e.target.value }))}
              placeholder="z. B. Anna Bauer"
            />
            <AdminField
              label="Kontakt-E-Mail"
              type="email"
              required={pays}
              value={form.billing_contact_email}
              onChange={e => setForm(f => ({ ...f, billing_contact_email: e.target.value }))}
              placeholder="rechnung@firma.de"
              hint={pays ? 'Pflicht – hierhin geht die Rechnung.' : 'Optional – erhält die Firmenaufstellung.'}
            />
          </div>

          {pays ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-medium text-fg-muted uppercase tracking-wide mb-1.5">Checkout am iPad</legend>
              <SegmentedControl
                ariaLabel="Checkout"
                value={form.checkout_mode}
                onChange={checkout_mode => setForm(f => ({ ...f, checkout_mode }))}
                options={[
                  { value: 'member', label: 'Personen wählen sich aus' },
                  { value: 'company', label: 'Ein gemeinsames Konto' },
                ]}
              />
              <p className="text-[13px] text-fg-muted leading-relaxed">
                {form.checkout_mode === 'company'
                  ? 'Niemand muss sich registrieren: Wer die Firma antippt, bucht direkt auf das gemeinsame Firmenkonto. Einzelne Personen werden nicht erfasst.'
                  : 'Jede Person wählt am iPad ihren Namen. Die Firma sieht in ihrer Abrechnung, wer was getrunken hat.'}
              </p>
            </fieldset>
          ) : (
            <Toggle
              checked={form.member_document_copies_enabled}
              onChange={member_document_copies_enabled => setForm(f => ({ ...f, member_document_copies_enabled }))}
              label="Firma erhält Kopien der Einzeldokumente ihrer Mitarbeitenden"
            />
          )}

          <AdminField
            label="Notiz (intern)"
            value={form.billing_notes}
            onChange={e => setForm(f => ({ ...f, billing_notes: e.target.value }))}
            placeholder="optional, nur für Admins sichtbar"
          />

          {problem && form.name.trim() && (
            <p role="alert" className="text-sm text-error">{problem}</p>
          )}
        </div>
      </Modal>
    </>
  )
}
