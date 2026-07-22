/**
 * Parses a `YYYY-MM-DD` date-only string as a local-timezone date.
 * `new Date('2026-07-22')` parses as UTC midnight, which renders as the
 * previous day in any timezone behind UTC — this avoids that off-by-one.
 */
export function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}
