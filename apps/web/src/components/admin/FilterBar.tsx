import { ReactNode } from 'react'
import AdminField from './AdminField'
import AdminIcon from './AdminIcon'

interface FilterBarProps {
  search?: { value: string; onChange: (v: string) => void; placeholder: string }
  // Compact filter selects, rendered in one wrapping row beside the search field.
  children?: ReactNode
  // Right-aligned: result count, export button, etc.
  trailing?: ReactNode
  onReset?: () => void
  resetVisible?: boolean
}

/**
 * One row of search + filters above a table. The list pages used to stack three
 * full-width selects, which pushed the table below the fold on a laptop screen.
 */
export default function FilterBar({ search, children, trailing, onReset, resetVisible }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {search && (
        <div className="w-full sm:w-64">
          <AdminField
            variant="filter"
            type="search"
            value={search.value}
            onChange={e => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            leading={<AdminIcon name="search" size={16} />}
          />
        </div>
      )}
      {children}
      {onReset && resetVisible && (
        <button
          type="button"
          onClick={onReset}
          className="h-9 px-2 text-sm text-fg-muted hover:text-fg rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Filter zurücksetzen
        </button>
      )}
      {trailing && <div className="flex items-center gap-2 sm:ml-auto">{trailing}</div>}
    </div>
  )
}
