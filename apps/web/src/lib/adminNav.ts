// The admin navigation, and which entries the demo leaves out.
//
// Kept out of Sidebar.tsx so that file only exports a component — required for
// React Fast Refresh, the same reason theme-context.ts sits beside theme.tsx.

export type PageId = 'dashboard' | 'log' | 'documents' | 'companies' | 'members' | 'items' | 'settings'

/** Matches AdminIcon's `name` prop; declared here to avoid importing a component into a lib module. */
export type AdminNavIcon = 'home' | 'log' | 'document' | 'building' | 'users' | 'coffee' | 'settings'

export interface NavItem {
  id: PageId
  label: string
  icon: AdminNavIcon
}

export const navItems: NavItem[] = [
  { id: 'dashboard',  label: 'Übersicht',      icon: 'home' },
  { id: 'log',        label: 'Einträge',        icon: 'log' },
  { id: 'documents',  label: 'Dokumente',       icon: 'document' },
  { id: 'companies',  label: 'Unternehmen',     icon: 'building' },
  { id: 'members',    label: 'Mitarbeitende',   icon: 'users' },
  { id: 'items',      label: 'Artikel',         icon: 'coffee' },
  { id: 'settings',   label: 'Einstellungen',   icon: 'settings' },
]

/**
 * Pages the public demo does not have. Their endpoints answer 410, so showing
 * the entry would only lead somewhere broken.
 */
export const DEMO_HIDDEN_PAGES: readonly PageId[] = ['documents']

export function visibleNavItems(demo: boolean): NavItem[] {
  return demo ? navItems.filter(i => !DEMO_HIDDEN_PAGES.includes(i.id)) : navItems
}

/** Where to land when the current page is one the demo does not have. */
export function fallbackPage(page: PageId, demo: boolean): PageId {
  return demo && DEMO_HIDDEN_PAGES.includes(page) ? 'dashboard' : page
}
