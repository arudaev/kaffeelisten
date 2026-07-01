// Placeholder tokens usable in report subject/intro templates. Mirrors the
// server-side substitution in apps/web/api/_lib/reportHtml.ts `renderTemplate`.
// The `sample` values drive the live "Beispiel" preview under each field.

export type PlaceholderKey = 'monat' | 'jahr' | 'name' | 'gesamt'

export interface PlaceholderDef {
  key: PlaceholderKey
  token: string // e.g. "{monat}"
  label: string // chip label (German)
  sample: string // value used in the live example
}

export const PLACEHOLDERS: Record<PlaceholderKey, PlaceholderDef> = {
  monat: { key: 'monat', token: '{monat}', label: 'Monat', sample: 'Juli 2026' },
  jahr: { key: 'jahr', token: '{jahr}', label: 'Jahr', sample: '2026' },
  name: { key: 'name', token: '{name}', label: 'Vorname', sample: 'Anna' },
  gesamt: { key: 'gesamt', token: '{gesamt}', label: 'Gesamtbetrag', sample: '€ 10,40' },
}

// Which placeholders each report type supports.
export const COMPANY_PLACEHOLDERS: PlaceholderKey[] = ['monat', 'jahr']
export const MEMBER_PLACEHOLDERS: PlaceholderKey[] = ['monat', 'jahr', 'name', 'gesamt']

/** Resolve tokens to their sample values for the live example line. */
export function renderExample(tpl: string): string {
  return tpl
    .replace(/\{monat\}/gi, PLACEHOLDERS.monat.sample)
    .replace(/\{jahr\}/gi, PLACEHOLDERS.jahr.sample)
    .replace(/\{name\}/gi, PLACEHOLDERS.name.sample)
    .replace(/\{gesamt\}/gi, PLACEHOLDERS.gesamt.sample)
}
