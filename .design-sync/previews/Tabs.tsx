import { Tabs, Toggle } from '@kaffeelisten/web'

const noop = () => {}

const settingsTabs = [
  { id: 'versand', label: 'Monatsversand' },
  { id: 'rechnung', label: 'Rechnungen' },
  { id: 'empfaenger', label: 'Empfänger' },
  { id: 'ipad', label: 'iPad-Bestellung' },
  { id: 'darstellung', label: 'Darstellung' },
]

export function SettingsSections() {
  return (
    <Tabs tabs={settingsTabs} active="versand" onChange={noop} ariaLabel="Einstellungen">
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-medium text-fg">Automatischer Monatsversand</p>
          <p className="text-sm text-fg-muted">Am 1. des Monats um 07:00 Uhr</p>
        </div>
        <Toggle checked onChange={noop} />
      </div>
    </Tabs>
  )
}

export function WithUnsavedBadge() {
  return (
    <Tabs
      tabs={[
        { id: 'email', label: 'E-Mail' },
        { id: 'pdf', label: 'PDF-Anhang', badge: <span aria-label="ungespeichert" className="h-1.5 w-1.5 rounded-full bg-accent" /> },
        { id: 'excel', label: 'Excel-Anhang' },
      ]}
      active="pdf"
      onChange={noop}
      ariaLabel="Vorschau-Format"
    >
      <p className="text-sm text-fg-muted">Rechnung Nr. KL-2026-0042 · 18,40 € · März 2026</p>
    </Tabs>
  )
}
