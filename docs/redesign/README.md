# Admin form-primitive redesign (2026-07)

Three admin form primitives were redesigned in the **Kaffeelisten Design System**
project on claude.ai/design, then adopted into the app source here.

## What changed

| Component | Source file | Redesign |
|---|---|---|
| `DayGridPicker` | `apps/web/src/components/admin/DayGridPicker.tsx` | Summary line, tactile rounded cells with hover lift, solid-amber selected state, divided "Letzter Tag des Monats" row with calendar glyph + confirmation check. |
| `PinInput` | `apps/web/src/components/admin/PinInput.tsx` | Blinking amber caret in the active slot, pop-in dots/digits, shake on invalid, revealed code in JetBrains Mono. |
| `TemplateField` | `apps/web/src/components/admin/TemplateField.tsx` | Live `{token}` highlighting inside the field (mirror layer), pill insert-chips showing the raw token, elevated "Beispiel" card with highlighted substituted sample values. |

All three keep their **existing props/API and German copy** — this is a visual and
interaction overhaul only. The day grid is still capped at 28 (matches the DB check
constraint), and `TemplateField` still reads `PLACEHOLDERS` from
`apps/web/src/lib/reportPlaceholders.ts`.

## Provenance

The redesign proposal (interactive HTML + JSX) lives in the design-system project on
claude.ai/design under `redesign/components.jsx` and `Redesign.html`. It was pulled in
and re-implemented with the app's Tailwind semantic token classes (`bg-accent`, `text-fg`,
`bg-surface-2`, …) plus a new `mono` font family and `blink` animation. See
[.design-sync/NOTES.md](../../.design-sync/NOTES.md) for the design-sync details.
