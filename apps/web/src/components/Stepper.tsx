interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export default function Stepper({ value, onChange, min = 1, max = 9 }: StepperProps) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))

  const btnClass = (disabled: boolean) =>
    [
      'w-14 h-14 flex items-center justify-center text-2xl font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
      disabled ? 'text-fg-subtle cursor-not-allowed' : 'text-fg hover:bg-surface-2 cursor-pointer',
    ].join(' ')

  return (
    <div className="inline-flex items-stretch border border-border rounded-xl bg-surface overflow-hidden">
      <button type="button" onClick={dec} disabled={value <= min} className={btnClass(value <= min)}>
        −
      </button>
      <div className="min-w-[64px] flex items-center justify-center text-[22px] font-semibold text-fg border-x border-border">
        {value}
      </div>
      <button type="button" onClick={inc} disabled={value >= max} className={btnClass(value >= max)}>
        +
      </button>
    </div>
  )
}
