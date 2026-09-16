import { describe, expect, it } from 'vitest'
import { nextSort, sortRows, type SortableColumn } from '../src/lib/tableSort'

interface Row { name: string; price: number | null }

const columns: SortableColumn<Row>[] = [
  { key: 'name', label: 'Name', sortValue: r => r.name },
  { key: 'price', label: 'Preis', sortValue: r => r.price },
  { key: 'plain', label: 'Unsortierbar' },
]

const rows: Row[] = [
  { name: 'Zander', price: 70 },
  { name: 'Äpfel', price: null },
  { name: 'apfel', price: 50 },
  { name: 'Bier', price: 50 },
]

describe('sortRows', () => {
  it('leaves order untouched with no sort, or on a column without sortValue', () => {
    expect(sortRows(rows, columns, null)).toEqual(rows)
    expect(sortRows(rows, columns, { key: 'plain', dir: 'asc' })).toEqual(rows)
  })

  it('collates German text so Ä sorts beside A, not after Z', () => {
    const names = sortRows(rows, columns, { key: 'name', dir: 'asc' }).map(r => r.name)
    expect(names.indexOf('Zander')).toBe(names.length - 1)
    expect(names.slice(0, 2).sort()).toEqual(['apfel', 'Äpfel'].sort())
  })

  it('sorts numbers numerically in both directions', () => {
    const asc = sortRows(rows, columns, { key: 'price', dir: 'asc' }).map(r => r.price)
    expect(asc).toEqual([50, 50, 70, null])
  })

  it('keeps blanks last even when descending', () => {
    const desc = sortRows(rows, columns, { key: 'price', dir: 'desc' }).map(r => r.price)
    expect(desc).toEqual([70, 50, 50, null])
  })

  it('is stable: equal values keep their original relative order', () => {
    const fifties = sortRows(rows, columns, { key: 'price', dir: 'asc' })
      .filter(r => r.price === 50)
      .map(r => r.name)
    expect(fifties).toEqual(['apfel', 'Bier'])
  })

  it('does not mutate the input', () => {
    const copy = [...rows]
    sortRows(rows, columns, { key: 'name', dir: 'desc' })
    expect(rows).toEqual(copy)
  })
})

describe('nextSort', () => {
  it('starts ascending on a new column, then toggles', () => {
    const first = nextSort(null, 'price')
    expect(first).toEqual({ key: 'price', dir: 'asc' })
    expect(nextSort(first, 'price')).toEqual({ key: 'price', dir: 'desc' })
    expect(nextSort({ key: 'price', dir: 'desc' }, 'name')).toEqual({ key: 'name', dir: 'asc' })
  })
})
