// @vitest-environment jsdom
//
// The seam between the admin API client and the demo's local store.
//
// The property that matters most here is the negative one: on a campus instance
// none of this exists. A bug that routed a real admin's save into localStorage
// would look like a working interface and lose their data silently.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let demo = false
vi.mock('../src/lib/appConfig', () => ({
  isDemoNow: () => demo,
}))

import { adminApi } from '../src/lib/adminApi'
import { demoEditCount, resetDemoStore } from '../src/lib/demoStore'

const json = (body: unknown) => ({ ok: true, json: async () => body }) as Response

beforeEach(() => {
  localStorage.clear()
  resetDemoStore()
  demo = false
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('on a campus instance', () => {
  it('sends the write to the server and stores nothing locally', async () => {
    const fetchMock = vi.fn(async () => json({ ok: true }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await adminApi.updateCompany('c1', { name: 'Neu' })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { method: string }]
    expect(url).toContain('/api/admin/data')
    expect(init.method).toBe('PATCH')
    expect(demoEditCount()).toBe(0)
  })

  it('returns the list from the server untouched', async () => {
    globalThis.fetch = vi.fn(async () => json({ companies: [{ id: 'c1', name: 'Original', active: true }] })) as unknown as typeof fetch
    const rows = await adminApi.getCompanies()
    expect(rows).toEqual([{ id: 'c1', name: 'Original', active: true }])
  })
})

describe('on the demo', () => {
  beforeEach(() => { demo = true })

  it('never calls the server for a write', async () => {
    const fetchMock = vi.fn(async () => json({ ok: true }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await adminApi.updateCompany('c1', { name: 'Neu' })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(demoEditCount()).toBe(1)
  })

  it('shows the visitor their own edit on the next read', async () => {
    globalThis.fetch = vi.fn(async () => json({ companies: [{ id: 'c1', name: 'Original', active: true }] })) as unknown as typeof fetch

    await adminApi.updateCompany('c1', { name: 'Umbenannt' })
    const rows = await adminApi.getCompanies()

    expect(rows[0].name).toBe('Umbenannt')
  })

  it('re-ticks the paid grid and recounts the summary from what is on screen', async () => {
    globalThis.fetch = vi.fn(async () => json({
      enabled: true,
      months: ['2026-10'],
      rows: { m1: { '2026-10': { amount_cents: 500, paid: true } }, m2: { '2026-10': { amount_cents: 300, paid: true } } },
      companies: {},
      summary: [{ month: '2026-10', owe: 2, paid: 2, outstanding_cents: 0 }],
    })) as unknown as typeof fetch

    await adminApi.setMemberPaid('m1', '2026-10', false)
    const grid = await adminApi.getPaidGrid()

    expect(grid.rows.m1['2026-10'].paid).toBe(false)
    expect(grid.rows.m2['2026-10'].paid).toBe(true)
    expect(grid.summary[0]).toMatchObject({ paid: 1, outstanding_cents: 500 })
  })

  it('reads still go to the server — only writes are local', async () => {
    const fetchMock = vi.fn(async () => json({ items: [] }))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    await adminApi.getItems()
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
