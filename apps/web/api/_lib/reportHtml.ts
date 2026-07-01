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
  work_email: string | null
  company_name: string
  item_name: string
  item_category: string
  unit_label: string
  price_cents: number
  total_cents: number
}

export interface MemberSummary {
  member_name: string
  work_email: string | null
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

// ── Per-member monthly statement (Phase 2 feature E) ──────────────────────────
// A warm, table-based HTML email sent to each member who consumed that month.
// Contains only that member's own consumption — never another member's or the
// company total. Uses Arial (Outlook-safe) rather than the Inter used in-app.
export function buildMemberStatementHtml(
  memberName: string,
  entries: EnrichedTransaction[],
  monthLabel: string,
): string {
  const firstName = memberName.trim().split(/\s+/)[0] || memberName
  const totalCents = entries.reduce((s, e) => s + e.total_cents, 0)

  const rows = entries
    .map(
      e => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #F5F5F4;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#57534E;">${formatDate(e.logged_at)}</td>
          <td style="padding:12px 0;border-bottom:1px solid #F5F5F4;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1C1917;">${e.item_name}</td>
          <td align="center" style="padding:12px 0;border-bottom:1px solid #F5F5F4;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#57534E;">${e.quantity}</td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #F5F5F4;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#57534E;">${formatEuro(e.price_cents)}</td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #F5F5F4;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1C1917;">${formatEuro(e.total_cents)}</td>
        </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="de" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#FAFAF9;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#FAFAF9;">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <!--[if mso]><table width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E7E5E4;">

        <!-- HEADER -->
        <tr>
          <td style="background:#D97706;padding:26px 32px;">
            <p style="margin:0;color:#ffffff;font-size:17px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;letter-spacing:-.01em;line-height:1.2;">Kaffeelisten</p>
            <p style="margin:2px 0 0;color:#FEF3C7;font-size:13px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">Deine Kaffeeliste &ndash; ${monthLabel}</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:28px 32px 24px;background:#ffffff;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1C1917;">Hallo ${firstName},</p>
            <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#57534E;">hier ist deine pers&ouml;nliche Aufstellung f&uuml;r ${monthLabel}.</p>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
              <tr>
                <th align="left"  style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;color:#A8A29E;border-bottom:1px solid #E7E5E4;">Datum</th>
                <th align="left"  style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;color:#A8A29E;border-bottom:1px solid #E7E5E4;">Artikel</th>
                <th align="center" style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;color:#A8A29E;border-bottom:1px solid #E7E5E4;">Menge</th>
                <th align="right" style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;color:#A8A29E;border-bottom:1px solid #E7E5E4;">Einzelpreis</th>
                <th align="right" style="padding:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;color:#A8A29E;border-bottom:1px solid #E7E5E4;">Betrag</th>
              </tr>
              ${rows}
              <tr>
                <td colspan="4" align="right" style="padding:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#1C1917;">Gesamt</td>
                <td align="right" style="padding:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#B45309;">${formatEuro(totalCents)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#F5F5F4;padding:18px 32px;border-top:1px solid #E7E5E4;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#A8A29E;">ITC1 Deggendorf &middot; Diese Aufstellung dient deiner &Uuml;bersicht.</p>
          </td>
        </tr>

      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`
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
  <div style="background:#D97706;padding:22px 40px 20px;display:flex;justify-content:space-between;align-items:center;">
    <!-- Wordmark + cappuccino illustration -->
    <div style="display:flex;align-items:center;gap:18px;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160" width="64" height="51" style="flex-shrink:0;opacity:.95;">
        <g fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M40 60c0-3 3-6 8-6h70c5 0 8 3 8 6"/>
          <ellipse cx="83" cy="60" rx="43" ry="6"/>
          <path d="M40 60v40c0 14 12 26 26 26h34c14 0 26-12 26-26V60"/>
          <path d="M126 70h12c10 0 18 8 18 18v0c0 10-8 18-18 18h-12"/>
          <path d="M70 28c-3 6 3 12 0 18"/>
          <path d="M83 22c-3 6 3 12 0 18"/>
          <path d="M96 28c-3 6 3 12 0 18"/>
        </g>
      </svg>
      <div>
        <div style="color:rgba(255,255,255,.75);font-size:10px;text-transform:uppercase;letter-spacing:.14em;font-weight:600;margin-bottom:5px;">ITC1 Deggendorf · B4Y3RW4LD</div>
        <div style="color:#fff;font-size:26px;font-weight:800;letter-spacing:-.02em;">Kaffeelisten</div>
      </div>
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
