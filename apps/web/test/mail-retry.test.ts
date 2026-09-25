import { describe, expect, it } from 'vitest'
import { retryRateLimited } from '../api/_lib/mail'

type Result = Awaited<ReturnType<typeof retryRateLimited>>
const ok = { data: { id: 'msg' }, error: null, headers: null } as Result
const limited = { data: null, error: { name: 'rate_limit_exceeded', message: 'Too many requests', statusCode: 429 }, headers: null } as unknown as Result
const quota = { data: null, error: { name: 'daily_quota_exceeded', message: 'Daily limit', statusCode: 429 }, headers: null } as unknown as Result

describe('retryRateLimited', () => {
  it('retries a rate-limited send with growing delays until it goes through', async () => {
    const results = [limited, limited, ok]
    const waits: number[] = []
    const r = await retryRateLimited(async () => results.shift()!, async ms => { waits.push(ms) })
    expect(r).toBe(ok)
    expect(waits).toEqual([1000, 2000])
  })

  it('gives up after three retries and returns the error', async () => {
    let calls = 0
    const r = await retryRateLimited(async () => { calls++; return limited }, async () => undefined)
    expect(calls).toBe(4)
    expect(r.error).toBeTruthy()
  })

  it('does not wait on a quota error', async () => {
    let calls = 0
    const r = await retryRateLimited(async () => { calls++; return quota }, async () => { throw new Error('should not wait') })
    expect(calls).toBe(1)
    expect((r.error as { name: string }).name).toBe('daily_quota_exceeded')
  })
})
