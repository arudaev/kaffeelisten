import { DeathStarMark } from '@kaffeelisten/web'

// Brand mark for the "Imperium" palette; inherits the current text color.
export function Default() {
  return (
    <div className="text-fg">
      <DeathStarMark className="w-24 h-20" />
    </div>
  )
}

export function Accent() {
  return (
    <div className="text-accent">
      <DeathStarMark className="w-24 h-20" />
    </div>
  )
}

export function Muted() {
  return (
    <div className="text-fg-muted">
      <DeathStarMark className="w-16 h-14" />
    </div>
  )
}
