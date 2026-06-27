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

## Known render warns (triaged — not regressions)

- **`[FONT_REMOTE]` Inter** — Inter loads via a remote Google Fonts `@import`; expected, by design.
- **`[GRID_OVERFLOW]` on Tile** — resolved with `cfg.overrides.Tile.cardMode = "column"`.
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
