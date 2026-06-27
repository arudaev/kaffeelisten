import { Tile, Icon } from '@kaffeelisten/web'

const noop = () => {}

export function Default() {
  return (
    <div style={{ width: 420 }}>
      <Tile label="GZDN GmbH" sub="12 Mitarbeitende" onClick={noop} />
    </div>
  )
}

export function Selected() {
  return (
    <div style={{ width: 420 }}>
      <Tile label="ITC1" sub="Innovation Tech Campus" selected onClick={noop} />
    </div>
  )
}

export function WithLeading() {
  return (
    <div style={{ width: 420 }}>
      <Tile
        label="Anna Bauer"
        sub="Zuletzt: Cappuccino"
        leading={<span className="text-amber-700"><Icon name="coffee-cup" size={28} /></span>}
        accentColor="#D97706"
        onClick={noop}
      />
    </div>
  )
}
