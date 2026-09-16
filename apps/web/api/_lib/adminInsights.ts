// What ITC1's administration needs at a glance in the monthly report email:
// the month against the previous one, what to restock, and what went wrong.
// Pure; rendered by buildCompanyEmailHtml.

import type { CampusRollup } from './excel'
import type { SkippedDelivery } from './documentMatrix'

export interface RestockLine {
  name: string
  quantity: number
  previousQuantity: number
}

export interface AdminInsights {
  previousMonth: string | null
  totalCents: number
  previousTotalCents: number | null
  activePeople: number
  // Most-consumed items this month, the basis for reordering beans, milk powder
  // and chocolate. There is no stock table, so this is consumption, not stock.
  restock: RestockLine[]
  warnings: string[]
}

const SKIP_TEXT: Record<string, (name: string) => string> = {
  no_billing_contact: n => `${n}: Firma zahlt, aber es ist keine Rechnungs-E-Mail hinterlegt – kein Dokument versendet.`,
  no_email: n => `${n}: keine E-Mail-Adresse – kein persönliches Dokument versendet.`,
  unknown_company: n => `${n}: Unternehmen nicht gefunden – kein Dokument versendet.`,
}

export const RESTOCK_LIMIT = 6

export function computeAdminInsights(input: {
  rollup: CampusRollup | null
  skipped: readonly SkippedDelivery[]
  failedDeliveries: number
  missingFiles: number
  archiveNotSent: boolean
}): AdminInsights {
  const r = input.rollup
  const warnings: string[] = []
  for (const s of input.skipped) {
    const text = SKIP_TEXT[s.reason]
    if (text) warnings.push(text(s.name))
  }
  if (input.failedDeliveries > 0) {
    warnings.push(`${input.failedDeliveries} ${input.failedDeliveries === 1 ? 'Dokument konnte' : 'Dokumente konnten'} nicht zugestellt werden – unter „Dokumente“ erneut senden.`)
  }
  if (input.missingFiles > 0) {
    warnings.push(`${input.missingFiles} ${input.missingFiles === 1 ? 'Anhang fehlt' : 'Anhänge fehlen'} (PDF oder Excel) – im Archiv markiert, unter „Dokumente“ neu erzeugbar.`)
  }
  if (input.archiveNotSent) {
    warnings.push('Kein Dokumentenarchiv versendet: Es ist keine E-Mail-Adresse der Geschäftsführung hinterlegt.')
  }
  return {
    previousMonth: r?.previousMonth ?? null,
    totalCents: r?.totals.totalCents ?? 0,
    previousTotalCents: r ? r.totals.previousTotalCents : null,
    activePeople: r?.totals.people ?? 0,
    restock: (r?.items ?? [])
      .filter(i => i.quantity > 0)
      .slice(0, RESTOCK_LIMIT)
      .map(i => ({ name: i.name, quantity: i.quantity, previousQuantity: i.previousQuantity })),
    warnings,
  }
}
