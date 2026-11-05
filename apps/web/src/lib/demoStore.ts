// A visitor's own edits on the public demo, kept in their browser.
//
// WHY. The demo is one deployment shared by everyone who opens the link, on a
// database that also serves previews. If a visitor's "save" reached it, the next
// visitor would arrive to renamed companies, a changed report recipient and a
// month ticked as paid — and whoever is being shown the product would be shown
// someone else's mess. So the server refuses every write (demoWriteBlocked).
//
// Refusing alone would make the demo feel broken: greyed-out controls and error
// toasts demonstrate nothing. Instead the admin API client routes writes here,
// and reads come back with these edits laid over the server's data. The product
// behaves exactly as it does on a campus instance — it just forgets when the
// visitor closes the tab, and nobody else ever sees it.
//
// Scope and limits, deliberately:
//   * localStorage, so it is per browser and per device and survives a reload.
//   * Every read and write is wrapped — private windows and blocked site data
//     throw on access, and a demo must not break because storage is unavailable.
//   * No merging with anything. This is a preview layer, never a source of truth.

const KEY = 'kaffeelisten.demo.v1'

export type Patch = Record<string, unknown>

interface Journal {
  /** resource -> row id -> changed fields */
  updates: Record<string, Record<string, Patch>>
  /** resource -> rows the visitor created, already in the list's own shape */
  creates: Record<string, Patch[]>
  /** whole-object overlays: 'settings', 'theme' */
  singletons: Record<string, Patch>
  /** `member:<id>:<YYYY-MM>` / `company:<id>:<YYYY-MM>` -> paid */
  paid: Record<string, boolean>
}

const EMPTY: Journal = { updates: {}, creates: {}, singletons: {}, paid: {} }

function read(): Journal {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(EMPTY)
    const parsed = JSON.parse(raw) as Partial<Journal>
    return {
      updates: parsed.updates ?? {},
      creates: parsed.creates ?? {},
      singletons: parsed.singletons ?? {},
      paid: parsed.paid ?? {},
    }
  } catch {
    // Unreadable or unparseable: start clean rather than taking the demo down.
    return structuredClone(EMPTY)
  }
}

function write(journal: Journal): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(journal))
  } catch {
    // Quota or blocked storage. The edit still applies to this page's state via
    // the caller's own React state; it simply will not survive a reload.
  }
}

/** Everything the visitor has changed, for the "unsaved changes" notice. */
export function demoEditCount(): number {
  const j = read()
  const updates = Object.values(j.updates).reduce((n, byId) => n + Object.keys(byId).length, 0)
  const creates = Object.values(j.creates).reduce((n, rows) => n + rows.length, 0)
  return updates + creates + Object.keys(j.singletons).length + Object.keys(j.paid).length
}

/** Discard the visitor's edits. The demo's own reset — it owns nothing else. */
export function resetDemoStore(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to do; there was nothing stored either.
  }
}

export function recordUpdate(resource: string, id: string, values: Patch): void {
  const j = read()
  const byId = (j.updates[resource] ??= {})
  byId[id] = { ...byId[id], ...values }
  write(j)
}

/**
 * Record a row the visitor added. It needs an id the rest of the interface can
 * key on; a `demo-` prefix keeps it obvious in a console and impossible to
 * confuse with a uuid from the database.
 */
export function recordCreate(resource: string, values: Patch): string {
  const j = read()
  const id = `demo-${resource}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  ;(j.creates[resource] ??= []).push({ ...values, id })
  write(j)
  return id
}

export function recordSingleton(name: string, values: Patch): void {
  const j = read()
  j.singletons[name] = { ...j.singletons[name], ...values }
  write(j)
}

export function recordPaid(scope: 'member' | 'company', id: string, reportMonth: string, paid: boolean): void {
  const j = read()
  j.paid[`${scope}:${id}:${reportMonth}`] = paid
  write(j)
}

/** Lay the visitor's edits over a list the server returned. */
export function applyList<T extends { id: string }>(resource: string, rows: T[]): T[] {
  const j = read()
  const updates = j.updates[resource] ?? {}
  const created = (j.creates[resource] ?? []) as unknown as T[]
  return [...rows, ...created].map(row => (updates[row.id] ? { ...row, ...updates[row.id] } : row))
}

/** Lay the visitor's edits over a single object (settings, theme). */
export function applySingleton<T extends object>(name: string, value: T): T {
  const patch = read().singletons[name]
  return patch ? { ...value, ...patch } : value
}

/** Whether the visitor has re-ticked this cell, or undefined to keep the server's. */
export function paidOverride(scope: 'member' | 'company', id: string, reportMonth: string): boolean | undefined {
  return read().paid[`${scope}:${id}:${reportMonth}`]
}
