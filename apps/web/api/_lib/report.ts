// Shared report orchestrator: fetch → compute → PDF → Excel → email → archive → reset

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { Resend } from 'resend'
import {
  buildReportHtml,
  formatEuro,
  formatDate,
  type EnrichedTransaction,
  type MemberSummary,
  type CompanySummary,
} from './reportHtml'

export type { EnrichedTransaction, MemberSummary, CompanySummary }

// ─── Supabase (service role — bypasses RLS) ───────────────────────────────────

function makeSupabase() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

// ─── Data fetching ────────────────────────────────────────────────────────────

export async function fetchAndEnrich(): Promise<{
  transactions: EnrichedTransaction[]
  reportMonth: string
  monthLabel: string
}> {
  const supabase = makeSupabase()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const reportMonth = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthStart = new Date(year, month, 1).toISOString()
  const monthEnd = new Date(year, month + 1, 1).toISOString()
  const monthLabel = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  const { data: txData, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .gte('logged_at', monthStart)
    .lt('logged_at', monthEnd)
    .order('logged_at', { ascending: true })

  if (txErr) throw new Error(`Failed to fetch transactions: ${txErr.message}`)

  const [membersRes, companiesRes, itemsRes] = await Promise.all([
    supabase.from('members').select('id, name, company_id'),
    supabase.from('companies').select('id, name'),
    supabase.from('items').select('id, name, unit_label, price_cents, category'),
  ])

  if (membersRes.error) throw new Error(`Failed to fetch members: ${membersRes.error.message}`)
  if (companiesRes.error) throw new Error(`Failed to fetch companies: ${companiesRes.error.message}`)
  if (itemsRes.error) throw new Error(`Failed to fetch items: ${itemsRes.error.message}`)

  const memberMap = new Map((membersRes.data ?? []).map(m => [m.id, m]))
  const companyMap = new Map((companiesRes.data ?? []).map(c => [c.id, c.name as string]))
  const itemMap = new Map((itemsRes.data ?? []).map(i => [i.id, i]))

  const transactions: EnrichedTransaction[] = (txData ?? []).map(t => {
    const member = memberMap.get(t.member_id)
    const item = itemMap.get(t.item_id)
    return {
      ...t,
      member_name: member?.name ?? '—',
      company_name: companyMap.get(t.company_id) ?? '—',
      item_name: item?.name ?? '—',
      item_category: item?.category ?? '—',
      unit_label: item?.unit_label ?? 'Stück',
      price_cents: item?.price_cents ?? 0,
      total_cents: (item?.price_cents ?? 0) * t.quantity,
    }
  })

  return { transactions, reportMonth, monthLabel }
}

// ─── Summary computation ──────────────────────────────────────────────────────

export function computeSummary(transactions: EnrichedTransaction[]): CompanySummary[] {
  const companyMap = new Map<string, Map<string, EnrichedTransaction[]>>()

  for (const t of transactions) {
    if (!companyMap.has(t.company_name)) companyMap.set(t.company_name, new Map())
    const memberMap = companyMap.get(t.company_name)!
    if (!memberMap.has(t.member_name)) memberMap.set(t.member_name, [])
    memberMap.get(t.member_name)!.push(t)
  }

  const summaries: CompanySummary[] = []

  for (const [company_name, members] of companyMap) {
    const memberSummaries: MemberSummary[] = []
    for (const [member_name, entries] of members) {
      const subtotal_cents = entries.reduce((s, e) => s + e.total_cents, 0)
      memberSummaries.push({ member_name, entries, subtotal_cents })
    }
    memberSummaries.sort((a, b) => b.subtotal_cents - a.subtotal_cents)

    summaries.push({
      company_name,
      members: memberSummaries,
      total_cents: memberSummaries.reduce((s, m) => s + m.subtotal_cents, 0),
      total_entries: memberSummaries.reduce((s, m) => s + m.entries.length, 0),
    })
  }

  summaries.sort((a, b) => b.total_cents - a.total_cents)
  return summaries
}

// ─── PDF (HTML → puppeteer) ───────────────────────────────────────────────────

export async function generatePdf(
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
  monthLabel: string,
  reportMonth: string,
): Promise<Buffer> {
  // Dynamic import so the module doesn't load chromium on cold start unless needed
  const chromium = (await import('@sparticuz/chromium-min')).default
  const puppeteer = (await import('puppeteer-core')).default

  const executablePath = process.env.CHROMIUM_PATH
    ?? await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
      )

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    const html = buildReportHtml(summaries, transactions, monthLabel, reportMonth)
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function generateExcel(
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
): Buffer {
  const wb = XLSX.utils.book_new()

  // Sheet 1 — Zusammenfassung (company totals)
  const ws1 = XLSX.utils.json_to_sheet(
    summaries.map(c => ({
      'Unternehmen': c.company_name,
      'Einträge': c.total_entries,
      'Gesamtbetrag (€)': Number((c.total_cents / 100).toFixed(2)),
    }))
  )
  ws1['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Zusammenfassung')

  // Sheet 2 — Alle Einträge (full transaction log)
  const ws2 = XLSX.utils.json_to_sheet(
    transactions.map(t => ({
      'Datum': formatDate(t.logged_at),
      'Uhrzeit': new Date(t.logged_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      'Person': t.member_name,
      'Unternehmen': t.company_name,
      'Item': t.item_name,
      'Kategorie': t.item_category,
      'Menge': t.quantity,
      'Einzelpreis (€)': Number((t.price_cents / 100).toFixed(2)),
      'Betrag (€)': Number((t.total_cents / 100).toFixed(2)),
    }))
  )
  ws2['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 24 }, { wch: 24 },
    { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, ws2, 'Alle Einträge')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// ─── Email ────────────────────────────────────────────────────────────────────

export async function sendEmail(
  pdfBuffer: Buffer,
  xlsxBuffer: Buffer,
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
  monthLabel: string,
  reportMonth: string,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL
  if (!resendKey) throw new Error('Missing RESEND_API_KEY')
  if (!adminEmail) throw new Error('Missing ADMIN_EMAIL')

  const resend = new Resend(resendKey)
  const totalCents = transactions.reduce((s, t) => s + t.total_cents, 0)
  const [yearStr, monStr] = reportMonth.split('-')
  const monthName = new Date(Number(yearStr), Number(monStr) - 1, 1)
    .toLocaleDateString('de-DE', { month: 'long' })

  const companyRows = summaries
    .map(c => `
      <tr>
        <td style="padding:8px 16px;border-bottom:1px solid #E7E5E4;color:#1C1917;">${c.company_name}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #E7E5E4;text-align:right;color:#57534E;">${c.total_entries}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #E7E5E4;text-align:right;font-weight:600;color:#1C1917;">${formatEuro(c.total_cents)}</td>
      </tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#FAFAF9;margin:0;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E7E5E4;">
    <div style="background:#D97706;padding:24px 32px;">
      <p style="color:#fff;margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.1em;opacity:.85;">Kaffeelisten · ITC1 Deggendorf</p>
      <h1 style="color:#fff;margin:8px 0 0;font-size:22px;font-weight:700;">Monatsbericht ${monthLabel}</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="color:#57534E;margin:0 0 20px;">Anbei der Monatsbericht für <strong style="color:#1C1917;">${monthLabel}</strong> mit allen Einträgen des ITC1-Campus.</p>
      <table style="width:100%;border-collapse:collapse;background:#FAFAF9;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <tr>
          <td style="padding:12px 16px;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E7E5E4;">Einträge gesamt</td>
          <td style="padding:12px 16px;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E7E5E4;">Gesamtbetrag</td>
          <td style="padding:12px 16px;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E7E5E4;">Unternehmen</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:24px;font-weight:700;color:#1C1917;">${transactions.length}</td>
          <td style="padding:12px 16px;font-size:24px;font-weight:700;color:#1C1917;">${formatEuro(totalCents)}</td>
          <td style="padding:12px 16px;font-size:18px;font-weight:700;color:#1C1917;">${summaries.length}</td>
        </tr>
      </table>
      <h2 style="font-size:13px;font-weight:600;color:#57534E;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px;">Nach Unternehmen</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#FAFAF9;">
            <th style="padding:8px 16px;text-align:left;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;">Unternehmen</th>
            <th style="padding:8px 16px;text-align:right;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;">Einträge</th>
            <th style="padding:8px 16px;text-align:right;font-size:11px;font-weight:600;color:#78716C;text-transform:uppercase;">Betrag</th>
          </tr>
        </thead>
        <tbody>${companyRows}</tbody>
      </table>
      <p style="color:#78716C;font-size:12px;margin:0;line-height:1.6;">
        Die vollständigen Daten finden Sie in den beigefügten Dateien:<br>
        <strong>PDF</strong> – Formatierter Bericht für Ablage und Weitergabe.<br>
        <strong>Excel</strong> – Alle Rohdaten für Auswertungen.
      </p>
      <p style="color:#78716C;font-size:12px;margin:12px 0 0;">Die Einträge wurden nach dem Versand archiviert. Die Originaldaten bleiben erhalten.</p>
    </div>
    <div style="background:#FAFAF9;padding:14px 32px;border-top:1px solid #E7E5E4;">
      <p style="color:#A8A29E;font-size:11px;margin:0;">Kaffeelisten · B4Y3RW4LD Hackathon · ITC1 Deggendorf</p>
    </div>
  </div>
</body>
</html>`

  const filename = `kaffeelisten-${reportMonth}`

  await resend.emails.send({
    from: 'Kaffeelisten <onboarding@resend.dev>',
    to: [adminEmail],
    subject: `Kaffeelisten – Monatsbericht ${monthName} ${yearStr}`,
    html,
    attachments: [
      { filename: `${filename}.pdf`, content: pdfBuffer.toString('base64') },
      { filename: `${filename}.xlsx`, content: xlsxBuffer.toString('base64') },
    ],
  })
}

// ─── Archive and reset ────────────────────────────────────────────────────────

export async function archiveTransactions(
  transactions: EnrichedTransaction[],
  reportMonth: string,
): Promise<void> {
  if (transactions.length === 0) return
  const supabase = makeSupabase()
  const now = new Date().toISOString()

  // upsert with ignoreDuplicates so re-sending the same month's report
  // never fails — rows already archived are simply skipped.
  const { error: archErr } = await supabase
    .from('transactions_archive')
    .upsert(
      transactions.map(t => ({
        id: t.id,
        member_id: t.member_id,
        company_id: t.company_id,
        item_id: t.item_id,
        quantity: t.quantity,
        logged_at: t.logged_at,
        archived_at: now,
        report_month: reportMonth,
      })),
      { onConflict: 'id,report_month', ignoreDuplicates: true },
    )

  if (archErr) throw new Error(`Archive insert failed: ${archErr.message}`)
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function runMonthlyReport(): Promise<void> {
  const { transactions, reportMonth, monthLabel } = await fetchAndEnrich()
  const summaries = computeSummary(transactions)
  const [pdfBuffer, xlsxBuffer] = await Promise.all([
    generatePdf(summaries, transactions, monthLabel, reportMonth),
    Promise.resolve(generateExcel(summaries, transactions)),
  ])
  await sendEmail(pdfBuffer, xlsxBuffer, summaries, transactions, monthLabel, reportMonth)
  await archiveTransactions(transactions, reportMonth)
}
