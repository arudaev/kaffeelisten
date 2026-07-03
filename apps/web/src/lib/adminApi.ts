// Client wrapper for the PIN-protected admin data API (/api/admin/data).
//
// The admin panel no longer talks to Supabase directly with the public anon key
// — that key can no longer read work emails/transactions or write catalogue data
// (migration 015). All admin reads/writes go through the serverless API, which
// authenticates the PIN server-side and uses the service-role key.
//
// The PIN lives in sessionStorage (set by the login flow). Replacing this with a
// real HttpOnly session is tracked separately (security-audit blocker #5).

export interface AdminCompany {
  id: string
  name: string
  active: boolean
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

function adminPin(): string {
  return sessionStorage.getItem('adminPin') ?? ''
}

async function call<T>(
  method: 'GET' | 'POST' | 'PATCH',
  query: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api/admin/data${query}`, {
    method,
    headers: {
      'x-admin-pin': adminPin(),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
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
  createCompany: (values: { name: string }) =>
    call<{ ok: true }>('POST', '?resource=companies', { values: { ...values, active: true } }),
  updateCompany: (id: string, values: Partial<Pick<AdminCompany, 'name' | 'active'>>) =>
    call<{ ok: true }>('PATCH', '?resource=companies', { id, values }),

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
}
