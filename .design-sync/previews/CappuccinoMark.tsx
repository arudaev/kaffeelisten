import { CappuccinoMark } from '@kaffeelisten/web'

// Line illustration that inherits the current text color via `stroke="currentColor"`.
export function Default() {
  return (
    <div className="text-fg">
      <CappuccinoMark className="w-24 h-20" />
    </div>
  )
}

export function Accent() {
  return (
    <div className="text-accent">
      <CappuccinoMark className="w-24 h-20" />
    </div>
  )
}

export function Muted() {
  return (
    <div className="text-fg-muted">
      <CappuccinoMark className="w-16 h-14" />
    </div>
  )
}
