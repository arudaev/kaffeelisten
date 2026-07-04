// Shared mail helpers.

/**
 * Reply-to for all outgoing mail. A from-address (bericht@kaffeelisten.de) that
 * bounces replies hurts deliverability and trust, so every send points replies
 * at the first configured admin address. Returns undefined when ADMIN_EMAIL is
 * unset, in which case callers simply omit reply_to.
 */
export function replyTo(): string | undefined {
  const first = process.env.ADMIN_EMAIL?.split(',')[0]?.trim()
  return first || undefined
}
