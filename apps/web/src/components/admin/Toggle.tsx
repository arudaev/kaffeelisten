interface ToggleProps {
  /** On/off state. */
  checked: boolean
  onChange: (checked: boolean) => void
  /** Optional label shown to the right of the switch. */
  label?: string
  disabled?: boolean
}

export default function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  const sw = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2',
        checked ? 'bg-amber-600' : 'bg-stone-300',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )

  if (!label) return sw

  return (
    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      {sw}
      <span className="text-sm text-stone-700">{label}</span>
    </label>
  )
}
