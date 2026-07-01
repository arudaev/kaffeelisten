import { useRef } from 'react'

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  /** Number of boxes / max digits. */
  length?: number
  /** Show the digits instead of masking them (used for the reset code). */
  reveal?: boolean
  /** Error styling (red boxes). */
  invalid?: boolean
  autoFocus?: boolean
  ariaLabel?: string
}

/**
 * Segmented numeric PIN entry — renders `length` boxes with a single invisible
 * input on top capturing the digits. Non-digits are stripped; input is capped
 * at `length`. Masks entries with a dot unless `reveal` is set.
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

  return (
    <div className="relative">
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, length))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex gap-2" aria-hidden="true">
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length
          const active = i === value.length && !invalid
          return (
            <div
              key={i}
              className={[
                'flex-1 h-[52px] rounded-lg flex items-center justify-center text-lg font-semibold transition-colors',
                invalid
                  ? 'border-[1.5px] border-error bg-error-subtle text-error'
                  : active
                  ? 'border-2 border-accent bg-surface text-fg'
                  : 'border-[1.5px] border-border bg-surface-2 text-fg',
              ].join(' ')}
            >
              {filled
                ? reveal
                  ? value[i]
                  : <span className={['w-2.5 h-2.5 rounded-full', invalid ? 'bg-error' : 'bg-fg'].join(' ')} />
                : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
