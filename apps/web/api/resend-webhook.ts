// Resend webhook: records what happened to each email after it was sent
// (delivered, delayed, bounced, complained, failed) in email_delivery_events
// (migration 040). The admin send dialog shows these as "zugestellt".
//
// Configure in Resend → Webhooks: endpoint https://<deployment>/api/resend-webhook,
// events email.delivered, email.delivery_delayed, email.bounced, email.complained,
// email.failed. Put the signing secret into RESEND_WEBHOOK_SECRET.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient } from './_lib/adminAuth'
import { verifyWebhook } from './_lib/webhookSignature'
import type { DeliveryEvent } from '../shared/reportProgress'

// The signature covers the exact bytes, so the body must not be parsed first.
export const config = { api: { bodyParser: false } }

const EVENT_TYPES: Record<string, DeliveryEvent> = {
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
}

async function readRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const header = (req: VercelRequest, name: string) => {
  const v = req.headers[name]
  return Array.isArray(v) ? v[0] : v
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return res.status(503).json({ error: 'RESEND_WEBHOOK_SECRET is not configured' })

  const body = await readRawBody(req)
  const valid = verifyWebhook(
    secret,
    { id: header(req, 'svix-id'), timestamp: header(req, 'svix-timestamp'), signature: header(req, 'svix-signature') },
    body,
  )
  if (!valid) return res.status(401).json({ error: 'Invalid signature' })

  let payload: { type?: unknown; created_at?: unknown; data?: { email_id?: unknown; created_at?: unknown } }
  try {
    payload = JSON.parse(body)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const event = typeof payload.type === 'string' ? EVENT_TYPES[payload.type] : undefined
  const messageId = payload.data?.email_id
  // Opens, clicks and "sent" are acknowledged but not stored.
  if (!event || typeof messageId !== 'string' || messageId.length === 0 || messageId.length > 200) {
    return res.status(200).json({ ok: true, ignored: true })
  }
  const when = typeof payload.created_at === 'string' && !Number.isNaN(Date.parse(payload.created_at))
    ? payload.created_at
    : new Date().toISOString()

  try {
    const { error } = await makeAdminClient()
      .from('email_delivery_events')
      .insert({ resend_message_id: messageId, event, occurred_at: when })
    if (error) throw new Error(error.message)
    return res.status(200).json({ ok: true })
  } catch (err) {
    // 500 makes Resend retry the delivery later.
    console.error('[resend-webhook]', err instanceof Error ? err.message : err)
    return res.status(500).json({ error: 'Could not record event' })
  }
}
