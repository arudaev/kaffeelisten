import { describe, expect, it } from 'vitest'
import { derivePaidGrid, summarisePaidGrid, type PaidGridInput } from '../api/_lib/paidGrid'

const months = ['2026-07', '2026-08', '2026-09']

function input(o: Partial<PaidGridInput> = {}): PaidGridInput {
  return {
    months,
    rows: [
      // EFCO: each person pays.
      { member_id: 'shen', company_id: 'efco', month: '2026-08', amount_cents: 100 },
      { member_id: 'shen', company_id: 'efco', month: '2026-08', amount_cents: 70 },
      { member_id: 'bettina', company_id: 'efco', month: '2026-08', amount_cents: 50 },
      // 4process: the company pays for Anna, Ben and its house account.
      { member_id: 'anna', company_id: '4p', month: '2026-08', amount_cents: 210 },
      { member_id: 'ben', company_id: '4p', month: '2026-08', amount_cents: 90 },
      { member_id: 'house-4p', company_id: '4p', month: '2026-08', amount_cents: 300 },
      // Outside the window.
      { member_id: 'shen', company_id: 'efco', month: '2026-06', amount_cents: 999 },
    ],
    companyPays: new Set(['4p']),
    memberPayments: [],
    companyPayments: [],
    ...o,
  }
}

describe('derivePaidGrid', () => {
  it('sums individually billed people per month', () => {
    const grid = derivePaidGrid(input())
    expect(grid.members.shen['2026-08']).toEqual({ amount_cents: 170, paid: false })
    expect(grid.members.bettina['2026-08'].amount_cents).toBe(50)
  })

  it('rolls a paying company’s people — and its house account — into one company cell', () => {
    const grid = derivePaidGrid(input())
    expect(grid.companies['4p']['2026-08']).toEqual({ amount_cents: 600, paid: false })
    expect(grid.members.anna).toBeUndefined()
    expect(grid.members['house-4p']).toBeUndefined()
  })

  it('ignores months outside the window', () => {
    expect(derivePaidGrid(input()).members.shen['2026-06']).toBeUndefined()
  })

  it('applies each ledger to its own kind of payer', () => {
    const grid = derivePaidGrid(input({
      memberPayments: [{ member_id: 'shen', report_month: '2026-08', paid: true }],
      companyPayments: [{ company_id: '4p', report_month: '2026-08', paid: true }],
    }))
    expect(grid.members.shen['2026-08'].paid).toBe(true)
    expect(grid.members.bettina['2026-08'].paid).toBe(false)
    expect(grid.companies['4p']['2026-08'].paid).toBe(true)
  })

  it('keeps a paid mark for a month with no consumption', () => {
    const grid = derivePaidGrid(input({ companyPayments: [{ company_id: '4p', report_month: '2026-07', paid: true }] }))
    expect(grid.companies['4p']['2026-07']).toEqual({ amount_cents: 0, paid: true })
  })
})

describe('summarisePaidGrid', () => {
  it('counts each payer once: two people plus one company, not four people', () => {
    const [, aug] = summarisePaidGrid(derivePaidGrid(input()), months)
    expect(aug).toEqual({ month: '2026-08', owe: 3, paid: 0, outstanding_cents: 820 })
  })

  it('removes a paid payer from the outstanding total', () => {
    const grid = derivePaidGrid(input({ companyPayments: [{ company_id: '4p', report_month: '2026-08', paid: true }] }))
    const [, aug] = summarisePaidGrid(grid, months)
    expect(aug).toMatchObject({ owe: 3, paid: 1, outstanding_cents: 220 })
  })

  it('does not count a payer who owes nothing that month', () => {
    const [jul] = summarisePaidGrid(derivePaidGrid(input()), months)
    expect(jul).toEqual({ month: '2026-07', owe: 0, paid: 0, outstanding_cents: 0 })
  })
})
