import { afterEach, describe, expect, it, vi } from 'vitest'

const SECRET = 'unit-test-secret'
process.env.ADMIN_SESSION_SECRET = SECRET

import { issueSessionCookie, verifySession, clearSessionCookie } from '../api/_lib/adminAuth'

const tokenFrom = (setCookie: string) => setCookie.split(';')[0].split('=').slice(1).join('=')
const headersWith = (token: string) => ({ cookie: `kl_admin=${token}` })

afterEach(() => {
  vi.useRealTimers()
})

describe('admin session cookie', () => {
  it('round-trips a freshly issued cookie', () => {
    const token = tokenFrom(issueSessionCookie())
    expect(verifySession(headersWith(token), SECRET)).toBe(true)
  })

  it('sets HttpOnly, Secure and SameSite=Strict attributes', () => {
    const cookie = issueSessionCookie()
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/Secure/)
    expect(cookie).toMatch(/SameSite=Strict/)
  })

  it('rejects a tampered token', () => {
    const token = tokenFrom(issueSessionCookie())
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')
    expect(verifySession(headersWith(tampered), SECRET)).toBe(false)
  })

  it('rejects a valid token under a different secret', () => {
    const token = tokenFrom(issueSessionCookie())
    expect(verifySession(headersWith(token), 'other-secret')).toBe(false)
  })

  it('rejects a request with no session cookie', () => {
    expect(verifySession({}, SECRET)).toBe(false)
    expect(verifySession({ cookie: 'other=1' }, SECRET)).toBe(false)
  })

  it('rejects an expired token', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-03T00:00:00Z'))
    const token = tokenFrom(issueSessionCookie())
    vi.setSystemTime(new Date('2026-07-03T13:00:00Z')) // > 12h TTL later
    expect(verifySession(headersWith(token), SECRET)).toBe(false)
  })

  it('clearSessionCookie expires the cookie', () => {
    expect(clearSessionCookie()).toMatch(/Max-Age=0/)
  })
})
