// PIN-protected admin payments API (service-role). Backs the per-member paid
// tracking in the Employees tab (migration 027) — independent of invoice mode.
//
//   GET   /api/admin/payments?member_id=<uuid>
//         → { months: [{ report_month, amount_cents, paid, covered_by_company }] }
//           newest month first. amount_cents is derived live from this month's
//           transactions plus the archive, so the list is meaningful even before
//           any member_payments row exists.
//   GET   /api/admin/payments
//         → { enabled, months, rows, companies, summary } — the last three months'
//           paid grid. `rows` are individually billed people; `companies` are
//           companies that pay for their people (one tick per company, migration
//           035); `summary` counts each payer once. See _lib/paidGrid.ts.
//   PATCH /api/admin/payments   body: { member_id | company_id, report_month, paid }
//         → upserts the paid flag in member_payments or company_payments.
//
// Admin-only. Never exposes secrets.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { makeAdminClient, requireAdmin } from '../_lib/adminAuth'
import { amountOf, mergeLiveAndArchive } from '../_lib/pricing'
import { derivePaidGrid, summarisePaidGrid } from '../_lib/paidGrid'

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
      const body = (req.body ?? {}) as { member_id?: unknown; company_id?: unknown; report_month?: unknown; paid?: unknown }
      const memberId = String(body.member_id ?? '').trim()
      const companyId = String(body.company_id ?? '').trim()
      const reportMonth = String(body.report_month ?? '').trim()
      if ((!memberId && !companyId) || (memberId && companyId) || !/^\d{4}-\d{2}$/.test(reportMonth)) {
        return res.status(400).json({ error: 'Genau eines von member_id / company_id und ein gültiger report_month sind erforderlich.' })
      }
      const paid = Boolean(body.paid)

      if (companyId) {
        // One payment for the whole company (migration 035) — only meaningful when
        // the company actually pays for its people.
        const { data: company, error: coErr } = await supabase
          .from('companies').select('billing_mode').eq('id', companyId).maybeSingle()
        if (coErr) throw new Error(coErr.message)
        if (!company) return res.status(404).json({ error: 'Unbekanntes Unternehmen.' })
        if (company.billing_mode !== 'company_paid') {
          return res.status(400).json({ error: 'Diese Firma zahlt nicht gesammelt – bitte pro Person abhaken.' })
        }
        const { error } = await supabase.from('company_payments').upsert(
          {
            company_id: companyId,
            report_month: reportMonth,
            paid,
            paid_at: paid ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'company_id,report_month' },
        )
        if (error) throw new Error(error.message)
        return res.status(200).json({ ok: true })
      }

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

    const memberIdParam = Array.isArray(req.query.member_id) ? req.query.member_id[0] : req.query.member_id

    // Bulk mode (no member_id): the last-3-months paid grid for ALL members, for
    // the inline checkboxes + the "X von Y bezahlt" summary in the Mitarbeitende
    // table. Chronological order (oldest → newest) so the UI can emphasise the
    // current (last) month. Each cell carries the derived amount so the summary
    // can count only the people who actually owe something that month.
    if (!memberIdParam) {
      const now = new Date()
      const months: string[] = []
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      }
      // The grid can be hidden (migration 028/029). When off, skip the read and
      // tell the client so it doesn't render the column/summary.
      const { data: cfg } = await supabase
        .from('app_settings')
        .select('member_paid_grid_enabled')
        .eq('id', 1)
        .maybeSingle()
      const enabled = cfg?.member_paid_grid_enabled ?? false
      if (!enabled) return res.status(200).json({ enabled, months, rows: {}, companies: {}, summary: [] })

      const [oy, om] = months[0].split('-').map(Number)
      const monthStart = new Date(oy, om - 1, 1).toISOString()

      const [itemsRes, companiesRes, liveRes, archiveRes, memberPayRes, companyPayRes] = await Promise.all([
        supabase.from('items').select('id, price_cents'),
        supabase.from('companies').select('id, billing_mode'),
        supabase.from('transactions').select('id, member_id, company_id, item_id, quantity, unit_price_cents, logged_at').gte('logged_at', monthStart),
        supabase.from('transactions_archive').select('id, member_id, company_id, item_id, quantity, unit_price_cents, logged_at, report_month').in('report_month', months),
        supabase.from('member_payments').select('member_id, report_month, paid').in('report_month', months),
        supabase.from('company_payments').select('company_id, report_month, paid').in('report_month', months),
      ])
      const firstErr = itemsRes.error || companiesRes.error || liveRes.error || archiveRes.error || memberPayRes.error || companyPayRes.error
      if (firstErr) throw new Error(firstErr.message)

      const priceMap = new Map((itemsRes.data ?? []).map(i => [i.id, i.price_cents]))
      // A reported month is in both tables until the live copy is pruned; merge
      // so each transaction counts once (it used to be summed twice).
      const grid = derivePaidGrid({
        months,
        rows: mergeLiveAndArchive(liveRes.data ?? [], archiveRes.data ?? []).map(t => ({
          member_id: t.member_id,
          company_id: t.company_id,
          month: t.month,
          amount_cents: amountOf(t, priceMap),
        })),
        companyPays: new Set((companiesRes.data ?? []).filter(c => c.billing_mode === 'company_paid').map(c => c.id)),
        memberPayments: memberPayRes.data ?? [],
        companyPayments: companyPayRes.data ?? [],
      })

      return res.status(200).json({
        enabled,
        months,
        rows: grid.members,
        companies: grid.companies,
        summary: summarisePaidGrid(grid, months),
      })
    }

    // GET — one member's months.
    const memberId = memberIdParam

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

    // Catalogue prices are only the fallback for rows logged before the checkout
    // price snapshot existed (migration 030); see pricing.ts.
    const { data: items } = await supabase.from('items').select('id, price_cents')
    const priceMap = new Map((items ?? []).map(i => [i.id, i.price_cents]))

    // Live (current-month) transactions + archived transactions for this member.
    const [{ data: live, error: liveErr }, { data: archived, error: archErr }] = await Promise.all([
      supabase.from('transactions').select('id, item_id, quantity, unit_price_cents, logged_at').eq('member_id', memberId),
      supabase.from('transactions_archive').select('id, item_id, quantity, unit_price_cents, report_month').eq('member_id', memberId),
    ])
    if (liveErr) throw new Error(liveErr.message)
    if (archErr) throw new Error(archErr.message)

    const byMonth = new Map<string, number>()
    for (const t of mergeLiveAndArchive(live ?? [], archived ?? [])) {
      byMonth.set(t.month, (byMonth.get(t.month) ?? 0) + amountOf(t, priceMap))
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
