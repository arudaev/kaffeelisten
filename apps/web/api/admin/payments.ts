// PIN-protected admin payments API (service-role). Backs the per-member paid
// tracking in the Employees tab (migration 027) — independent of invoice mode.
//
//   GET   /api/admin/payments?member_id=<uuid>
//         → { months: [{ report_month, amount_cents, paid, covered_by_company }] }
//           newest month first. amount_cents is derived live from this month's
//           transactions plus the archive, so the list is meaningful even before
//           any member_payments row exists.
//   PATCH /api/admin/payments   body: { member_id, report_month, paid }
//         → upserts the paid flag.
//
// Admin-only. Never exposes secrets.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient, requireAdmin } from '../_lib/adminAuth'

interface MonthPayment {
  report_month: string
  amount_cents: number
  paid: boolean
  covered_by_company: boolean
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method ?? 'GET'
  if (method !== 'GET' && method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await requireAdmin(req.headers)
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

    const supabase = makeAdminClient()

    if (method === 'PATCH') {
      const body = (req.body ?? {}) as { member_id?: unknown; report_month?: unknown; paid?: unknown }
      const memberId = String(body.member_id ?? '').trim()
      const reportMonth = String(body.report_month ?? '').trim()
      if (!memberId || !/^\d{4}-\d{2}$/.test(reportMonth)) {
        return res.status(400).json({ error: 'member_id oder report_month fehlt/ungültig.' })
      }
      const paid = Boolean(body.paid)
      const { error } = await supabase.from('member_payments').upsert(
        {
          member_id: memberId,
          report_month: reportMonth,
          paid,
          paid_at: paid ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'member_id,report_month' },
      )
      if (error) throw new Error(error.message)
      return res.status(200).json({ ok: true })
    }

    // GET — one member's months.
    const memberId = Array.isArray(req.query.member_id) ? req.query.member_id[0] : req.query.member_id
    if (!memberId) return res.status(400).json({ error: 'member_id fehlt.' })

    // The member's company billing mode: when the company pays, the member is not
    // billed individually — surfaced so the UI can label it rather than let the
    // admin toggle a non-existent personal debt.
    const { data: member, error: memberErr } = await supabase
      .from('members')
      .select('company_id')
      .eq('id', memberId)
      .maybeSingle()
    if (memberErr) throw new Error(memberErr.message)
    if (!member) return res.status(404).json({ error: 'Unbekannte Person.' })

    const { data: company } = await supabase
      .from('companies')
      .select('billing_mode')
      .eq('id', member.company_id)
      .maybeSingle()
    const coveredByCompany = company?.billing_mode === 'company_paid'

    // Live prices for amount derivation (approximation for past months — the
    // archive stores quantity, not a price snapshot).
    const { data: items } = await supabase.from('items').select('id, price_cents')
    const priceMap = new Map((items ?? []).map(i => [i.id, i.price_cents]))

    // Live (current-month) transactions + archived transactions for this member.
    const [{ data: live, error: liveErr }, { data: archived, error: archErr }] = await Promise.all([
      supabase.from('transactions').select('item_id, quantity, logged_at').eq('member_id', memberId),
      supabase.from('transactions_archive').select('item_id, quantity, report_month').eq('member_id', memberId),
    ])
    if (liveErr) throw new Error(liveErr.message)
    if (archErr) throw new Error(archErr.message)

    const byMonth = new Map<string, number>()
    for (const t of live ?? []) {
      const month = String(t.logged_at).slice(0, 7)
      byMonth.set(month, (byMonth.get(month) ?? 0) + (priceMap.get(t.item_id) ?? 0) * t.quantity)
    }
    for (const t of archived ?? []) {
      byMonth.set(t.report_month, (byMonth.get(t.report_month) ?? 0) + (priceMap.get(t.item_id) ?? 0) * t.quantity)
    }

    // Merge paid flags. Also surface any member_payments row whose month has no
    // transactions (e.g. a manual mark), so nothing silently disappears.
    const { data: payments, error: payErr } = await supabase
      .from('member_payments')
      .select('report_month, paid')
      .eq('member_id', memberId)
    if (payErr) throw new Error(payErr.message)
    const paidMap = new Map((payments ?? []).map(p => [p.report_month, p.paid]))
    for (const p of payments ?? []) if (!byMonth.has(p.report_month)) byMonth.set(p.report_month, 0)

    const months: MonthPayment[] = [...byMonth.entries()]
      .map(([report_month, amount_cents]) => ({
        report_month,
        amount_cents,
        paid: paidMap.get(report_month) ?? false,
        covered_by_company: coveredByCompany,
      }))
      .sort((a, b) => (a.report_month < b.report_month ? 1 : -1))

    return res.status(200).json({ months })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin/payments]', message)
    return res.status(500).json({ error: 'Serverfehler' })
  }
}
