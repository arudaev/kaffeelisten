// The one rule for what a transaction cost. Every amount in the app — reports,
// invoices, the paid grid, exports — must come through here.
//
// A row's own snapshot (unit_price_cents, written at checkout since migration 030
// and carried into the archive by migration 031) always wins. Only rows logged
// before the snapshot existed fall back to the current catalogue price. Deriving
// from the catalogue first is what used to make past months' totals change
// whenever an item was repriced.

export interface PricedRow {
  item_id: string
  quantity: number
  unit_price_cents?: number | null
}

export function unitPriceOf(row: PricedRow, catalogue: ReadonlyMap<string, number>): number {
  if (row.unit_price_cents != null) return row.unit_price_cents
  return catalogue.get(row.item_id) ?? 0
}

export function amountOf(row: PricedRow, catalogue: ReadonlyMap<string, number>): number {
  return unitPriceOf(row, catalogue) * row.quantity
}

// ─── Live + archive, counted once ────────────────────────────────────────────

// The columns both tables share. Callers may carry more (member_id, company_id…),
// and get them back on the merged rows.
export type TransactionCore = PricedRow & { id: string }

// Union of the live table and the archive with every transaction appearing ONCE.
//
// A reported month lives in BOTH tables: archiveTransactions copies it at report
// time, but the live table is only pruned two months later. Summing both — as the
// paid grid once did — counts every reported month twice. The archive copy wins,
// because it carries the price and month as they were fixed at reporting time.
export function mergeLiveAndArchive<
  L extends TransactionCore & { logged_at: string },
  A extends TransactionCore & { report_month: string },
>(live: readonly L[], archive: readonly A[]): MergedRow<L, A>[] {
  const byId = new Map<string, MergedRow<L, A>>()
  for (const r of archive) {
    byId.set(r.id, { ...r, month: r.report_month } as unknown as MergedRow<L, A>)
  }
  for (const r of live) {
    if (!byId.has(r.id)) {
      byId.set(r.id, { ...r, month: String(r.logged_at).slice(0, 7) } as unknown as MergedRow<L, A>)
    }
  }
  return [...byId.values()]
}

// A merged row exposes only the columns both sides were selected with, plus the
// resolved month. The table-specific timestamp columns are dropped from the type.
// TransactionCore is repeated explicitly because Omit<> over an untyped (`any`)
// Supabase row collapses to an index signature and would lose id/item_id/quantity.
export type MergedRow<L, A> = TransactionCore & Omit<L, 'logged_at'> & Omit<A, 'report_month'> & { month: string }
