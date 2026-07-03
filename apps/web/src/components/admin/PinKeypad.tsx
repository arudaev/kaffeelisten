import { useEffect, useRef, useState } from 'react'

interface PinKeypadProps {
  onSubmit: (pin: string) => void
  error?: boolean
  onErrorAnimEnd?: () => void
  /** Optional status message shown below the dots (e.g. a throttle notice). */
  notice?: string
  /** Expected PIN length. Phase 2 uses 6; defaults to 6. */
  length?: number
  /** When provided, renders a "PIN vergessen?" link that starts the reset flow. */
  onForgot?: () => void
}

export default function PinKeypad({ onSubmit, error = false, onErrorAnimEnd, notice, length = 6, onForgot }: PinKeypadProps) {
  const [pin, setPin] = useState('')
  const MAX = length

  // Guard against submitting the same full PIN more than once. Without this, the
  // OK button and the auto-submit effect (and effect re-runs while the pin stays
  // full during the error animation) each fire a request, burning rate-limit
  // attempts several-fold per entry. Reset once the pin drops below full again.
  const submittedRef = useRef(false)

  const submitOnce = (value: string) => {
    if (submittedRef.current) return
    submittedRef.current = true
    onSubmit(value)
  }

  const handleKey = (k: string) => {
    if (k === 'del') {
      setPin(p => p.slice(0, -1))
      return
    }
    if (k === 'ok') {
      if (pin.length === MAX) submitOnce(pin)
      return
    }
    setPin(p => (p.length >= MAX ? p : p + k))
  }

  useEffect(() => {
    if (pin.length < MAX) {
      submittedRef.current = false
      return
    }
    if (submittedRef.current) return
    const t = setTimeout(() => submitOnce(pin), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, MAX])

  // Reset pin after error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => {
        setPin('')
        onErrorAnimEnd?.()
      }, 800)
      return () => clearTimeout(t)
    }
  }, [error, onErrorAnimEnd])

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-8 p-10 font-sans">
      {/* Title */}
      <div className="text-center">
        <p className="text-[12px] font-medium text-fg-muted uppercase tracking-[0.06em] mb-2">
          Kaffeelisten
        </p>
        <h1 className="text-[28px] font-bold text-fg tracking-tight">Administration</h1>
        <p className="text-base text-fg-muted mt-1.5">PIN eingeben</p>
      </div>

      {/* Dots */}
      <div className={['flex gap-3', error ? 'animate-shake' : ''].join(' ')}>
        {Array.from({ length: MAX }).map((_, i) => {
          const filled = i < pin.length
          return (
            <div
              key={i}
              className={[
                'w-4 h-4 rounded-full border-2 transition-all duration-[120ms]',
                error
                  ? 'border-error bg-error'
                  : filled
                  ? 'border-fg bg-fg'
                  : 'border-fg-subtle bg-transparent',
              ].join(' ')}
            />
          )
        })}
      </div>

      {notice && (
        <p className="-mt-4 max-w-[280px] text-center text-sm font-medium text-accent leading-relaxed" role="status">
          {notice}
        </p>
      )}

      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => handleKey(String(n))}
            className="w-[76px] h-[68px] rounded-lg bg-surface border border-border text-2xl font-semibold text-fg hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {n}
          </button>
        ))}
        {/* Bottom row: Löschen | 0 | OK */}
        <button
          type="button"
          onClick={() => handleKey('del')}
          className="w-[76px] h-[68px] rounded-lg bg-transparent border border-transparent text-sm font-medium text-fg-muted hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Löschen
        </button>
        <button
          type="button"
          onClick={() => handleKey('0')}
          className="w-[76px] h-[68px] rounded-lg bg-surface border border-border text-2xl font-semibold text-fg hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleKey('ok')}
          className="w-[76px] h-[68px] rounded-lg bg-accent border border-transparent text-sm font-semibold text-white hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          OK
        </button>
      </div>

      {onForgot && (
        <button
          type="button"
          onClick={onForgot}
          className="text-sm font-medium text-fg-muted hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-2 py-1"
        >
          PIN vergessen?
        </button>
      )}
    </div>
  )
}
