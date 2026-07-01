// Admin PIN entry + self-service recovery.
//
// PIN is validated server-side via /api/admin/verify-pin. After too many failed
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
    fetch('/api/admin/pin-meta')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data && typeof data.pin_length === 'number') setPinLength(data.pin_length)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const enter = (pin: string) => {
    sessionStorage.setItem('adminSession', 'true')
    sessionStorage.setItem('adminPin', pin)
    navigate('/admin/dashboard')
  }

  const handleSubmit = async (pin: string) => {
    setError(false)
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (res.ok) {
        enter(pin)
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
      await fetch('/api/admin/request-pin-reset', {
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
      const res = await fetch('/api/admin/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), newPin }),
      })
      if (res.ok) {
        enter(newPin)
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
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        <div className="text-center">
          <p className="text-[12px] font-medium text-stone-500 uppercase tracking-[0.06em] mb-2">Kaffeelisten</p>
          <h1 className="text-[26px] font-bold text-stone-900 tracking-tight">PIN zurücksetzen</h1>
        </div>

        {lockedOut && (
          <div className="flex gap-3 items-start bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <span className="flex-none w-5 h-5 rounded-full bg-amber-600 text-white text-[13px] font-bold leading-5 text-center">!</span>
            <p className="text-sm font-medium text-amber-700 leading-relaxed">
              Zu viele Fehlversuche. Setze die PIN über deine hinterlegte Admin-E-Mail zurück.
            </p>
          </div>
        )}

        {view === 'email' ? (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <p className="text-sm text-stone-600 leading-relaxed">
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
              className="text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors self-center"
            >
              Zurück zur PIN-Eingabe
            </button>
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <p className="text-sm text-stone-600 leading-relaxed">
              Wir haben — falls die Adresse hinterlegt ist — einen Code an <strong className="text-stone-900">{email.trim()}</strong> gesendet.
              Gib ihn ein und wähle eine neue {pinLength}-stellige PIN.
            </p>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Einmaliger Code</span>
              <PinInput value={code} onChange={setCode} length={pinLength} reveal autoFocus ariaLabel="Einmaliger Code" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Neue PIN</span>
              <PinInput value={newPin} onChange={setNewPin} length={pinLength} ariaLabel="Neue PIN" />
            </div>
            {resetError && <p className="text-[13px] text-red-600">{resetError}</p>}
            <p className="text-xs text-stone-400 leading-relaxed">
              Kein Zugriff auf die E-Mail? Der Notfall-Code aus der Serverkonfiguration funktioniert hier ebenfalls.
            </p>
            <AdminButton variant="primary" onClick={submitReset} disabled={resetting}>
              {resetting ? 'Wird gespeichert…' : 'Neue PIN speichern & anmelden'}
            </AdminButton>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setView('email')}
                className="text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={requestCode}
                disabled={sending}
                className="text-sm font-medium text-stone-500 hover:text-amber-700 transition-colors disabled:opacity-50"
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
