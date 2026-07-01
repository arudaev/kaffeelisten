type Accent = 'amber' | 'stone'

interface SummaryCardProps {
  label: string
  metric: string | number
  sub?: string
  accent?: Accent
}

const accentBorder: Record<Accent, string> = {
  amber: 'border-l-accent',
  stone: 'border-l-fg-subtle',
}

export default function SummaryCard({ label, metric, sub, accent = 'amber' }: SummaryCardProps) {
  return (
    <div
      className={[
        'bg-surface border border-border border-l-4 rounded-xl p-6 shadow-sm',
        'flex flex-col gap-1',
        accentBorder[accent],
      ].join(' ')}
    >
      <span className="text-[13px] text-fg-muted">{label}</span>
      <span className="text-3xl font-bold text-fg tracking-tight tabular-nums leading-none mt-0.5">
        {metric}
      </span>
      {sub && <span className="text-[13px] text-fg-muted mt-1">{sub}</span>}
    </div>
  )
}
