// Admin export: any range of entries — including months already archived and
// pruned from the live table — scoped by company, person or item.
//
// Archived months are deliberately NOT shown in the admin's Einträge table (it
// reads only the live table, see api/admin/data.ts); they are reachable here.

import { toCsv } from '../../src/lib/csv'
import { mergeLiveAndArchive, unitPriceOf, type TransactionCore } from './pricing'
import type { EnrichedTransaction } from './reportHtml'

export interface ExportFilters {
  from: string          // "YYYY-MM-DD", inclusive, Berlin calendar day
  to: string            // "YYYY-MM-DD", inclusive, Berlin calendar day
  companyId?: string
  memberId?: string
  itemId?: string
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

// Row caps keep a request inside the function time limit. A PDF renders every
// row as HTML, so it is capped much lower than the spreadsheet formats.
export const EXPORT_ROW_LIMIT: Record<ExportFormat, number> = { csv: 50_000, xlsx: 50_000, pdf: 2_000 }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type FilterParseResult = { filters: ExportFilters; format: ExportFormat } | { error: string }

const first = (v: unknown): string | undefined => {
  const x = Array.isArray(v) ? v[0] : v
  return typeof x === 'string' && x.trim() ? x.trim() : undefined
}

export function parseExportQuery(query: Record<string, unknown>): FilterParseResult {
  const from = first(query.from)
  const to = first(query.to)
  if (!from || !DATE_RE.test(from) || !to || !DATE_RE.test(to)) {
    return { error: 'Bitte einen gültigen Zeitraum angeben (from/to im Format JJJJ-MM-TT).' }
  }
  if (from > to) return { error: 'Das Startdatum liegt nach dem Enddatum.' }
  const format = (first(query.format) ?? 'csv') as ExportFormat
  if (!(format in EXPORT_ROW_LIMIT)) return { error: 'Unbekanntes Format. Erlaubt: csv, xlsx, pdf.' }
  return {
    format,
    filters: {
      from,
      to,
      companyId: first(query.company_id),
      memberId: first(query.member_id),
      itemId: first(query.item_id),
    },
  }
}

const berlinDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
})

/** The Europe/Berlin calendar date ("YYYY-MM-DD") of a UTC timestamp. */
export function berlinDate(iso: string): string {
  return berlinDay.format(new Date(iso))
}

/**
 * A UTC window wide enough to contain every Berlin day in [from, to], for the
 * database query. Berlin is UTC+1/+2, so one day of padding either side is enough;
 * the exact Berlin-day match is then applied in buildExportRows.
 */
export function queryWindow(filters: Pick<ExportFilters, 'from' | 'to'>): { gte: string; lt: string } {
  const start = new Date(`${filters.from}T00:00:00.000Z`)
  start.setUTCDate(start.getUTCDate() - 1)
  const end = new Date(`${filters.to}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() + 2)
  return { gte: start.toISOString(), lt: end.toISOString() }
}

type LiveRow = TransactionCore & { member_id: string; company_id: string; logged_at: string }
type ArchiveRow = LiveRow & {
  report_month: string
  item_name?: string | null
  unit_label?: string | null
  item_category?: string | null
}

export interface ExportLookups {
  members: ReadonlyMap<string, { name: string; work_email: string | null }>
  companies: ReadonlyMap<string, string>
  items: ReadonlyMap<string, { name: string; unit_label: string; category: string; price_cents: number }>
}

/**
 * Live and archived entries in the range, each once, filtered and priced, oldest
 * first. The archive copy wins where a row is in both (pricing.ts), so an entry
 * keeps the price and item name it was reported with.
 */
export function buildExportRows(
  live: readonly LiveRow[],
  archive: readonly ArchiveRow[],
  lookups: ExportLookups,
  filters: ExportFilters,
): EnrichedTransaction[] {
  const catalogue = new Map([...lookups.items].map(([id, i]) => [id, i.price_cents]))
  return mergeLiveAndArchive(live, archive)
    .filter(t => {
      const day = berlinDate(t.logged_at)
      return (
        day >= filters.from &&
        day <= filters.to &&
        (!filters.companyId || t.company_id === filters.companyId) &&
        (!filters.memberId || t.member_id === filters.memberId) &&
        (!filters.itemId || t.item_id === filters.itemId)
      )
    })
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at))
    .map(t => {
      const archived = t as Partial<ArchiveRow>
      const item = lookups.items.get(t.item_id)
      const member = lookups.members.get(t.member_id)
      const price_cents = unitPriceOf(t, catalogue)
      return {
        id: t.id,
        member_id: t.member_id,
        company_id: t.company_id,
        item_id: t.item_id,
        quantity: t.quantity,
        logged_at: t.logged_at,
        member_name: member?.name ?? '—',
        work_email: member?.work_email ?? null,
        company_name: lookups.companies.get(t.company_id) ?? '—',
        item_name: archived.item_name ?? item?.name ?? '—',
        item_category: archived.item_category ?? item?.category ?? '—',
        unit_label: archived.unit_label ?? item?.unit_label ?? 'Stück',
        price_cents,
        total_cents: price_cents * t.quantity,
      }
    })
}

const euro = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

/** Semicolon CSV for German Excel, formula-injection safe, with a UTF-8 BOM. */
export function exportCsv(rows: readonly EnrichedTransaction[]): string {
  const header = ['Datum', 'Uhrzeit', 'Person', 'E-Mail', 'Unternehmen', 'Artikel', 'Kategorie', 'Menge', 'Einzelpreis (€)', 'Betrag (€)']
  const body = rows.map(t => {
    const d = new Date(t.logged_at)
    return [
      d.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' }),
      d.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }),
      t.member_name,
      t.work_email ?? '',
      t.company_name,
      t.item_name,
      t.item_category,
      String(t.quantity),
      euro(t.price_cents),
      euro(t.total_cents),
    ]
  })
  // The BOM makes Excel open the file as UTF-8, so umlauts survive.
  return '﻿' + toCsv([header, ...body])
}

/** A readable description of the filters, for file names and document headers. */
export function describeFilters(filters: ExportFilters, lookups: ExportLookups): string {
  const parts = [`${filters.from} bis ${filters.to}`]
  if (filters.companyId) parts.push(lookups.companies.get(filters.companyId) ?? 'unbekanntes Unternehmen')
  if (filters.memberId) parts.push(lookups.members.get(filters.memberId)?.name ?? 'unbekannte Person')
  if (filters.itemId) parts.push(lookups.items.get(filters.itemId)?.name ?? 'unbekannter Artikel')
  return parts.join(' · ')
}
