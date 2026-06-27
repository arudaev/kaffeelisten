import { FlowShell, Tile, BigButton, Icon } from '@kaffeelisten/web'

const noop = () => {}

export function SelectMember() {
  return (
    <FlowShell
      step={1}
      totalSteps={4}
      onBack={noop}
      header={
        <>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Wer bist du?</h1>
          <p className="text-base text-stone-600">Wähle deinen Namen aus der Liste.</p>
        </>
      }
      footer={
        <BigButton variant="primary" fullWidth onClick={noop} icon={<Icon name="check" size={20} strokeWidth={2} />}>
          Weiter
        </BigButton>
      }
    >
      <div className="flex flex-col gap-3">
        <Tile label="Anna Bauer" sub="GZDN GmbH" selected onClick={noop} />
        <Tile label="Markus Huber" sub="ITC1" onClick={noop} />
        <Tile label="Sophie Lang" sub="TechWald AG" onClick={noop} />
      </div>
    </FlowShell>
  )
}
