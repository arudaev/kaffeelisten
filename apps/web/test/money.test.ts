import { describe, expect, it } from 'vitest'
import { formatEuro, parseEuro } from '../src/lib/money'

describe('parseEuro', () => {
  it('reads German amounts, including thousands separators', () => {
    expect(parseEuro('0,50')).toBe(50)
    expect(parseEuro('0,5')).toBe(50)
    expect(parseEuro('1.234,50')).toBe(123450) // the old parser returned 123
    expect(parseEuro('€ 2,10')).toBe(210)
    expect(parseEuro('3')).toBe(300)
  })

  it('accepts a plain dot decimal', () => {
    expect(parseEuro('1.50')).toBe(150)
  })

  it('refuses input it cannot read unambiguously', () => {
    expect(parseEuro('')).toBeNull()
    expect(parseEuro('abc')).toBeNull()
    expect(parseEuro('-1,00')).toBeNull()
    expect(parseEuro('1,234')).toBeNull()   // three decimals
    expect(parseEuro('1.234')).toBeNull()   // one euro or a thousand?
    expect(parseEuro('12.34.56')).toBeNull()
  })

  it('does not lose a cent to floating point', () => {
    expect(parseEuro('0,29')).toBe(29)
    expect(parseEuro('1,15')).toBe(115)
  })
})

describe('formatEuro', () => {
  it('formats with a comma and a thousands dot', () => {
    expect(formatEuro(123450)).toBe('€ 1.234,50')
    expect(formatEuro(50)).toBe('€ 0,50')
  })

  it('names a free item when asked', () => {
    expect(formatEuro(0, { free: true })).toBe('kostenlos')
    expect(formatEuro(0)).toBe('€ 0,00')
  })

  it('round-trips with parseEuro', () => {
    for (const cents of [0, 5, 50, 199, 123450]) {
      expect(parseEuro(formatEuro(cents))).toBe(cents)
    }
  })
})
