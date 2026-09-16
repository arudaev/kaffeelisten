import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import { ThemeProvider } from './lib/theme'
import { databaseConfigError } from './lib/environment'
import './index.css'

// A preview or local build wired to the production database must not start.
const environmentError = databaseConfigError(import.meta.env.VITE_SUPABASE_URL, __VERCEL_ENV__)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {environmentError ? (
        <main className="flex min-h-screen items-center justify-center bg-bg p-6">
          <div role="alert" className="max-w-lg rounded-xl border border-error bg-error-subtle p-6 text-fg">
            <h1 className="mb-2 text-lg font-semibold">Falsche Datenbank</h1>
            <p className="text-sm leading-relaxed">{environmentError}</p>
          </div>
        </main>
      ) : (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      )}
    </ThemeProvider>
    {/* Vercel Web Analytics — privacy-friendly page/visit metrics, no cookies.
        Only sends beacons on Vercel-hosted deployments; a no-op locally. */}
    <Analytics />
  </StrictMode>,
)
