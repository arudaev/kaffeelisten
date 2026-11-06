// One serverless function for the whole admin API.
//
// Vercel counts every file under api/ as its own function, and the Hobby plan
// allows twelve per deployment. Ten separate admin routes put the application
// at fifteen, which meant it could not build on a free team at all — so the
// public demo was impossible and any instance needed a paid plan before it
// could serve a single request.
//
// The handlers themselves are unchanged. They moved to api/_lib/admin (an
// underscore directory is not a route) and this file dispatches to them by the
// first path segment, so every client URL — /api/admin/data, /api/admin/theme —
// is exactly what it was.
//
// Adding an admin endpoint means adding a module there and a line to ROUTES.

import type { VercelRequest, VercelResponse } from '@vercel/node'

import { DEMO_DISABLED_ADMIN_ROUTES, demoWriteBlocked, isDemoDeployment } from '../../shared/environment'

import auth from '../_lib/admin/auth'
import billing from '../_lib/admin/billing'
import data from '../_lib/admin/data'
import documents from '../_lib/admin/documents'
import exportHandler from '../_lib/admin/export'
import payments from '../_lib/admin/payments'
import previewReport from '../_lib/admin/preview-report'
import reportProgress from '../_lib/admin/report-progress'
import settings from '../_lib/admin/settings'
import theme from '../_lib/admin/theme'

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>

const ROUTES: Record<string, Handler> = {
  auth,
  billing,
  data,
  documents,
  export: exportHandler,
  payments,
  'preview-report': previewReport,
  'report-progress': reportProgress,
  settings,
  theme,
}

/**
 * The first path segment after /api/admin.
 *
 * Vercel supplies it in req.query.path, but that is absent when the function is
 * invoked directly (tests, `vercel dev` edge cases), so fall back to the URL.
 */
function routeKey(req: VercelRequest): string | null {
  const fromQuery = req.query?.path
  if (Array.isArray(fromQuery) && fromQuery.length > 0) return fromQuery[0]
  if (typeof fromQuery === 'string' && fromQuery) return fromQuery

  const path = (req.url ?? '').split('?')[0]
  const match = /\/api\/admin\/([^/]+)/.exec(path)
  return match ? match[1] : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = routeKey(req)
  const route = key ? ROUTES[key] : undefined

  if (!route) {
    // Never echo the requested path back — it is attacker-controlled input.
    return res.status(404).json({ error: 'Unknown admin endpoint' })
  }

  // The demo switches whole features off at the server, so hiding them in the
  // interface is a convenience rather than the control. 410 rather than 404:
  // the endpoint exists in the product, it is gone from this deployment.
  if (isDemoDeployment(process.env.DEMO_MODE) && (DEMO_DISABLED_ADMIN_ROUTES as readonly string[]).includes(key!)) {
    return res.status(410).json({ error: 'Diese Funktion ist in der Demo nicht verfügbar.' })
  }

  // Everything else the demo serves read-only. A visitor explores the whole
  // product; their edits live in their own browser and never reach the shared
  // database, which one public deployment and many visitors makes necessary.
  if (demoWriteBlocked(process.env.DEMO_MODE, key!, req.method)) {
    return res.status(410).json({ error: 'In der Demo werden Änderungen nicht gespeichert.' })
  }

  return route(req, res)
}
