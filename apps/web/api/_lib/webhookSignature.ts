// Verifies a Resend webhook. Resend signs with Svix: the signed content is
// `${svix-id}.${svix-timestamp}.${raw body}`, HMAC-SHA256 with the base64 part of
// the `whsec_…` secret, sent as one or more space-separated `v1,<base64>` entries.

import { createHmac, timingSafeEqual } from 'node:crypto'

export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60

export interface SvixHeaders {
  id: string | undefined
  timestamp: string | undefined
  signature: string | undefined
}

export function signWebhook(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  return createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')
}

export function verifyWebhook(
  secret: string,
  headers: SvixHeaders,
  body: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false
  const ts = Number(timestamp)
  // Reject replays of old deliveries and clocks far in the future.
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > WEBHOOK_TOLERANCE_SECONDS) return false

  const expected = Buffer.from(signWebhook(secret, id, timestamp, body))
  return signature.split(' ').some(entry => {
    const [version, value] = entry.split(',')
    if (version !== 'v1' || !value) return false
    const given = Buffer.from(value)
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}
