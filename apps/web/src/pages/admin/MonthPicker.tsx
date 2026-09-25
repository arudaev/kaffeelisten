import { monthLabel } from '../../lib/dates'

interface Props {
  value: string
  months: string[]
  onChange: (month: string) => void
}

/**
 * Month selection for the live-data pages. Visible at every width — the previous
 * selector was hidden below the md breakpoint, so on a phone the month could not
 * be changed at all.
 */
export function MonthPicker({ value, months, onChange }: Props) {
  const options = months.includes(value) ? months : [value, ...months]
  return (
    <select
      aria-label="Monat wählen"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="h-9 max-w-[11rem] px-3 bg-surface border border-border rounded-md text-sm font-medium text-fg hover:bg-surface-2 transition-colors focus:border-accent focus:ring-1 focus:ring-accent outline-none cursor-pointer"
    >
      {options.map(m => (
        <option key={m} value={m}>{monthLabel(m)}</option>
      ))}
    </select>
  )
}
