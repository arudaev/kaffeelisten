// Client wrapper for the PIN-protected admin data API (/api/admin/data).
//
// The admin panel no longer talks to Supabase directly with the public anon key
// — that key can no longer read work emails/transactions or write catalogue data
// (migration 015). All admin reads/writes go through the serverless API, which
// authenticates the request server-side and uses the service-role key.
//
// Auth is a signed HttpOnly session cookie set at login; the browser sends it
// automatically on same-origin requests, so no PIN is stored or sent here.

export interface AdminCompany {
  id: string
  name: string
  active: boolean
  // Billing (migration 023). Optional because the dashboard endpoint returns a
  // slimmer company shape without them.
  billing_mode?: 'individual' | 'company_paid'
  billing_contact_name?: string | null
  billing_contact_email?: string | null
  billing_notes?: string | null
}

export type CompanyBillingValues = {
  billing_mode: 'individual' | 'company_paid'
  billing_contact_name: string | null
  billing_contact_email: string | null
  billing_notes: string | null
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
  logged_at: string
}

export interface DashboardData {
  transactions: DashboardTransaction[]
  members: { id: string; name: string; work_email: string | null }[]
  companies: AdminCompany[]
  items: { id: string; name: string; price_cents: number }[]
}

async function call<T>(
  method: 'GET' | 'POST' | 'PATCH',
  query: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api/admin/data${query}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    let message = 'Serverfehler'
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const adminApi = {
  getDashboard: () => call<DashboardData>('GET', '?resource=dashboard'),

  getCompanies: async () =>
    (await call<{ companies: AdminCompany[] }>('GET', '?resource=companies')).companies,
  createCompany: (values: { name: string } & Partial<CompanyBillingValues>) =>
    call<{ ok: true }>('POST', '?resource=companies', { values: { ...values, active: true } }),
  updateCompany: (
    id: string,
    values: Partial<Pick<AdminCompany, 'name' | 'active'> & CompanyBillingValues>,
  ) => call<{ ok: true }>('PATCH', '?resource=companies', { id, values }),

  getItems: async () =>
    (await call<{ items: AdminItem[] }>('GET', '?resource=items')).items,
  createItem: (values: Omit<AdminItem, 'id'>) =>
    call<{ ok: true }>('POST', '?resource=items', { values }),
  updateItem: (id: string, values: Partial<Omit<AdminItem, 'id'>>) =>
    call<{ ok: true }>('PATCH', '?resource=items', { id, values }),

  getMembers: async () =>
    (await call<{ members: AdminMember[] }>('GET', '?resource=members')).members,
  createMember: (values: { name: string; company_id: string; work_email: string; active: boolean }) =>
    call<{ ok: true }>('POST', '?resource=members', { values }),
  updateMember: (
    id: string,
    values: Partial<{ name: string; company_id: string; work_email: string; active: boolean }>,
  ) => call<{ ok: true }>('PATCH', '?resource=members', { id, values }),
  sendMemberConfirmation: (id: string) =>
    call<{ ok: true }>('POST', '?resource=members&action=send-confirmation', { id }),

  // ── Billing documents (invoice ledger, feature E) ──
  getBillingDocuments: async (month?: string) =>
    (await billingCall<{ documents: BillingDocument[]; months: string[] }>(
      'GET', month ? `?month=${encodeURIComponent(month)}` : '',
    )),
  setBillingPaid: (id: string, paid: boolean) =>
    billingCall<{ ok: true }>('PATCH', '', { id, paid }),

  // ── Per-member payment tracking (migration 027) ──
  getMemberPayments: async (memberId: string) =>
    (await paymentsCall<{ months: MemberPaymentMonth[] }>(
      'GET', `?member_id=${encodeURIComponent(memberId)}`,
    )).months,
  // The last-3-months paid grid for all members (inline Mitarbeitende checkboxes).
  getPaidGrid: () => paymentsCall<PaidGrid>('GET', ''),
  setMemberPaid: (memberId: string, reportMonth: string, paid: boolean) =>
    paymentsCall<{ ok: true }>('PATCH', '', { member_id: memberId, report_month: reportMonth, paid }),
}

export interface PaidGrid {
  enabled: boolean
  months: string[]
  // member_id → report_month → { amount owed that month, paid flag }
  rows: Record<string, Record<string, { amount_cents: number; paid: boolean }>>
}

export interface MemberPaymentMonth {
  report_month: string
  amount_cents: number
  paid: boolean
  covered_by_company: boolean
}

async function paymentsCall<T>(
  method: 'GET' | 'PATCH',
  query: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api/admin/payments${query}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    let message = 'Serverfehler'
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch { /* keep generic */ }
    throw new Error(message)
  }
  return res.json() as Promise<T>
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

async function billingCall<T>(
  method: 'GET' | 'PATCH',
  query: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api/admin/billing${query}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    let message = 'Serverfehler'
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch { /* keep generic */ }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}
