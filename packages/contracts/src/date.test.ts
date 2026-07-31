import { describe, expect, it } from 'vitest';
import { isRealCalendarDate, latestAcceptableDate, toIsoDate } from './date';

describe('isRealCalendarDate', () => {
  it('accepts ordinary dates', () => {
    expect(isRealCalendarDate('2026-07-31')).toBe(true);
    expect(isRealCalendarDate('1900-01-01')).toBe(true);
  });

  it('accepts 29 February in a leap year', () => {
    expect(isRealCalendarDate('2024-02-29')).toBe(true);
  });

  it('rejects 29 February in a non-leap year', () => {
    // JavaScript silently rolls this forward to 1 March, which is exactly why
    // the implementation round-trips the components instead of trusting Date.
    expect(isRealCalendarDate('2025-02-29')).toBe(false);
  });

  it('rejects days that do not exist in the month', () => {
    expect(isRealCalendarDate('2026-02-30')).toBe(false);
    expect(isRealCalendarDate('2026-04-31')).toBe(false);
    expect(isRealCalendarDate('2026-13-01')).toBe(false);
    expect(isRealCalendarDate('2026-00-10')).toBe(false);
    expect(isRealCalendarDate('2026-01-00')).toBe(false);
  });

  it('rejects anything that is not YYYY-MM-DD', () => {
    expect(isRealCalendarDate('')).toBe(false);
    expect(isRealCalendarDate('31/07/2026')).toBe(false);
    expect(isRealCalendarDate('2026-7-31')).toBe(false);
    expect(isRealCalendarDate('2026-07-31T00:00:00Z')).toBe(false);
    expect(isRealCalendarDate('not a date')).toBe(false);
  });

  it('rejects two-digit years that Date would silently reinterpret', () => {
    // Date.UTC(26, ...) means 1926, so the round-trip check catches it.
    expect(isRealCalendarDate('0026-07-31')).toBe(false);
  });
});

describe('latestAcceptableDate', () => {
  it('allows one day of slack beyond UTC today', () => {
    const now = new Date('2026-07-31T12:00:00.000Z');
    expect(latestAcceptableDate(now)).toBe('2026-08-01');
  });

  /**
   * The bug this exists to prevent.
   *
   * At 07:00 on 1 August in Singapore (UTC+8) it is still 23:00 on 31 July in
   * UTC. A user picking "today" in the date input submits 2026-08-01. Comparing
   * that against bare UTC today (2026-07-31) would reject the current day for
   * every user east of UTC.
   */
  it('accepts "today" for a user in UTC+8 while the server is still on the previous UTC day', () => {
    const serverNow = new Date('2026-07-31T23:00:00.000Z');
    const dateTheUserPicked = '2026-08-01';

    expect(dateTheUserPicked <= latestAcceptableDate(serverNow)).toBe(true);
  });

  it('still rejects genuine future-dating', () => {
    const now = new Date('2026-07-31T12:00:00.000Z');

    expect('2026-08-02' <= latestAcceptableDate(now)).toBe(false);
    expect('2027-01-01' <= latestAcceptableDate(now)).toBe(false);
  });

  it('rolls over month and year boundaries', () => {
    expect(latestAcceptableDate(new Date('2026-12-31T10:00:00.000Z'))).toBe('2027-01-01');
    expect(latestAcceptableDate(new Date('2024-02-28T10:00:00.000Z'))).toBe('2024-02-29');
  });
});

describe('toIsoDate', () => {
  it('formats an instant as a UTC calendar date', () => {
    expect(toIsoDate(new Date('2026-07-31T23:59:59.999Z'))).toBe('2026-07-31');
  });
});
