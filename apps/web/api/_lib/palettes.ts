// Server-side palette resolution for the serverless functions. Mirrors the
// browser copy in apps/web/src/lib/palettes.ts, but lives under api/_lib so the
// Vercel (CommonJS) bundle never has to require() the ESM browser module
// (that cross-import triggers ERR_REQUIRE_ESM at runtime). Keep the two preset
// lists in sync. Only the accent data the emails need is included here.

export interface Palette {
  id: string
  name: string
  lightAccent: string
  darkAccent: string
}

export const PRESET_PALETTES: Palette[] = [
  { id: 'bayerwald', name: 'Standard (Amber)', lightAccent: '#D97706', darkAccent: '#F59E0B' },
  { id: 'b4y3rw4ld', name: 'ITC1', lightAccent: '#018FC2', darkAccent: '#34B7E6' },
  { id: 'wald', name: 'Wald', lightAccent: '#4D7C0F', darkAccent: '#84CC16' },
  { id: 'deathstar', name: 'Imperium (Death Star)', lightAccent: '#475569', darkAccent: '#64748B' },
]

export const CUSTOM_SLOTS = ['custom-1', 'custom-2', 'custom-3'] as const

export function isHex(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
}

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
