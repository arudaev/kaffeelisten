import type { ReactNode } from 'react'

interface TileProps {
  label: string
  sub?: string
  selected?: boolean
  leading?: ReactNode
  accentColor?: string
  onClick: () => void
}

export default function Tile({ label, sub, selected = false, leading, accentColor, onClick }: TileProps) {
  const arrowColor = selected ? '#b45309' : accentColor ?? undefined
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-4 w-full px-4 sm:px-6 py-5 min-h-[72px] text-left',
        'rounded-xl border shadow-sm',
        'transition-[background,border-color,box-shadow] duration-[120ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2',
        selected
          ? 'bg-amber-50 border-amber-600 ring-2 ring-amber-600'
          : 'bg-white border-stone-200 hover:bg-stone-50 hover:border-stone-400',
      ]
        .join(' ')}
    >
      {leading}
      <div className="flex flex-col gap-0.5 flex-1">
        <span className="text-lg sm:text-xl font-semibold text-stone-900">{label}</span>
        {sub && <span className="text-sm text-stone-600">{sub}</span>}
      </div>
      <span
        style={arrowColor ? { backgroundColor: arrowColor + '18', color: arrowColor } : undefined}
        className={[
          'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg',
          !arrowColor ? 'text-stone-400' : '',
        ].join(' ')}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  )
}
