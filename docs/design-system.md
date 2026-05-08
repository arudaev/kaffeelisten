# Design System — Kaffeelisten

Design tokens and component specifications. Used as the source for the Tailwind config and all UI implementation.

---

## Color tokens

### Primitive palette

| Token | Hex | Use |
|---|---|---|
| `stone-50` | `#FAFAF9` | Page background |
| `stone-100` | `#F5F5F4` | Secondary background, input bg |
| `stone-200` | `#E7E5E4` | Borders, dividers |
| `stone-400` | `#A8A29E` | Muted text, placeholder |
| `stone-600` | `#57534E` | Secondary text |
| `stone-900` | `#1C1917` | Primary text |
| `amber-600` | `#D97706` | Brand accent (coffee warm) |
| `amber-700` | `#B45309` | Brand accent hover |
| `amber-50` | `#FFFBEB` | Brand accent subtle bg |
| `green-600` | `#16A34A` | Success |
| `green-50` | `#F0FDF4` | Success subtle bg |
| `red-600` | `#DC2626` | Error, destructive |
| `red-50` | `#FEF2F2` | Error subtle bg |
| `blue-600` | `#2563EB` | Info, links |
| `white` | `#FFFFFF` | Card surface, modal bg |

### Semantic roles

```
background.default    → stone-50
background.subtle     → stone-100
surface.default       → white
surface.elevated      → white (with shadow)
border.default        → stone-200
border.strong         → stone-400
text.primary          → stone-900
text.secondary        → stone-600
text.muted            → stone-400
text.inverse          → white
brand.default         → amber-600
brand.hover           → amber-700
brand.subtle          → amber-50
interactive.focus     → amber-600 (ring)
semantic.success      → green-600
semantic.error        → red-600
semantic.info         → blue-600
```

---

## Typography

**Font family:** Inter (primary), system-ui (fallback)

| Scale | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `text-xs` | 12px | 1.5 | 400 | Captions, badges |
| `text-sm` | 14px | 1.5 | 400/500 | Secondary body, labels |
| `text-base` | 16px | 1.5 | 400 | Body text |
| `text-lg` | 18px | 1.4 | 500 | Member flow body (wall readability) |
| `text-xl` | 20px | 1.4 | 600 | Section headings |
| `text-2xl` | 24px | 1.3 | 600/700 | Page headings |
| `text-3xl` | 30px | 1.2 | 700 | Member flow headings |
| `text-4xl` | 36px | 1.1 | 700 | Landing hero |

**Member flow note:** All interactive elements in the member flow use at minimum `text-lg` for wall-mount readability.

---

## Spacing

Standard Tailwind 4px grid. Key reference points:

| Token | px | Use |
|---|---|---|
| `p-2` | 8px | Tight inline padding |
| `p-3` | 12px | Badge, small button padding |
| `p-4` | 16px | Standard card padding |
| `p-6` | 24px | Section padding |
| `p-8` | 32px | Page padding (desktop) |
| `gap-4` | 16px | Standard grid gap |
| `gap-6` | 24px | Section gap |

---

## Border radius

| Token | px | Use |
|---|---|---|
| `rounded` | 4px | Inputs, badges |
| `rounded-md` | 6px | Buttons, small cards |
| `rounded-lg` | 8px | Standard cards |
| `rounded-xl` | 12px | Large member flow tiles |
| `rounded-2xl` | 16px | Modal, elevated surfaces |

---

## Shadows

| Token | Use |
|---|---|
| `shadow-sm` | Default card elevation |
| `shadow-md` | Elevated card, dropdown |
| `shadow-lg` | Modal, dialog |

---

## Component specifications

### Member flow tile (company / member)

```
Size:        min 80px height, full width of grid column
Padding:     p-6
Radius:      rounded-xl
Background:  white
Border:      1px stone-200
Shadow:      shadow-sm
Hover:       bg stone-50, border stone-400
Active:      bg amber-50, border amber-600, ring-2 amber-600
Text:        text-lg font-semibold stone-900
Tap target:  min 44x44px (enforced by full tile clickability)
```

### Item card

```
Size:        min 124px height
Padding:     p-4
Radius:      rounded-xl
Background:  white
Border:      1px stone-200
Shadow:      shadow-sm
Selected:    bg amber-50, border amber-600, ring-2 amber-600
Price label: text-sm text-stone-600
Name:        text-lg font-semibold stone-900
Icon:        28x28 custom SVG, stone-600 (amber-700 when selected)

Quantity controls (shown only when selected, bottom-right of card):
  − button: w-8 h-8, rounded-lg, bg amber-100, text amber-700
  count:     w-6 text-center font-bold stone-900
  + button:  w-8 h-8, rounded-lg, bg amber-100, text amber-700
  click propagation stopped on control area so card body click does not fire
```

### Primary button

```
Height:      48px (56px in member flow)
Padding:     px-6 py-3
Radius:      rounded-md
Background:  amber-600
Text:        white, text-base font-semibold
Hover:       amber-700
Focus:       ring-2 ring-amber-600 ring-offset-2
Disabled:    opacity-40, cursor-not-allowed
Full-width:  w-full in member flow and mobile
```

### Secondary button

```
Height:      48px
Padding:     px-6 py-3
Radius:      rounded-md
Background:  white
Border:      1px stone-200
Text:        stone-900, text-base font-medium
Hover:       bg stone-50
```

### Input field

```
Height:      44px
Padding:     px-3 py-2
Radius:      rounded
Background:  stone-100
Border:      1px stone-200
Focus:       border amber-600, ring-1 ring-amber-600, bg white
Placeholder: stone-400
Text:        stone-900 text-base
Error:       border red-600, ring-1 ring-red-600
```

### Data table (admin)

```
Header:      bg stone-50, text-sm font-medium stone-600, uppercase tracking-wide
Row:         bg white, border-b stone-200, text-sm stone-900
Row hover:   bg stone-50
Cell padding: px-4 py-3
```

### Summary card (admin)

```
Padding:     p-6
Radius:      rounded-xl
Background:  white
Border:      1px stone-200
Shadow:      shadow-sm
Metric:      text-3xl font-bold stone-900
Label:       text-sm stone-600
Accent:      amber-600 left border (4px)
```

### Status badge

```
Active:      bg green-50, text green-600, text-xs font-medium, rounded px-2 py-0.5
Inactive:    bg stone-100, text stone-400, text-xs font-medium, rounded px-2 py-0.5
```

### Modal / dialog

```
Overlay:     bg black/50
Container:   bg white, rounded-2xl, shadow-lg, max-w-md, p-6
```

---

## Tailwind config extensions

Add to `tailwind.config.ts` in `apps/web/`:

```ts
theme: {
  extend: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    colors: {
      brand: {
        DEFAULT: '#D97706',  // amber-600
        hover: '#B45309',    // amber-700
        subtle: '#FFFBEB',   // amber-50
      },
    },
    borderRadius: {
      xl: '12px',
      '2xl': '16px',
    },
  },
},
```

---

## Responsive breakpoints

| Breakpoint | Width | Primary use |
|---|---|---|
| `sm` | 640px | — |
| `md` | 768px | iPad portrait threshold |
| `lg` | 1024px | iPad landscape, admin desktop |
| `xl` | 1280px | Wide admin panel |

The member flow is designed mobile-first. iPad landscape (1024px+) gets a centered, constrained layout (max-w-2xl) rather than full-bleed.

The admin panel is designed for `lg` and above, with a responsive fallback for smaller screens.
