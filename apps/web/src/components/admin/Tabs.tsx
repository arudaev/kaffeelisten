import { KeyboardEvent, ReactNode, useId, useRef } from 'react'

export interface TabItem<T extends string> {
  id: T
  label: string
  // Small marker after the label, e.g. an unsaved-changes dot.
  badge?: ReactNode
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (id: T) => void
  ariaLabel: string
  children: ReactNode
}

/**
 * Tab bar with real tablist/tab/tabpanel semantics and arrow-key navigation.
 * (SegmentedControl is a radio group, which a screen reader announces as a
 * choice of value rather than a set of pages.)
 */
export default function Tabs<T extends string>({ tabs, active, onChange, ariaLabel, children }: TabsProps<T>) {
  const baseId = useId()
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    if (next === null) return
    e.preventDefault()
    onChange(tabs[next].id)
    refs.current[tabs[next].id]?.focus()
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-1 border-b border-border overflow-x-auto -mx-1 px-1"
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              ref={el => { refs.current[tab.id] = el }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={e => onKeyDown(e, i)}
              className={[
                'relative inline-flex items-center gap-1.5 h-10 px-3 text-sm font-medium whitespace-nowrap rounded-t-md transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                selected ? 'text-fg' : 'text-fg-muted hover:text-fg',
              ].join(' ')}
            >
              {tab.label}
              {tab.badge}
              {selected && <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 bg-accent rounded-full" />}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${active}`}>
        {children}
      </div>
    </div>
  )
}
