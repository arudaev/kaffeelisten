import { FilterBar, AdminSelect, AdminButton } from '@kaffeelisten/web'

const noop = () => {}

export function SearchAndFilters() {
  return (
    <FilterBar
      search={{ value: '', onChange: noop, placeholder: 'Name oder E-Mail suchen' }}
      trailing={<span className="text-sm text-fg-muted">48 Einträge</span>}
    >
      <AdminSelect
        variant="filter"
        label="Unternehmen"
        defaultValue="alle"
        options={[
          { value: 'alle', label: 'Alle Unternehmen' },
          { value: 'itc1', label: 'ITC1' },
          { value: '4process', label: '4process' },
        ]}
      />
      <AdminSelect
        variant="filter"
        label="Status"
        defaultValue="aktiv"
        options={[
          { value: 'aktiv', label: 'Aktiv' },
          { value: 'inaktiv', label: 'Inaktiv' },
        ]}
      />
    </FilterBar>
  )
}

export function ActiveFiltersWithExport() {
  return (
    <FilterBar
      search={{ value: 'Cappuccino', onChange: noop, placeholder: 'Artikel suchen' }}
      onReset={noop}
      resetVisible
      trailing={
        <>
          <span className="text-sm text-fg-muted">7 von 312</span>
          <AdminButton variant="secondary">Exportieren</AdminButton>
        </>
      }
    >
      <AdminSelect
        variant="filter"
        label="Unternehmen"
        defaultValue="itc1"
        options={[
          { value: 'alle', label: 'Alle Unternehmen' },
          { value: 'itc1', label: 'ITC1' },
        ]}
      />
    </FilterBar>
  )
}
