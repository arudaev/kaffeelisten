// DEMO_MODE switches whole features off at the server, because the demo is
// public and must not be able to reach a real person or mutate a real month.
// Hiding things in the interface is a convenience, never the control.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEMO_DISABLED_ADMIN_ROUTES, DEMO_DISABLED_AUTH_ACTIONS, isDemoDeployment } from '../shared/environment'

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

describe('demoAdminPin', () => {
  it('is null unless DEMO_MODE is on, so a campus PIN is never taken from env', async () => {
    const { demoAdminPin } = await import('../shared/environment')
    expect(demoAdminPin(undefined, '123456')).toBeNull()
    expect(demoAdminPin('0', '123456')).toBeNull()
  })

  it('is null when the demo sets no PIN, so verification falls through to the database', async () => {
    const { demoAdminPin } = await import('../shared/environment')
    expect(demoAdminPin('1', undefined)).toBeNull()
    expect(demoAdminPin('1', '   ')).toBeNull()
  })

  it('trims, because a value pasted into a dashboard field often carries a space', async () => {
    const { demoAdminPin } = await import('../shared/environment')
    expect(demoAdminPin('1', ' 123456 ')).toBe('123456')
  })
})

describe('the admin PIN in demo mode', () => {
  const saved = { mode: process.env.DEMO_MODE, pin: process.env.DEMO_ADMIN_PIN, admin: process.env.ADMIN_PIN }

  beforeEach(() => {
    process.env.DEMO_MODE = '1'
    process.env.DEMO_ADMIN_PIN = '123456'
    // A different value, to prove the demo does not fall back to it.
    process.env.ADMIN_PIN = '999999'
    vi.resetModules()
  })

  afterEach(() => {
    for (const [k, v] of [['DEMO_MODE', saved.mode], ['DEMO_ADMIN_PIN', saved.pin], ['ADMIN_PIN', saved.admin]] as const) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    vi.resetModules()
  })

  it('accepts the published demo PIN', async () => {
    const { verifyAdminPin } = await import('../api/_lib/adminAuth')
    await expect(verifyAdminPin('123456')).resolves.toBe(true)
  })

  it('rejects anything else, including the instance ADMIN_PIN', async () => {
    const { verifyAdminPin } = await import('../api/_lib/adminAuth')
    await expect(verifyAdminPin('999999')).resolves.toBe(false)
    await expect(verifyAdminPin('000000')).resolves.toBe(false)
    await expect(verifyAdminPin('')).resolves.toBe(false)
  })

  it('needs no database, so the demo stays reachable across a data reset', async () => {
    // No VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY: makeAdminClient would
    // throw. The demo PIN is checked before any client is built.
    const url = process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.VITE_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    vi.resetModules()
    try {
      const { verifyAdminPin } = await import('../api/_lib/adminAuth')
      await expect(verifyAdminPin('123456')).resolves.toBe(true)
    } finally {
      if (url !== undefined) process.env.VITE_SUPABASE_URL = url
      if (key !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = key
    }
  })
})

describe('the auth router in demo mode', () => {
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
      setHeader() { return this },
      end() { return this },
    }
  }

  it.each([...DEMO_DISABLED_AUTH_ACTIONS])('refuses action=%s with 410, ahead of any handler', async action => {
    const { default: handler } = await import('../api/_lib/admin/auth')
    const res = makeRes()
    // No body and no session: a 410 here proves the switch sits before the
    // mailer and before set_admin_pin, not behind an auth check.
    await handler({ method: 'POST', query: { action }, headers: {}, body: {} } as never, res as never)
    expect(res.statusCode).toBe(410)
  })

  it('still serves verify, so the demo can be logged into', async () => {
    const { default: handler } = await import('../api/_lib/admin/auth')
    const res = makeRes()
    await handler({ method: 'POST', query: { action: 'verify' }, headers: {}, body: { pin: 'nope' } } as never, res as never)
    expect(res.statusCode).not.toBe(410)
  })

  it('still serves logout and meta', async () => {
    const { default: handler } = await import('../api/_lib/admin/auth')
    for (const [method, action] of [['POST', 'logout'], ['GET', 'meta']] as const) {
      const res = makeRes()
      await handler({ method, query: { action }, headers: {} } as never, res as never)
      expect(res.statusCode).not.toBe(410)
    }
  })

  it('serves every action when DEMO_MODE is off', async () => {
    delete process.env.DEMO_MODE
    vi.resetModules()
    const { default: handler } = await import('../api/_lib/admin/auth')
    for (const action of DEMO_DISABLED_AUTH_ACTIONS) {
      const res = makeRes()
      await handler({ method: 'POST', query: { action }, headers: {}, body: {} } as never, res as never)
      expect(res.statusCode).not.toBe(410)
    }
  })
})
