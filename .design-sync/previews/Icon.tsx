import { Icon } from '@kaffeelisten/web'

const names = [
  'coffee-cup', 'cappuccino', 'takeaway', 'beans', 'drink', 'food',
  'snack', 'back', 'check', 'undo', 'home', 'close',
] as const

const cell: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  width: 84,
  padding: '12px 0',
  color: '#44403c',
}

export function Overview() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: '#44403c' }}>
      {names.map((n) => (
        <div key={n} style={cell}>
          <Icon name={n} size={28} />
          <span style={{ fontSize: 11, color: '#78716c' }}>{n}</span>
        </div>
      ))}
    </div>
  )
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: '#D97706' }}>
      <Icon name="cappuccino" size={20} />
      <Icon name="cappuccino" size={32} />
      <Icon name="cappuccino" size={48} />
    </div>
  )
}
