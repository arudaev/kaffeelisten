import { DataTable, Badge } from '@kaffeelisten/web'

interface Row {
  name: string
  company: string
  item: string
  qty: number
  active: boolean
}

const columns = [
  { key: 'name', label: 'Mitarbeiter' },
  { key: 'company', label: 'Unternehmen', muted: true },
  { key: 'item', label: 'Artikel' },
  { key: 'qty', label: 'Menge', align: 'right' as const, mono: true },
  {
    key: 'status',
    label: 'Status',
    render: (r: Row) => <Badge kind={r.active ? 'active' : 'inactive'}>{r.active ? 'Aktiv' : 'Inaktiv'}</Badge>,
  },
]

const rows: Row[] = [
  { name: 'Anna Bauer', company: 'GZDN GmbH', item: 'Cappuccino', qty: 12, active: true },
  { name: 'Markus Huber', company: 'ITC1', item: 'Apfelschorle', qty: 7, active: true },
  { name: 'Sophie Lang', company: 'TechWald AG', item: 'Butterbreze', qty: 4, active: true },
  { name: 'Jonas Wirth', company: 'GZDN GmbH', item: 'Espresso', qty: 21, active: false },
]

export function WithData() {
  return <DataTable columns={columns} rows={rows} />
}

export function EmptyState() {
  return <DataTable columns={columns} rows={[]} />
}
