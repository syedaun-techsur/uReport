// lib/reports/csv.ts
// RFC 4180 CSV serialization. Pure — no I/O, no DB. Unit-tested in __tests__/reports-csv.test.ts.

export type CsvCell = string | number | null | undefined;

/**
 * Escape a single CSV field per RFC 4180:
 * - null/undefined become an empty field
 * - numbers are stringified as-is
 * - a field containing a comma, double-quote, CR or LF is wrapped in double
 *   quotes, and any internal double-quote is doubled ("" ).
 */
export function escapeCsvField(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Serialize a header row + data rows into an RFC-4180 CSV string.
 * Rows are joined with CRLF and the output ends with a trailing CRLF.
 */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvField).join(','));
  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
