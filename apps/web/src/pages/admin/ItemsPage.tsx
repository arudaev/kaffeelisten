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

interface ItemRow {
  id: string
  name: string
  unit_label: string
  price_cents: number
  category: string
  active: boolean
}

type ItemCategory = 'coffee' | 'drink' | 'snack' | 'food' | 'other'

interface ItemForm {
  name: string
  unit_label: string
  price_str: string
  category: ItemCategory
  active: boolean
}

const EMPTY_FORM: ItemForm = {
  name: '',
  unit_label: '',
  price_str: '0,00',
  category: 'coffee' as ItemCategory,
  active: true,
}

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  coffee: 'Kaffee',
  drink: 'Getränk',
  snack: 'Snack',
  food: 'Essen',
  other: 'Sonstiges',
}

function priceLabel(cents: number): string {
  return cents === 0 ? 'kostenlos' : '€ ' + (cents / 100).toFixed(2).replace('.', ',')
}

interface Props {
  onToast: (msg: string) => void
  onMenuClick: () => void
}

export default function ItemsPage({ onToast, onMenuClick }: Props) {
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterName, setFilterName] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortKey, setSortKey] = useState<'name' | 'price' | 'category'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchItems = async () => {
    setLoading(true)
    const { data } = await supabase.from('items').select('*').order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setModalMode('add')
    setEditId(null)
    setModalOpen(true)
  }

  const openEdit = (item: ItemRow) => {
    setForm({
      name: item.name,
      unit_label: item.unit_label,
      price_str: (item.price_cents / 100).toFixed(2).replace('.', ','),
      category: item.category as ItemCategory,
      active: item.active,
    })
    setModalMode('edit')
    setEditId(item.id)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const price_cents = Math.round(
      parseFloat(form.price_str.replace(',', '.')) * 100
    )
    if (isNaN(price_cents)) {
      onToast('Ungültiger Preis.')
      return
    }
    const payload = {
      name: form.name.trim(),
      unit_label: form.unit_label.trim(),
      price_cents,
      category: form.category,
      active: form.active,
    }
    setSaving(true)
    const { error } =
      modalMode === 'add'
        ? await supabase.from('items').insert(payload)
        : await supabase.from('items').update(payload).eq('id', editId!)
    setSaving(false)
    if (error) {
      onToast('Fehler beim Speichern.')
    } else {
      setModalOpen(false)
      onToast(modalMode === 'add' ? 'Item hinzugefügt.' : 'Item aktualisiert.')
      fetchItems()
    }
  }

  const displayed = useMemo(() => {
    let rows = items
    if (filterStatus !== 'all') rows = rows.filter(r => r.active === (filterStatus === 'active'))
    if (filterCategory) rows = rows.filter(r => r.category === filterCategory)
    if (filterName.trim()) {
      const q = filterName.trim().toLowerCase()
      rows = rows.filter(r => r.name.toLowerCase().includes(q))
    }
    return [...rows].sort((a, b) => {
      let av: string | number, bv: string | number
      if (sortKey === 'price') { av = a.price_cents; bv = b.price_cents }
      else if (sortKey === 'category') { av = a.category; bv = b.category }
      else { av = a.name; bv = b.name }
      if (typeof av === 'number') return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
      return sortDir === 'asc' ? (av as string).localeCompare(bv as string) : (bv as string).localeCompare(av as string)
    })
  }, [items, filterStatus, filterCategory, filterName, sortKey, sortDir])

  const toggleActive = async (item: ItemRow) => {
    const { error } = await supabase
      .from('items')
      .update({ active: !item.active })
      .eq('id', item.id)
    if (error) {
      onToast('Fehler beim Aktualisieren.')
    } else {
      onToast(item.active ? 'Item deaktiviert.' : 'Item aktiviert.')
      fetchItems()
    }
  }

  const columns: Column<ItemRow>[] = [
    {
      key: 'name',
      label: 'Name',
      render: r => <span className="font-semibold">{r.name}</span>,
    },
    {
      key: 'category',
      label: 'Kategorie',
      muted: true,
      render: r => CATEGORY_LABELS[r.category as ItemCategory] ?? r.category,
    },
    { key: 'unit_label', label: 'Einheit', muted: true },
    {
      key: 'price_cents',
      label: 'Preis',
      align: 'right',
      mono: true,
      render: r => priceLabel(r.price_cents),
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
        title="Items"
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
            placeholder="Item suchen…"
            leading={<AdminIcon name="search" size={16} strokeWidth={1.5} />}
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
          />
          <AdminSelect
            variant="filter"
            aria-label="Kategorie filtern"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Alle Kategorien</option>
            {(Object.entries(CATEGORY_LABELS) as [ItemCategory, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
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
              const [k, d] = e.target.value.split('-') as ['name' | 'price' | 'category', 'asc' | 'desc']
              setSortKey(k); setSortDir(d)
            }}
            options={[
              { value: 'name-asc', label: 'Name A→Z' },
              { value: 'name-desc', label: 'Name Z→A' },
              { value: 'price-asc', label: 'Preis ↑' },
              { value: 'price-desc', label: 'Preis ↓' },
              { value: 'category-asc', label: 'Kategorie A→Z' },
            ]}
          />
          {(filterCategory || filterStatus !== 'all' || filterName) && (
            <button
              type="button"
              onClick={() => { setFilterCategory(''); setFilterStatus('all'); setFilterName('') }}
              className="text-xs text-fg-muted hover:text-fg transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
          <span className="ml-auto text-sm text-fg-muted">
            {displayed.length} {displayed.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>
        {loading ? (
          <div className="h-48 bg-surface-2 rounded-xl animate-pulse" />
        ) : (
          <DataTable
            columns={columns}
            rows={displayed}
            empty={{
              title: 'Noch keine Items.',
              body: 'Füge das erste Item hinzu.',
            }}
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'add' ? 'Item hinzufügen' : 'Item bearbeiten'}
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
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="z. B. Espresso"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <AdminField
              label="Einheit"
              value={form.unit_label}
              onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))}
              placeholder="Tasse"
            />
            <AdminField
              label="Preis (€)"
              className="font-mono"
              value={form.price_str}
              onChange={e => setForm(f => ({ ...f, price_str: e.target.value }))}
              placeholder="0,00"
            />
          </div>
          <AdminSelect
            label="Kategorie"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value as ItemCategory }))}
            options={[
              { value: 'coffee', label: 'Kaffee' },
              { value: 'drink', label: 'Getränk' },
              { value: 'snack', label: 'Snack' },
              { value: 'food', label: 'Essen' },
              { value: 'other', label: 'Sonstiges' },
            ]}
          />
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
