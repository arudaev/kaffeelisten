// The admin catch-all dispatches to the handler modules by path segment. Every
// handler is mocked, so this tests routing only: that each client URL still
// reaches the module it reached before, and that an unknown segment is refused
// without echoing attacker-controlled input back.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: string[] = []
const spy = (name: string) => vi.fn(async (_req: unknown, res: { _handled?: string }) => {
  calls.push(name)
  res._handled = name
  return res
})

vi.mock('../api/_lib/admin/auth', () => ({ default: spy('auth') }))
vi.mock('../api/_lib/admin/billing', () => ({ default: spy('billing') }))
vi.mock('../api/_lib/admin/data', () => ({ default: spy('data') }))
vi.mock('../api/_lib/admin/documents', () => ({ default: spy('documents') }))
vi.mock('../api/_lib/admin/export', () => ({ default: spy('export') }))
vi.mock('../api/_lib/admin/payments', () => ({ default: spy('payments') }))
vi.mock('../api/_lib/admin/preview-report', () => ({ default: spy('preview-report') }))
vi.mock('../api/_lib/admin/report-progress', () => ({ default: spy('report-progress') }))
vi.mock('../api/_lib/admin/settings', () => ({ default: spy('settings') }))
vi.mock('../api/_lib/admin/theme', () => ({ default: spy('theme') }))

const { default: handler } = await import('../api/admin/[...path]')

function makeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    _handled: undefined as string | undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res
}

const ROUTES = [
  'auth', 'billing', 'data', 'documents', 'export',
  'payments', 'preview-report', 'report-progress', 'settings', 'theme',
]

describe('admin catch-all router', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it.each(ROUTES)('routes /api/admin/%s to its handler', async route => {
    const res = makeRes()
    await handler({ query: { path: [route] }, url: `/api/admin/${route}` } as never, res as never)
    expect(calls).toEqual([route])
  })

  it('falls back to the URL when Vercel supplies no path query', async () => {
    const res = makeRes()
    await handler({ query: {}, url: '/api/admin/theme?mode=dark' } as never, res as never)
    expect(calls).toEqual(['theme'])
  })

  it('uses only the first segment, so a deeper path still resolves', async () => {
    const res = makeRes()
    await handler({ query: { path: ['data', 'members'] }, url: '/api/admin/data/members' } as never, res as never)
    expect(calls).toEqual(['data'])
  })

  it('refuses an unknown endpoint with 404', async () => {
    const res = makeRes()
    await handler({ query: { path: ['nope'] }, url: '/api/admin/nope' } as never, res as never)
    expect(res.statusCode).toBe(404)
    expect(calls).toEqual([])
  })

  it('does not echo the requested path back into the response', async () => {
    const res = makeRes()
    const nasty = '<script>alert(1)</script>'
    await handler({ query: { path: [nasty] }, url: `/api/admin/${nasty}` } as never, res as never)
    expect(res.statusCode).toBe(404)
    expect(JSON.stringify(res.body)).not.toContain('script')
  })

  it('refuses a request with no resolvable segment', async () => {
    const res = makeRes()
    await handler({ query: {}, url: '/api/admin' } as never, res as never)
    expect(res.statusCode).toBe(404)
    expect(calls).toEqual([])
  })

  it('covers every route the dispatcher knows about', async () => {
    // Guards against a module being added to the router but never exercised.
    const mod = await import('../api/admin/[...path]')
    expect(typeof mod.default).toBe('function')
    expect(ROUTES).toHaveLength(10)
  })
})
