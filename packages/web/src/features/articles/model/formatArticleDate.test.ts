import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatArticleDate, toSummaryPoints } from './formatArticleDate';

describe('formatArticleDate', () => {
  const now = new Date('2026-07-31T12:00:00.000Z');

  it('labels the current day', () => {
    expect(formatArticleDate('2026-07-31', now)).toBe('Today');
  });

  it('labels the previous day, as the design does', () => {
    expect(formatArticleDate('2026-07-30', now)).toBe('Yesterday');
  });

  it.each([
    ['2026-07-29', '2 days ago'],
    ['2026-07-26', '5 days ago'],
    ['2026-07-25', '6 days ago'],
  ])('describes %s relatively', (date, expected) => {
    expect(formatArticleDate(date, now)).toBe(expected);
  });

  it('switches to an absolute date once relative text stops helping', () => {
    // "43 days ago" is harder to place than a date.
    expect(formatArticleDate('2026-06-18', now)).toBe('18 Jun 2026');
  });

  it('shows an absolute date for anything ahead of the reader clock', () => {
    // Should not happen — the schema rejects future dates — but "in -2 days"
    // would be a worse failure than simply showing the date.
    expect(formatArticleDate('2026-08-05', now)).toBe('5 Aug 2026');
  });

  describe('across timezones', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /**
     * The bug this guards against.
     *
     * At 07:00 on 31 July in Singapore (UTC+8) it is still 23:00 on 30 July in
     * UTC. Deriving "today" with toISOString() would compare against 30 July
     * and label an article published today as "Yesterday".
     */
    it('uses the reader local calendar day, not the UTC one', () => {
      const singaporeMorning = new Date('2026-07-30T23:00:00.000Z');

      // Sanity check: the instant really is on the previous day in UTC.
      expect(singaporeMorning.toISOString().slice(0, 10)).toBe('2026-07-30');

      vi.useFakeTimers();
      vi.setSystemTime(singaporeMorning);

      const localToday = new Date().toLocaleDateString('en-CA');
      expect(formatArticleDate(localToday, singaporeMorning)).toBe('Today');
    });
  });
});

describe('toSummaryPoints', () => {
  it('splits a paragraph into sentences, keeping the punctuation', () => {
    const points = toSummaryPoints(
      'The EU will remove noodles from Annex II. Exporters still face border checks.',
    );

    expect(points).toEqual([
      'The EU will remove noodles from Annex II.',
      'Exporters still face border checks.',
    ]);
  });

  it('prefers explicit line breaks when the author supplied them', () => {
    expect(toSummaryPoints('First point\nSecond point\n\nThird point')).toEqual([
      'First point',
      'Second point',
      'Third point',
    ]);
  });

  it('returns a single point for a single sentence', () => {
    expect(toSummaryPoints('One sentence only.')).toEqual(['One sentence only.']);
  });

  it('does not split on a decimal point or an abbreviation', () => {
    // A naive split on "." turns "1.6 per cent" into two bullets.
    expect(toSummaryPoints('Inflation slowed to 1.6 per cent in June.')).toHaveLength(1);
  });

  it('returns nothing for empty or whitespace-only input', () => {
    expect(toSummaryPoints('')).toEqual([]);
    expect(toSummaryPoints('   \n  ')).toEqual([]);
  });
});
