// Admin PIN entry screen
// PIN is validated server-side via /api/admin/verify-pin
// Never expose ADMIN_PIN in the client bundle

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PinKeypad from '../components/admin/PinKeypad'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [error, setError] = useState(false)

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
    />
  )
}
