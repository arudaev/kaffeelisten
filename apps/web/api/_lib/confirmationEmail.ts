// Sends a member the one-time "confirm your email" message and stores the
// hashed token. Called on member create and on work-email change (auto), and by
// the admin resend action. Failures are logged and swallowed so a mail outage
// never blocks the underlying member CRUD write — the admin can always resend.

import { randomBytes } from 'node:crypto'
import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'
import { buildEmailConfirmationHtml } from './reportHtml'
import { replyTo } from './mail'

const CONFIRM_TTL_MINUTES = 14 * 24 * 60 // 14 days
const FROM = 'Kaffeelisten <bericht@kaffeelisten.de>'

interface ConfirmTarget {
  id: string
  name: string
  work_email: string | null
}

/**
 * Issue a fresh confirmation token for `member` and email them the link.
 * `baseUrl` is the request origin (e.g. https://kaffeelisten.de) used to build
 * the /email-bestaetigen link. No-op (returns false) when the member has no
 * email or RESEND_API_KEY is unset.
 */
export async function sendMemberConfirmation(
  supabase: SupabaseClient<Database>,
  member: ConfirmTarget,
  baseUrl: string,
): Promise<boolean> {
  const email = member.work_email?.trim()
  if (!email) return false

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error('[confirmation] RESEND_API_KEY not set — skipping send')
    return false
  }

  // URL-safe token; only its bcrypt hash is stored server-side.
  const token = randomBytes(24).toString('base64url')
  const { error: tokenErr } = await supabase.rpc('set_member_email_token', {
    p_member_id: member.id,
    p_token: token,
    p_ttl_minutes: CONFIRM_TTL_MINUTES,
  })
  if (tokenErr) {
    console.error('[confirmation] set_member_email_token failed:', tokenErr.message)
    return false
  }

  const confirmUrl = `${baseUrl}/email-bestaetigen?mid=${encodeURIComponent(member.id)}&token=${encodeURIComponent(token)}`
  const reply = replyTo()

  try {
    const resend = new Resend(resendKey)
    const { error } = await resend.emails.send({
      from: FROM,
      to: [email],
      ...(reply ? { replyTo: reply } : {}),
      subject: 'Kaffeelisten – E-Mail bestätigen',
      html: buildEmailConfirmationHtml(member.name, confirmUrl),
    })
    if (error) throw new Error(error.message ?? JSON.stringify(error))
    return true
  } catch (err) {
    console.error('[confirmation] send failed for', email, err instanceof Error ? err.message : err)
    return false
  }
}
