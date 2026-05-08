type Accent = 'amber' | 'stone'

interface SummaryCardProps {
  label: string
  metric: string | number
  sub?: string
  accent?: Accent
}

const accentBorder: Record<Accent, string> = {
  amber: 'border-l-amber-600',
  stone: 'border-l-stone-400',
}

export default function SummaryCard({ label, metric, sub, accent = 'amber' }: SummaryCardProps) {
  return (
    <div
      className={[
        'bg-white border border-stone-200 border-l-4 rounded-xl p-6 shadow-sm',
        'flex flex-col gap-1',
        accentBorder[accent],
      ].join(' ')}
    >
      <span className="text-[13px] text-stone-600">{label}</span>
      <span className="text-3xl font-bold text-stone-900 tracking-tight tabular-nums leading-none mt-0.5">
        {metric}
      </span>
      {sub && <span className="text-[13px] text-stone-600 mt-1">{sub}</span>}
    </div>
  )
}
