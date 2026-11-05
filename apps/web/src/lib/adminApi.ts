// Client wrapper for the PIN-protected admin API (/api/admin/*).
//
// The admin panel no longer talks to Supabase directly with the public anon key
// — that key can no longer read work emails/transactions or write catalogue data
// (migration 015). All admin reads/writes go through the serverless API, which
// authenticates the request server-side and uses the service-role key.
//
// Auth is a signed HttpOnly session cookie set at login; the browser sends it
// automatically on same-origin requests, so no PIN is stored or sent here.

import type { ReportProgress } from '../../shared/reportProgress'
import { isDemoNow } from './appConfig'
import { applyList, paidOverride, recordCreate, recordPaid, recordUpdate, resetDemoStore } from './demoStore'

/**
 * On the demo, keep this write in the visitor's browser and report success.
 *
 * Returns null anywhere else, so each method reads as "demo path, else the real
 * request". The server refuses these writes regardless (demoWriteBlocked) — this
 * is what stops the interface looking broken, not what makes it safe.
 */
function demoWrite(record: () => void): Promise<{ ok: true }> | null {
  if (!isDemoNow()) return null
  record()
  return Promise.resolve({ ok: true as const })
}

export type BillingMode = 'individual' | 'company_paid'
export type CheckoutMode = 'member' | 'company' | 'both'

export interface AdminCompany {
  id: string
  name: string
  active: boolean
  // Optional because the dashboard endpoint returns a slimmer company shape.
  billing_mode?: BillingMode
  billing_contact_name?: string | null
  billing_contact_email?: string | null
  billing_notes?: string | null
  member_document_copies_enabled?: boolean   // migration 033
  employee_list_enabled?: boolean            // migration 041
  checkout_mode?: CheckoutMode                // migration 034
}

export type CompanyBillingValues = {
  billing_mode: BillingMode
  billing_contact_name: string | null
  billing_contact_email: string | null
  billing_notes: string | null
  member_document_copies_enabled: boolean
  employee_list_enabled: boolean
  checkout_mode: CheckoutMode
}

export interface AdminItem {
  id: string
  name: string
  unit_label: string
  price_cents: number
  category: string
  active: boolean
}

export interface AdminMember {
  id: string
  name: string
  company_id: string
  work_email: string | null
  active: boolean
  email_verified_at: string | null
}

export interface DashboardTransaction {
  id: string
  member_id: string
  company_id: string
  item_id: string
  quantity: number
  // Price at checkout (migration 030). Null for rows logged before it existed,
  // which fall back to the item's catalogue price.
  unit_price_cents: number | null
  logged_at: string
}

export interface DashboardData {
  transactions: DashboardTransaction[]
  members: { id: string; name: string; work_email: string | null; kind?: 'person' | 'house' }[]
  companies: AdminCompany[]
  items: { id: string; name: string; price_cents: number }[]
}

export interface PaidCell {
  amount_cents: number
  paid: boolean
}

export interface PaidSummary {
  month: string
  owe: number
  paid: number
  outstanding_cents: number
}

export interface PaidGrid {
  enabled: boolean
  months: string[]
  // Individually billed people: member_id → month → cell.
  rows: Record<string, Record<string, PaidCell>>
  // Companies that pay for their people: company_id → month → cell (migration 035).
  companies: Record<string, Record<string, PaidCell>>
  // "X von Y bezahlt", counting each payer once.
  summary: PaidSummary[]
}

export interface MemberPaymentMonth {
  report_month: string
  amount_cents: number
  paid: boolean
  covered_by_company: boolean
}

export interface BillingDocument {
  id: string
  report_month: string
  document_number: string
  recipient_type: 'member' | 'company' | 'itc1_archive'
  recipient_name: string
  recipient_email: string
  total_cents: number
  status: 'draft' | 'sent' | 'failed' | 'voided'
  paid: boolean
  sent_at: string | null
}

export type DeliveryKind = 'member_invoice' | 'member_statement' | 'member_info' | 'company_invoice' | 'company_statement'

export interface DocumentDelivery {
  id: string
  report_month: string
  kind: DeliveryKind
  company_id: string
  company_name: string
  member_id: string | null
  recipient_name: string
  recipient_email: string
  document_number: string | null
  billing_document_id: string | null
  gross_cents: number
  has_pdf: boolean
  has_xlsx: boolean
  resend_of: string | null
  sent_at: string
}

export interface ExportQuery {
  from: string
  to: string
  company_id?: string
  member_id?: string
  item_id?: string
  format: 'csv' | 'xlsx' | 'pdf'
}

async function request<T>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? 'GET',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : {},
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  })
  if (!res.ok) throw new Error(await errorMessage(res))
  return res.json() as Promise<T>
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data?.error) return data.error
  } catch {
    // non-JSON error body — keep the generic message
  }
  return res.status === 401 ? 'Sitzung abgelaufen – bitte neu anmelden.' : 'Serverfehler'
}

const qs = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][]
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : ''
}

/**
 * Download a file from an admin endpoint. Uses fetch rather than a plain link so
 * an error (e.g. "too many rows") arrives as a readable message instead of a
 * browser download of a JSON error body.
 */
async function download(url: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await errorMessage(res))
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'kaffeelisten-download'
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(href)
}

/**
 * Re-tick the grid with whatever the visitor changed in their own browser.
 *
 * The summary counts are recomputed from the cells rather than patched, so
 * "3 von 18 bezahlt" stays true to what is on screen.
 */
function applyPaidOverrides(grid: PaidGrid): PaidGrid {
  if (!isDemoNow()) return grid

  const overlay = (scope: 'member' | 'company', byId: Record<string, Record<string, PaidCell>>) =>
    Object.fromEntries(
      Object.entries(byId).map(([id, months]) => [
        id,
        Object.fromEntries(
          Object.entries(months).map(([month, cell]) => {
            const override = paidOverride(scope, id, month)
            return [month, override === undefined ? cell : { ...cell, paid: override }]
          }),
        ),
      ]),
    )

  const rows = overlay('member', grid.rows)
  const companies = overlay('company', grid.companies)

  const summary = grid.summary.map(s => {
    const cells = [
      ...Object.values(rows).map(m => m[s.month]),
      ...Object.values(companies).map(m => m[s.month]),
    ].filter(Boolean)
    return {
      ...s,
      paid: cells.filter(c => c.paid).length,
      outstanding_cents: cells.filter(c => !c.paid).reduce((n, c) => n + c.amount_cents, 0),
    }
  })

  return { ...grid, rows, companies, summary }
}

const data = (query: string, init?: { method?: string; body?: unknown }) => request(`/api/admin/data${query}`, init)

export const adminApi = {
  getDashboard: () => data('?resource=dashboard') as Promise<DashboardData>,

  getCompanies: async () =>
    applyList('companies', ((await data('?resource=companies')) as { companies: AdminCompany[] }).companies),
  createCompany: (values: { name: string } & Partial<CompanyBillingValues>) =>
    demoWrite(() => recordCreate('companies', { ...values, active: true })) ??
    data('?resource=companies', { method: 'POST', body: { values: { ...values, active: true } } }),
  updateCompany: (id: string, values: Partial<Pick<AdminCompany, 'name' | 'active'> & CompanyBillingValues>) =>
    demoWrite(() => recordUpdate('companies', id, values)) ??
    data('?resource=companies', { method: 'PATCH', body: { id, values } }),

  getItems: async () => applyList('items', ((await data('?resource=items')) as { items: AdminItem[] }).items),
  createItem: (values: Omit<AdminItem, 'id'>) =>
    demoWrite(() => recordCreate('items', { ...values })) ??
    data('?resource=items', { method: 'POST', body: { values } }),
  updateItem: (id: string, values: Partial<Omit<AdminItem, 'id'>>) =>
    demoWrite(() => recordUpdate('items', id, values)) ??
    data('?resource=items', { method: 'PATCH', body: { id, values } }),

  getMembers: async () => applyList('members', ((await data('?resource=members')) as { members: AdminMember[] }).members),
  createMember: (values: { name: string; company_id: string; work_email: string; active: boolean }) =>
    demoWrite(() => recordCreate('members', { ...values, email_verified_at: null })) ??
    data('?resource=members', { method: 'POST', body: { values } }),
  updateMember: (id: string, values: Partial<{ name: string; company_id: string; work_email: string; active: boolean }>) =>
    demoWrite(() => recordUpdate('members', id, values)) ??
    data('?resource=members', { method: 'PATCH', body: { id, values } }),
  // Mail is absent from the demo entirely, so this is a no-op there rather than
  // a stored edit — there is nothing for the visitor to see either way.
  sendMemberConfirmation: (id: string) =>
    demoWrite(() => {}) ??
    data('?resource=members&action=send-confirmation', { method: 'POST', body: { id } }),

  // ── Invoice ledger (billing_documents; invoices only) ──
  getBillingDocuments: (month?: string) =>
    request<{ documents: BillingDocument[]; months: string[] }>(`/api/admin/billing${qs({ month })}`),
  setBillingPaid: (id: string, paid: boolean) =>
    demoWrite(() => recordUpdate('billing_documents', id, { paid })) ??
    request('/api/admin/billing', { method: 'PATCH', body: { id, paid } }),

  // ── Live progress of the monthly send (migration 040) ──
  getReportProgress: (month: string) =>
    request<ReportProgress>(`/api/admin/report-progress${qs({ month })}`),

  // ── Delivered documents of every kind (migration 037) ──
  getDeliveries: (month?: string) =>
    request<{ months: string[]; month: string | null; deliveries: DocumentDelivery[] }>(`/api/admin/documents${qs({ month })}`),
  previewDelivery: (id: string) =>
    request<{ subject: string; html: string }>(`/api/admin/documents${qs({ id, as: 'html' })}`),
  downloadDelivery: (id: string, as: 'pdf' | 'xlsx') => download(`/api/admin/documents${qs({ id, as })}`),
  resendDelivery: (id: string) =>
    request<{ ok: true; id: string }>('/api/admin/documents', { method: 'POST', body: { id, action: 'resend' } }),

  /** The visitor's own edits, so the demo can offer to discard them. */
  demoReset: () => resetDemoStore(),

  // ── Export, including archived months ──
  exportEntries: (q: ExportQuery) => download(`/api/admin/export${qs({ ...q })}`),

  // ── Payment tracking (migrations 027, 035) ──
  getMemberPayments: async (memberId: string) =>
    (await request<{ months: MemberPaymentMonth[] }>(`/api/admin/payments${qs({ member_id: memberId })}`)).months,
  getPaidGrid: async () => applyPaidOverrides(await request<PaidGrid>('/api/admin/payments')),
  setMemberPaid: (memberId: string, reportMonth: string, paid: boolean) =>
    demoWrite(() => recordPaid('member', memberId, reportMonth, paid)) ??
    request('/api/admin/payments', { method: 'PATCH', body: { member_id: memberId, report_month: reportMonth, paid } }),
  setCompanyPaid: (companyId: string, reportMonth: string, paid: boolean) =>
    demoWrite(() => recordPaid('company', companyId, reportMonth, paid)) ??
    request('/api/admin/payments', { method: 'PATCH', body: { company_id: companyId, report_month: reportMonth, paid } }),
}
