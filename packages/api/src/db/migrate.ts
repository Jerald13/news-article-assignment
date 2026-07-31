import type { DatabaseSync } from 'node:sqlite';

/**
 * Create the schema if it is not already there.
 *
 * Idempotent by design, so it can run on every boot. That is what makes the
 * project work from a clean clone with no setup step: `npm run dev` creates the
 * file, the tables and the indexes on first start.
 *
 * `date` is a 'YYYY-MM-DD' string rather than a number. SQLite has no date type,
 * and storing an epoch would force a timezone conversion on every read — the
 * exact bug the contracts package exists to avoid. As a fixed-width string it
 * also sorts and compares correctly with plain lexicographic ordering.
 */
export function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id        TEXT PRIMARY KEY,
      title     TEXT NOT NULL,
      summary   TEXT NOT NULL,
      date      TEXT NOT NULL,
      publisher TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Indexes on every column the list endpoint can sort by. Without these,
  // ORDER BY forces a full scan and sort of the table on every request.
  db.exec('CREATE INDEX IF NOT EXISTS idx_articles_date ON articles (date DESC);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles (createdAt DESC);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_articles_title ON articles (title);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_articles_publisher ON articles (publisher);');
}
