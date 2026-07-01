import { SegmentedControl } from '@kaffeelisten/web'

const noop = () => {}

const themeOptions = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'System' },
]

export function ThemeMode() {
  return <SegmentedControl options={themeOptions} value="system" onChange={noop} ariaLabel="Darstellung" />
}

export function TwoOptions() {
  return (
    <SegmentedControl
      options={[
        { value: 'firma', label: 'Firma' },
        { value: 'person', label: 'Person' },
      ]}
      value="firma"
      onChange={noop}
    />
  )
}

export function Small() {
  return <SegmentedControl size="sm" options={themeOptions} value="light" onChange={noop} />
}
