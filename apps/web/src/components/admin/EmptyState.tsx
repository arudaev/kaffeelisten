import { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  body?: string
  /** Custom illustration path (rendered as <img>); omit for the default coffee-cup mark, or pass null for no illustration. */
  illustration?: string | null
  /** Optional action (e.g. a button) shown below the text. */
  action?: ReactNode
}

// Inline empty-cup line mark (stroke=currentColor) so it themes with the app.
function EmptyCupMark() {
  return (
    <svg
      viewBox="0 0 200 160"
      className="w-24 h-auto text-fg-subtle"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M50 60h70l-4 60c-1 8-7 14-15 14h-32c-8 0-14-6-15-14z" />
      <path d="M120 75h10c8 0 14 6 14 14v0c0 8-6 14-14 14h-10" />
      <path d="M48 60h74" />
      <path d="M85 22c0 6 0 8 0 14" />
      <path d="M70 30c4 4 4 8 0 12" />
      <path d="M100 30c-4 4-4 8 0 12" />
    </svg>
  )
}

export default function EmptyState({ title, body, illustration, action }: EmptyStateProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-12 flex flex-col items-center gap-3 text-center">
      {illustration === undefined ? (
        <EmptyCupMark />
      ) : illustration ? (
        <img src={illustration} alt="" className="w-24" />
      ) : null}
      <p className="text-base font-semibold text-fg">{title}</p>
      {body && <p className="text-sm text-fg-muted max-w-sm">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
