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
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-8 py-5">
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          className={[
            'flex items-center gap-2 h-11 px-3.5 rounded-lg text-base font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600',
            onBack
              ? 'text-stone-700 hover:bg-stone-100 cursor-pointer'
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
              className="h-2 rounded-full transition-all duration-[180ms] ease-[cubic-bezier(0.2,0,0,1)]"
              style={{
                width: i === step ? 24 : 8,
                backgroundColor: i <= step ? '#D97706' : '#E7E5E4',
              }}
            />
          ))}
        </div>

        <span className="w-24 text-right text-[13px] text-stone-500 tabular-nums">
          ITC1 · Kaffeelisten
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pb-6 pt-2 w-full max-w-[920px] mx-auto flex flex-col gap-6">
        {header && (
          <div className="flex flex-col gap-1.5 py-3 pb-1">{header}</div>
        )}
        <div className="flex-1">{children}</div>
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-8 py-4 pb-6 bg-stone-50 border-t border-stone-200">
          <div className="max-w-[920px] mx-auto flex items-center gap-3">{footer}</div>
        </div>
      )}
    </div>
  )
}
