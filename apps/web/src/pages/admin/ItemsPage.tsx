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
import Toggle from '../../components/admin/Toggle'
import FilterBar from '../../components/admin/FilterBar'
import { toEntryRows } from '../../lib/entries'
import { monthLabel, shiftMonth, todayBerlin } from '../../lib/dates'
import { formatEuro, parseEuro } from '../../lib/money'

type ItemCategory = 'coffee' | 'drink' | 'snack' | 'food' | 'other'

interface ItemRow {
  id: string
  name: string
  unit_label: string
  price_cents: number
  category: string
  active: boolean
  qtyMonth: number
  qtyPrevious: number
  revenueMonth: number
}

interface ItemForm {
  name: string
  unit_label: string
  price_str: string
  category: ItemCategory
  active: boolean
}

const EMPTY_FORM: ItemForm = { name: '', unit_label: 'Tasse', price_str: '', category: 'coffee', active: true }

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  coffee: 'Kaffee',
  drink: 'Getränk',
  snack: 'Snack',
  food: 'Essen',
  other: 'Sonstiges',
}

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

export default function ItemsPage({ onToast, onMenuClick }: Props) {
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editId, setEditId] = useState<string | null>(null)
  const [editOriginalPrice, setEditOriginalPrice] = useState<number | null>(null)
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const month = todayBerlin().slice(0, 7)
  const previous = shiftMonth(month, 1)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const [itemList, dashboard] = await Promise.all([adminApi.getItems(), adminApi.getDashboard()])
      const usage = new Map<string, { qtyMonth: number; qtyPrevious: number; revenueMonth: number }>()
      for (const r of toEntryRows(dashboard)) {
        const u = usage.get(r.item_id) ?? { qtyMonth: 0, qtyPrevious: 0, revenueMonth: 0 }
        if (r.month === month) { u.qtyMonth += r.quantity; u.revenueMonth += r.total_cents }
        if (r.month === previous) u.qtyPrevious += r.quantity
        usage.set(r.item_id, u)
      }
      setItems(itemList.map(i => ({ ...i, ...(usage.get(i.id) ?? { qtyMonth: 0, qtyPrevious: 0, revenueMonth: 0 }) })))
    } catch {
      onToast('Artikel konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchItems() }, [])

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setModalMode('add')
    setEditId(null)
    setEditOriginalPrice(null)
    setModalOpen(true)
  }

  const openEdit = (item: ItemRow) => {
    setForm({
      name: item.name,
      unit_label: item.unit_label,
      price_str: formatEuro(item.price_cents).replace('€ ', ''),
      category: item.category as ItemCategory,
      active: item.active,
    })
    setModalMode('edit')
    setEditId(item.id)
    setEditOriginalPrice(item.price_cents)
    setModalOpen(true)
  }

  const parsedPrice = parseEuro(form.price_str)
  const priceChanged = modalMode === 'edit' && parsedPrice !== null && parsedPrice !== editOriginalPrice

  const handleSubmit = async () => {
    if (parsedPrice === null || !form.name.trim()) return
    const payload = {
      name: form.name.trim(),
      unit_label: form.unit_label.trim(),
      price_cents: parsedPrice,
      category: form.category,
      active: form.active,
    }
    setSaving(true)
    try {
      if (modalMode === 'add') await adminApi.createItem(payload)
      else await adminApi.updateItem(editId!, payload)
      setModalOpen(false)
      onToast(modalMode === 'add' ? 'Artikel hinzugefügt.' : 'Artikel aktualisiert.')
      fetchItems()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Fehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (item: ItemRow) => {
    try {
      await adminApi.updateItem(item.id, { active: !item.active })
      onToast(item.active ? 'Artikel deaktiviert – er erscheint nicht mehr am iPad.' : 'Artikel aktiviert.')
      fetchItems()
    } catch {
      onToast('Fehler beim Aktualisieren.')
    }
  }

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(r =>
      (filterStatus === 'all' || r.active === (filterStatus === 'active')) &&
      (!filterCategory || r.category === filterCategory) &&
      (!q || r.name.toLowerCase().includes(q)),
    )
  }, [items, search, filterStatus, filterCategory])

  const columns: Column<ItemRow>[] = [
    { key: 'name', label: 'Artikel', sortValue: r => r.name, render: r => <span className="font-semibold">{r.name}</span> },
    { key: 'category', label: 'Kategorie', muted: true, sortValue: r => CATEGORY_LABELS[r.category as ItemCategory] ?? r.category, render: r => CATEGORY_LABELS[r.category as ItemCategory] ?? r.category },
    { key: 'price', label: 'Preis', align: 'right', mono: true, sortValue: r => r.price_cents, render: r => `${formatEuro(r.price_cents, { free: true })} / ${r.unit_label}` },
    {
      key: 'qty', label: `Verkauft · ${monthLabel(month)}`, align: 'right', mono: true, sortValue: r => r.qtyMonth,
      render: r => (
        <span className="flex flex-col items-end">
          <span className={r.qtyMonth === 0 ? 'text-fg-subtle' : ''}>{r.qtyMonth}</span>
          <span className="text-xs text-fg-muted">Vormonat {r.qtyPrevious}</span>
        </span>
      ),
    },
    { key: 'revenue', label: 'Umsatz', align: 'right', mono: true, sortValue: r => r.revenueMonth, render: r => (r.revenueMonth > 0 ? formatEuro(r.revenueMonth) : <span className="text-fg-subtle">—</span>) },
    { key: 'active', label: 'Status', sortValue: r => (r.active ? 1 : 0), render: r => <Badge kind={r.active ? 'active' : 'inactive'}>{r.active ? 'Aktiv' : 'Inaktiv'}</Badge> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: r => (
        <div className="inline-flex gap-1">
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

  const totalQty = displayed.reduce((s, r) => s + r.qtyMonth, 0)
  const totalRevenue = displayed.reduce((s, r) => s + r.revenueMonth, 0)

  return (
    <>
      <Topbar
        title="Artikel"
        onMenuClick={onMenuClick}
        right={
          <AdminButton variant="primary" icon={<AdminIcon name="add" size={16} />} onClick={openAdd}>
            Hinzufügen
          </AdminButton>
        }
      />
      <div className="p-4 md:p-8 flex flex-col gap-4">
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Artikel suchen…' }}
          onReset={() => { setSearch(''); setFilterCategory(''); setFilterStatus('active') }}
          resetVisible={!!search || !!filterCategory || filterStatus !== 'active'}
          trailing={<span className="text-sm text-fg-muted">{displayed.length} Artikel</span>}
        >
          <AdminSelect
            variant="filter"
            aria-label="Kategorie filtern"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            options={[{ value: '', label: 'Alle Kategorien' }, ...(Object.entries(CATEGORY_LABELS) as [ItemCategory, string][]).map(([value, label]) => ({ value, label }))]}
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
            defaultSort={{ key: 'qty', dir: 'desc' }}
            footer={displayed.length > 0 ? { name: 'Summe', qty: totalQty, revenue: formatEuro(totalRevenue) } : undefined}
            empty={items.length === 0
              ? { title: 'Noch keine Artikel.', body: 'Füge den ersten Artikel hinzu.' }
              : { title: 'Keine Treffer.', body: 'Passe die Filter an.' }}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'add' ? 'Artikel hinzufügen' : 'Artikel bearbeiten'}
        actions={
          <>
            <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</AdminButton>
            <AdminButton variant="primary" onClick={handleSubmit} disabled={saving || !form.name.trim() || parsedPrice === null}>
              {saving ? 'Speichern…' : 'Speichern'}
            </AdminButton>
          </>
        }
      >
        <div className="flex flex-col gap-4 mt-1 text-fg">
          <AdminField label="Name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z. B. Espresso" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Einheit" value={form.unit_label} onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))} placeholder="Tasse" />
            <AdminField
              label="Preis (€)"
              required
              inputMode="decimal"
              className="font-mono"
              value={form.price_str}
              onChange={e => setForm(f => ({ ...f, price_str: e.target.value }))}
              placeholder="0,50"
              error={form.price_str && parsedPrice === null ? 'z. B. 0,50 oder 1.234,50' : undefined}
              hint={parsedPrice === 0 ? 'Wird am iPad als kostenlos angezeigt.' : undefined}
            />
          </div>
          <AdminSelect
            label="Kategorie"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value as ItemCategory }))}
            options={(Object.entries(CATEGORY_LABELS) as [ItemCategory, string][]).map(([value, label]) => ({ value, label }))}
          />
          {priceChanged && (
            <p className="text-sm rounded-md bg-accent-subtle px-3 py-2">
              Der neue Preis gilt ab sofort für neue Einträge. Bereits erfasste Einträge und versendete Dokumente behalten ihren Preis.
            </p>
          )}
          {modalMode === 'edit' && (
            <Toggle label="Aktiv – am iPad auswählbar" checked={form.active} onChange={active => setForm(f => ({ ...f, active }))} />
          )}
        </div>
      </Modal>
    </>
  )
}
