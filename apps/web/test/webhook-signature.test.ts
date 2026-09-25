import { describe, expect, it } from 'vitest'
import { signWebhook, verifyWebhook, WEBHOOK_TOLERANCE_SECONDS } from '../api/_lib/webhookSignature'

const secret = 'whsec_' + Buffer.from('kaffeelisten-test-secret').toString('base64')
const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'abc' } })
const now = 1_789_632_000
const headers = (signature: string, timestamp = String(now)) => ({ id: 'msg_1', timestamp, signature })

describe('Resend webhook signature', () => {
  it('accepts a correctly signed delivery, also among several signatures', () => {
    const sig = signWebhook(secret, 'msg_1', String(now), body)
    expect(verifyWebhook(secret, headers(`v1,${sig}`), body, now)).toBe(true)
    expect(verifyWebhook(secret, headers(`v1,bm9wZQ== v1,${sig}`), body, now)).toBe(true)
  })

  it('rejects a changed body, a wrong secret and missing headers', () => {
    const sig = signWebhook(secret, 'msg_1', String(now), body)
    expect(verifyWebhook(secret, headers(`v1,${sig}`), body.replace('abc', 'xyz'), now)).toBe(false)
    const other = 'whsec_' + Buffer.from('other').toString('base64')
    expect(verifyWebhook(other, headers(`v1,${sig}`), body, now)).toBe(false)
    expect(verifyWebhook(secret, { id: undefined, timestamp: String(now), signature: `v1,${sig}` }, body, now)).toBe(false)
  })

  it('rejects replays outside the tolerance window', () => {
    const old = String(now - WEBHOOK_TOLERANCE_SECONDS - 1)
    const sig = signWebhook(secret, 'msg_1', old, body)
    expect(verifyWebhook(secret, headers(`v1,${sig}`, old), body, now)).toBe(false)
  })
})
