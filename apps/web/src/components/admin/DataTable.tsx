import { ReactNode } from 'react'
import Illustration from '../Illustration'

export interface Column<T> {
  key: string
  label: string
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
      <div className="bg-white border border-stone-200 rounded-xl p-12 flex flex-col items-center gap-3">
        <Illustration name="emptyCup" className="w-24 text-stone-400" />
        <p className="text-base font-semibold text-stone-900">
          {empty?.title ?? 'Diesen Monat noch nichts.'}
        </p>
        <p className="text-sm text-stone-600">
          {empty?.body ?? 'Sobald jemand etwas einträgt, erscheint es hier.'}
        </p>
      </div>
    )
  }

  const alignClass = (align?: string) =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={[
                  'bg-stone-50 px-4 py-2.5 text-[11px] font-medium text-stone-600 uppercase tracking-[0.06em] border-b border-stone-200',
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
              className="bg-white hover:bg-stone-50 transition-colors"
            >
              {columns.map((col, ci) => (
                <td
                  key={col.key}
                  className={[
                    'px-4 py-3 text-sm',
                    i < rows.length - 1 ? 'border-b border-stone-200' : '',
                    col.muted ? 'text-stone-600' : 'text-stone-900',
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
