// Design-sync entry for the Kaffeelisten DS.
// The app components are default exports; this file re-exports them as named
// bindings so the converter's esbuild IIFE assigns each to window.Kaffeelisten.*.
// Paths are repo-relative (resolved from this file's location) so the entry is
// portable across clones. Regenerate by hand only if components are added/removed.

// Router provider — Sidebar renders <Link>, so previews need a Router from the
// SAME bundled react-router-dom instance (a preview-side wrapper wouldn't share
// context). Exposed as window.Kaffeelisten.MemoryRouter for cfg.provider; it is
// excluded from the component set via componentSrcMap.
export { MemoryRouter } from 'react-router-dom'

// Brand marks (inline themable SVGs)
export { default as Logo } from '../apps/web/src/components/Logo'
export { default as CappuccinoMark } from '../apps/web/src/components/CappuccinoMark'

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
