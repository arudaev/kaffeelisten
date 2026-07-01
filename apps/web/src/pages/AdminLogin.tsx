// Admin PIN entry screen
// PIN is validated server-side via /api/admin/verify-pin
// Never expose ADMIN_PIN in the client bundle

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinKeypad from '../components/admin/PinKeypad'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [error, setError] = useState(false)
  const [pinLength, setPinLength] = useState(6)

  // The PIN length isn't secret — fetch it so the keypad renders the right
  // number of dots even if it's ever changed from the default 6.
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/pin-meta')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data && typeof data.pin_length === 'number') {
          setPinLength(data.pin_length)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (pin: string) => {
    setError(false)
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (res.ok) {
        sessionStorage.setItem('adminSession', 'true')
        sessionStorage.setItem('adminPin', pin)
        navigate('/admin/dashboard')
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }
  }

  return (
    <PinKeypad
      onSubmit={handleSubmit}
      error={error}
      onErrorAnimEnd={() => setError(false)}
      length={pinLength}
    />
  )
}
