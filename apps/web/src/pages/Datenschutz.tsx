// GDPR / data-protection notice — route: /datenschutz
// Linked from the start screen footer. No cookies, no tracking, no banner needed.

import { useNavigate } from 'react-router-dom'
import FlowShell from '../components/FlowShell'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-fg uppercase tracking-wide text-[11px]">
        {title}
      </h2>
      <div className="text-fg-muted leading-relaxed text-[15px]">{children}</div>
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
            <span className="h-1 w-6 rounded-full bg-accent-subtle0" />
            <span className="text-[11px] font-semibold text-accent uppercase tracking-widest">
              Datenschutz
            </span>
          </div>
          <h1 className="text-3xl font-bold text-fg tracking-tight">
            Datenschutzerklärung
          </h1>
          <p className="text-fg-muted text-sm">
            Kaffeelisten · ITC1 Deggendorf · Stand Juli 2026
          </p>
        </div>

        <div className="h-px bg-border" />

        {/* Sections */}
        <Section title="Verantwortliche Stelle">
          Verantwortlich für die Verarbeitung im Sinne der DSGVO ist die{' '}
          <strong className="text-fg font-medium">
            ITC1 Innovations- und Technologiecampus Deggendorf GmbH
          </strong>
          , vertreten durch die Campus-Verwaltung. Fragen zum Datenschutz sowie die
          Ausübung deiner Rechte richtest du bitte direkt an die Campus-Verwaltung.
        </Section>

        <Section title="Was wir erfassen">
          <ul className="flex flex-col gap-1.5 list-none">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-subtle0 shrink-0" />
              <span>Vorname und Nachname (vollständig, intern gespeichert)</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-subtle0 shrink-0" />
              <span>
                Arbeits-E-Mail-Adresse{' '}
                <span className="text-fg-subtle">
                  (erforderlich — zur eindeutigen Zuordnung und für die monatliche
                  Abrechnung)
                </span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-subtle0 shrink-0" />
              <span>Zugehöriges Unternehmen am ITC1-Campus</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-subtle0 shrink-0" />
              <span>Verbrauchseinträge: Datum, Uhrzeit, Produkt und Menge</span>
            </li>
          </ul>
          <p className="mt-3">
            Wir erheben{' '}
            <strong className="text-fg font-medium">keine besonderen Kategorien</strong>{' '}
            personenbezogener Daten und legen keine Profile an. Es werden nur die
            Angaben verarbeitet, die du selbst eingibst.
          </p>
        </Section>

        <Section title="Warum wir das verarbeiten">
          Kaffeelisten dient ausschließlich der internen Kostenabrechnung des
          Verbrauchs (Kaffee, Getränke, Snacks) zwischen den Unternehmen des
          ITC1-Campus in Deggendorf. Am Monatsende wird ein nach Unternehmen und
          Person gruppierter Bericht an die Campus-Verwaltung übermittelt. Deine
          Daten werden{' '}
          <strong className="text-fg font-medium">nicht für Werbung genutzt</strong>,{' '}
          <strong className="text-fg font-medium">nicht zu Profiling</strong> und{' '}
          <strong className="text-fg font-medium">
            nicht an unbeteiligte Dritte weitergegeben
          </strong>
          .
        </Section>

        <Section title="Rechtsgrundlage">
          Die Verarbeitung erfolgt auf Grundlage berechtigter Interessen gemäß{' '}
          <strong className="text-fg font-medium">Art. 6 Abs. 1 lit. f DSGVO</strong>.
          Das berechtigte Interesse besteht in der internen Kostentransparenz und
          korrekten Abrechnung des Verbrauchs zwischen den Campus-Mietern. Eine
          darüber hinausgehende Verarbeitung findet nicht statt.
        </Section>

        <Section title="Empfänger &amp; Auftragsverarbeiter">
          <p>
            Zum Betrieb der Anwendung setzen wir sorgfältig ausgewählte
            Dienstleister ein, die Daten ausschließlich weisungsgebunden in unserem
            Auftrag verarbeiten (Art. 28 DSGVO):
          </p>
          <ul className="flex flex-col gap-1.5 list-none mt-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-subtle0 shrink-0" />
              <span>
                <strong className="text-fg font-medium">Supabase</strong> — Hosting
                der Datenbank
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-subtle0 shrink-0" />
              <span>
                <strong className="text-fg font-medium">Vercel</strong> — Hosting und
                Auslieferung der Anwendung
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-subtle0 shrink-0" />
              <span>
                <strong className="text-fg font-medium">Resend</strong> — Versand des
                monatlichen Abrechnungsberichts per E-Mail
              </span>
            </li>
          </ul>
          <p className="mt-3">
            Soweit dabei Daten in Länder außerhalb der EU/des EWR übermittelt werden,
            erfolgt dies auf Grundlage geeigneter Garantien im Sinne der Art. 44 ff.
            DSGVO (insbesondere EU-Standardvertragsklauseln).
          </p>
        </Section>

        <Section title="Speicherdauer">
          Verbrauchseinträge werden nach Versand des monatlichen Berichts archiviert.
          Das Archiv wird automatisch nach{' '}
          <strong className="text-fg font-medium">90 Tagen</strong> gelöscht.
          Stammdaten (Name, Arbeits-E-Mail, Unternehmen) werden gespeichert, solange
          du am Campus als teilnehmende Person geführt wirst, und auf Anfrage oder bei
          Wegfall des Zwecks entfernt.
        </Section>

        <Section title="Wer hat Zugriff">
          Ausschließlich die Campus-Verwaltung über das PIN-geschützte Admin-Panel.
          Mitarbeitende sehen keine fremden Daten — die Logging-Ansicht zeigt nur die
          eigene Auswahl. Die Admin-PIN wird serverseitig geprüft und ist nicht Teil
          der Anwendung im Browser.
        </Section>

        <Section title="Deine Rechte">
          Dir stehen gegenüber der verantwortlichen Stelle folgende Rechte zu:
          Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17),
          Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20)
          sowie das{' '}
          <strong className="text-fg font-medium">
            Widerspruchsrecht gegen die Verarbeitung
          </strong>{' '}
          (Art. 21 DSGVO). Zudem kannst du dich bei einer Aufsichtsbehörde
          beschweren — zuständig ist das{' '}
          <strong className="text-fg font-medium">
            Bayerische Landesamt für Datenschutzaufsicht (BayLDA)
          </strong>
          .
        </Section>

        <Section title="Löschung beantragen">
          Wende dich direkt an die Campus-Verwaltung. Einträge und Stammdaten werden
          umgehend aus der Datenbank entfernt. Es gibt keine automatisierte
          Selbstlöschfunktion.
        </Section>

        <Section title="Keine Cookies · Kein Tracking">
          Kaffeelisten verwendet{' '}
          <strong className="text-fg font-medium">
            keine Tracking-Cookies und kein Analytics
          </strong>
          . Lediglich ein lokaler Browserspeicher{' '}
          <span className="text-fg-subtle">(localStorage)</span> wird genutzt, um dein
          zuletzt gewähltes Unternehmen vorzuschlagen und deine Anzeige-Einstellung
          (hell/dunkel) zu merken. Diese Angaben verbleiben ausschließlich auf deinem
          Gerät und werden nie übertragen.
        </Section>

        <div className="h-px bg-border" />

        {/* Footer note */}
        <p className="text-[12px] text-fg-subtle text-center pb-4">
          ITC1 Innovations- und Technologiecampus Deggendorf GmbH ·{' '}
          Fragen zum Datenschutz bitte direkt an die Campus-Verwaltung richten.
        </p>
      </div>
    </FlowShell>
  )
}
