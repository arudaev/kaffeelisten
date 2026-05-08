import AdminIcon from './AdminIcon'

type AdminIconName = Parameters<typeof AdminIcon>[0]['name']

type PageId = 'dashboard' | 'log' | 'companies' | 'members' | 'items' | 'settings'

interface NavItem {
  id: PageId
  label: string
  icon: AdminIconName
}

const navItems: NavItem[] = [
  { id: 'dashboard',  label: 'Übersicht',      icon: 'home' },
  { id: 'log',        label: 'Einträge',        icon: 'log' },
  { id: 'companies',  label: 'Unternehmen',     icon: 'building' },
  { id: 'members',    label: 'Mitarbeitende',   icon: 'users' },
  { id: 'items',      label: 'Items',           icon: 'coffee' },
  { id: 'settings',   label: 'Einstellungen',   icon: 'settings' },
]

interface SidebarProps {
  active: PageId
  onNavigate: (page: PageId) => void
  onSendReport: () => void
}

export default function Sidebar({ active, onNavigate, onSendReport }: SidebarProps) {
  return (
    <aside className="w-60 min-h-screen bg-white border-r border-stone-200 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-5 py-6 border-b border-stone-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
            <AdminIcon name="coffee" size={18} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-stone-900 tracking-tight">Kaffeelisten</p>
            <p className="text-[11px] text-stone-500 uppercase tracking-[0.06em]">Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5">
        {navItems.map(item => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={[
                'flex items-center gap-2.5 px-3 h-9 rounded-md text-sm text-left w-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600',
                isActive
                  ? 'bg-amber-50 text-amber-700 font-semibold'
                  : 'text-stone-700 font-medium hover:bg-stone-100',
              ].join(' ')}
            >
              <AdminIcon name={item.icon} size={18} strokeWidth={isActive ? 2 : 1.5} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-stone-200 flex flex-col gap-3">
        <button
          type="button"
          onClick={onSendReport}
          className="flex items-center justify-center gap-2 h-10 rounded-md bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
        >
          <AdminIcon name="send" size={16} strokeWidth={2} />
          Bericht senden
        </button>
        <div className="flex items-center gap-2">
          <img src="/assets/itc1-logo.svg" alt="ITC1" className="h-6 w-auto opacity-80" />
          <span className="text-[11px] text-stone-500">ITC1 · Part of GZDN</span>
        </div>
      </div>
    </aside>
  )
}
