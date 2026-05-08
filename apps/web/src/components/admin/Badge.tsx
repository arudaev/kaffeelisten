type BadgeKind = 'active' | 'inactive' | 'warn' | 'error'

interface BadgeProps {
  kind?: BadgeKind
  children: React.ReactNode
}

const kindClasses: Record<BadgeKind, string> = {
  active: 'bg-green-50 text-green-600',
  inactive: 'bg-stone-100 text-stone-400',
  warn: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-600',
}

export default function Badge({ kind = 'active', children }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded',
        kindClasses[kind],
      ].join(' ')}
    >
      {kind === 'active' && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  )
}
