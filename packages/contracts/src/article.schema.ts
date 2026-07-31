import { z } from 'zod';
import {
  ISO_DATE_PATTERN,
  MIN_ARTICLE_DATE,
  isRealCalendarDate,
  latestAcceptableDate,
} from './date';

/**
 * The single definition of a valid article.
 *
 * This schema is imported by the React form (through `zodResolver`) and by the
 * Express validation middleware. There is exactly one copy of these rules, so
 * the client and the server cannot disagree about what is valid. The client
 * copy is user experience; the server copy is the actual guarantee.
 */

export const ARTICLE_FIELD_LIMITS = {
  title: 200,
  summary: 2000,
  publisher: 100,
} as const;

/**
 * Publication date.
 *
 * `.trim()` runs before `.min(1)`, so a field containing only whitespace is
 * rejected rather than accepted as "filled".
 */
export const articleDateSchema = z
  .string()
  .trim()
  .min(1, 'Article date is required')
  .regex(ISO_DATE_PATTERN, 'Enter the date as YYYY-MM-DD')
  .refine(isRealCalendarDate, 'That date does not exist')
  .refine((value) => value >= MIN_ARTICLE_DATE, `Date must be on or after ${MIN_ARTICLE_DATE}`)
  // Lexicographic comparison is correct for YYYY-MM-DD and avoids constructing
  // a Date purely to compare two calendar days.
  .refine((value) => value <= latestAcceptableDate(), 'Date cannot be in the future');

/** What a client may send when creating or updating an article. */
export const articleInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Article title is required')
    .max(
      ARTICLE_FIELD_LIMITS.title,
      `Title must be ${ARTICLE_FIELD_LIMITS.title} characters or fewer`,
    ),

  summary: z
    .string()
    .trim()
    .min(1, 'Article summary is required')
    .max(
      ARTICLE_FIELD_LIMITS.summary,
      `Summary must be ${ARTICLE_FIELD_LIMITS.summary} characters or fewer`,
    ),

  date: articleDateSchema,

  publisher: z
    .string()
    .trim()
    .min(1, 'Publisher is required')
    .max(
      ARTICLE_FIELD_LIMITS.publisher,
      `Publisher must be ${ARTICLE_FIELD_LIMITS.publisher} characters or fewer`,
    ),
});

/** A stored article: the client's input plus the fields the server owns. */
export const articleSchema = articleInputSchema.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
