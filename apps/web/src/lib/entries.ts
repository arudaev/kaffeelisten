// Turning the admin dashboard payload into rows and figures, as pure functions.
//
// Four display bugs lived in AdminDashboard.tsx and are fixed here:
//   • amounts used today's catalogue price instead of the price at checkout;
//   • the month filter compared the UTC timestamp, so an entry at 00:30 Berlin
//     time on the 1st landed in the previous month;
//   • "Konsumierende" counted distinct names, merging two people called Max;
//   • the "Unternehmen mit Einträgen" card counted every company.

import type { DashboardData } from './adminApi'

export interface EntryRow {
  id: string
  logged_at: string
  month: string             // Berlin calendar month, "YYYY-MM"
  date: string              // Berlin calendar date, "YYYY-MM-DD"
  member_id: string
  member_name: string
  is_house: boolean
  work_email: string | null
  company_id: string
  company_name: string
  item_id: string
  item_name: string
  quantity: number
  unit_price_cents: number
  total_cents: number
}

const berlinDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })

export function berlinDateOf(iso: string): string {
  return berlinDate.format(new Date(iso))
}

export function berlinMonthOf(iso: string): string {
  return berlinDateOf(iso).slice(0, 7)
}

export function toEntryRows(data: DashboardData): EntryRow[] {
  const members = new Map(data.members.map(m => [m.id, m]))
  const companies = new Map(data.companies.map(c => [c.id, c.name]))
  const items = new Map(data.items.map(i => [i.id, i]))
  return data.transactions.map(t => {
    const member = members.get(t.member_id)
    const item = items.get(t.item_id)
    // The checkout snapshot wins; only rows logged before it existed fall back.
    const unit = t.unit_price_cents ?? item?.price_cents ?? 0
    const isHouse = member?.kind === 'house'
    const date = berlinDateOf(t.logged_at)
    return {
      id: t.id,
      logged_at: t.logged_at,
      month: date.slice(0, 7),
      date,
      member_id: t.member_id,
      member_name: isHouse ? 'Sammelkonto' : member?.name ?? '—',
      is_house: isHouse,
      work_email: member?.work_email ?? null,
      company_id: t.company_id,
      company_name: companies.get(t.company_id) ?? '—',
      item_id: t.item_id,
      item_name: item?.name ?? '—',
      quantity: t.quantity,
      unit_price_cents: unit,
      total_cents: unit * t.quantity,
    }
  })
}

export interface MonthFigures {
  entries: number
  quantity: number
  totalCents: number
  consumers: number          // distinct people (house accounts excluded)
  companiesWithEntries: number
  topItem: { name: string; quantity: number } | null
  byCompany: Map<string, { entries: number; totalCents: number }>
}

/**
 * Figures for a month. `throughDay` stops at that day of the month, so the month
 * in progress can be compared with the SAME days of the previous month — a
 * half-finished month against a whole one reads as a steep drop that isn't real.
 */
export function monthFigures(rows: readonly EntryRow[], month: string, opts: { throughDay?: number } = {}): MonthFigures {
  const inMonth = rows.filter(r =>
    r.month === month && (opts.throughDay === undefined || Number(r.date.slice(8, 10)) <= opts.throughDay),
  )
  const itemQty = new Map<string, number>()
  const byCompany = new Map<string, { entries: number; totalCents: number }>()
  const people = new Set<string>()
  for (const r of inMonth) {
    itemQty.set(r.item_name, (itemQty.get(r.item_name) ?? 0) + r.quantity)
    const c = byCompany.get(r.company_id) ?? { entries: 0, totalCents: 0 }
    c.entries += 1
    c.totalCents += r.total_cents
    byCompany.set(r.company_id, c)
    if (!r.is_house) people.add(r.member_id)
  }
  const top = [...itemQty.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))[0]
  return {
    entries: inMonth.length,
    quantity: inMonth.reduce((s, r) => s + r.quantity, 0),
    totalCents: inMonth.reduce((s, r) => s + r.total_cents, 0),
    consumers: people.size,
    companiesWithEntries: byCompany.size,
    topItem: top ? { name: top[0], quantity: top[1] } : null,
    byCompany,
  }
}
