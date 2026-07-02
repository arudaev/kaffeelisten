import { TemplateField } from '@kaffeelisten/web'

const noop = () => {}

// `placeholders` keys are validated against reportPlaceholders.PLACEHOLDERS.
export function Subject() {
  return (
    <div style={{ width: 460 }}>
      <TemplateField
        label="Betreff"
        value="Kaffeeabrechnung {monat}"
        onChange={noop}
        placeholders={['monat', 'jahr']}
      />
    </div>
  )
}

export function IntroMultiline() {
  return (
    <div style={{ width: 460 }}>
      <TemplateField
        label="Einleitung"
        value="Hallo {name}, hier ist deine Abrechnung für {monat}. Gesamtbetrag: {gesamt}."
        onChange={noop}
        placeholders={['monat', 'jahr', 'name', 'gesamt']}
        multiline
      />
    </div>
  )
}

export function EmptyWithExample() {
  return (
    <div style={{ width: 460 }}>
      <TemplateField
        label="Betreff"
        value=""
        onChange={noop}
        placeholders={['monat', 'jahr']}
        placeholder="Betreff eingeben…"
        emptyExample="Kaffeeabrechnung {monat}"
      />
    </div>
  )
}
