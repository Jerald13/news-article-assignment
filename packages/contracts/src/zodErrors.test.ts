import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { articleInputSchema } from './article.schema';
import { toFieldErrors } from './zodErrors';

describe('toFieldErrors', () => {
  it('maps each failing field to a message the form can display', () => {
    const result = articleInputSchema.safeParse({
      title: '',
      summary: 'fine',
      date: '2026-07-30',
      publisher: '',
    });

    expect(toFieldErrors(result.error!)).toEqual([
      { field: 'title', message: 'Article title is required' },
      { field: 'publisher', message: 'Publisher is required' },
    ]);
  });

  it('keeps only the first message per field', () => {
    // An empty date fails "required", "format" and "does not exist" together.
    // An input shows one message; three stacked under one field is noise.
    const result = articleInputSchema.safeParse({
      title: 'ok',
      summary: 'ok',
      date: '',
      publisher: 'ok',
    });

    const dateErrors = toFieldErrors(result.error!).filter((e) => e.field === 'date');

    expect(dateErrors).toHaveLength(1);
    expect(dateErrors[0]?.message).toBe('Article date is required');
  });

  it('joins nested paths with dots', () => {
    const nested = z.object({ author: z.object({ name: z.string().min(1, 'Name is required') }) });
    const result = nested.safeParse({ author: { name: '' } });

    expect(toFieldErrors(result.error!)).toEqual([
      { field: 'author.name', message: 'Name is required' },
    ]);
  });

  it('returns an empty list for an error with no issues', () => {
    expect(toFieldErrors(new z.ZodError([]))).toEqual([]);
  });

  it('reads issues from `issues`, not the Zod 3 `errors` property', () => {
    // Guards the silent-failure trap: in Zod 4, `error.errors` is undefined
    // rather than an error, so v3-era code returns nothing and looks fine.
    const result = articleInputSchema.safeParse({});

    expect(result.error?.issues.length).toBeGreaterThan(0);
    expect(toFieldErrors(result.error!).length).toBeGreaterThan(0);
  });
});
