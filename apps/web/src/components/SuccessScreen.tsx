import { useEffect, useState } from 'react'
import BigButton from './BigButton'
import Icon from './Icon'
import Illustration from './Illustration'

interface SuccessScreenProps {
  summary: string
  onUndo: () => void
  onReset: () => void
}

export default function SuccessScreen({ summary, onUndo, onReset }: SuccessScreenProps) {
  const [secs, setSecs] = useState(3)

  useEffect(() => {
    if (secs <= 0) {
      onReset()
      return
    }
    const t = setTimeout(() => setSecs(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secs, onReset])

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center gap-8 p-6 sm:p-8 font-sans relative isolate overflow-hidden">
      <Illustration name="beans" className="absolute right-8 top-10 hidden w-36 rotate-12 text-amber-700/15 md:block" />
      <Illustration name="campus" className="absolute bottom-8 left-1/2 hidden w-[560px] -translate-x-1/2 text-stone-300/70 sm:block" strokeWidth={1.4} />

      {/* Check circle */}
      <div className="relative w-28 sm:w-36 h-28 sm:h-36 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-radial from-amber-50 to-transparent" />
        <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-full bg-amber-600 flex items-center justify-center text-white animate-pop">
          <Icon name="check" size={48} strokeWidth={2.5} />
        </div>
      </div>

      {/* Text */}
      <div className="text-center">
        <p className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">Gespeichert.</p>
        <p className="text-lg text-stone-600 mt-2">{summary}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3">
        <BigButton
          variant="ghost"
          onClick={onUndo}
          icon={<Icon name="undo" size={20} strokeWidth={2} />}
        >
          Rückgängig
        </BigButton>
        <p className="text-[13px] text-stone-500">Zurück zur Startseite in {secs}s</p>
      </div>
    </div>
  )
}
