import { describe, expect, it } from 'vitest';
import { ARTICLE_FIELD_LIMITS, articleInputSchema, articleSchema } from './article.schema';
import { toFieldErrors } from './zodErrors';

const validInput = {
  title: 'EU relaxes food safety requirements for Vietnamese instant noodles',
  summary: 'The EU will remove Vietnamese instant noodles from its Annex II control list.',
  date: '2026-07-30',
  publisher: 'Saigon Times',
};

/** The four field names, in the order they appear in the form. */
const requiredFields = ['title', 'summary', 'date', 'publisher'] as const;

describe('articleInputSchema — happy path', () => {
  it('accepts a fully populated article', () => {
    const result = articleInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('trims surrounding whitespace from every field', () => {
    const result = articleInputSchema.parse({
      title: '  Padded title  ',
      summary: '\tPadded summary\n',
      date: ' 2026-07-30 ',
      publisher: '  Saigon Times  ',
    });

    expect(result).toEqual({
      title: 'Padded title',
      summary: 'Padded summary',
      date: '2026-07-30',
      publisher: 'Saigon Times',
    });
  });

  it('accepts content exactly at each length limit', () => {
    const result = articleInputSchema.safeParse({
      ...validInput,
      title: 'x'.repeat(ARTICLE_FIELD_LIMITS.title),
      summary: 'x'.repeat(ARTICLE_FIELD_LIMITS.summary),
      publisher: 'x'.repeat(ARTICLE_FIELD_LIMITS.publisher),
    });

    expect(result.success).toBe(true);
  });
});

describe('articleInputSchema — required fields', () => {
  it.each(requiredFields)('rejects an empty %s', (field) => {
    const result = articleInputSchema.safeParse({ ...validInput, [field]: '' });

    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!).map((e) => e.field)).toContain(field);
  });

  it.each(requiredFields)('rejects a whitespace-only %s', (field) => {
    // The brief says "if any field is missing, show an error". A field holding
    // only spaces looks filled but is not, so trimming happens before the
    // required check rather than after it.
    const result = articleInputSchema.safeParse({ ...validInput, [field]: '   ' });

    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!).map((e) => e.field)).toContain(field);
  });

  it('reports every missing field at once rather than stopping at the first', () => {
    const result = articleInputSchema.safeParse({
      title: '',
      summary: '',
      date: '',
      publisher: '',
    });

    expect(result.success).toBe(false);
    expect(
      toFieldErrors(result.error!)
        .map((e) => e.field)
        .sort(),
    ).toEqual([...requiredFields].sort());
  });

  it.each(requiredFields)('rejects a missing %s key entirely', (field) => {
    const { [field]: _omitted, ...incomplete } = validInput;

    expect(articleInputSchema.safeParse(incomplete).success).toBe(false);
  });

  it.each(requiredFields)('gives a missing %s the same human message as an empty one', (field) => {
    // Zod checks the type before the length, so a field that is absent
    // entirely never reaches .min(1). Without a message on the type check it
    // would surface "Invalid input: expected string, received undefined" —
    // developer jargon shown to a user.
    const { [field]: _omitted, ...incomplete } = validInput;

    const missing = toFieldErrors(articleInputSchema.safeParse(incomplete).error!);
    const empty = toFieldErrors(
      articleInputSchema.safeParse({ ...validInput, [field]: '' }).error!,
    );

    expect(missing.find((e) => e.field === field)?.message).toBe(
      empty.find((e) => e.field === field)?.message,
    );
    expect(missing.find((e) => e.field === field)?.message).not.toMatch(/expected string/i);
  });
});

describe('articleInputSchema — length limits', () => {
  it('rejects a title one character over the limit', () => {
    const result = articleInputSchema.safeParse({
      ...validInput,
      title: 'x'.repeat(ARTICLE_FIELD_LIMITS.title + 1),
    });

    expect(result.success).toBe(false);
  });

  it('rejects a summary one character over the limit', () => {
    const result = articleInputSchema.safeParse({
      ...validInput,
      summary: 'x'.repeat(ARTICLE_FIELD_LIMITS.summary + 1),
    });

    expect(result.success).toBe(false);
  });

  it('rejects a publisher one character over the limit', () => {
    const result = articleInputSchema.safeParse({
      ...validInput,
      publisher: 'x'.repeat(ARTICLE_FIELD_LIMITS.publisher + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe('articleInputSchema — date rules', () => {
  it.each([
    ['wrong separator', '2026/07/30'],
    ['day-first', '30-07-2026'],
    ['unpadded month', '2026-7-30'],
    ['a full timestamp', '2026-07-30T00:00:00.000Z'],
    ['free text', 'yesterday'],
  ])('rejects %s', (_label, date) => {
    expect(articleInputSchema.safeParse({ ...validInput, date }).success).toBe(false);
  });

  it('rejects a date that does not exist on the calendar', () => {
    expect(articleInputSchema.safeParse({ ...validInput, date: '2026-02-30' }).success).toBe(false);
  });

  it('rejects a date before the minimum', () => {
    expect(articleInputSchema.safeParse({ ...validInput, date: '1899-12-31' }).success).toBe(false);
  });

  it('rejects a date well into the future', () => {
    const nextYear = String(new Date().getUTCFullYear() + 1);
    expect(articleInputSchema.safeParse({ ...validInput, date: `${nextYear}-01-01` }).success).toBe(
      false,
    );
  });

  it("accepts today's date", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(articleInputSchema.safeParse({ ...validInput, date: today }).success).toBe(true);
  });
});

describe('articleInputSchema — unknown keys', () => {
  it('strips fields the contract does not define', () => {
    const result = articleInputSchema.parse({ ...validInput, isAdmin: true, id: 'spoofed' });

    expect(result).not.toHaveProperty('isAdmin');
    expect(result).not.toHaveProperty('id');
  });
});

describe('articleSchema — stored article', () => {
  const storedArticle = {
    ...validInput,
    id: '3f8c1b2e-9d4a-4c7e-8b1f-2a6d5e0c9a13',
    createdAt: '2026-07-30T09:15:00.000Z',
    updatedAt: '2026-07-30T09:15:00.000Z',
  };

  it('accepts a well-formed stored article', () => {
    expect(articleSchema.safeParse(storedArticle).success).toBe(true);
  });

  it('rejects an id that is not a uuid', () => {
    expect(articleSchema.safeParse({ ...storedArticle, id: '123' }).success).toBe(false);
  });

  it('rejects timestamps that are not ISO 8601', () => {
    expect(articleSchema.safeParse({ ...storedArticle, createdAt: '2026-07-30' }).success).toBe(
      false,
    );
  });
});
