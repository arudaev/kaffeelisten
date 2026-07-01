# design-sync notes — Kaffeelisten

This repo is **off the converter's normal envelope**: it is a Vite **PWA app**, not a
published component library. There is no `dist/`, no `.d.ts`, no Storybook. The sync works
via a hand-written entry + synth-from-source + a separately compiled Tailwind stylesheet.
Read this before re-syncing.

## How the build is wired

- **Shape:** `package`, synth-entry. `cfg.entry` = `.design-sync/ds-entry.tsx` — a hand-written
  file that re-exports the app's **default-export** components as named bindings (the synth
  `export *` path drops default exports, so this file is mandatory). PKG_DIR resolves to the
  repo root (entry walks up to root `package.json`); `cfg.srcDir = apps/web/src`;
  `componentSrcMap` enumerates all 17 components relative to repo root.
  - **If components are added/removed/renamed:** update BOTH `.design-sync/ds-entry.tsx` and
    `cfg.componentSrcMap`. `Topbar.tsx` exports two components (`Topbar` + `MonthSelector`).
- **CSS (Tailwind JIT):** the components style via Tailwind utility classes; there is no shipped
  stylesheet. `cfg.buildCmd` recompiles `.design-sync/tailwind.css` → `.design-sync/.cache/ds-tailwind.css`
  (gitignored), which `cfg.cssEntry` points at and the converter appends into `_ds_bundle.css`.
  **Always run `cfg.buildCmd` before the converter** — and again if any preview/component adds a
  utility class not previously used, or that class renders unstyled. The compiled CSS is a
  **JIT subset**, not full Tailwind (this is also called out in `conventions.md`).
- **Design tokens:** `.design-sync/tokens/colors_and_type.css` (from the teammate's original
  hand-authored claude.ai/design DS) holds CSS custom properties + semantic `.k-*` type classes.
  It is `@import`ed by `.design-sync/tailwind.css`, so the Tailwind CLI inlines it into the
  compiled stylesheet → it ships via `_ds_bundle.css` (the `styles.css` closure). NOTE: `cfg.tokensGlob`
  does NOT work on its own — `copyTokens` returns early unless `cfg.tokensPkg` is also set, hence the
  `@import` approach instead of `tokensGlob`. If editing the tokens, just re-run `cfg.buildCmd`.
- **Brand assets:** `Sidebar` (`/logo.svg`, `/assets/itc1-logo.svg`) and `DataTable` empty state
  (`/assets/illustrations/empty-cup.svg`) reference absolute public paths that are NOT bundled.
  After every `package-build`/`resync` (which wipes `ds-bundle/`), re-copy before validate/upload:
  ```sh
  cp apps/web/public/logo.svg ds-bundle/logo.svg && mkdir -p ds-bundle/assets && cp -r apps/web/public/assets/* ds-bundle/assets/
  ```
  `logo.svg` and `assets/**` are in the upload plan.

## Re-sync recipe (one pass)

1. `cp -r <skill>/{*.mjs,lib,storybook} .ds-sync/` (re-stage scripts), `(cd .ds-sync && npm i)` on a fresh clone.
2. Run `cfg.buildCmd` (recompile Tailwind).
3. Fetch the project's `_ds_sync.json` → `.design-sync/.cache/remote-sync.json`.
4. `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./.design-sync/ds-entry.tsx --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json`
5. Re-copy assets (above). Grade any `pendingGrade`, then upload per the verdict.

## Component set

29 components (was 22; +7 added 2026-07-02):
- **2 brand marks:** `Logo`, `CappuccinoMark` — inline themable SVGs (member/`general` group).
- **7 member-flow:** `BigButton`, `Tile`, `ItemCard`, `Stepper`, `Icon`, `FlowShell`, `SuccessScreen`.
- **20 admin:** `AdminButton`, `AdminIcon`, `Badge`, `DataTable`, `Modal`, `PinKeypad`, `SummaryCard`,
  `Sidebar`, `Topbar`, `MonthSelector`, and the form primitives `AdminField`, `AdminSelect`, `Toggle`,
  `Toast`, `EmptyState`, `SegmentedControl`, `PinInput`, `DayGridPicker`, `TemplateField`,
  `PalettePreviewCard`. Keep building admin form UI from the primitives rather than raw
  `<input>`/`<select>`.

The 7 new components came from the palette/appearance/PIN work (see git around cc33b57). Two carry
non-trivial preview data: `PalettePreviewCard` needs a `Palette` object (id/name/lightAccent/darkAccent
— literals mirror `apps/web/src/lib/palettes.ts` `PRESET_PALETTES`), and `TemplateField` needs
`placeholders` keys from `apps/web/src/lib/reportPlaceholders.ts` (`'monat'|'jahr'|'name'|'gesamt'`).
`SegmentedControl` is generic (`<T extends string>`), so its `.d.ts` is hand-written via
`cfg.dtsPropsFor.SegmentedControl` — auto-extraction can't flatten the generic.

**Adding/removing a component re-grades everything.** When the component set changes, every
component's contract key shifts, so `package-capture` reports `grade cleared … contract changed`
for ALL components and 0 carried forward — expected, not a nondeterminism bug. The unchanged
components are visually identical; confirm them from the contact sheets and re-write `good` grades
(a small node script writing `.design-sync/.cache/review/<Name>.grade.json` for every component is
the fast path). A re-sync that does NOT change the set carries grades forward normally.

## Token-layer sync — `.design-sync/tailwind.config.cjs` + `tailwind.css` MUST mirror the app

The 2026-07 palette refactor migrated the app to a **semantic token layer**: `apps/web/tailwind.config.ts`
maps `bg`/`surface`/`border`/`fg`/`accent`/`success`/`error`/`info` to `rgb(var(--<name>) / <alpha>)`,
and `apps/web/src/index.css` defines those `--*` channel-triplet vars on `:root` (light) +
`[data-mode="dark"]`. The DS sync had its OWN older `tailwind.config.cjs` (only `brand`) and never got
the new layer, so components using `bg-accent`/`text-fg`/`border-border`/`bg-surface-2`/`bg-error-subtle`
compiled to **nothing** and rendered unstyled (silently — no error, just wrong colors).

**Fix (already applied — keep it in sync going forward):**
1. `.design-sync/tailwind.config.cjs` `theme.extend.colors` now mirrors `apps/web/tailwind.config.ts`
   (the `token()` → `rgb(var(--*))` map). Also `darkMode: ['selector','[data-mode="dark"]']`.
2. `.design-sync/tailwind.css` now defines the `:root` + `[data-mode='dark']` channel-triplet vars
   (copied from `apps/web/src/index.css`) so `rgb(var(--accent))` etc. resolve; cards render light
   (`:root`). Body is `@apply bg-bg text-fg`.
**Whenever the app's token system changes** (new semantic color, renamed var), update BOTH files and
re-run `cfg.buildCmd`. Quick check after building: `grep -oE '\.(text|bg|border)-(accent|fg|surface)[a-z0-9-]*' .design-sync/.cache/ds-tailwind.css` should list the classes.

## Provider — Sidebar needs a Router (`cfg.provider`)

`Sidebar` imports `Link` from `react-router-dom`, so its preview renders blank ("Cannot destructure
'basename' of useContext(...) as it is null") without a Router. react-router-dom is **inlined into the
bundle**, so a preview-side `<MemoryRouter>` wouldn't share context. Fix: `ds-entry.tsx` re-exports
`MemoryRouter` from `react-router-dom` (→ `window.Kaffeelisten.MemoryRouter`, same instance),
`cfg.provider = {"component":"MemoryRouter"}` wraps every card, and `componentSrcMap.MemoryRouter = null`
keeps it out of the component set. If a future component adds another router hook, this already covers it.

## Known render warns (triaged — not regressions)

- **`[RENDER_THIN]` on `Logo` and `CappuccinoMark`** — both are pure line-art SVGs with no text, so the
  "no text + thin paint" heuristic misfires. They DO paint (12–15 KB PNGs, correct amber/token colors —
  confirmed from the contact sheets). Benign; grade `good`.

- **`[FONT_REMOTE]` Inter / JetBrains Mono** — load via remote `@import` (Google Fonts + the
  `--font-mono` stack referenced by the design tokens); expected, by design.
- **`[GRID_OVERFLOW]` on Tile** — resolved with `cfg.overrides.Tile.cardMode = "column"`.
- **Toast** — `position:fixed` overlay; its preview wraps each cell in a `transform: translateZ(0)`
  frame so the toast anchors inside the card, and `cfg.overrides.Toast` uses `cardMode: single`
  (the grid check flags fixed/portal content). Not a defect.
- **EmptyState illustration blank under `file://` capture** — the `/assets/illustrations/empty-cup.svg`
  doesn't load in the screenshot; resolves over http / in the DS pane (assets shipped). Same class
  as the Sidebar logo.
- **Modal title clipped in the review-sheet capture** — `fixed inset-0` overlay framing artifact;
  the viewport override does not move it. The title is in the DOM and centers correctly over http /
  in the DS pane. Body shortened to one line to minimise the clip. Not a defect.
- **Sidebar logo broken under `file://` capture** — resolves over http (assets shipped); fine in the DS pane.
- **MonthSelector shows "Mai 2024"** in capture — the component derives months from `new Date()` and
  the capture clock is fixed to 2024-05-15. Cosmetic, capture-only.

## Re-sync risks (what can silently go stale)

- `ds-entry.tsx` / `componentSrcMap` drift from the actual `apps/web/src/components` set — a renamed
  or new component is silently missing from the sync until both are updated.
- The compiled Tailwind subset goes stale if `cfg.buildCmd` isn't re-run — components/previews using
  new classes render unstyled with no error.
- Brand-asset copy step skipped → Sidebar/DataTable images break in the uploaded project.
- Several previews use `style={{...}}` inline layout deliberately (to avoid depending on un-compiled
  Tailwind classes) — keep that pattern when editing previews.
- **`.design-sync/tailwind.config.cjs` + `tailwind.css` drift from the app's token system** — the single
  biggest silent-failure risk after the palette refactor (see the Token-layer sync section). If the app
  adds/renames a semantic color or `--*` var and these two files aren't updated, the affected components
  render unstyled with no error. After any app token change: mirror both files, re-run `cfg.buildCmd`.
- **Sidebar / any new router-dependent component** — needs `cfg.provider` (MemoryRouter). A new component
  that reads router/theme/i18n context renders blank until its provider is wired.
- **Remote anchor cache** — `.design-sync/.cache/remote-sync.json` must be the CURRENT project
  `_ds_sync.json` fetched via `DesignSync(get_file)`; a stale/old-format file logs
  `remote sidecar malformed — treating as no anchor` (→ full re-verify; harmless but slower). The
  2026-07-02 run hit this because the cache file couldn't be overwritten (Write needs a prior Read on an
  existing file) — just re-fetch and overwrite it before running the driver.
- **Conventions header** — `.design-sync/conventions.md`'s class vocabulary must track the token system.
  It was rewritten 2026-07-02 (amber-*/stone-* → semantic `bg-accent`/`text-fg`/… classes). Re-validate
  named classes against the compiled CSS on every sync (`grep` them in `ds-bundle/_ds_bundle.css`).
