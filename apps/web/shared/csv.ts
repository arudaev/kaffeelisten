// CSV serialization helpers for the admin exports.

/**
 * Serialize one cell for a CSV file, neutralizing spreadsheet formula injection.
 *
 * A cell beginning with `=`, `+`, `-`, `@`, or a leading control char (tab /
 * carriage return) can be executed as a formula by Excel/Sheets when the file is
 * opened. Such cells are prefixed with an apostrophe so they render as literal
 * text. The result is always double-quoted, with embedded quotes doubled.
 */
export function csvCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${guarded.replace(/"/g, '""')}"`
}

/** Join rows into a CRLF-delimited, semicolon-separated CSV body. */
export function toCsv(rows: string[][]): string {
  return rows.map(row => row.map(csvCell).join(';')).join('\r\n')
}
