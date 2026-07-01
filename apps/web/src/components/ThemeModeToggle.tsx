import SegmentedControl from './admin/SegmentedControl'
import { useTheme } from '../lib/theme-context'
import type { ThemeMode } from '../lib/theme-context'

interface ThemeModeToggleProps {
  size?: 'sm' | 'md'
}

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'System' },
]

/** Per-device Light / Dark / System switcher backed by the ThemeProvider. */
export default function ThemeModeToggle({ size = 'sm' }: ThemeModeToggleProps) {
  const { mode, setMode } = useTheme()
  return (
    <SegmentedControl
      ariaLabel="Erscheinungsbild"
      options={OPTIONS}
      value={mode}
      onChange={setMode}
      size={size}
    />
  )
}
