import { useEffect, useState } from 'react'

type InstallChoice = 'accepted' | 'dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: InstallChoice; platform: string }>
}

interface StandaloneNavigator extends Navigator {
  standalone?: boolean
}

export type InstallMethod = 'native' | 'ios-help' | null

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as StandaloneNavigator).standalone === true
  )
}

function isIosDevice(): boolean {
  const isClassicIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isModernIpad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isClassicIos || isModernIpad
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installMethod, setInstallMethod] = useState<InstallMethod>(() => {
    if (isStandalone()) return null
    return isIosDevice() ? 'ios-help' : null
  })

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
      setInstallMethod('native')
    }

    const handleInstalled = () => {
      setPromptEvent(null)
      setInstallMethod(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<InstallChoice | 'unavailable'> => {
    if (!promptEvent) return 'unavailable'

    const event = promptEvent
    setPromptEvent(null)
    setInstallMethod(null)

    try {
      await event.prompt()
      const { outcome } = await event.userChoice
      return outcome
    } catch {
      return 'unavailable'
    }
  }

  return { installMethod, promptInstall }
}
