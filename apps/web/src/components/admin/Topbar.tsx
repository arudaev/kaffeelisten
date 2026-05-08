import { ReactNode } from 'react'
import AdminIcon from './AdminIcon'

interface TopbarProps {
  title: string
  eyebrow?: string
  right?: ReactNode
}

export function Topbar({ title, eyebrow, right }: TopbarProps) {
  return (
    <div className="sticky top-0 z-10 flex items-end justify-between px-8 py-6 pb-5 border-b border-stone-200 bg-stone-50 gap-6">
      <div>
        {eyebrow && (
          <p className="text-xs font-medium text-stone-500 uppercase tracking-[0.06em] mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[26px] font-bold text-stone-900 tracking-tight">{title}</h1>
      </div>
      {right && (
        <div className="flex items-center gap-3">{right}</div>
      )}
    </div>
  )
}

interface MonthSelectorProps {
  value: string
  onChange: () => void
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="inline-flex items-center gap-2 h-9 px-3 bg-white border border-stone-200 rounded-md text-sm font-medium text-stone-900 hover:bg-stone-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
    >
      {value}
      <AdminIcon name="chevron" size={16} />
    </button>
  )
}
