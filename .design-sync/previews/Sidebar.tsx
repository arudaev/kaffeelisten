import { Sidebar } from '@kaffeelisten/web'

const noop = () => {}

export function Dashboard() {
  return (
    <div style={{ height: 660, display: 'flex' }}>
      <Sidebar active="dashboard" onNavigate={noop} onSendReport={noop} open onClose={noop} />
    </div>
  )
}

export function ItemsActive() {
  return (
    <div style={{ height: 660, display: 'flex' }}>
      <Sidebar active="items" onNavigate={noop} onSendReport={noop} open onClose={noop} />
    </div>
  )
}
