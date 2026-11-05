// DEMO_MODE switches whole features off at the server, because the demo is
// public and must not be able to reach a real person or mutate a real month.
// Hiding things in the interface is a convenience, never the control.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEMO_DISABLED_ADMIN_ROUTES, isDemoDeployment } from '../shared/environment'

describe('isDemoDeployment', () => {
  it.each(['1', 'true', 'TRUE', 'yes', ' 1 '])('treats %j as on', v => {
    expect(isDemoDeployment(v)).toBe(true)
  })

  it.each([undefined, '', '  ', '0', 'false', 'no', 'off'])('treats %j as off', v => {
    expect(isDemoDeployment(v)).toBe(false)
  })

  it('is off when nothing is configured, so no instance becomes a demo by accident', () => {
    expect(isDemoDeployment(undefined)).toBe(false)
  })
})

describe('the mailer in demo mode', () => {
  const ENV = { DEMO_MODE: '1', VERCEL_ENV: 'production', MAIL_ALLOWLIST: 'itc1.de' }

  it('never sends, even to an allowlisted production recipient', async () => {
    const { makeMailer } = await import('../api/_lib/mail')
    const mailer = makeMailer('re_test', ENV as never)
    const r = await mailer.emails.send({
      from: 'bericht@kaffeelisten.de',
      to: ['boss@itc1.de'],
      subject: 'Bericht',
      html: '<p/>',
    })
    // The blocked id is how the rest of the pipeline recognises a suppressed send.
    expect(r.error).toBeNull()
    expect(String(r.data?.id)).toContain('blocked')
  })

  it('suppresses before the allowlist, not through it', async () => {
    // A production demo has no allowlist narrowing to rely on, so the stop has
    // to come first. An address that WOULD pass the allowlist still gets nowhere.
    const { makeMailer } = await import('../api/_lib/mail')
    const mailer = makeMailer('re_test', { ...ENV, MAIL_ALLOWLIST: 'itc1.de' } as never)
    const r = await mailer.emails.send({
      from: 'bericht@kaffeelisten.de',
      to: ['boss@itc1.de'],
      cc: ['ceo@itc1.de'],
      subject: 'Rechnung',
      html: '<p/>',
    })
    expect(String(r.data?.id)).toContain('blocked')
  })
})

describe('the admin router in demo mode', () => {
  const saved = process.env.DEMO_MODE

  beforeEach(() => {
    process.env.DEMO_MODE = '1'
    vi.resetModules()
  })

  afterEach(() => {
    if (saved === undefined) delete process.env.DEMO_MODE
    else process.env.DEMO_MODE = saved
    vi.resetModules()
  })

  function makeRes() {
    return {
      statusCode: 0,
      body: undefined as unknown,
      status(code: number) { this.statusCode = code; return this },
      json(payload: unknown) { this.body = payload; return this },
    }
  }

  it.each([...DEMO_DISABLED_ADMIN_ROUTES])('refuses /api/admin/%s with 410', async route => {
    const { default: handler } = await import('../api/admin/[...path]')
    const res = makeRes()
    await handler({ query: { path: [route] }, url: `/api/admin/${route}` } as never, res as never)
    expect(res.statusCode).toBe(410)
  })

  it.each(['data', 'theme', 'settings', 'export', 'preview-report', 'auth'])(
    'still serves /api/admin/%s, which the demo needs',
    async route => {
      const { default: handler } = await import('../api/admin/[...path]')
      const res = makeRes()
      await handler({ query: { path: [route] }, url: `/api/admin/${route}` } as never, res as never)
      expect(res.statusCode).not.toBe(410)
    },
  )

  it('serves every route when DEMO_MODE is off', async () => {
    delete process.env.DEMO_MODE
    vi.resetModules()
    const { default: handler } = await import('../api/admin/[...path]')
    for (const route of DEMO_DISABLED_ADMIN_ROUTES) {
      const res = makeRes()
      await handler({ query: { path: [route] }, url: `/api/admin/${route}` } as never, res as never)
      expect(res.statusCode).not.toBe(410)
    }
  })
})
