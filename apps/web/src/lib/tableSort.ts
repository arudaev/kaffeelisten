// Pure sorting for the admin DataTable, kept out of the component file so React
// fast refresh keeps working and the logic can be unit-tested without a DOM.

export type SortDir = 'asc' | 'desc'

export interface SortState {
  key: string
  dir: SortDir
}

export interface SortableColumn<T> {
  key: string
  // Presence makes the column sortable. Return the value to compare — the
  // rendered cell is often a badge or a formatted string.
  sortValue?: (row: T) => string | number | null | undefined
}

/**
 * Stable sort by a column's sortValue. Nullish and empty values always sort
 * last, regardless of direction, so blanks never crowd the top of a descending
 * list. Strings compare with German collation, so Ä sorts beside A, not after Z.
 */
export function sortRows<T>(
  rows: readonly T[],
  columns: readonly SortableColumn<T>[],
  sort: SortState | null,
): T[] {
  if (!sort) return [...rows]
  const col = columns.find(c => c.key === sort.key)
  if (!col?.sortValue) return [...rows]
  const get = col.sortValue
  const factor = sort.dir === 'asc' ? 1 : -1
  return rows
    .map((row, index) => ({ row, index, value: get(row) }))
    .sort((a, b) => {
      const aBlank = a.value === null || a.value === undefined || a.value === ''
      const bBlank = b.value === null || b.value === undefined || b.value === ''
      if (aBlank || bBlank) {
        if (aBlank && bBlank) return a.index - b.index
        return aBlank ? 1 : -1
      }
      const cmp =
        typeof a.value === 'number' && typeof b.value === 'number'
          ? a.value - b.value
          : String(a.value).localeCompare(String(b.value), 'de', { sensitivity: 'base', numeric: true })
      return cmp !== 0 ? cmp * factor : a.index - b.index
    })
    .map(x => x.row)
}

export function nextSort(current: SortState | null, key: string): SortState {
  if (current?.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
  return { key, dir: 'asc' }
}
