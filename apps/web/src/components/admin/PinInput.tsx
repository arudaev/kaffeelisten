import { useEffect, useRef, useState } from 'react'

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  /** Number of boxes / max digits. */
  length?: number
  /** Show the digits instead of masking them (used for the reset code). */
  reveal?: boolean
  /** Error styling (red boxes) — a fresh error also replays the shake. */
  invalid?: boolean
  autoFocus?: boolean
  ariaLabel?: string
}

/**
 * Segmented numeric PIN entry — renders `length` boxes with a single invisible
 * input on top capturing the digits. Non-digits are stripped; input is capped
 * at `length`. The active slot shows a blinking amber caret, filled slots pop
 * in a masking dot (or the mono digit when `reveal` is set), and a new error
 * shakes the row.
 */
export default function PinInput({
  value,
  onChange,
  length = 6,
  reveal = false,
  invalid = false,
  autoFocus = false,
  ariaLabel,
}: PinInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const prevInvalid = useRef(invalid)

  useEffect(() => {
    if (invalid && !prevInvalid.current) setShakeKey(k => k + 1)
    prevInvalid.current = invalid
  }, [invalid])

  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        maxLength={length}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
      />
      <div
        key={shakeKey}
        className={['flex gap-2.5', invalid ? 'animate-shake' : ''].join(' ')}
        aria-hidden="true"
      >
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length
          const active = i === value.length && !invalid
          return (
            <div
              key={i}
              className={[
                'flex h-14 flex-1 items-center justify-center rounded-xl transition-all',
                invalid
                  ? 'border-[1.5px] border-error bg-error-subtle'
                  : active
                  ? 'border-2 border-accent bg-surface ring-2 ring-accent/25'
                  : filled
                  ? 'border-[1.5px] border-border-strong bg-surface'
                  : 'border-[1.5px] border-border bg-surface-2',
              ].join(' ')}
            >
              {filled ? (
                reveal ? (
                  <span
                    className={[
                      'animate-pop font-mono text-[22px] font-semibold',
                      invalid ? 'text-error' : 'text-fg',
                    ].join(' ')}
                  >
                    {value[i]}
                  </span>
                ) : (
                  <span
                    className={['h-2.5 w-2.5 animate-pop rounded-full', invalid ? 'bg-error' : 'bg-fg'].join(' ')}
                  />
                )
              ) : active ? (
                <span className="h-6 w-0.5 animate-blink rounded-sm bg-accent" />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
