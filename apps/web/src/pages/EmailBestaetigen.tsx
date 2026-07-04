// Public landing page for the member email-confirmation link — route:
// /email-bestaetigen?mid=<id>&token=<token>. On mount it calls /api/confirm-email
// once and shows the outcome. No login, no data beyond the click.

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'

type Status = 'loading' | 'success' | 'error'

export default function EmailBestaetigen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [name, setName] = useState<string>('')
  const ran = useRef(false)

  useEffect(() => {
    // Confirm exactly once — the token is single-use, so a re-run (e.g. React
    // StrictMode double-invoke in dev) would report the second call as expired.
    if (ran.current) return
    ran.current = true

    const mid = params.get('mid') ?? ''
    const token = params.get('token') ?? ''
    if (!mid || !token) {
      setStatus('error')
      return
    }

    fetch(`/api/confirm-email?mid=${encodeURIComponent(mid)}&token=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = (await res.json().catch(() => null)) as { ok?: boolean; name?: string } | null
        if (res.ok && data?.ok) {
          setName(typeof data.name === 'string' ? data.name : '')
          setStatus('success')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [params])

  const firstName = name.trim().split(/\s+/)[0] || ''

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-8 p-6 sm:p-8 font-sans">
      {status === 'loading' && (
        <>
          <div className="w-16 h-16 rounded-full border-4 border-surface-2 border-t-accent animate-spin" />
          <p className="text-lg text-fg-muted">E-Mail wird bestätigt…</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="relative w-28 sm:w-36 h-28 sm:h-36 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-radial from-accent-subtle to-transparent" />
            <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-full bg-accent flex items-center justify-center text-white animate-pop">
              <Icon name="check" size={48} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl sm:text-4xl font-bold text-fg tracking-tight">E-Mail bestätigt.</p>
            <p className="text-lg text-fg-muted mt-2">
              {firstName ? `Vielen Dank, ${firstName}. ` : 'Vielen Dank. '}
              Deine Adresse ist jetzt verifiziert.
            </p>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-20 h-20 rounded-full bg-error-subtle flex items-center justify-center text-error">
            <Icon name="close" size={40} strokeWidth={2.5} />
          </div>
          <div className="text-center max-w-sm">
            <p className="text-3xl sm:text-4xl font-bold text-fg tracking-tight">Link ungültig.</p>
            <p className="text-lg text-fg-muted mt-2">
              Dieser Bestätigungslink ist ungültig oder abgelaufen. Bitte wende dich an die
              Campus-Verwaltung für einen neuen Link.
            </p>
          </div>
        </>
      )}

      {status !== 'loading' && (
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-[13px] text-fg-muted hover:text-fg transition-colors"
        >
          Zur Startseite
        </button>
      )}
    </div>
  )
}
