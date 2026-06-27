# Kaffeelisten — how to build with this design system

Kaffeelisten is the PWA that replaces the paper coffee-consumption sheet at the ITC1
Deggendorf campus. The visual language is warm, minimal, Bavarian-Wald: amber accent,
warm stone neutrals, Inter, generous rounding. UI copy is **German** (English only for
dev-facing labels). No emojis in UI copy.

## Setup & wrapping

No provider, theme context, or router is required — every component is a self-contained
React component styled with Tailwind utility classes. Just render it. The shipped
`styles.css` carries all styling (it `@import`s the compiled Tailwind layer and a remote
Inter `@font-face`); nothing else needs wiring.

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

### The DS's class vocabulary (present in the compiled CSS)

- **Brand / primary:** `amber-600` (the accent `#D97706`), `amber-700` (hover), `amber-50`
  / `amber-100` (subtle fills), `ring-amber-600` (focus). Use these for primary actions
  and selected states.
- **Neutrals / text:** `stone-50` (app canvas), `stone-200` (borders), `stone-400`–`stone-600`
  (muted text), `stone-900` (primary text), `white` (surfaces).
- **Status:** `green-50`/`green-600` (active), `red-50`/`red-500`/`red-600` (error/destructive),
  amber for warnings.
- **Radius:** `rounded-md`, `rounded-lg`, `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-full`.
- **Type:** `font-medium`/`font-semibold`/`font-bold`, Inter via `font-sans`. Tabular numbers
  via `tabular-nums`.
- **Motion:** `animate-pop` (success pop-in), `animate-shake` (error shake).

## Where the truth lives

Read `_ds/<folder>/styles.css` (and the `_ds_bundle.css` it imports) for the exact compiled
classes, and each component's `<Name>.prompt.md` + `<Name>.d.ts` for its API before composing.

## Components at a glance

- **Member flow (zero-login, iPad-first):** `FlowShell` (step shell with progress dots, back,
  footer slot), `Tile` (company/member selection row), `ItemCard` (consumable with quantity
  stepper), `Stepper`, `BigButton` (primary/secondary/ghost), `SuccessScreen`, `Icon`.
- **Admin panel:** `Sidebar`, `Topbar` + `MonthSelector`, `SummaryCard` (KPI), `DataTable`
  (`columns`/`rows`, `render` per column), `Badge` (active/inactive/warn/error), `Modal`,
  `PinKeypad`, `AdminButton` (primary/secondary/ghost/destructive), `AdminIcon`.
- **Admin form primitives** (build all admin forms from these — never raw `<input>`/`<select>`):
  `AdminField` (labelled text/number/email input; `form` + compact `filter` variants, optional
  leading icon, `hint`/`error`, `required` asterisk), `AdminSelect` (labelled select, same
  variants, `options` prop), `Toggle` (on/off switch for booleans), `Toast` (`success`/`error`
  notification), `EmptyState` (illustration + title + body + optional action).

## Idiomatic example

```tsx
import { FlowShell, Tile, BigButton, Icon } from '@kaffeelisten/web'

function SelectCompany() {
  return (
    <FlowShell
      step={0}
      totalSteps={4}
      header={<h1 className="text-2xl font-bold text-stone-900 tracking-tight">Für welche Firma?</h1>}
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
