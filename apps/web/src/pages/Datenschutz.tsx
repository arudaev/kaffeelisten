// GDPR / data-protection notice — route: /datenschutz
// Linked from the start screen footer. No cookies, no tracking, no banner needed.

import { useNavigate } from 'react-router-dom'
import FlowShell from '../components/FlowShell'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-stone-800 uppercase tracking-wide text-[11px]">
        {title}
      </h2>
      <div className="text-stone-600 leading-relaxed text-[15px]">{children}</div>
    </section>
  )
}

export default function Datenschutz() {
  const navigate = useNavigate()

  return (
    <FlowShell step={-1} totalSteps={0} onBack={() => navigate('/')}>
      <div className="max-w-xl mx-auto flex flex-col gap-8 py-4">

        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="h-1 w-6 rounded-full bg-amber-500" />
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-widest">
              Datenschutz
            </span>
          </div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
            Datenschutzerklärung
          </h1>
          <p className="text-stone-500 text-sm">
            Kaffeelisten · ITC1 Deggendorf · Stand Mai 2026
          </p>
        </div>

        <div className="h-px bg-stone-200" />

        {/* Sections */}
        <Section title="Was wir erfassen">
          <ul className="flex flex-col gap-1.5 list-none">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Vorname und Nachname (vollständig, intern gespeichert)</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>
                Arbeits-E-Mail-Adresse{' '}
                <span className="text-stone-400">(freiwillig, nur für die Abrechnung)</span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Verbrauchseinträge: Datum, Uhrzeit, Produkt und Menge</span>
            </li>
          </ul>
        </Section>

        <Section title="Warum">
          Kaffeelisten dient ausschließlich der internen Kostenabrechnung zwischen den
          Unternehmen des ITC1-Campus in Deggendorf. Deine Daten werden{' '}
          <strong className="text-stone-700 font-medium">nicht für Werbung genutzt</strong>{' '}
          und{' '}
          <strong className="text-stone-700 font-medium">nicht an Dritte weitergegeben</strong>.
        </Section>

        <Section title="Wie lange">
          Einträge werden nach dem monatlichen Bericht archiviert. Das Archiv wird
          automatisch nach <strong className="text-stone-700 font-medium">90 Tagen</strong>{' '}
          gelöscht. Aktive Einträge des laufenden Monats sind jederzeit auf Anfrage
          einsehbar.
        </Section>

        <Section title="Wer hat Zugriff">
          Ausschließlich die Campus-Verwaltung über das PIN-geschützte Admin-Panel.
          Mitarbeitende sehen keine fremden Daten — die Logging-Ansicht zeigt nur
          die eigene Auswahl.
        </Section>

        <Section title="Löschung beantragen">
          Wende dich direkt an die Campus-Verwaltung. Einträge und Stammdaten werden
          umgehend aus der Datenbank entfernt. Es gibt keine automatisierte
          Selbstlöschfunktion.
        </Section>

        <Section title="Keine Cookies · Kein Tracking">
          Kaffeelisten verwendet{' '}
          <strong className="text-stone-700 font-medium">
            keine Tracking-Cookies und kein Analytics
          </strong>
          . Lediglich ein lokaler Browserspeicher{' '}
          <span className="text-stone-400">(localStorage)</span> wird genutzt, um
          dein zuletzt gewähltes Unternehmen vorzuschlagen — dieser verbleibt
          ausschließlich auf deinem Gerät und wird nie übertragen.
        </Section>

        <Section title="Rechtsgrundlage">
          Die Verarbeitung erfolgt auf Grundlage berechtigter Interessen gemäß{' '}
          <strong className="text-stone-700 font-medium">Art. 6 Abs. 1 lit. f DSGVO</strong>{' '}
          (interne Kostentransparenz zwischen Campus-Mietern). Eine darüber
          hinausgehende Verarbeitung findet nicht statt.
        </Section>

        <div className="h-px bg-stone-200" />

        {/* Footer note */}
        <p className="text-[12px] text-stone-400 text-center pb-4">
          ITC1 Innovations- und Technologiecampus Deggendorf GmbH ·{' '}
          Fragen zum Datenschutz bitte direkt an die Campus-Verwaltung richten.
        </p>
      </div>
    </FlowShell>
  )
}
