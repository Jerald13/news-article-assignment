/**
 * Calendar-date helpers.
 *
 * An article's publication date is a *calendar date*, not an instant in time.
 * It is stored, transported and compared as a 'YYYY-MM-DD' string from end to
 * end. Round-tripping it through `new Date(value).toISOString()` shifts it by a
 * day for anyone east of UTC, which is the most common date bug there is.
 */

/** Shape check only — '2026-02-30' matches this but is not a real date. */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Earliest date accepted. Catches typos such as year 0202 or 1002. */
export const MIN_ARTICLE_DATE = '1900-01-01';

const MS_PER_DAY = 86_400_000;

/** Format an instant as a 'YYYY-MM-DD' calendar date in UTC. */
export function toIsoDate(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

/**
 * True when the string is a date that actually exists on the calendar.
 *
 * Substrings rather than `split()` so the values are plainly `string`, which
 * `noUncheckedIndexedAccess` would otherwise widen to `string | undefined`.
 * The round-trip through `Date.UTC` is what rejects 2026-02-30 and 2025-02-29:
 * JavaScript silently rolls those forward, so the components come back changed.
 */
export function isRealCalendarDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  const utc = new Date(Date.UTC(year, month - 1, day));

  return (
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  );
}

/**
 * The latest date an article may be dated: UTC today plus one day.
 *
 * This rule is enforced in two places in different timezones — the browser
 * (the user's local time) and the server (its own). A user in UTC+14 is
 * legitimately a calendar day ahead of a UTC server, so comparing against bare
 * UTC today would reject "today" for everyone east of UTC. One day of slack
 * covers every real offset (UTC+14 is the maximum) while still rejecting
 * genuine future-dating.
 *
 * `now` is injectable so the boundary can be tested without mocking the clock.
 */
export function latestAcceptableDate(now: Date = new Date()): string {
  return toIsoDate(new Date(now.getTime() + MS_PER_DAY));
}
