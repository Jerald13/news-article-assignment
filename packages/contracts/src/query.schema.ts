import { z } from 'zod';

/**
 * Query parameters for the article list.
 *
 * Everything arrives as a string, so numbers are coerced. Every field uses
 * `.catch()`, which means a malformed value falls back to its default instead
 * of failing the request. That is deliberate: query strings get hand-edited,
 * truncated by chat apps and mangled by link previewers, and answering
 * `?page=abc` with a 400 is worse for a *read* endpoint than quietly serving
 * page 1. Write endpoints stay strict — this leniency is scoped to reads.
 */

export const ARTICLE_SORT_FIELDS = ['date', 'title', 'publisher', 'createdAt'] as const;
export type ArticleSortField = (typeof ARTICLE_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const DEFAULT_PAGE_SIZE = 10;
/** Upper bound so a caller cannot ask for the whole table in one request. */
export const MAX_PAGE_SIZE = 50;
export const MAX_SEARCH_LENGTH = 200;

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE),
  /** Free-text search across title, summary and publisher. Empty means "no filter". */
  q: z.string().trim().max(MAX_SEARCH_LENGTH).catch(''),
  sort: z.enum(ARTICLE_SORT_FIELDS).catch('date'),
  order: z.enum(SORT_ORDERS).catch('desc'),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
