import { ReactNode } from 'react'
import AdminIcon from './AdminIcon'
import BrandMark from '../BrandMark'

interface TopbarProps {
  title: string
  eyebrow?: string
  right?: ReactNode
  onMenuClick?: () => void
}

export function Topbar({ title, eyebrow, right, onMenuClick }: TopbarProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-8 py-4 md:py-6 md:pb-5 border-b border-stone-200 bg-stone-50 gap-3 md:gap-6">
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-1.5 -ml-1 rounded-md text-stone-500 hover:bg-stone-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            aria-label="Menü öffnen"
          >
            <AdminIcon name="menu" size={22} strokeWidth={1.5} />
          </button>
        )}
        <BrandMark alt="" className="h-8 w-10 text-amber-600 md:hidden" loading="lazy" />
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-medium text-stone-500 uppercase tracking-[0.06em] mb-1 hidden sm:block">
              {eyebrow}
            </p>
          )}
          <h1 className="text-xl md:text-[26px] font-bold text-stone-900 tracking-tight truncate">{title}</h1>
        </div>
      </div>
      {right && (
        <div className="flex items-center gap-2 md:gap-3 shrink-0">{right}</div>
      )}
    </div>
  )
}

interface MonthSelectorProps {
  value: string  // "2026-05"
  onChange: (month: string) => void
}

function recentMonths(): Array<{ value: string; label: string }> {
  const now = new Date()
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
    }
  })
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const months = recentMonths()
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="hidden md:inline-flex h-9 px-3 bg-white border border-stone-200 rounded-md text-sm font-medium text-stone-900 hover:bg-stone-50 transition-colors focus:border-amber-600 focus:ring-1 focus:ring-amber-600 outline-none cursor-pointer"
    >
      {months.map(m => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
    </select>
  )
}
