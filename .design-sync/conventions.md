# Kaffeelisten — how to build with this design system

Kaffeelisten is the PWA that replaces the paper coffee-consumption sheet at the ITC1
Deggendorf campus. The visual language is warm, minimal, Bavarian-Wald: amber accent,
warm stone neutrals, Inter, generous rounding. UI copy is **German** (English only for
dev-facing labels). No emojis in UI copy.

## Setup & wrapping

Almost every component is a self-contained React component styled with Tailwind utility
classes — just render it. The shipped `styles.css` carries all styling (it `@import`s the
compiled Tailwind layer and a remote Inter `@font-face`); nothing else needs wiring.

**One exception:** `Sidebar` renders a react-router `<Link>`, so it must be mounted inside
a Router (`<BrowserRouter>` / `<MemoryRouter>` from `react-router-dom`). Every other
component works with no provider, theme context, or router.

**Theming.** The palette is driven by semantic CSS variables (`--accent`, `--fg`,
`--surface`, `--bg`, `--border`, …) defined for light mode on `:root` and overridden under
`[data-mode="dark"]`. Add `data-mode="dark"` to a wrapping element to preview dark mode; a
brand palette can further override `--accent*` at runtime. Because the tokens are variables,
you get theming for free by using the semantic classes below — never hard-code hex colors.

## Styling idiom — two layers

There are two ways to style, both shipped via `styles.css`:

1. **Design tokens + semantic type classes (`tokens/colors_and_type.css`) — prefer these for
   custom styling, they are always present.** CSS custom properties cover the whole foundation:
   colors (`var(--brand)` = `#D97706`, `var(--brand-hover)`, `var(--fg-primary)`,
   `var(--fg-secondary)`, `var(--fg-muted)`, `var(--bg-default)`, `var(--surface-default)`,
   `var(--border-default)`, `var(--success)`, `var(--error)`), spacing (`var(--space-1..16)`,
   4px grid), radii (`var(--radius-sm..2xl)`, `--radius-full`), shadows (`var(--shadow-sm/md/lg)`),
   type scale (`var(--fs-xs..4xl)` + matching `--lh-*`), weights, motion (`var(--ease-standard)`,
   `var(--duration-fast/base/slow)`), and tap targets (`--tap-min` 44px, `--tap-comfortable` 56px).
   Apply semantic type with the **`.k-*` classes**: `.k-display`, `.k-h1`, `.k-h2`, `.k-h3`,
   `.k-body-lg` (member-flow body floor — never below 18px on the wall iPad), `.k-body`,
   `.k-body-sm`, `.k-caption`, `.k-eyebrow` (uppercase), `.k-label`, `.k-mono`; emphasis with
   `.k-fg-secondary/.k-fg-muted/.k-fg-brand/.k-fg-success/.k-fg-error`; keyboard focus with `.k-focus`.

2. **Tailwind utility classes — but a JIT-compiled SUBSET.** The components themselves are styled
   with Tailwind, and `styles.css` ships only the utility classes the library's own source uses,
   **not all of Tailwind**. So a class outside the compiled set (e.g. `bg-blue-500`, `p-10`) renders
   **unstyled — no fallback**. Treat the vocabulary below as the safe utility set; for anything else,
   reach for the tokens/`.k-*` classes in layer 1 or an inline `style={{…}}`.

**Build primarily by composing the library components** — they already carry their full styling, so
you rarely add classes at all.

### The DS's class vocabulary (semantic tokens — present in the compiled CSS)

These map to the theme CSS variables above, so they follow light/dark and the brand palette
automatically. Prefer them over raw color scales — this is the current idiom the components use.

- **Accent / primary:** `bg-accent` (the accent, amber `#D97706` in light), `text-accent`,
  `border-accent`, `bg-accent-subtle` (tinted fill), `ring-accent` (focus). Use for primary
  actions and selected states. (The `--accent-hover` variable exists for hover states.)
- **Surfaces / canvas:** `bg-bg` (app canvas), `bg-surface` (cards), `bg-surface-2` (inset/
  input fills), `border-border`, `border-border-strong`.
- **Text:** `text-fg` (primary), `text-fg-muted` (secondary), `text-fg-subtle` (hints/placeholder).
- **Status:** `text-success` / `bg-success-subtle` (active/ok), `text-error` / `bg-error` /
  `bg-error-subtle` (error/destructive). Amber accent doubles for warnings.
- **Radius:** `rounded-md`, `rounded-lg`, `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-full`.
- **Type:** `font-medium`/`font-semibold`/`font-bold`, Inter via `font-sans`. Tabular numbers
  via `tabular-nums`.
- **Motion:** `animate-pop` (success pop-in), `animate-shake` (error shake).

## Where the truth lives

Read `_ds/<folder>/styles.css` (and the `_ds_bundle.css` it imports) for the exact compiled
classes, and each component's `<Name>.prompt.md` + `<Name>.d.ts` for its API before composing.

## Components at a glance

- **Brand marks:** `Logo` (amber rounded-square cappuccino mark; follows the accent via
  `currentColor` — wrap in a `text-accent` element), `CappuccinoMark` (line-art cup that
  inherits `currentColor`). Size both with `w-*`/`h-*` (or inline `style`).
- **Member flow (zero-login, iPad-first):** `FlowShell` (step shell with progress dots, back,
  footer slot), `Tile` (company/member selection row), `ItemCard` (consumable with quantity
  stepper), `Stepper`, `BigButton` (primary/secondary/ghost), `SuccessScreen`, `Icon`.
- **Admin panel:** `Sidebar` (needs a Router — see Setup), `Topbar` + `MonthSelector`,
  `SummaryCard` (KPI), `DataTable` (`columns`/`rows`, `render` per column), `Badge`
  (active/inactive/warn/error), `Modal`, `PinKeypad`, `AdminButton`
  (primary/secondary/ghost/destructive), `AdminIcon`.
- **Admin form primitives** (build all admin forms from these — never raw `<input>`/`<select>`):
  `AdminField` (labelled text/number/email input; `form` + compact `filter` variants, optional
  leading icon, `hint`/`error`, `required` asterisk), `AdminSelect` (labelled select, same
  variants, `options` prop), `Toggle` (on/off switch for booleans), `Toast` (`success`/`error`
  notification), `EmptyState` (illustration + title + body + optional action),
  `SegmentedControl` (radio-group of 2–4 options; `size` `sm`/`md` — used for the theme-mode
  switcher), `PinInput` (segmented numeric entry; `length`, `reveal`, `invalid`),
  `DayGridPicker` (day-of-month 1–28 grid + "last day" option), `TemplateField` (subject/intro
  input with placeholder-token chips and a live "Beispiel" preview),
  `PalettePreviewCard` (selectable brand-palette card with light/dark accent swatches).

## Idiomatic example

```tsx
import { FlowShell, Tile, BigButton, Icon } from '@kaffeelisten/web'

function SelectCompany() {
  return (
    <FlowShell
      step={0}
      totalSteps={4}
      header={<h1 className="text-2xl font-bold text-fg tracking-tight">Für welche Firma?</h1>}
      footer={<BigButton variant="primary" fullWidth icon={<Icon name="check" size={20} strokeWidth={2} />}>Weiter</BigButton>}
    >
      <div className="flex flex-col gap-3">
        <Tile label="GZDN GmbH" sub="12 Mitarbeitende" selected onClick={() => {}} />
        <Tile label="ITC1" sub="Innovation Tech Campus" onClick={() => {}} />
      </div>
    </FlowShell>
  )
}
```
