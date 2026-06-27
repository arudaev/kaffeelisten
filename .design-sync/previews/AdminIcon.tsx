import { AdminIcon } from '@kaffeelisten/web'

const names = [
  'home', 'log', 'report', 'settings', 'send', 'download', 'add', 'edit', 'delete',
  'filter', 'search', 'check', 'close', 'chevron', 'back', 'coffee', 'building', 'users', 'menu',
] as const

const cell: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  width: 80,
  padding: '12px 0',
  color: '#44403c',
}

export function Overview() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {names.map((n) => (
        <div key={n} style={cell}>
          <AdminIcon name={n} size={22} />
          <span style={{ fontSize: 11, color: '#78716c' }}>{n}</span>
        </div>
      ))}
    </div>
  )
}
