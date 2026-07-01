interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel?: string
  size?: 'sm' | 'md'
}

/**
 * A compact segmented control (radio-group semantics). Reused for the theme mode
 * switcher and other few-option choices. Themed via semantic tokens.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: SegmentedControlProps<T>) {
  const pad = size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3 text-sm'
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-lg bg-surface-2 border border-border p-0.5"
    >
      {options.map(opt => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={[
              pad,
              'rounded-md font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              selected
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg',
            ].join(' ')}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
