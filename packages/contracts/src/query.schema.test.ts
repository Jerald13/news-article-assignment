import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, listQuerySchema } from './query.schema';

describe('listQuerySchema — defaults', () => {
  it('fills in every default when nothing is supplied', () => {
    expect(listQuerySchema.parse({})).toEqual({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      q: '',
      sort: 'date',
      order: 'desc',
    });
  });
});

describe('listQuerySchema — coercion', () => {
  it('coerces numeric strings, since query params are always strings', () => {
    const result = listQuerySchema.parse({ page: '3', limit: '25' });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
  });

  it('trims the search term', () => {
    expect(listQuerySchema.parse({ q: '  noodles  ' }).q).toBe('noodles');
  });
});

describe('listQuerySchema — clamping and fallbacks', () => {
  /**
   * A read endpoint should not 400 because someone hand-edited a URL or a chat
   * app truncated it. Every field falls back to its default instead.
   */
  it.each([
    ['non-numeric page', { page: 'abc' }, 'page', 1],
    ['zero page', { page: '0' }, 'page', 1],
    ['negative page', { page: '-5' }, 'page', 1],
    ['fractional page', { page: '2.7' }, 'page', 1],
    ['non-numeric limit', { limit: 'lots' }, 'limit', DEFAULT_PAGE_SIZE],
    ['zero limit', { limit: '0' }, 'limit', DEFAULT_PAGE_SIZE],
  ])('falls back for %s', (_label, input, key, expected) => {
    const result = listQuerySchema.parse(input) as Record<string, unknown>;
    expect(result[key]).toBe(expected);
  });

  it('caps limit so a caller cannot request the whole table', () => {
    expect(listQuerySchema.parse({ limit: '10000' }).limit).toBe(DEFAULT_PAGE_SIZE);
  });

  it('accepts a limit exactly at the maximum', () => {
    expect(listQuerySchema.parse({ limit: String(MAX_PAGE_SIZE) }).limit).toBe(MAX_PAGE_SIZE);
  });

  it('falls back to a safe sort column for an unknown field', () => {
    // Important: `sort` is interpolated into SQL as a column name, so anything
    // outside the allowlist must never reach the query builder.
    expect(listQuerySchema.parse({ sort: 'password' }).sort).toBe('date');
    expect(listQuerySchema.parse({ sort: 'title; DROP TABLE articles' }).sort).toBe('date');
  });

  it('falls back to a safe sort order', () => {
    expect(listQuerySchema.parse({ order: 'sideways' }).order).toBe('desc');
  });

  it('accepts every allowlisted sort field and order', () => {
    expect(listQuerySchema.parse({ sort: 'title', order: 'asc' })).toMatchObject({
      sort: 'title',
      order: 'asc',
    });
  });

  it('never throws, whatever it is handed', () => {
    expect(() =>
      listQuerySchema.parse({ page: {}, limit: [], q: 5, sort: null, order: false }),
    ).not.toThrow();
  });
});
