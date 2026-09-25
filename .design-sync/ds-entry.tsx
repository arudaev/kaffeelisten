// Design-sync entry for the Kaffeelisten DS.
// The app components are default exports; this file re-exports them as named
// bindings so the converter's esbuild IIFE assigns each to window.Kaffeelisten.*.
// Paths are repo-relative (resolved from this file's location) so the entry is
// portable across clones. Regenerate by hand only if components are added/removed.

// Card/design provider. Sidebar renders <Link> (needs a Router) and Logo reads the
// active brand palette via useTheme() (throws outside a ThemeContext). The app's
// real ThemeProvider fetches the palette from Supabase, so it can't ship here;
// this wrapper supplies the SAME bundled react-router-dom + ThemeContext instances
// with a static preset palette. Exposed as window.Kaffeelisten.KaffeelistenProvider
// for cfg.provider and excluded from the component set via componentSrcMap.
import { createElement, type ReactNode } from 'react'
import { MemoryRouter, useInRouterContext } from 'react-router-dom'
import { ThemeContext } from '../apps/web/src/lib/theme-context'
import { PRESET_PALETTES } from '../apps/web/src/lib/palettes'

const noop = () => {}

export function KaffeelistenProvider({ palette = 'bayerwald', children }: { palette?: string; children?: ReactNode }) {
  const active = PRESET_PALETTES.find(p => p.id === palette) ?? PRESET_PALETTES[0]
  const themed = createElement(
    ThemeContext.Provider,
    { value: { mode: 'light', resolved: 'light', setMode: noop, palette: active, setPalette: noop } },
    children,
  )
  // Nestable: an inner provider (e.g. to switch palette) reuses the outer Router.
  return useInRouterContext() ? themed : createElement(MemoryRouter, null, themed)
}

export { MemoryRouter }

// Brand marks (inline themable SVGs)
export { default as Logo } from '../apps/web/src/components/Logo'
export { default as CappuccinoMark } from '../apps/web/src/components/CappuccinoMark'
export { default as DeathStarMark } from '../apps/web/src/components/DeathStarMark'

// Member-facing flow
export { default as BigButton } from '../apps/web/src/components/BigButton'
export { default as Tile } from '../apps/web/src/components/Tile'
export { default as ItemCard } from '../apps/web/src/components/ItemCard'
export { default as Stepper } from '../apps/web/src/components/Stepper'
export { default as Icon } from '../apps/web/src/components/Icon'
export { default as FlowShell } from '../apps/web/src/components/FlowShell'
export { default as SuccessScreen } from '../apps/web/src/components/SuccessScreen'

// Admin panel
export { default as AdminButton } from '../apps/web/src/components/admin/AdminButton'
export { default as AdminIcon } from '../apps/web/src/components/admin/AdminIcon'
export { default as Badge } from '../apps/web/src/components/admin/Badge'
export { default as DataTable } from '../apps/web/src/components/admin/DataTable'
export { default as Modal } from '../apps/web/src/components/admin/Modal'
export { default as PinKeypad } from '../apps/web/src/components/admin/PinKeypad'
export { default as SummaryCard } from '../apps/web/src/components/admin/SummaryCard'
export { default as Sidebar } from '../apps/web/src/components/admin/Sidebar'
export { Topbar, MonthSelector } from '../apps/web/src/components/admin/Topbar'

// Admin form primitives
export { default as AdminField } from '../apps/web/src/components/admin/AdminField'
export { default as AdminSelect } from '../apps/web/src/components/admin/AdminSelect'
export { default as Toggle } from '../apps/web/src/components/admin/Toggle'
export { default as Toast } from '../apps/web/src/components/admin/Toast'
export { default as EmptyState } from '../apps/web/src/components/admin/EmptyState'
export { default as SegmentedControl } from '../apps/web/src/components/admin/SegmentedControl'
export { default as PinInput } from '../apps/web/src/components/admin/PinInput'
export { default as DayGridPicker } from '../apps/web/src/components/admin/DayGridPicker'
export { default as TemplateField } from '../apps/web/src/components/admin/TemplateField'
export { default as PalettePreviewCard } from '../apps/web/src/components/admin/PalettePreviewCard'
export { default as Tabs } from '../apps/web/src/components/admin/Tabs'
export { default as FilterBar } from '../apps/web/src/components/admin/FilterBar'
