import { ReactNode } from 'react'
import Icon from './Icon'

interface FlowShellProps {
  step: number
  totalSteps: number
  onBack?: () => void
  header?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export default function FlowShell({ step, totalSteps, onBack, header, children, footer }: FlowShellProps) {
  return (
    <div className="min-h-screen bg-bg flex flex-col font-sans">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 md:px-8 py-5">
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          className={[
            'flex items-center gap-2 h-11 px-3.5 rounded-lg text-base font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            onBack
              ? 'text-fg hover:bg-surface-2 cursor-pointer'
              : 'text-transparent cursor-default',
          ].join(' ')}
        >
          <Icon name="back" size={20} strokeWidth={2} />
          Zurück
        </button>

        {/* Progress dots */}
        <div className="flex-1 flex justify-center items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={[
                'h-2 rounded-full transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)]',
                i <= step ? 'bg-accent' : 'bg-border',
              ].join(' ')}
              style={{ width: i === step ? 24 : 8 }}
            />
          ))}
        </div>

        <span className="w-24 text-right text-[13px] text-fg-muted tabular-nums">
          ITC1 · Kaffeelisten
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 md:px-8 pb-3 md:pb-6 pt-2 w-full max-w-[920px] mx-auto flex flex-col gap-6">
        {header && (
          <div className="flex flex-col gap-1.5 py-3 pb-1">{header}</div>
        )}
        <div className="flex-1">{children}</div>
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-4 md:px-8 py-4 pb-6 bg-bg border-t border-border">
          <div className="max-w-[920px] mx-auto flex items-center gap-3">{footer}</div>
        </div>
      )}
    </div>
  )
}
