import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from '../src/lib/csv'

describe('csvCell', () => {
  it('quotes an ordinary value', () => {
    expect(csvCell('Anna')).toBe('"Anna"')
  })

  it('neutralizes formula-injection leads (= + - @)', () => {
    expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"')
    expect(csvCell('+1')).toBe('"\'+1"')
    expect(csvCell('-1')).toBe('"\'-1"')
    expect(csvCell('@cmd')).toBe('"\'@cmd"')
  })

  it('neutralizes leading control characters', () => {
    expect(csvCell('\tTab')).toBe('"\'\tTab"')
  })

  it('doubles embedded quotes', () => {
    expect(csvCell('a"b')).toBe('"a""b"')
  })
})

describe('toCsv', () => {
  it('joins cells with ; and rows with CRLF', () => {
    expect(toCsv([['a', '=b'], ['c', 'd']])).toBe('"a";"\'=b"\r\n"c";"d"')
  })
})
