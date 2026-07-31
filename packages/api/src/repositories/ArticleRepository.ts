import type { Article, ArticleInput, ListQuery } from '@news/contracts';

export interface ListArticlesResult {
  /** The requested page of articles. */
  data: Article[];
  /** Total rows matching the filter, ignoring pagination. */
  total: number;
}

/**
 * The boundary between the application and its storage.
 *
 * Controllers depend on this interface, never on SQLite. Two things follow:
 * tests inject an in-memory implementation with no mocking framework, and
 * moving to Postgres or Supabase later means writing one new class rather than
 * touching any route, controller or type.
 *
 * The methods return promises even though `node:sqlite` is synchronous. That is
 * deliberate — a driver's synchronicity is an implementation detail, and baking
 * it into the interface would mean every caller changes on the day the database
 * does. The cost today is one `await`; the saving later is the whole point of
 * having an interface.
 */
export interface ArticleRepository {
  list(query: ListQuery): Promise<ListArticlesResult>;
  findById(id: string): Promise<Article | null>;
  create(input: ArticleInput): Promise<Article>;
  /** Resolves to `null` when no article has that id. */
  update(id: string, input: ArticleInput): Promise<Article | null>;
  /** Resolves to `false` when no article has that id. */
  remove(id: string): Promise<boolean>;
}
