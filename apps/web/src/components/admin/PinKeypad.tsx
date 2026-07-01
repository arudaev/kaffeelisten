import { useEffect, useState } from 'react'

interface PinKeypadProps {
  onSubmit: (pin: string) => void
  error?: boolean
  onErrorAnimEnd?: () => void
  /** Expected PIN length. Phase 2 uses 6; defaults to 6. */
  length?: number
}

export default function PinKeypad({ onSubmit, error = false, onErrorAnimEnd, length = 6 }: PinKeypadProps) {
  const [pin, setPin] = useState('')
  const MAX = length

  const handleKey = (k: string) => {
    if (k === 'del') {
      setPin(p => p.slice(0, -1))
      return
    }
    if (k === 'ok') {
      if (pin.length === MAX) onSubmit(pin)
      return
    }
    setPin(p => (p.length >= MAX ? p : p + k))
  }

  useEffect(() => {
    if (pin.length === MAX) {
      const t = setTimeout(() => onSubmit(pin), 250)
      return () => clearTimeout(t)
    }
  }, [pin, onSubmit, MAX])

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
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-8 p-10 font-sans">
      {/* Title */}
      <div className="text-center">
        <p className="text-[12px] font-medium text-stone-500 uppercase tracking-[0.06em] mb-2">
          Kaffeelisten
        </p>
        <h1 className="text-[28px] font-bold text-stone-900 tracking-tight">Administration</h1>
        <p className="text-base text-stone-600 mt-1.5">PIN eingeben</p>
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
                  ? 'border-red-600 bg-red-600'
                  : filled
                  ? 'border-stone-900 bg-stone-900'
                  : 'border-stone-400 bg-transparent',
              ].join(' ')}
            />
          )
        })}
      </div>

      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => handleKey(String(n))}
            className="w-[76px] h-[68px] rounded-lg bg-white border border-stone-200 text-2xl font-semibold text-stone-900 hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            {n}
          </button>
        ))}
        {/* Bottom row: Löschen | 0 | OK */}
        <button
          type="button"
          onClick={() => handleKey('del')}
          className="w-[76px] h-[68px] rounded-lg bg-transparent border border-transparent text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
        >
          Löschen
        </button>
        <button
          type="button"
          onClick={() => handleKey('0')}
          className="w-[76px] h-[68px] rounded-lg bg-white border border-stone-200 text-2xl font-semibold text-stone-900 hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleKey('ok')}
          className="w-[76px] h-[68px] rounded-lg bg-amber-600 border border-transparent text-sm font-semibold text-white hover:bg-amber-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
        >
          OK
        </button>
      </div>
    </div>
  )
}
