import { ReactNode } from 'react'
import EmptyState from './EmptyState'

export interface Column<T> {
  key: string
  label: ReactNode
  align?: 'left' | 'right' | 'center'
  mono?: boolean
  muted?: boolean
  render?: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  empty?: { title?: string; body?: string }
}

export default function DataTable<T>({
  columns,
  rows,
  empty,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? 'Diesen Monat noch nichts.'}
        body={empty?.body ?? 'Sobald jemand etwas einträgt, erscheint es hier.'}
      />
    )
  }

  const alignClass = (align?: string) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={[
                  'bg-bg px-4 py-2.5 text-[11px] font-medium text-fg-muted uppercase tracking-[0.06em] border-b border-border',
                  alignClass(col.align),
                ].join(' ')}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="bg-surface hover:bg-surface-2 transition-colors"
            >
              {columns.map((col, ci) => (
                <td
                  key={col.key}
                  className={[
                    'px-4 py-3 text-sm',
                    i < rows.length - 1 ? 'border-b border-border' : '',
                    col.muted ? 'text-fg-muted' : 'text-fg',
                    col.mono ? 'font-mono tabular-nums' : '',
                    alignClass(col.align),
                    ci === 0 ? '' : '',
                  ].join(' ')}
                >
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
