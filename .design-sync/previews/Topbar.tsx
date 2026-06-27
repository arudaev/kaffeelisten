import { Topbar, AdminButton, AdminIcon, MonthSelector } from '@kaffeelisten/web'

const noop = () => {}

export function Dashboard() {
  return (
    <Topbar
      eyebrow="Administration"
      title="Übersicht"
      right={
        <>
          <MonthSelector value="2026-05" onChange={noop} />
          <AdminButton variant="primary" onClick={noop} icon={<AdminIcon name="send" size={16} strokeWidth={2} />}>
            Bericht senden
          </AdminButton>
        </>
      }
    />
  )
}

export function Simple() {
  return (
    <Topbar
      eyebrow="Verwaltung"
      title="Unternehmen"
      right={<AdminButton variant="secondary" onClick={noop} icon={<AdminIcon name="add" size={16} />}>Neu</AdminButton>}
    />
  )
}
