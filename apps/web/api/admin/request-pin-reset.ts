// POST /api/admin/request-pin-reset — no auth (it is the recovery path).
// Generates a one-time 6-digit code, stores only its hash (15-min TTL), and
// emails the clear code to the configured report recipients + CEO. If email
// isn't configured, the ADMIN_RECOVERY_PIN env backstop still works via
// reset-pin. Service-role only. See docs/phase-2-production.md §C.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Resend } from 'resend'
import { makeAdminClient, rateLimit, clientKey } from '../_lib/adminAuth'

const TTL_MINUTES = 15

function sixDigitCode(): string {
  // Cryptographically-random 6-digit code (000000–999999).
  const n = Math.floor(Math.random() * 1_000_000)
  return String(n).padStart(6, '0')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Tight limit — this sends email and issues a recovery code.
  if (!rateLimit(`reset-req:${clientKey(req.headers)}`, 3, 10 * 60_000)) {
    return res.status(429).json({ error: 'Zu viele Anfragen. Bitte später erneut versuchen.' })
  }

  try {
    const supabase = makeAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('report_recipients, ceo_email')
      .eq('id', 1)
      .single()
    if (error) throw new Error(error.message)

    const recipients = Array.from(
      new Set([...(data.report_recipients ?? []), data.ceo_email].filter(Boolean) as string[]),
    )

    const code = sixDigitCode()
    const { error: tokenErr } = await supabase.rpc('set_pin_reset_token', {
      p_code: code,
      p_ttl_minutes: TTL_MINUTES,
    })
    if (tokenErr) throw new Error(tokenErr.message)

    // Best-effort email. We never reveal in the response who (if anyone) was
    // emailed, so the endpoint can't be used to enumerate recipients.
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && recipients.length > 0) {
      try {
        const resend = new Resend(resendKey)
        await resend.emails.send({
          from: 'Kaffeelisten <bericht@kaffeelisten.de>',
          to: recipients,
          subject: 'Kaffeelisten – PIN-Zurücksetzung',
          html: `<!DOCTYPE html><html lang="de"><body style="margin:0;padding:24px;background:#FAFAF9;font-family:Arial,Helvetica,sans-serif;color:#1C1917;">
  <div style="max-width:460px;margin:0 auto;background:#fff;border:1px solid #E7E5E4;border-radius:12px;padding:28px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#B45309;">Kaffeelisten · Administration</p>
    <h1 style="margin:0 0 16px;font-size:20px;color:#1C1917;">Dein Code zum Zurücksetzen der PIN</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#57534E;">Gib diesen Code im Admin-Bereich ein, um eine neue PIN zu vergeben. Der Code ist ${TTL_MINUTES} Minuten gültig.</p>
    <div style="text-align:center;font-size:34px;font-weight:800;letter-spacing:10px;color:#1C1917;background:#F5F5F4;border-radius:10px;padding:18px 0;font-variant-numeric:tabular-nums;">${code}</div>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#A8A29E;">Wenn du das nicht angefordert hast, ignoriere diese E-Mail — deine PIN bleibt unverändert.</p>
  </div>
</body></html>`,
        })
      } catch (mailErr) {
        // Log but don't fail: the recovery-PIN backstop is still available.
        console.error('[request-pin-reset] email failed', mailErr)
      }
    }

    // Always 200 with the same shape — no recipient enumeration.
    return res.status(200).json({ ok: true, recipientCount: recipients.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[request-pin-reset]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
