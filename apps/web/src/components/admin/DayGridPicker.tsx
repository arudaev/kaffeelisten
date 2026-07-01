interface DayGridPickerProps {
  /** Selected day of month (1–28), or null for "last day of month". */
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}

/**
 * Calendar-style day picker: a 7-column grid of days 1–28 plus a "Letzter Tag
 * des Monats" option. Days are capped at 28 so the chosen day exists in every
 * month (matches the DB check constraint).
 */
export default function DayGridPicker({ value, onChange, disabled = false }: DayGridPickerProps) {
  const days = Array.from({ length: 28 }, (_, i) => i + 1)

  const cell = (selected: boolean) =>
    [
      'h-9 rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600',
      selected
        ? 'bg-amber-600 text-white border border-transparent'
        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50',
    ].join(' ')

  return (
    <div
      className={['flex flex-col gap-2', disabled ? 'opacity-40 pointer-events-none' : ''].join(' ')}
      aria-disabled={disabled}
    >
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
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={[cell(value === null), 'w-full'].join(' ')}
      >
        Letzter Tag des Monats
      </button>
    </div>
  )
}
