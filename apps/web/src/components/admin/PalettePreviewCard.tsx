import type { Palette } from '../../lib/palettes'

interface PalettePreviewCardProps {
  palette: Palette
  selected: boolean
  onSelect: () => void
}

/** Selectable brand-palette card showing its light and dark accent swatches. */
export default function PalettePreviewCard({ palette, selected, onSelect }: PalettePreviewCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        selected
          ? 'border-accent bg-accent-subtle'
          : 'border-border bg-surface hover:bg-surface-2',
      ].join(' ')}
    >
      <div className="flex -space-x-1.5 shrink-0">
        <span
          className="w-6 h-6 rounded-full border-2 border-surface"
          style={{ backgroundColor: palette.lightAccent }}
          title="Hell"
        />
        <span
          className="w-6 h-6 rounded-full border-2 border-surface"
          style={{ backgroundColor: palette.darkAccent }}
          title="Dunkel"
        />
      </div>
      <span className="text-sm font-medium text-fg min-w-0 truncate">{palette.name}</span>
      {selected && <span className="ml-auto text-accent text-sm font-semibold shrink-0">✓</span>}
    </button>
  )
}
