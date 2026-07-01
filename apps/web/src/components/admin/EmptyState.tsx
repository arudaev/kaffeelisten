import { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  body?: string
  /** Path to an illustration SVG. Defaults to the coffee-cup empty illustration. Pass null to omit. */
  illustration?: string | null
  /** Optional action (e.g. a button) shown below the text. */
  action?: ReactNode
}

export default function EmptyState({
  title,
  body,
  illustration = '/assets/illustrations/empty-cup.svg',
  action,
}: EmptyStateProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-12 flex flex-col items-center gap-3 text-center">
      {illustration && (
        <img src={illustration} alt="" className="w-24" style={{ color: '#A8A29E' }} />
      )}
      <p className="text-base font-semibold text-fg">{title}</p>
      {body && <p className="text-sm text-fg-muted max-w-sm">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
