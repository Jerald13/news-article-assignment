const MS_PER_DAY = 86_400_000;

/**
 * A `Date` rendered as the calendar date it is *in the reader's timezone*.
 *
 * `toISOString()` would give the UTC date instead, so at 07:00 in Singapore an
 * article published today would be compared against yesterday and labelled
 * "YESTERDAY". Using the local getters is the fix.
 */
function toLocalIsoDate(instant: Date): string {
  const year = instant.getFullYear();
  const month = String(instant.getMonth() + 1).padStart(2, '0');
  const day = String(instant.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Whole days between two 'YYYY-MM-DD' strings, both read as UTC midnight. */
function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const from = Date.parse(`${fromIsoDate}T00:00:00Z`);
  const to = Date.parse(`${toIsoDate}T00:00:00Z`);

  return Math.round((to - from) / MS_PER_DAY);
}

const absoluteFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * The `YESTERDAY` label from the supplied design.
 *
 * Recent dates read as relative text, which is how a reader actually thinks
 * about news; anything older gets an absolute date, because "43 days ago" is
 * harder to place than "18 Jun 2026".
 *
 * Both sides of the comparison are calendar dates, never instants. Parsing the
 * article's date at UTC midnight and comparing it against the reader's *local*
 * calendar day is what keeps the label correct everywhere.
 *
 * `now` is injectable so the boundaries can be tested without mocking the clock.
 */
export function formatArticleDate(date: string, now: Date = new Date()): string {
  const elapsedDays = daysBetween(date, toLocalIsoDate(now));

  if (elapsedDays === 0) {
    return 'Today';
  }

  if (elapsedDays === 1) {
    return 'Yesterday';
  }

  if (elapsedDays > 1 && elapsedDays < 7) {
    return `${elapsedDays} days ago`;
  }

  // Covers older articles and, defensively, any date ahead of the reader's
  // clock — "in -2 days" would be worse than simply showing the date.
  return absoluteFormatter.format(new Date(`${date}T00:00:00Z`));
}

/**
 * Split a summary into the bullet points the design shows.
 *
 * The sample renders each summary as a short bulleted list rather than a
 * paragraph, which is what makes the cards scannable. Explicit line breaks win
 * when the author supplied them; otherwise the text is split on sentence
 * endings.
 *
 * The lookbehind keeps the punctuation attached to the sentence it ends.
 */
export function toSummaryPoints(summary: string): string[] {
  const trimmed = summary.trim();

  if (trimmed.length === 0) {
    return [];
  }

  const byLine = trimmed
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (byLine.length > 1) {
    return byLine;
  }

  return trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z"'“‘])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}
