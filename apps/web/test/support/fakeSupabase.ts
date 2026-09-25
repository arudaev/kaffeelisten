// A small in-memory stand-in for the parts of the Supabase JS query builder the
// monthly report uses, so runMonthlyReport can be exercised end to end without a
// network, a database or an email provider.
//
// Supported: select/insert/upsert/update, the filters eq/in/gte/lt, order,
// single/maybeSingle, and rpc() through a handler map. Anything else throws, so
// a new query shape fails loudly here instead of silently returning nothing.

type Row = Record<string, unknown>
type Filter = (row: Row) => boolean

export interface FakeDb {
  tables: Record<string, Row[]>
  rpc: Record<string, (args: Record<string, unknown>) => unknown>
}

class Query implements PromiseLike<{ data: unknown; error: null | { message: string } }> {
  private filters: Filter[] = []
  private op: 'select' | 'insert' | 'upsert' | 'update' = 'select'
  private payload: Row | Row[] | null = null
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {}
  private orderBy: { col: string; asc: boolean } | null = null
  private columns: string[] | null = null   // null → all columns
  private selectAfterWrite = false
  private mode: 'many' | 'single' | 'maybeSingle' = 'many'

  constructor(private db: FakeDb, private table: string) {
    db.tables[table] ??= []
  }

  // Honours the column list like PostgREST does, so code that reads a column it
  // never selected fails here too instead of passing against a too-generous fake.
  select(cols?: string) {
    if (this.op !== 'select') this.selectAfterWrite = true
    const list = (cols ?? '*').split(',').map(c => c.trim()).filter(Boolean)
    this.columns = list.includes('*') || list.some(c => c.includes('(')) ? null : list
    return this
  }
  insert(payload: Row | Row[]) { this.op = 'insert'; this.payload = payload; return this }
  upsert(payload: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = 'upsert'; this.payload = payload; this.upsertOpts = opts; return this
  }
  update(payload: Row) { this.op = 'update'; this.payload = payload; return this }
  delete(): never { throw new Error(`fakeSupabase: delete() on ${this.table} is not supported`) }

  eq(col: string, v: unknown) { this.filters.push(r => r[col] === v); return this }
  in(col: string, vs: unknown[]) { this.filters.push(r => vs.includes(r[col])); return this }
  gte(col: string, v: string) { this.filters.push(r => String(r[col]) >= v); return this }
  lt(col: string, v: string) { this.filters.push(r => String(r[col]) < v); return this }
  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orderBy = { col, asc: opts.ascending !== false }
    return this
  }
  single() { this.mode = 'single'; return this }
  maybeSingle() { this.mode = 'maybeSingle'; return this }

  private rows(): Row[] {
    return this.db.tables[this.table]
  }

  private execute(): { data: unknown; error: null | { message: string } } {
    const table = this.rows()
    let result: Row[]

    if (this.op === 'select') {
      result = table.filter(r => this.filters.every(f => f(r)))
    } else if (this.op === 'update') {
      result = table.filter(r => this.filters.every(f => f(r)))
      for (const r of result) Object.assign(r, this.payload)
    } else {
      const incoming = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map(r => ({
        id: r.id ?? `gen-${this.table}-${table.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
        ...r,
      }))
      result = []
      const keys = this.op === 'upsert' ? (this.upsertOpts.onConflict ?? 'id').split(',') : null
      for (const row of incoming) {
        const existing = keys ? table.find(r => keys.every(k => r[k] === row[k])) : undefined
        if (existing) {
          if (!this.upsertOpts.ignoreDuplicates) Object.assign(existing, row)
          result.push(existing)
        } else {
          table.push(row)
          result.push(row)
        }
      }
    }

    if (this.orderBy) {
      const { col, asc } = this.orderBy
      result = [...result].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1))
    }

    const cols = this.columns
    const copies = result.map(r =>
      cols ? Object.fromEntries(cols.map(c => [c, r[c] ?? null])) : { ...r },
    )
    if (this.mode === 'single') {
      return copies.length === 1
        ? { data: copies[0], error: null }
        : { data: null, error: { message: `single() matched ${copies.length} rows in ${this.table}` } }
    }
    if (this.mode === 'maybeSingle') return { data: copies[0] ?? null, error: null }
    if (this.op !== 'select' && !this.selectAfterWrite) return { data: null, error: null }
    return { data: copies, error: null }
  }

  then<T1 = { data: unknown; error: null | { message: string } }, T2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null | { message: string } }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve().then(() => this.execute()).then(onfulfilled, onrejected)
  }
}

export function createFakeClient(db: FakeDb) {
  return {
    from: (table: string) => new Query(db, table),
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      const handler = db.rpc[name]
      if (!handler) throw new Error(`fakeSupabase: rpc ${name} has no handler`)
      return { data: handler(args), error: null }
    },
  }
}
