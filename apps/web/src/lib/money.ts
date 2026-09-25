// Euro amounts in the admin UI. Amounts are integer cents everywhere else.

/** "€ 1,50", or "kostenlos" for zero when `free` is set. */
export function formatEuro(cents: number, opts: { free?: boolean } = {}): string {
  if (opts.free && cents === 0) return 'kostenlos'
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const euros = Math.floor(abs / 100).toLocaleString('de-DE')
  return `€ ${sign}${euros},${String(abs % 100).padStart(2, '0')}`
}

/**
 * Parse an amount typed by an admin into cents, or null if it is not one.
 *
 * Accepts German input ("1,50", "1.234,50", "0,5"), a plain dot decimal
 * ("1.50") and an optional € sign. The previous parser replaced only the first
 * comma and called parseFloat, so "1.234,50" became 1.234 → 123 cents.
 */
export function parseEuro(input: string): number | null {
  let s = input.trim().replace(/€/g, '').replace(/\s+/g, '')
  if (!s) return null
  if (s.includes(',')) {
    // German: dots are thousands separators, the comma is the decimal mark.
    if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(s)) return null
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    // Without a comma, a dot is only accepted as a decimal mark ("1.50"); an
    // ambiguous "1.234" is refused rather than silently read as one euro.
    return null
  }
  const cents = Math.round(Number(s) * 100)
  return Number.isFinite(cents) ? cents : null
}
