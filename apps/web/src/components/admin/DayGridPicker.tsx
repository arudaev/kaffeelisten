interface DayGridPickerProps {
  /** Selected day of month (1–28), or null for "last day of month". */
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}

/**
 * Calendar-style day picker: a readable summary line, a 7-column grid of days
 * 1–28 with tactile rounded cells (hover lift, solid-amber selected state),
 * and a divided "Letzter Tag des Monats" row with a calendar glyph and a
 * confirmation check. Days are capped at 28 so the chosen day exists in every
 * month (matches the DB check constraint).
 */
export default function DayGridPicker({ value, onChange, disabled = false }: DayGridPickerProps) {
  const days = Array.from({ length: 28 }, (_, i) => i + 1)

  const cell = (selected: boolean) =>
    [
      'flex h-11 items-center justify-center rounded-xl border-[1.5px] text-[15px] font-medium tabular-nums transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      selected
        ? 'border-accent bg-accent text-white shadow-[0_3px_10px_rgb(var(--accent)/0.3)] hover:border-accent-hover hover:bg-accent-hover'
        : 'border-border bg-surface text-fg hover:-translate-y-px hover:border-border-strong hover:bg-surface-2',
    ].join(' ')

  const lastSelected = value === null

  return (
    <div
      className={['flex flex-col gap-3.5', disabled ? 'pointer-events-none opacity-45' : ''].join(' ')}
      aria-disabled={disabled}
    >
      <p className="text-[13px] text-fg-muted">
        {lastSelected ? (
          <>
            Versand am <b className="font-semibold text-fg">letzten Tag</b> des Monats
          </>
        ) : (
          <>
            Versand am <b className="font-semibold text-fg">{value}.</b> jedes Monats
          </>
        )}
      </p>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            aria-pressed={value === d}
            className={cell(value === d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="h-px bg-border" />

      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={lastSelected}
        className={[
          'flex h-12 w-full items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          lastSelected
            ? 'border-accent bg-accent-subtle text-accent-hover'
            : 'border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-2',
        ].join(' ')}
      >
        <svg
          className={['shrink-0 transition-colors', lastSelected ? 'text-accent' : 'text-fg-subtle'].join(' ')}
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4" />
          <path d="M15 15.5l-2.6 2.6-1.4-1.4" />
        </svg>
        <span>Letzter Tag des Monats</span>
        <span
          className={[
            'ml-auto flex text-accent transition-all',
            lastSelected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          ].join(' ')}
          aria-hidden="true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
      </button>
    </div>
  )
}
