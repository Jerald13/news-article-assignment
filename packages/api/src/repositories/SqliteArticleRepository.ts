import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type {
  Article,
  ArticleInput,
  ArticleSortField,
  ListQuery,
  SortOrder,
} from '@news/contracts';
import type { ArticleRepository, ListArticlesResult } from './ArticleRepository';

/** The row shape as it comes back from SQLite. */
interface ArticleRow {
  id: string;
  title: string;
  summary: string;
  date: string;
  publisher: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sort field to column name.
 *
 * A column name cannot be a bound parameter, so it has to be interpolated into
 * the SQL string. This map is what makes that safe: the key type is the
 * allowlisted union from the contract, so nothing outside it can reach the
 * query — and the schema already falls back to 'date' for anything unrecognised.
 */
const SORT_COLUMNS: Record<ArticleSortField, string> = {
  date: 'date',
  title: 'title',
  publisher: 'publisher',
  createdAt: 'createdAt',
};

const SORT_DIRECTIONS: Record<SortOrder, string> = {
  asc: 'ASC',
  desc: 'DESC',
};

/**
 * `%` and `_` are wildcards in a LIKE pattern, so a user searching for "50%"
 * would otherwise match everything. Escaped here and paired with `ESCAPE '\'`
 * in the query.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export class SqliteArticleRepository implements ArticleRepository {
  constructor(private readonly db: DatabaseSync) {}

  list(query: ListQuery): Promise<ListArticlesResult> {
    const { page, limit, q, sort, order } = query;

    const searching = q.length > 0;
    const whereClause = searching
      ? `WHERE title LIKE ? ESCAPE '\\' COLLATE NOCASE
            OR summary LIKE ? ESCAPE '\\' COLLATE NOCASE
            OR publisher LIKE ? ESCAPE '\\' COLLATE NOCASE`
      : '';

    const pattern = `%${escapeLikePattern(q)}%`;
    const filterParams = searching ? [pattern, pattern, pattern] : [];

    const countRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM articles ${whereClause}`)
      .get(...filterParams) as { total: number } | undefined;

    const total = countRow?.total ?? 0;

    // A second column keeps the order deterministic when the primary sort
    // column ties — without it, two articles from the same day can swap places
    // between requests and appear to duplicate across page boundaries.
    const rows = this.db
      .prepare(
        `SELECT id, title, summary, date, publisher, createdAt, updatedAt
           FROM articles
           ${whereClause}
          ORDER BY ${SORT_COLUMNS[sort]} ${SORT_DIRECTIONS[order]}, createdAt DESC, id ASC
          LIMIT ? OFFSET ?`,
      )
      .all(...filterParams, limit, (page - 1) * limit) as unknown as ArticleRow[];

    return Promise.resolve({ data: rows, total });
  }

  findById(id: string): Promise<Article | null> {
    const row = this.db
      .prepare(
        `SELECT id, title, summary, date, publisher, createdAt, updatedAt
           FROM articles WHERE id = ?`,
      )
      .get(id) as ArticleRow | undefined;

    return Promise.resolve(row ?? null);
  }

  create(input: ArticleInput): Promise<Article> {
    const now = new Date().toISOString();
    const article: Article = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO articles (id, title, summary, date, publisher, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        article.id,
        article.title,
        article.summary,
        article.date,
        article.publisher,
        article.createdAt,
        article.updatedAt,
      );

    return Promise.resolve(article);
  }

  update(id: string, input: ArticleInput): Promise<Article | null> {
    const updatedAt = new Date().toISOString();

    const result = this.db
      .prepare(
        `UPDATE articles
            SET title = ?, summary = ?, date = ?, publisher = ?, updatedAt = ?
          WHERE id = ?`,
      )
      .run(input.title, input.summary, input.date, input.publisher, updatedAt, id);

    if (result.changes === 0) {
      return Promise.resolve(null);
    }

    return this.findById(id);
  }

  remove(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM articles WHERE id = ?').run(id);

    return Promise.resolve(result.changes > 0);
  }
}
