// POST/GET /api/admin/auth?action=<action> — consolidated admin auth router.
//
// The Vercel Hobby plan caps a deployment at 12 Serverless Functions, and each
// file under api/ is one function. The PIN/session endpoints are small and
// closely related, so they are dispatched here from a single function keyed on
// the `action` query param instead of one file each:
//
//   action=verify        POST  { pin }                 → verify PIN, issue session cookie
//   action=change        POST  { currentPin, newPin }  → rotate PIN (session + current PIN required)
//   action=reset         POST  { code, newPin }        → set PIN via email code / recovery backstop
//   action=request-reset POST  { email }               → email a one-time reset code
//   action=meta          GET                           → public: expected PIN length
//   action=logout        POST                          → clear session cookie
//
// Splitting these back into separate files is fine once on a Pro plan; the
// client calls the same URLs either way (see apps/web/src/pages/admin/*).

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomInt } from 'node:crypto'
import { Resend } from 'resend'
import {
  makeAdminClient,
  verifyAdminPin,
  isValidPinFormat,
  consumeRateLimit,
  resetRateLimit,
  clientKey,
  requireAdmin,
  issueSessionCookie,
  clearSessionCookie,
} from '../_lib/adminAuth'

const RESET_TTL_MINUTES = 15

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = typeof req.query.action === 'string' ? req.query.action : ''

  switch (action) {
    case 'verify':
      return verify(req, res)
    case 'change':
      return change(req, res)
    case 'reset':
      return reset(req, res)
    case 'request-reset':
      return requestReset(req, res)
    case 'meta':
      return meta(req, res)
    case 'logout':
      return logout(req, res)
    default:
      return res.status(400).json({ error: 'Unknown action' })
  }
}

// POST verify — validates the PIN and, on success, issues the session cookie.
//
// The PIN is checked BEFORE the rate limit is consumed: the durable limiter only
// counts *failed* attempts, and a correct PIN always succeeds (and clears the
// counter). This is what keeps a brute-force lock from also locking out the real
// admin — a locked key blocks further wrong guesses, never the right one.
async function verify(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const rlKey = `verify:${clientKey(req.headers)}`
  const { pin } = (req.body ?? {}) as { pin?: string }

  try {
    if (await verifyAdminPin(pin)) {
      await resetRateLimit(rlKey)
      res.setHeader('Set-Cookie', issueSessionCookie())
      return res.status(200).json({ ok: true })
    }
    // Wrong PIN — count it. consumeRateLimit returns false once this attempt
    // trips (or is already past) the cap; surface that as 429 so the client can
    // show a throttle message instead of another "wrong PIN".
    const allowed = await consumeRateLimit(rlKey)
    if (!allowed) {
      return res.status(429).json({ error: 'Zu viele Versuche. Bitte einige Minuten warten.' })
    }
    return res.status(403).json({ error: 'Ungültige PIN' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[auth:verify]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}

// POST change — rotates the PIN. Requires an active session AND the current PIN,
// so a stolen session alone can't change the credential.
async function change(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await requireAdmin(req.headers)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const rlKey = `change:${clientKey(req.headers)}`
  const { currentPin, newPin } = (req.body ?? {}) as { currentPin?: string; newPin?: string }

  try {
    // Verify the current PIN first, throttling only failed attempts (see verify()).
    if (!(await verifyAdminPin(currentPin))) {
      if (!(await consumeRateLimit(rlKey))) {
        return res.status(429).json({ error: 'Zu viele Versuche. Bitte einige Minuten warten.' })
      }
      return res.status(403).json({ error: 'Aktuelle PIN ist falsch.' })
    }
    await resetRateLimit(rlKey)

    const supabase = makeAdminClient()
    const { data, error: readErr } = await supabase
      .from('app_settings')
      .select('pin_length')
      .eq('id', 1)
      .single()
    if (readErr) throw new Error(readErr.message)

    if (typeof newPin !== 'string' || !isValidPinFormat(newPin, data.pin_length)) {
      return res
        .status(400)
        .json({ error: `Neue PIN muss ${data.pin_length}-stellig sein (nur Ziffern).` })
    }

    const { error } = await supabase.rpc('set_admin_pin', { p_pin: newPin })
    if (error) throw new Error(error.message)

    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[auth:change]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}

// POST reset — `code` is either the one-time email code (verified + consumed in
// the DB) or the ADMIN_RECOVERY_PIN env backstop. On success stores the new PIN
// and issues a session cookie. See docs/phase-2-production.md §C.
async function reset(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Durable limit — throttles brute force of the 6-digit reset code AND the
  // ADMIN_RECOVERY_PIN backstop across instances.
  const rlKey = `reset:${clientKey(req.headers)}`
  if (!(await consumeRateLimit(rlKey))) {
    return res.status(429).json({ error: 'Zu viele Versuche. Bitte später erneut versuchen.' })
  }

  const { code, newPin } = (req.body ?? {}) as { code?: string; newPin?: string }

  try {
    const supabase = makeAdminClient()
    const { data, error: readErr } = await supabase
      .from('app_settings')
      .select('pin_length')
      .eq('id', 1)
      .single()
    if (readErr) throw new Error(readErr.message)

    if (typeof newPin !== 'string' || !isValidPinFormat(newPin, data.pin_length)) {
      return res
        .status(400)
        .json({ error: `Neue PIN muss ${data.pin_length}-stellig sein (nur Ziffern).` })
    }
    if (typeof code !== 'string' || code.length === 0) {
      return res.status(400).json({ error: 'Code fehlt.' })
    }

    // Env recovery backstop — bypasses the email code when email is down.
    const recoveryPin = process.env.ADMIN_RECOVERY_PIN
    if (recoveryPin && code === recoveryPin) {
      const { error } = await supabase.rpc('set_admin_pin', { p_pin: newPin })
      if (error) throw new Error(error.message)
      await resetRateLimit(rlKey)
      res.setHeader('Set-Cookie', issueSessionCookie())
      return res.status(200).json({ ok: true })
    }

    // Otherwise verify + consume the one-time email code atomically.
    const { data: ok, error } = await supabase.rpc('consume_pin_reset', {
      p_code: code,
      p_new_pin: newPin,
    })
    if (error) throw new Error(error.message)

    if (ok !== true) {
      return res.status(403).json({ error: 'Code ungültig oder abgelaufen.' })
    }
    await resetRateLimit(rlKey)
    res.setHeader('Set-Cookie', issueSessionCookie())
    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[auth:reset]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}

// Cryptographically-secure 6-digit code (Math.random is not suitable for a
// security token — it's predictable and low-entropy).
function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

// POST request-reset — recovery path reachable from the /admin login page (no
// auth — you're locked out). If the address is a known admin, a one-time 6-digit
// code (15-min TTL, hash stored) is emailed to THAT address only. The response
// is always generic so the endpoint can't enumerate admins.
async function requestReset(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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
        p_ttl_minutes: RESET_TTL_MINUTES,
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
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#57534E;">Du hast auf der Admin-Anmeldeseite eine PIN-Zurücksetzung angefordert. Gib diesen Code dort ein und <strong style="color:#1C1917;">lege anschließend sofort eine neue PIN fest</strong> — aus Sicherheitsgründen ist der Code danach ungültig. Er läuft in ${RESET_TTL_MINUTES} Minuten ab.</p>
    <div style="text-align:center;font-size:34px;font-weight:800;letter-spacing:10px;color:#1C1917;background:#F5F5F4;border-radius:10px;padding:18px 0;font-variant-numeric:tabular-nums;">${code}</div>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#A8A29E;">Wenn du das nicht angefordert hast, ignoriere diese E-Mail — deine PIN bleibt unverändert.</p>
  </div>
</body></html>`,
          })
        } catch (mailErr) {
          console.error('[auth:request-reset] email failed', mailErr)
        }
      }
    }

    // Always the same generic response — no admin enumeration.
    return res.status(200).json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[auth:request-reset]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}

// GET meta — public, returns only the expected PIN length so the login keypad
// renders the right number of dots. Never returns any hash or token.
async function meta(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const supabase = makeAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('pin_length')
      .eq('id', 1)
      .single()
    if (error) throw new Error(error.message)
    return res.status(200).json({ pin_length: data.pin_length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[auth:meta]', message)
    // Fall back to the default so login still works if settings are unreachable.
    return res.status(200).json({ pin_length: 6 })
  }
}

// POST logout — clears the admin session cookie. No auth required: clearing an
// already-invalid cookie is harmless.
function logout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  res.setHeader('Set-Cookie', clearSessionCookie())
  return res.status(200).json({ ok: true })
}
