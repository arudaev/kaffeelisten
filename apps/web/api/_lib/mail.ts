// Shared mail helpers.

import { Resend } from 'resend'
import { filterRecipients, subjectFor } from './environment'

/**
 * Reply-to for all outgoing mail. A from-address (bericht@kaffeelisten.de) that
 * bounces replies hurts deliverability and trust, so every send points replies
 * at the first configured admin address. Returns undefined when ADMIN_EMAIL is
 * unset, in which case callers simply omit reply_to.
 */
export function replyTo(): string | undefined {
  const first = process.env.ADMIN_EMAIL?.split(',')[0]?.trim()
  return first || undefined
}


type SendArgs = Parameters<Resend['emails']['send']>
type SendResult = Awaited<ReturnType<Resend['emails']['send']>>

/**
 * The only way the API creates a Resend client. Outside production (VERCEL_ENV)
 * recipients not on MAIL_ALLOWLIST (default example.com) are dropped and the
 * subject is prefixed "[STAGING]", so a preview can never email a real person.
 * When every recipient is dropped the send is skipped and reported as delivered
 * with a recognisable id, so staging runs complete end to end.
 */
export function makeMailer(apiKey: string, env: NodeJS.ProcessEnv = process.env): Resend {
  const resend = new Resend(apiKey)
  const send = resend.emails.send.bind(resend.emails)
  resend.emails.send = async (...args: SendArgs): Promise<SendResult> => {
    const [payload, options] = args
    const r = filterRecipients(payload, env.VERCEL_ENV, env.MAIL_ALLOWLIST)
    if (r.blocked.length) console.warn('[mail-guard] blocked outside production:', r.blocked.join(', '))
    if (r.to.length === 0) {
      return { data: { id: 'blocked-by-mail-guard' }, error: null, headers: null } as SendResult
    }
    const guarded = {
      ...payload,
      to: r.to,
      ...(r.cc.length ? { cc: r.cc } : { cc: undefined }),
      ...(r.bcc.length ? { bcc: r.bcc } : { bcc: undefined }),
      ...(payload.subject !== undefined ? { subject: subjectFor(payload.subject, env.VERCEL_ENV) } : {}),
    } as SendArgs[0]
    return send(guarded, options)
  }
  return resend
}
