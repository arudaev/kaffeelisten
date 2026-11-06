// @vitest-environment jsdom
//
// The demo's write path. The server refuses every mutation (demoWriteBlocked),
// so the interface would be a wall of error toasts without this layer: writes go
// to the visitor's own browser and reads come back with them laid over.
//
// What these tests are really protecting: that a visitor's edit is visible to
// that visitor and to nobody else, and that none of it happens off the demo.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyList,
  applySingleton,
  demoEditCount,
  paidOverride,
  recordCreate,
  recordPaid,
  recordSingleton,
  recordUpdate,
  resetDemoStore,
} from '../src/lib/demoStore'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('recording a visitor edit', () => {
  it('lays an update over the row the server returned', () => {
    recordUpdate('companies', 'c1', { name: 'Umbenannt' })
    const rows = applyList('companies', [
      { id: 'c1', name: 'Nordwald Systeme GmbH', active: true },
      { id: 'c2', name: 'Hafermond GbR', active: true },
    ])
    expect(rows[0].name).toBe('Umbenannt')
    expect(rows[1].name).toBe('Hafermond GbR')
  })

  it('merges successive edits to the same row instead of replacing them', () => {
    recordUpdate('companies', 'c1', { name: 'Erst' })
    recordUpdate('companies', 'c1', { active: false })
    const [row] = applyList('companies', [{ id: 'c1', name: 'Original', active: true }])
    expect(row).toMatchObject({ name: 'Erst', active: false })
  })

  it('appends a created row, with an id that cannot be mistaken for a uuid', () => {
    const id = recordCreate('items', { name: 'Chai', price_cents: 120 })
    expect(id).toMatch(/^demo-items-/)
    const rows = applyList('items', [{ id: 'i1', name: 'Espresso' }])
    expect(rows).toHaveLength(2)
    expect(rows[1]).toMatchObject({ id, name: 'Chai' })
  })

  it('applies an update to a row the visitor created in the same session', () => {
    const id = recordCreate('members', { name: 'Neu', active: true })
    recordUpdate('members', id, { active: false })
    const [, created] = applyList('members', [{ id: 'm1', name: 'Alex R.', active: true }])
    expect(created).toMatchObject({ id, active: false })
  })

  it('overlays a singleton without dropping the fields it does not mention', () => {
    recordSingleton('settings', { ceo_email: 'neu@example.com' })
    const merged = applySingleton('settings', { ceo_email: 'alt@example.com', max_items_per_order: 6 })
    expect(merged).toEqual({ ceo_email: 'neu@example.com', max_items_per_order: 6 })
  })

  it('remembers a re-ticked paid cell, and only that cell', () => {
    recordPaid('member', 'm1', '2026-10', false)
    expect(paidOverride('member', 'm1', '2026-10')).toBe(false)
    expect(paidOverride('member', 'm1', '2026-09')).toBeUndefined()
    expect(paidOverride('company', 'm1', '2026-10')).toBeUndefined()
  })
})

describe('what the visitor is told, and can undo', () => {
  it('counts every kind of edit', () => {
    recordUpdate('companies', 'c1', { name: 'A' })
    recordCreate('items', { name: 'B' })
    recordSingleton('theme', { active_palette: 'wald' })
    recordPaid('company', 'c1', '2026-10', true)
    expect(demoEditCount()).toBe(4)
  })

  it('counts a row edited twice once, because it is one changed row', () => {
    recordUpdate('companies', 'c1', { name: 'A' })
    recordUpdate('companies', 'c1', { active: false })
    expect(demoEditCount()).toBe(1)
  })

  it('reset leaves nothing behind', () => {
    recordUpdate('companies', 'c1', { name: 'A' })
    recordPaid('member', 'm1', '2026-10', true)
    resetDemoStore()
    expect(demoEditCount()).toBe(0)
    expect(applyList('companies', [{ id: 'c1', name: 'Original' }])[0].name).toBe('Original')
  })
})

describe('when the browser will not store anything', () => {
  it('survives a localStorage that throws on write, which a private window does', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    // The edit is lost, but the demo must not be.
    expect(() => recordUpdate('companies', 'c1', { name: 'A' })).not.toThrow()
    expect(() => applyList('companies', [{ id: 'c1', name: 'Original' }])).not.toThrow()
  })

  it('survives a localStorage that throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })
    expect(applyList('companies', [{ id: 'c1', name: 'Original' }])).toEqual([{ id: 'c1', name: 'Original' }])
    expect(demoEditCount()).toBe(0)
  })

  it('ignores a corrupted journal rather than rendering nothing', () => {
    localStorage.setItem('kaffeelisten.demo.v1', '{not json')
    expect(applyList('companies', [{ id: 'c1', name: 'Original' }])).toEqual([{ id: 'c1', name: 'Original' }])
  })
})
