import type { z } from 'zod';
import type { articleInputSchema, articleSchema } from './article.schema';

/**
 * Types are *inferred from the schemas*, never hand-written.
 *
 * That is the whole point of the contracts package: a validation rule and the
 * type describing it are the same declaration, so they cannot drift apart. Add
 * a field to the schema and every consumer stops compiling until it is handled.
 */

/** The four fields a user fills in. */
export type ArticleInput = z.infer<typeof articleInputSchema>;

/** A stored article as returned by the API. */
export type Article = z.infer<typeof articleSchema>;
