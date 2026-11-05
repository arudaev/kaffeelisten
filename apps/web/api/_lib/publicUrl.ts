// The deployment's own public origin.
//
// Anything a recipient opens later — the logo in a report email, a confirmation
// link — has to be an absolute URL, and until now those were hardcoded to the
// apex `https://kaffeelisten.de`. That is wrong in two directions:
//
//   * each campus runs its own instance (itc1.kaffeelisten.de), and its emails
//     should point at that instance rather than at a host it does not control;
//   * the apex is moving to the landing page, so it will stop resolving to this
//     application at all, which would break the logo in every monthly report.
//
// `PUBLIC_BASE_URL` is the deployed origin. The fallback is the old apex, so a
// deployment that has not set it behaves exactly as before.

const FALLBACK = 'https://kaffeelisten.de'

/** The instance's public origin, without a trailing slash. */
export function publicBaseUrl(): string {
  const raw = process.env.PUBLIC_BASE_URL?.trim()
  if (!raw) return FALLBACK

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    // Normalises away a path, a trailing slash and any stray whitespace.
    return new URL(withScheme).origin
  } catch {
    return FALLBACK
  }
}

/** Absolute URL of the report email's logo, served by this deployment. */
export function emailLogoUrl(): string {
  return `${publicBaseUrl()}/email-logo.png`
}
