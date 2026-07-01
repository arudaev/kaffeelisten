// Brand palettes. A palette rebrands the app's **accent** for light and dark
// (the surface/text tokens keep their theme defaults for guaranteed contrast).
// Presets live here in code; up to three "custom" palettes are stored in the
// app_theme.custom JSONB and edited from Settings.

export interface Palette {
  id: string
  name: string
  lightAccent: string // #RRGGBB used in light mode
  darkAccent: string // #RRGGBB used in dark mode
}

export const PRESET_PALETTES: Palette[] = [
  { id: 'bayerwald', name: 'Bayerwald (Standard)', lightAccent: '#D97706', darkAccent: '#F59E0B' },
  { id: 'espresso', name: 'Espresso', lightAccent: '#8B5E34', darkAccent: '#C08457' },
  { id: 'wald', name: 'Wald', lightAccent: '#4D7C0F', darkAccent: '#84CC16' },
]

export const CUSTOM_SLOTS = ['custom-1', 'custom-2', 'custom-3'] as const
export type CustomSlot = (typeof CUSTOM_SLOTS)[number]

export function isHex(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
}

/** The three custom palettes parsed from the app_theme.custom JSONB (with defaults). */
export function customPalettes(custom: Record<string, unknown> | null | undefined): Palette[] {
  return CUSTOM_SLOTS.map((id, i) => {
    const c = (custom?.[id] ?? {}) as Record<string, unknown>
    const name = typeof c.name === 'string' && c.name.trim() ? c.name.trim() : `Eigene ${i + 1}`
    return {
      id,
      name,
      lightAccent: isHex(c.light) ? c.light : '#D97706',
      darkAccent: isHex(c.dark) ? c.dark : '#F59E0B',
    }
  })
}

export function allPalettes(custom: Record<string, unknown> | null | undefined): Palette[] {
  return [...PRESET_PALETTES, ...customPalettes(custom)]
}

export function findPalette(id: string, custom: Record<string, unknown> | null | undefined): Palette {
  return allPalettes(custom).find(p => p.id === id) ?? PRESET_PALETTES[0]
}

// ── colour maths ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** "#D97706" → "217 119 6" (the channel-triplet form the CSS vars use). */
export function triplet(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return `${r} ${g} ${b}`
}

function mix(hex: string, withHex: string, ratio: number): string {
  const a = hexToRgb(hex)
  const b = hexToRgb(withHex)
  const m = a.map((v, i) => Math.round(v * (1 - ratio) + b[i] * ratio))
  return `${m[0]} ${m[1]} ${m[2]}`
}

/**
 * CSS variable overrides for a palette in a given mode. Derives the hover and
 * subtle-background accent tints so a single accent hex is enough.
 */
export function paletteVars(p: Palette, mode: 'light' | 'dark'): Record<string, string> {
  const accent = mode === 'dark' ? p.darkAccent : p.lightAccent
  return {
    '--accent': triplet(accent),
    '--accent-hover': mix(accent, '#000000', 0.14),
    '--accent-subtle': mode === 'dark' ? mix(accent, '#000000', 0.8) : mix(accent, '#ffffff', 0.88),
  }
}
