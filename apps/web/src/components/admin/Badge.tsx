type BadgeKind = 'active' | 'inactive' | 'warn' | 'error' | 'verified' | 'pending'

interface BadgeProps {
  kind?: BadgeKind
  children: React.ReactNode
}

const kindClasses: Record<BadgeKind, string> = {
  active: 'bg-success-subtle text-success',
  inactive: 'bg-surface-2 text-fg-subtle',
  warn: 'bg-accent-subtle text-accent',
  error: 'bg-error-subtle text-error',
  verified: 'bg-success-subtle text-success',
  pending: 'bg-accent-subtle text-accent',
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
