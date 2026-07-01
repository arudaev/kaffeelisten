import { PalettePreviewCard } from '@kaffeelisten/web'

const noop = () => {}

// Palette literals mirror PRESET_PALETTES in apps/web/src/lib/palettes.ts.
const amber = { id: 'bayerwald', name: 'Standard (Amber)', lightAccent: '#D97706', darkAccent: '#F59E0B' }
const itc1 = { id: 'b4y3rw4ld', name: 'ITC1', lightAccent: '#018FC2', darkAccent: '#34B7E6' }
const wald = { id: 'wald', name: 'Wald', lightAccent: '#4D7C0F', darkAccent: '#84CC16' }

export function Selected() {
  return (
    <div style={{ width: 300 }}>
      <PalettePreviewCard palette={itc1} selected onSelect={noop} />
    </div>
  )
}

export function Unselected() {
  return (
    <div style={{ width: 300 }}>
      <PalettePreviewCard palette={amber} selected={false} onSelect={noop} />
    </div>
  )
}

export function List() {
  return (
    <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <PalettePreviewCard palette={amber} selected={false} onSelect={noop} />
      <PalettePreviewCard palette={itc1} selected onSelect={noop} />
      <PalettePreviewCard palette={wald} selected={false} onSelect={noop} />
    </div>
  )
}
