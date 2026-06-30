import { Toast } from '@kaffeelisten/web'
import type { CSSProperties } from 'react'

// Toast is position:fixed (bottom-right of the viewport). The transform on this
// frame establishes a containing block so the toast anchors inside the card
// instead of escaping to the page corner.
const frame: CSSProperties = { position: 'relative', height: 110, transform: 'translateZ(0)' }

export function Success() {
  return (
    <div style={frame}>
      <Toast message="Eintrag gespeichert." />
    </div>
  )
}

export function ErrorToast() {
  return (
    <div style={frame}>
      <Toast message="Fehler beim Speichern." kind="error" />
    </div>
  )
}
