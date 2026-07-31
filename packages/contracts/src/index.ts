/**
 * @news/contracts — the single source of truth for the API surface.
 *
 * Both the Express server and the React client import from here, so a change to
 * a validation rule or a response shape cannot be applied to only one side.
 *
 * Nothing in this package may import from `@news/api` or `@news/web`. It is the
 * bottom of the dependency graph and stays environment-agnostic: no DOM, no
 * node built-ins, no ambient types (its tsconfig sets `"types": []`).
 */

export {
  ARTICLE_FIELD_LIMITS,
  articleDateSchema,
  articleInputSchema,
  articleSchema,
} from './article.schema';

export type { Article, ArticleInput } from './article.types';

export {
  API_BASE_PATH,
  type ApiErrorBody,
  type ApiErrorCode,
  type ClientErrorCode,
  type FieldError,
  type Paginated,
  type PaginationMeta,
  type ServerErrorCode,
} from './api.types';

export {
  ARTICLE_SORT_FIELDS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  SORT_ORDERS,
  listQuerySchema,
  type ArticleSortField,
  type ListQuery,
  type SortOrder,
} from './query.schema';

export {
  ISO_DATE_PATTERN,
  MIN_ARTICLE_DATE,
  isRealCalendarDate,
  latestAcceptableDate,
  toIsoDate,
} from './date';

export { toFieldErrors } from './zodErrors';
