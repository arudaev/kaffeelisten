import { Logo, KaffeelistenProvider } from '@kaffeelisten/web'

// The square follows `currentColor`; wrap in a text-* token to theme it. The white
// mark follows the active palette from KaffeelistenProvider (cappuccino by default).
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

export function Itc1Blue() {
  return (
    <div style={{ color: '#018FC2' }}>
      <Logo className="w-16 h-16" />
    </div>
  )
}

export function ImperiumPalette() {
  return (
    <KaffeelistenProvider palette="deathstar">
      <div style={{ color: '#475569' }}>
        <Logo className="w-16 h-16" />
      </div>
    </KaffeelistenProvider>
  )
}
