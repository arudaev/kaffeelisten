import { ReactNode, useMemo, useState } from 'react'
import EmptyState from './EmptyState'
import AdminIcon from './AdminIcon'
import { nextSort, sortRows, type SortState } from '../../lib/tableSort'

export interface Column<T> {
  key: string
  label: ReactNode
  align?: 'left' | 'right' | 'center'
  mono?: boolean
  muted?: boolean
  render?: (row: T) => ReactNode
  // Presence makes the column sortable by clicking its header. Return the value
  // to compare — the rendered cell is often a badge or a formatted string.
  sortValue?: (row: T) => string | number | null | undefined
}

export interface DataGroup<T> {
  key: string
  label: ReactNode
  rows: T[]
  // Cells for the group's header row, keyed by column. The first column always
  // shows the collapse toggle and `label`; other columns render these cells, so a
  // group can carry its own aligned values (e.g. a company's totals or paid ticks).
  cells?: Record<string, ReactNode>
  defaultCollapsed?: boolean
  // Shown instead of the row count, e.g. for a group that has no rows by design.
  note?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  // Provide either flat `rows` or `groups`.
  rows?: T[]
  groups?: DataGroup<T>[]
  empty?: { title?: string; body?: string }
  // Stable identity per row. Falls back to the index, which breaks React state
  // (and focus) whenever rows are re-sorted or filtered.
  rowKey?: (row: T) => string
  rowClassName?: (row: T) => string
  // Footer cells keyed by column, e.g. totals under "Menge" and "Betrag".
  footer?: Record<string, ReactNode>
  defaultSort?: SortState
}

const alignClass = (align?: string) =>
  align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

export default function DataTable<T>({
  columns,
  rows,
  groups,
  empty,
  rowKey,
  rowClassName,
  footer,
  defaultSort,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((groups ?? []).map(g => [g.key, !!g.defaultCollapsed])),
  )

  const sortedRows = useMemo(() => sortRows(rows ?? [], columns, sort), [rows, columns, sort])
  const sortedGroups = useMemo(
    () => (groups ?? []).map(g => ({ ...g, rows: sortRows(g.rows, columns, sort) })),
    [groups, columns, sort],
  )

  const isEmpty = groups ? groups.length === 0 : sortedRows.length === 0
  if (isEmpty) {
    return (
      <EmptyState
        title={empty?.title ?? 'Diesen Monat noch nichts.'}
        body={empty?.body ?? 'Sobald jemand etwas einträgt, erscheint es hier.'}
      />
    )
  }

  const renderRow = (row: T, i: number) => (
    <tr
      key={rowKey ? rowKey(row) : i}
      className={['bg-surface hover:bg-surface-2 transition-colors', rowClassName?.(row) ?? ''].join(' ')}
    >
      {columns.map(col => (
        <td
          key={col.key}
          className={[
            'px-4 py-3 text-sm border-b border-border',
            col.muted ? 'text-fg-muted' : 'text-fg',
            col.mono ? 'font-mono tabular-nums' : '',
            alignClass(col.align),
          ].join(' ')}
        >
          {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
        </td>
      ))}
    </tr>
  )

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        {/* The last body row's bottom border would double the container border. */}
        <table className="w-full border-collapse [&_tbody:last-of-type_tr:last-child_td]:border-b-0">
          <thead>
            <tr>
              {columns.map(col => {
                const active = sort?.key === col.key
                const ariaSort = active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : col.sortValue ? 'none' : undefined
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={[
                      'bg-bg px-4 py-2.5 text-[11px] font-medium text-fg-muted uppercase tracking-[0.06em] border-b border-border',
                      alignClass(col.align),
                    ].join(' ')}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => setSort(s => nextSort(s, col.key))}
                        className={[
                          'inline-flex items-center gap-1 uppercase tracking-[0.06em] rounded',
                          'hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                          active ? 'text-fg' : '',
                        ].join(' ')}
                      >
                        {col.label}
                        <span aria-hidden="true" className={active ? '' : 'opacity-30'}>
                          {active && sort!.dir === 'desc' ? '↓' : '↑'}
                        </span>
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          {groups ? (
            sortedGroups.map(group => {
              const isCollapsed = !!collapsed[group.key]
              return (
                <tbody key={group.key}>
                  <tr className="bg-bg">
                    {columns.map((col, ci) => (
                      <td
                        key={col.key}
                        className={[
                          'px-4 py-2.5 text-sm border-b border-border',
                          col.mono ? 'font-mono tabular-nums' : '',
                          alignClass(col.align),
                        ].join(' ')}
                      >
                        {ci === 0 ? (
                          <button
                            type="button"
                            aria-expanded={!isCollapsed}
                            onClick={() => setCollapsed(c => ({ ...c, [group.key]: !isCollapsed }))}
                            className="inline-flex items-center gap-2 font-semibold text-fg rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            <span
                              aria-hidden="true"
                              className={['inline-flex transition-transform', isCollapsed ? '-rotate-90' : ''].join(' ')}
                            >
                              <AdminIcon name="chevron" size={14} />
                            </span>
                            {group.label}
                            <span className="text-xs font-normal text-fg-muted">{group.note ?? `(${group.rows.length})`}</span>
                          </button>
                        ) : (
                          group.cells?.[col.key] ?? null
                        )}
                      </td>
                    ))}
                  </tr>
                  {!isCollapsed && group.rows.map(renderRow)}
                </tbody>
              )
            })
          ) : (
            <tbody>{sortedRows.map(renderRow)}</tbody>
          )}

          {footer && (
            <tfoot>
              <tr className="bg-bg">
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={[
                      'px-4 py-2.5 text-sm font-semibold text-fg border-t border-border',
                      col.mono ? 'font-mono tabular-nums' : '',
                      alignClass(col.align),
                    ].join(' ')}
                  >
                    {footer[col.key] ?? null}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
