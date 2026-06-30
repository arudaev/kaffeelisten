import { AdminField, AdminIcon } from '@kaffeelisten/web'

const noop = () => {}

export function Form() {
  return (
    <div style={{ width: 340 }}>
      <AdminField label="Name" defaultValue="Beispiel GmbH" onChange={noop} />
    </div>
  )
}

export function Required() {
  return (
    <div style={{ width: 340 }}>
      <AdminField label="Vorname" required defaultValue="Anna" onChange={noop} />
    </div>
  )
}

export function WithHint() {
  return (
    <div style={{ width: 340 }}>
      <AdminField label="Arbeits-E-Mail" type="email" hint="Optional — für den Monatsbericht." defaultValue="" placeholder="anna.mueller@firma.de" onChange={noop} />
    </div>
  )
}

export function WithError() {
  return (
    <div style={{ width: 340 }}>
      <AdminField label="Preis (€)" className="font-mono" error="Ungültiger Preis." defaultValue="1,2x" onChange={noop} />
    </div>
  )
}

export function Filter() {
  return (
    <div style={{ width: 240 }}>
      <AdminField
        variant="filter"
        placeholder="Person suchen…"
        leading={<AdminIcon name="search" size={16} strokeWidth={1.5} />}
        defaultValue=""
        onChange={noop}
      />
    </div>
  )
}
