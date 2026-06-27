import { SummaryCard } from '@kaffeelisten/web'

export function Total() {
  return (
    <div style={{ width: 280 }}>
      <SummaryCard label="Einträge diesen Monat" metric={342} sub="+18 % zum Vormonat" accent="amber" />
    </div>
  )
}

export function Companies() {
  return (
    <div style={{ width: 280 }}>
      <SummaryCard label="Aktive Unternehmen" metric={6} sub="von 8 insgesamt" accent="stone" />
    </div>
  )
}

export function Revenue() {
  return (
    <div style={{ width: 280 }}>
      <SummaryCard label="Summe (Schätzung)" metric="410,40 €" sub="Stand heute" accent="amber" />
    </div>
  )
}
