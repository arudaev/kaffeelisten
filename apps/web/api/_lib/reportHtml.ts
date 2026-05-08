// Self-contained HTML report template — inline styles mirror docs/design-system.md
// Rendered to PDF by puppeteer in report.ts

export interface EnrichedTransaction {
  id: string
  member_id: string
  company_id: string
  item_id: string
  quantity: number
  logged_at: string
  member_name: string
  company_name: string
  item_name: string
  item_category: string
  unit_label: string
  price_cents: number
  total_cents: number
}

export interface MemberSummary {
  member_name: string
  entries: EnrichedTransaction[]
  subtotal_cents: number
}

export interface CompanySummary {
  company_name: string
  members: MemberSummary[]
  total_cents: number
  total_entries: number
}

function formatEuro(cents: number): string {
  return '€ ' + (cents / 100).toFixed(2).replace('.', ',')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function consolidatedItems(entries: EnrichedTransaction[]): string {
  const map: Record<string, number> = {}
  for (const e of entries) {
    map[e.item_name] = (map[e.item_name] ?? 0) + e.quantity
  }
  return Object.entries(map).map(([name, qty]) => `${qty}× ${name}`).join(', ')
}

export function buildReportHtml(
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
  monthLabel: string,
  reportMonth: string,
): string {
  const totalCents = transactions.reduce((s, t) => s + t.total_cents, 0)
  const topCompany = summaries[0]?.company_name ?? '—'
  const createdAt = new Date().toLocaleDateString('de-DE')

  const companySections = summaries.map(company => {
    const memberRows = company.members.map((m, i) => `
      <tr style="background:${i % 2 === 1 ? '#FAFAF9' : '#FFFFFF'};">
        <td style="padding:9px 16px;font-weight:500;color:#1C1917;">${m.member_name}</td>
        <td style="padding:9px 16px;text-align:right;color:#57534E;">${m.entries.length}</td>
        <td style="padding:9px 16px;text-align:right;font-weight:600;color:#1C1917;">${formatEuro(m.subtotal_cents)}</td>
        <td style="padding:9px 16px;color:#57534E;font-size:12px;">${consolidatedItems(m.entries)}</td>
      </tr>`).join('')

    return `
    <div style="margin-bottom:28px;page-break-inside:avoid;">
      <div style="background:#D97706;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-radius:8px 8px 0 0;">
        <span style="font-size:14px;font-weight:700;">${company.company_name}</span>
        <span style="font-size:14px;font-weight:700;">${formatEuro(company.total_cents)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E7E5E4;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
        <thead>
          <tr style="background:#FAFAF9;">
            <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E7E5E4;">Person</th>
            <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E7E5E4;">Einträge</th>
            <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E7E5E4;">Betrag</th>
            <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #E7E5E4;">Items</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows}
          <tr style="background:#FFFBEB;border-top:2px solid #D97706;">
            <td colspan="2" style="padding:9px 16px;font-size:13px;font-weight:700;color:#1C1917;">Gesamt</td>
            <td style="padding:9px 16px;text-align:right;font-size:13px;font-weight:700;color:#D97706;">${formatEuro(company.total_cents)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #FAFAF9; color: #1C1917; font-size: 14px; line-height: 1.5; }
    @page { size: A4; margin: 0; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  <!-- Header bar -->
  <div style="background:#D97706;padding:28px 40px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.12em;opacity:.85;font-weight:500;">ITC1 Deggendorf · B4Y3RW4LD</div>
      <div style="color:#fff;font-size:26px;font-weight:700;margin-top:6px;letter-spacing:-.01em;">Kaffeelisten</div>
    </div>
    <div style="text-align:right;">
      <div style="color:#fff;font-size:16px;font-weight:600;">Monatsbericht — ${monthLabel}</div>
      <div style="color:#fff;font-size:12px;opacity:.8;margin-top:4px;">Berichtszeitraum: ${reportMonth}</div>
    </div>
  </div>

  <!-- Summary metrics -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#E7E5E4;margin-bottom:36px;">
    <div style="background:#fff;padding:20px 28px;">
      <div style="font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.08em;">Einträge gesamt</div>
      <div style="font-size:28px;font-weight:700;color:#1C1917;margin-top:6px;">${transactions.length}</div>
      <div style="font-size:12px;color:#A8A29E;margin-top:2px;">Alle Unternehmen</div>
    </div>
    <div style="background:#fff;padding:20px 28px;">
      <div style="font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.08em;">Gesamtbetrag</div>
      <div style="font-size:28px;font-weight:700;color:#1C1917;margin-top:6px;">${formatEuro(totalCents)}</div>
      <div style="font-size:12px;color:#A8A29E;margin-top:2px;">${new Set(transactions.map(t => t.member_name)).size} Konsumierende</div>
    </div>
    <div style="background:#fff;padding:20px 28px;">
      <div style="font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.08em;">Größtes Unternehmen</div>
      <div style="font-size:20px;font-weight:700;color:#1C1917;margin-top:6px;">${topCompany}</div>
      <div style="font-size:12px;color:#A8A29E;margin-top:2px;">${formatEuro(summaries[0]?.total_cents ?? 0)}</div>
    </div>
  </div>

  <!-- Company sections -->
  <div style="padding:0 40px 40px;">
    <h2 style="font-size:13px;font-weight:600;color:#57534E;text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;">Aufschlüsselung nach Unternehmen</h2>
    ${companySections}
  </div>

  <!-- Footer -->
  <div style="margin:0 40px;padding:16px 0;border-top:1px solid #E7E5E4;display:flex;justify-content:space-between;align-items:center;">
    <span style="color:#A8A29E;font-size:11px;">Kaffeelisten · ${monthLabel} · ${transactions.length} Einträge · ${formatEuro(totalCents)}</span>
    <span style="color:#A8A29E;font-size:11px;">Erstellt am ${createdAt}</span>
  </div>
</body>
</html>`
}

export { formatEuro, formatDate }
