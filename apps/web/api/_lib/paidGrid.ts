// The "who has paid" grid behind the Mitarbeitende tab, as a pure function.
//
// Two ledgers, because there are two kinds of payer:
//   • a person who pays their own way  → member_payments  (migration 027)
//   • a company that pays for everyone → company_payments (migration 035)
// A company_paid company's employees get no personal tick; the company row does.
// House accounts (migration 034) roll up into their company and never appear as
// a person.

export interface PaidCell {
  amount_cents: number
  paid: boolean
}

export type MonthCells = Record<string, PaidCell>

export interface PricedMonthRow {
  member_id: string
  company_id: string
  month: string
  amount_cents: number
}

export interface PaidGridInput {
  months: readonly string[]
  rows: readonly PricedMonthRow[]
  companyPays: ReadonlySet<string>             // company ids with billing_mode = company_paid
  memberPayments: readonly { member_id: string; report_month: string; paid: boolean }[]
  companyPayments: readonly { company_id: string; report_month: string; paid: boolean }[]
}

export interface PaidGrid {
  // Individually billed people only.
  members: Record<string, MonthCells>
  // company_paid companies only.
  companies: Record<string, MonthCells>
}

export function derivePaidGrid(input: PaidGridInput): PaidGrid {
  const inWindow = new Set(input.months)
  const grid: PaidGrid = { members: {}, companies: {} }
  const cell = (bucket: Record<string, MonthCells>, id: string, month: string): PaidCell =>
    ((bucket[id] ??= {})[month] ??= { amount_cents: 0, paid: false })

  for (const r of input.rows) {
    if (!inWindow.has(r.month)) continue
    if (input.companyPays.has(r.company_id)) cell(grid.companies, r.company_id, r.month).amount_cents += r.amount_cents
    else cell(grid.members, r.member_id, r.month).amount_cents += r.amount_cents
  }

  // A paid flag with no consumption that month still surfaces, so a manual mark
  // never silently disappears.
  for (const p of input.memberPayments) {
    if (inWindow.has(p.report_month)) cell(grid.members, p.member_id, p.report_month).paid = p.paid
  }
  for (const p of input.companyPayments) {
    if (inWindow.has(p.report_month)) cell(grid.companies, p.company_id, p.report_month).paid = p.paid
  }
  return grid
}

export interface PaidSummary {
  month: string
  owe: number          // payers who owe something that month
  paid: number         // of those, marked paid
  outstanding_cents: number
}

/**
 * "X of Y paid" per month, counting each PAYER once: a person for individually
 * billed companies, the company for companies that pay. Company-paid employees
 * used to be skipped entirely, so they silently vanished from the count.
 */
export function summarisePaidGrid(grid: PaidGrid, months: readonly string[]): PaidSummary[] {
  return months.map(month => {
    let owe = 0
    let paid = 0
    let outstanding = 0
    for (const bucket of [grid.members, grid.companies]) {
      for (const cells of Object.values(bucket)) {
        const c = cells[month]
        if (!c || c.amount_cents <= 0) continue
        owe++
        if (c.paid) paid++
        else outstanding += c.amount_cents
      }
    }
    return { month, owe, paid, outstanding_cents: outstanding }
  })
}
