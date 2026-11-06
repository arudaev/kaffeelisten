// What the demo hides in the interface, and — more importantly — what it must
// never infer. The server is the control; these only cover the convenience
// layer that keeps a visitor away from endpoints that answer 410.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEMO_HIDDEN_PAGES, fallbackPage, navItems, visibleNavItems } from '../src/lib/adminNav'
import { loadAppConfig, resetAppConfigCache } from '../src/lib/appConfig'

describe('admin navigation', () => {
  it('shows every page on a campus instance', () => {
    expect(visibleNavItems(false)).toHaveLength(navItems.length)
  })

  it('leaves out the pages the demo does not have', () => {
    const ids = visibleNavItems(true).map(i => i.id)
    for (const hidden of DEMO_HIDDEN_PAGES) expect(ids).not.toContain(hidden)
    expect(ids).toContain('dashboard')
    expect(ids).toContain('settings')
  })

  it('keeps everything a prospect came to see', () => {
    const ids = visibleNavItems(true).map(i => i.id)
    for (const kept of ['dashboard', 'log', 'companies', 'members', 'items', 'settings']) {
      expect(ids).toContain(kept)
    }
  })

  it('sends a hidden page back to the dashboard rather than rendering nothing', () => {
    expect(fallbackPage('documents', true)).toBe('dashboard')
    expect(fallbackPage('documents', false)).toBe('documents')
    expect(fallbackPage('settings', true)).toBe('settings')
  })
})

describe('app config', () => {
  const realFetch = globalThis.fetch

  beforeEach(() => resetAppConfigCache())
  afterEach(() => {
    globalThis.fetch = realFetch
    resetAppConfigCache()
    vi.restoreAllMocks()
  })

  function mockFetch(body: unknown, ok = true) {
    globalThis.fetch = vi.fn(async () => ({ ok, json: async () => body })) as never
  }

  it('reads the demo flag and PIN', async () => {
    mockFetch({ maxItemsPerOrder: 5, demo: true, demoPin: '123456' })
    const c = await loadAppConfig()
    expect(c).toEqual({ maxItemsPerOrder: 5, demo: true, demoPin: '123456' })
  })

  it('is not a demo when the field is absent', async () => {
    mockFetch({ maxItemsPerOrder: null })
    expect((await loadAppConfig()).demo).toBe(false)
  })

  it.each([1, 'true', 'yes', null, 0])('only treats a real boolean true as a demo, not %j', async v => {
    mockFetch({ demo: v })
    expect((await loadAppConfig()).demo).toBe(false)
  })

  it('is not a demo when the request fails', async () => {
    // An unreachable config must never turn a campus instance into a demo.
    globalThis.fetch = vi.fn(async () => {
      throw new Error('offline')
    }) as never
    const c = await loadAppConfig()
    expect(c.demo).toBe(false)
    expect(c.demoPin).toBeNull()
  })

  it('is not a demo when the response is not ok', async () => {
    mockFetch({ demo: true }, false)
    expect((await loadAppConfig()).demo).toBe(false)
  })

  it('ignores an empty PIN', async () => {
    mockFetch({ demo: true, demoPin: '' })
    expect((await loadAppConfig()).demoPin).toBeNull()
  })

  it('fetches once and shares the result', async () => {
    mockFetch({ demo: true, demoPin: '1234' })
    await Promise.all([loadAppConfig(), loadAppConfig(), loadAppConfig()])
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
})
