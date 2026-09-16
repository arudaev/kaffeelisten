// Map a thrown error to the admin API response. Most failures stay a generic
// "Serverfehler", but two configuration faults get a precise German message so
// the admin panel says what is wrong instead of showing empty tables.


export const SCHEMA_OUTDATED_MESSAGE =
  'Die Datenbank ist nicht auf dem Stand dieser Version – eine Migration ist noch nicht eingespielt. Bitte die Migrationen anwenden (docs/environments.md).'

// PostgREST/Postgres wording for a column or table the code expects but the database lacks.
const SCHEMA_RE = /(column .+ does not exist|relation .+ does not exist|Could not find the '.+' column|Could not find the table|in the schema cache)/i

export function classifyServerError(err: unknown): { status: number; error: string } {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('Produktionsdatenbank') && message.includes('gesperrt')) return { status: 503, error: message }
  if (SCHEMA_RE.test(message)) return { status: 503, error: SCHEMA_OUTDATED_MESSAGE }
  return { status: 500, error: 'Serverfehler' }
}
