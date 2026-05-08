import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Topbar } from '../../components/admin/Topbar'
import DataTable, { Column } from '../../components/admin/DataTable'
import Modal from '../../components/admin/Modal'
import AdminButton from '../../components/admin/AdminButton'
import Badge from '../../components/admin/Badge'
import AdminIcon from '../../components/admin/AdminIcon'

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
}

export default function ItemsPage({ onToast }: Props) {
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(true)
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
        title="Items"
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
            rows={items}
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
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Name
            </span>
            <input
              className="h-11 px-3 bg-stone-100 border border-stone-200 rounded text-stone-900 text-base focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:bg-white outline-none transition-colors"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="z. B. Espresso"
              autoFocus
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Einheit
              </span>
              <input
                className="h-11 px-3 bg-stone-100 border border-stone-200 rounded text-stone-900 text-base focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:bg-white outline-none transition-colors"
                value={form.unit_label}
                onChange={e =>
                  setForm(f => ({ ...f, unit_label: e.target.value }))
                }
                placeholder="Tasse"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                Preis (€)
              </span>
              <input
                className="h-11 px-3 bg-stone-100 border border-stone-200 rounded text-stone-900 text-base font-mono focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:bg-white outline-none transition-colors"
                value={form.price_str}
                onChange={e =>
                  setForm(f => ({ ...f, price_str: e.target.value }))
                }
                placeholder="0,00"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Kategorie
            </span>
            <select
              className="h-11 px-3 bg-stone-100 border border-stone-200 rounded text-stone-900 text-base focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:bg-white outline-none transition-colors"
              value={form.category}
              onChange={e =>
                setForm(f => ({ ...f, category: e.target.value as ItemCategory }))
              }
            >
              <option value="coffee">Kaffee</option>
              <option value="drink">Getränk</option>
              <option value="snack">Snack</option>
              <option value="food">Essen</option>
              <option value="other">Sonstiges</option>
            </select>
          </label>
          {modalMode === 'edit' && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-amber-600"
                checked={form.active}
                onChange={e =>
                  setForm(f => ({ ...f, active: e.target.checked }))
                }
              />
              <span className="text-sm text-stone-700">Aktiv</span>
            </label>
          )}
        </div>
      </Modal>
    </>
  )
}
