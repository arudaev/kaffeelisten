// Admin PIN entry + self-service recovery.
//
// PIN is validated server-side via /api/admin/auth?action=verify. After too many failed
// attempts the keypad locks and the recovery flow opens: the admin enters their
// email, a one-time code is sent to that address (if it's a known admin), and
// they set a new PIN with it — so a locked-out admin can always regain access
// even if they never received a broadcast PIN. Never expose ADMIN_PIN client-side.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinKeypad from '../components/admin/PinKeypad'
import PinInput from '../components/admin/PinInput'
import AdminField from '../components/admin/AdminField'
import AdminButton from '../components/admin/AdminButton'

type View = 'pin' | 'email' | 'code'

const MAX_ATTEMPTS = 5
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AdminLogin() {
  const navigate = useNavigate()
  const [pinLength, setPinLength] = useState(6)

  const [view, setView] = useState<View>('pin')
  const [error, setError] = useState(false)
  const attemptsRef = useRef(0)
  const [lockedOut, setLockedOut] = useState(false)

  // Recovery flow
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [sending, setSending] = useState(false)
  const [code, setCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/auth?action=meta')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data && typeof data.pin_length === 'number') setPinLength(data.pin_length)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // The server sets an HttpOnly session cookie on a successful verify/reset; the
  // clear PIN is never stored client-side. `adminSession` is a non-sensitive flag
  // used only for client-side route guarding (the cookie is the real auth).
  const enter = () => {
    sessionStorage.setItem('adminSession', 'true')
    navigate('/admin/dashboard')
  }

  const handleSubmit = async (pin: string) => {
    setError(false)
    try {
      const res = await fetch('/api/admin/auth?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (res.ok) {
        enter()
        return
      }
    } catch {
      /* fall through to error handling */
    }
    setError(true)
    attemptsRef.current += 1
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      setLockedOut(true)
      setView('email')
    }
  }

  const openRecovery = () => {
    setEmailError(''); setResetError(''); setView('email')
  }

  const requestCode = async () => {
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setEmailError('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    setSending(true)
    setEmailError('')
    try {
      await fetch('/api/admin/auth?action=request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
    } catch {
      /* generic — proceed regardless so we never reveal whether the email matched */
    } finally {
      setSending(false)
      setView('code')
    }
  }

  const submitReset = async () => {
    if (newPin.length !== pinLength) {
      setResetError(`Die neue PIN muss ${pinLength}-stellig sein.`)
      return
    }
    if (!code.trim()) {
      setResetError('Bitte den Code aus der E-Mail eingeben.')
      return
    }
    setResetting(true)
    setResetError('')
    try {
      const res = await fetch('/api/admin/auth?action=reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), newPin }),
      })
      if (res.ok) {
        enter()
      } else {
        const err = await res.json().catch(() => ({}))
        setResetError(err.error ?? 'Zurücksetzen fehlgeschlagen.')
      }
    } catch {
      setResetError('Zurücksetzen fehlgeschlagen.')
    } finally {
      setResetting(false)
    }
  }

  if (view === 'pin') {
    return (
      <PinKeypad
        onSubmit={handleSubmit}
        error={error}
        onErrorAnimEnd={() => setError(false)}
        length={pinLength}
        onForgot={openRecovery}
      />
    )
  }

  // Shared shell for the recovery steps
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        <div className="text-center">
          <p className="text-[12px] font-medium text-fg-muted uppercase tracking-[0.06em] mb-2">Kaffeelisten</p>
          <h1 className="text-[26px] font-bold text-fg tracking-tight">PIN zurücksetzen</h1>
        </div>

        {lockedOut && (
          <div className="flex gap-3 items-start bg-accent-subtle border border-accent rounded-lg px-4 py-3">
            <span className="flex-none w-5 h-5 rounded-full bg-accent text-white text-[13px] font-bold leading-5 text-center">!</span>
            <p className="text-sm font-medium text-accent leading-relaxed">
              Zu viele Fehlversuche. Setze die PIN über deine hinterlegte Admin-E-Mail zurück.
            </p>
          </div>
        )}

        {view === 'email' ? (
          <div className="bg-surface border border-border rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <p className="text-sm text-fg-muted leading-relaxed">
              Gib deine Admin-E-Mail ein. Wenn sie hinterlegt ist, senden wir dir einen einmaligen Code, mit dem du eine neue PIN vergeben kannst.
            </p>
            <AdminField
              type="email"
              label="Admin-E-Mail"
              placeholder="name@firma.de"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError('') }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); requestCode() } }}
              error={emailError || undefined}
              autoFocus
            />
            <AdminButton variant="primary" onClick={requestCode} disabled={sending}>
              {sending ? 'Code wird gesendet…' : 'Code senden'}
            </AdminButton>
            <button
              type="button"
              onClick={() => setView('pin')}
              className="text-sm font-medium text-fg-muted hover:text-fg transition-colors self-center"
            >
              Zurück zur PIN-Eingabe
            </button>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <p className="text-sm text-fg-muted leading-relaxed">
              Wir haben — falls die Adresse hinterlegt ist — einen Code an <strong className="text-fg">{email.trim()}</strong> gesendet.
              Gib ihn ein und wähle eine neue {pinLength}-stellige PIN.
            </p>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Einmaliger Code</span>
              <PinInput value={code} onChange={setCode} length={pinLength} reveal autoFocus ariaLabel="Einmaliger Code" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Neue PIN</span>
              <PinInput value={newPin} onChange={setNewPin} length={pinLength} ariaLabel="Neue PIN" />
            </div>
            {resetError && <p className="text-[13px] text-error">{resetError}</p>}
            <p className="text-xs text-fg-subtle leading-relaxed">
              Kein Zugriff auf die E-Mail? Der Notfall-Code aus der Serverkonfiguration funktioniert hier ebenfalls.
            </p>
            <AdminButton variant="primary" onClick={submitReset} disabled={resetting}>
              {resetting ? 'Wird gespeichert…' : 'Neue PIN speichern & anmelden'}
            </AdminButton>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView('email')}
                className="text-sm font-medium text-fg-muted hover:text-fg transition-colors"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={requestCode}
                disabled={sending}
                className="text-sm font-medium text-fg-muted hover:text-accent transition-colors disabled:opacity-50"
              >
                Code erneut senden
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
