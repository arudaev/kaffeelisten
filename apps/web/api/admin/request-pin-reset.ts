// POST /api/admin/request-pin-reset — { email }
// Recovery path reachable from the /admin login page (no auth — you're locked
// out). The caller enters their admin email; if it is on the admin list, a
// one-time 6-digit code (15-min TTL, hash stored) is emailed to THAT address
// only. The response is always generic so the endpoint can't enumerate admins.
// The emailed code is used with reset-pin to set a new PIN. Service-role only.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomInt } from 'node:crypto'
import { Resend } from 'resend'
import { makeAdminClient, consumeRateLimit, clientKey } from '../_lib/adminAuth'

const TTL_MINUTES = 15

// Cryptographically-secure 6-digit code (Math.random is not suitable for a
// security token — it's predictable and low-entropy).
function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Tight limit — this sends email and issues a recovery code.
  if (!(await consumeRateLimit(`reset-req:${clientKey(req.headers)}`, { max: 5, windowSecs: 600, lockSecs: 900 }))) {
    return res.status(429).json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' })
  }

  const { email } = (req.body ?? {}) as { email?: string }
  const requested = typeof email === 'string' ? email.trim().toLowerCase() : ''

  try {
    const supabase = makeAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('report_recipients, ceo_email')
      .eq('id', 1)
      .single()
    if (error) throw new Error(error.message)

    // The admin list authorised to recover access: every configured report
    // recipient, every server admin from ADMIN_EMAIL, and the CEO. ADMIN_EMAIL
    // is always included here even when custom report recipients exist because
    // server admins must not lose their recovery path when Settings is changed.
    const dbRecipients = (data.report_recipients ?? []).filter(Boolean)
    const serverAdmins = (process.env.ADMIN_EMAIL ?? '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)
    const admins = Array.from(
      new Set([...dbRecipients, ...serverAdmins, data.ceo_email].filter(Boolean) as string[]),
    )

    // Match case-insensitively but send to the stored casing.
    const match = requested ? admins.find(a => a.toLowerCase() === requested) : undefined

    // Only issue + email a code when the address is a known admin. On no match we
    // do nothing (no token rotation) but still return the generic success below.
    if (match) {
      const code = sixDigitCode()
      const { error: tokenErr } = await supabase.rpc('set_pin_reset_token', {
        p_code: code,
        p_ttl_minutes: TTL_MINUTES,
      })
      if (tokenErr) throw new Error(tokenErr.message)

      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        try {
          const resend = new Resend(resendKey)
          await resend.emails.send({
            from: 'Kaffeelisten <bericht@kaffeelisten.de>',
            to: [match],
            subject: 'Kaffeelisten – PIN zurücksetzen',
            html: `<!DOCTYPE html><html lang="de"><body style="margin:0;padding:24px;background:#FAFAF9;font-family:Arial,Helvetica,sans-serif;color:#1C1917;">
  <div style="max-width:460px;margin:0 auto;background:#fff;border:1px solid #E7E5E4;border-radius:12px;padding:28px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#B45309;">Kaffeelisten · Administration</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#1C1917;">Dein Code zum Zurücksetzen der PIN</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#57534E;">Du hast auf der Admin-Anmeldeseite eine PIN-Zurücksetzung angefordert. Gib diesen Code dort ein und <strong style="color:#1C1917;">lege anschließend sofort eine neue PIN fest</strong> — aus Sicherheitsgründen ist der Code danach ungültig. Er läuft in ${TTL_MINUTES} Minuten ab.</p>
    <div style="text-align:center;font-size:34px;font-weight:800;letter-spacing:10px;color:#1C1917;background:#F5F5F4;border-radius:10px;padding:18px 0;font-variant-numeric:tabular-nums;">${code}</div>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#A8A29E;">Wenn du das nicht angefordert hast, ignoriere diese E-Mail — deine PIN bleibt unverändert.</p>
  </div>
</body></html>`,
          })
        } catch (mailErr) {
          console.error('[request-pin-reset] email failed', mailErr)
        }
      }
    }

    // Always the same generic response — no admin enumeration.
    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[request-pin-reset]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
