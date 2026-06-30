import { AdminSelect } from '@kaffeelisten/web'

const noop = () => {}

const categories = [
  { value: 'coffee', label: 'Kaffee' },
  { value: 'drink', label: 'Getränk' },
  { value: 'snack', label: 'Snack' },
  { value: 'food', label: 'Essen' },
  { value: 'other', label: 'Sonstiges' },
]

export function Form() {
  return (
    <div style={{ width: 340 }}>
      <AdminSelect label="Kategorie" defaultValue="coffee" onChange={noop} options={categories} />
    </div>
  )
}

export function Required() {
  return (
    <div style={{ width: 340 }}>
      <AdminSelect label="Unternehmen" required defaultValue="" onChange={noop}>
        <option value="" disabled>Unternehmen wählen</option>
        <option value="1">GZDN GmbH</option>
        <option value="2">ITC1</option>
      </AdminSelect>
    </div>
  )
}

export function Filter() {
  return (
    <div style={{ width: 220 }}>
      <AdminSelect
        variant="filter"
        aria-label="Status filtern"
        defaultValue="all"
        onChange={noop}
        options={[
          { value: 'all', label: 'Alle Status' },
          { value: 'active', label: 'Aktiv' },
          { value: 'inactive', label: 'Inaktiv' },
        ]}
      />
    </div>
  )
}
