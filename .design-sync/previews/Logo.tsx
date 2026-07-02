import { Logo } from '@kaffeelisten/web'

// The amber square follows `currentColor`; wrap in a text-* token to theme it.
export function Default() {
  return (
    <div className="text-accent">
      <Logo className="w-16 h-16" />
    </div>
  )
}

export function Large() {
  return (
    <div className="text-accent">
      <Logo className="w-28 h-28" />
    </div>
  )
}

export function OnDarkAccent() {
  return (
    <div style={{ color: '#018FC2' }}>
      <Logo className="w-16 h-16" />
    </div>
  )
}
