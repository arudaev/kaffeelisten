// Shared mail helpers.

import { Resend } from 'resend'
import { filterRecipients, isExactlyAllowed, isProductionDeployment, subjectFor } from '../../shared/environment'
import { BLOCKED_MESSAGE_ID } from '../../shared/reportProgress'

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

const RATE_LIMIT_DELAYS_MS = [1000, 2000, 4000]

/**
 * Resend allows 10 requests per second per team. A monthly run sends one email
 * at a time, but a re-send or a second tab can push past that; a 429 used to
 * count the document as failed. Retry it with backoff — the idempotency key on
 * every send makes a retry safe. Quota errors (daily/monthly limit reached) are
 * not retried: waiting seconds does not help.
 */
export async function retryRateLimited(
  attempt: () => Promise<SendResult>,
  sleep: (ms: number) => Promise<void> = ms => new Promise(r => setTimeout(r, ms)),
): Promise<SendResult> {
  let result = await attempt()
  for (const delay of RATE_LIMIT_DELAYS_MS) {
    const err = result.error as { name?: string; statusCode?: number | null } | null
    // Resend answers 429 for both; only the rate limit clears within seconds.
    const rateLimited = err?.name === 'rate_limit_exceeded' || (err?.statusCode === 429 && !/quota/.test(err.name ?? ''))
    if (!rateLimited) return result
    console.warn(`[mail] rate limited by Resend, retrying in ${delay} ms`)
    await sleep(delay)
    result = await attempt()
  }
  return result
}

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
      return { data: { id: BLOCKED_MESSAGE_ID }, error: null, headers: null } as SendResult
    }
    // MAIL_SINK (non-production only): mail for domain-allowed test addresses
    // (example.com) goes to one test inbox such as Resend's delivered@resend.dev,
    // because those addresses would bounce and hurt the sending domain's
    // reputation. Addresses the allowlist names exactly are real test inboxes and
    // receive the email themselves.
    const sink = !isProductionDeployment(env.VERCEL_ENV) ? env.MAIL_SINK?.trim() : undefined
    const direct = (xs: string[]) => (sink ? xs.filter(x => isExactlyAllowed(x, env.MAIL_ALLOWLIST)) : xs)
    const sunk = sink ? [...r.to, ...r.cc, ...r.bcc].filter(x => !isExactlyAllowed(x, env.MAIL_ALLOWLIST)) : []
    const to = [...direct(r.to), ...(sunk.length ? [sink!] : [])]
    const cc = direct(r.cc)
    const bcc = direct(r.bcc)
    const subject = payload.subject === undefined
      ? undefined
      : subjectFor(sunk.length ? `${payload.subject} (an: ${sunk.join(', ')})` : payload.subject, env.VERCEL_ENV)
    const guarded = {
      ...payload,
      to: to.length ? to : [sink!],
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      ...(subject !== undefined ? { subject } : {}),
    } as SendArgs[0]
    return retryRateLimited(() => send(guarded, options))
  }
  return resend
}
