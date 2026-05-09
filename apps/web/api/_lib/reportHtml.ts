// Self-contained HTML report template — inline styles, flows naturally across pages.
// Rendered to PDF by Puppeteer.

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

export function formatEuro(cents: number): string {
  return '€ ' + (cents / 100).toFixed(2).replace('.', ',')
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function consolidatedItems(entries: EnrichedTransaction[]): string {
  const map: Record<string, number> = {}
  for (const e of entries) map[e.item_name] = (map[e.item_name] ?? 0) + e.quantity
  return Object.entries(map).map(([name, qty]) => `${qty}× ${name}`).join(' · ')
}

export function buildReportHtml(
  summaries: CompanySummary[],
  transactions: EnrichedTransaction[],
  monthLabel: string,
  reportMonth: string,
): string {
  const totalCents  = transactions.reduce((s, t) => s + t.total_cents, 0)
  const uniqueUsers = new Set(transactions.map(t => t.member_name)).size
  const createdAt   = new Date().toLocaleDateString('de-DE')

  const overviewRows = summaries.map((c, i) => `
    <tr style="background:${i % 2 === 0 ? '#FFFFFF' : '#FAFAF9'};">
      <td style="padding:9px 16px;color:#A8A29E;font-size:11px;font-weight:600;">${i + 1}.</td>
      <td style="padding:9px 16px;color:#1C1917;font-weight:500;">${c.company_name}</td>
      <td style="padding:9px 16px;text-align:center;color:#57534E;">${c.total_entries}</td>
      <td style="padding:9px 16px;text-align:right;font-weight:700;color:#D97706;font-variant-numeric:tabular-nums;">${formatEuro(c.total_cents)}</td>
    </tr>`).join('')

  const companySections = summaries.map(company => {
    const memberRows = company.members.map((m, i) => `
      <tr style="background:${i % 2 === 0 ? '#FFFFFF' : '#FAFAF9'};">
        <td style="padding:9px 16px;font-weight:500;color:#1C1917;">${m.member_name}</td>
        <td style="padding:9px 16px;text-align:center;color:#57534E;">${m.entries.length}</td>
        <td style="padding:9px 16px;text-align:right;font-weight:600;color:#1C1917;font-variant-numeric:tabular-nums;">${formatEuro(m.subtotal_cents)}</td>
        <td style="padding:9px 16px;color:#78716C;font-size:11.5px;">${consolidatedItems(m.entries)}</td>
      </tr>`).join('')

    return `
    <div style="margin:0 40px;padding-top:20px;page-break-inside:avoid;break-inside:avoid;">
      <div style="background:#D97706;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-radius:6px 6px 0 0;">
        <span style="font-size:13px;font-weight:700;">${company.company_name}</span>
        <span style="font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;">${formatEuro(company.total_cents)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E7E5E4;border-top:none;border-radius:0 0 6px 6px;overflow:hidden;">
        <thead>
          <tr style="background:#F5F5F4;border-bottom:1px solid #E7E5E4;">
            <th style="padding:7px 16px;text-align:left;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:22%;">Person</th>
            <th style="padding:7px 16px;text-align:center;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:10%;">Einträge</th>
            <th style="padding:7px 16px;text-align:right;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:14%;">Betrag</th>
            <th style="padding:7px 16px;text-align:left;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;">Items</th>
          </tr>
        </thead>
        <tbody>
          ${memberRows}
          <tr style="background:#FFFBEB;border-top:2px solid #D97706;">
            <td colspan="2" style="padding:9px 16px;font-size:12px;font-weight:700;color:#92400E;">Gesamt</td>
            <td style="padding:9px 16px;text-align:right;font-size:13px;font-weight:800;color:#D97706;font-variant-numeric:tabular-nums;">${formatEuro(company.total_cents)}</td>
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
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif;
      background: #fff;
      color: #1C1917;
      font-size: 14px;
      line-height: 1.5;
    }
    @page { size: A4 portrait; margin: 0 0 14mm 0; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>

  <!-- ── Header ────────────────────────────────────────────────────────────── -->
  <div style="background:#D97706;padding:28px 40px 24px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <div style="color:rgba(255,255,255,.75);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:600;margin-bottom:6px;">ITC1 Deggendorf · B4Y3RW4LD</div>
      <div style="color:#fff;font-size:26px;font-weight:800;letter-spacing:-.02em;">Kaffeelisten</div>
    </div>
    <div style="text-align:right;">
      <div style="color:rgba(255,255,255,.75);font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:4px;">Monatsbericht</div>
      <div style="color:#fff;font-size:20px;font-weight:700;">${monthLabel}</div>
      <div style="color:rgba(255,255,255,.65);font-size:11px;margin-top:2px;">${reportMonth}</div>
    </div>
  </div>

  <!-- ── KPI strip ─────────────────────────────────────────────────────────── -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #E7E5E4;">
    <div style="padding:16px 24px;border-right:1px solid #E7E5E4;">
      <div style="font-size:9px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.1em;">Einträge</div>
      <div style="font-size:26px;font-weight:800;color:#1C1917;margin-top:3px;">${transactions.length}</div>
    </div>
    <div style="padding:16px 24px;border-right:1px solid #E7E5E4;">
      <div style="font-size:9px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.1em;">Gesamtbetrag</div>
      <div style="font-size:26px;font-weight:800;color:#D97706;margin-top:3px;">${formatEuro(totalCents)}</div>
    </div>
    <div style="padding:16px 24px;border-right:1px solid #E7E5E4;">
      <div style="font-size:9px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.1em;">Konsumierende</div>
      <div style="font-size:26px;font-weight:800;color:#1C1917;margin-top:3px;">${uniqueUsers}</div>
    </div>
    <div style="padding:16px 24px;">
      <div style="font-size:9px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.1em;">Unternehmen</div>
      <div style="font-size:26px;font-weight:800;color:#1C1917;margin-top:3px;">${summaries.length}</div>
    </div>
  </div>

  <!-- ── Company overview table ─────────────────────────────────────────────── -->
  <div style="margin:28px 40px 24px;">
    <h2 style="font-size:10px;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;">Übersicht nach Unternehmen</h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #E7E5E4;border-radius:6px;overflow:hidden;">
      <thead>
        <tr style="background:#F5F5F4;border-bottom:1px solid #E7E5E4;">
          <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:6%;">#</th>
          <th style="padding:8px 16px;text-align:left;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;">Unternehmen</th>
          <th style="padding:8px 16px;text-align:center;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:16%;">Einträge</th>
          <th style="padding:8px 16px;text-align:right;font-size:10px;font-weight:600;color:#78716C;text-transform:uppercase;letter-spacing:.07em;width:20%;">Betrag</th>
        </tr>
      </thead>
      <tbody>
        ${overviewRows}
        <tr style="background:#FFFBEB;border-top:2px solid #D97706;">
          <td colspan="2" style="padding:9px 16px;font-weight:700;color:#92400E;font-size:12px;">Gesamt</td>
          <td style="padding:9px 16px;text-align:center;font-weight:700;color:#92400E;">${transactions.length}</td>
          <td style="padding:9px 16px;text-align:right;font-weight:800;color:#D97706;font-size:14px;font-variant-numeric:tabular-nums;">${formatEuro(totalCents)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Section heading ────────────────────────────────────────────────────── -->
  <div style="margin:0 40px;">
    <h2 style="font-size:10px;font-weight:700;color:#78716C;text-transform:uppercase;letter-spacing:.1em;">Aufschlüsselung nach Unternehmen</h2>
  </div>

  <!-- ── Company detail sections ────────────────────────────────────────────── -->
  ${companySections}

  <!-- ── Fixed footer on every page ────────────────────────────────────────── -->
  <div style="position:fixed;bottom:0;left:0;right:0;height:14mm;padding:0 40px;border-top:1px solid #E7E5E4;display:flex;justify-content:space-between;align-items:center;background:#fff;">
    <span style="color:#A8A29E;font-size:10.5px;">Kaffeelisten · ${monthLabel} · ${transactions.length} Einträge · ${formatEuro(totalCents)}</span>
    <span style="color:#A8A29E;font-size:10.5px;">Erstellt am ${createdAt}</span>
  </div>

</body>
</html>`
}
