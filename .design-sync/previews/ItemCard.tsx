import { ItemCard } from '@kaffeelisten/web'

const noop = () => {}

export function Default() {
  return (
    <div style={{ width: 280 }}>
      <ItemCard name="Cappuccino" price="1,20 €" category="coffee" quantity={0} onAdd={noop} onRemove={noop} />
    </div>
  )
}

export function Selected() {
  return (
    <div style={{ width: 280 }}>
      <ItemCard name="Cappuccino" price="1,20 €" category="coffee" quantity={2} onAdd={noop} onRemove={noop} />
    </div>
  )
}

export function Snack() {
  return (
    <div style={{ width: 280 }}>
      <ItemCard name="Butterbreze" price="1,50 €" category="snack" quantity={0} onAdd={noop} onRemove={noop} />
    </div>
  )
}

export function Drink() {
  return (
    <div style={{ width: 280 }}>
      <ItemCard name="Apfelschorle" price="1,80 €" category="drink" quantity={1} onAdd={noop} onRemove={noop} />
    </div>
  )
}
