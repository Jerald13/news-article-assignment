import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Open a SQLite database.
 *
 * `node:sqlite` is built into Node, so there is no native addon to compile and
 * `npm install` cannot fail on it. That matters more than it sounds: the most
 * damaging outcome for this project is a reviewer whose install breaks.
 */
export function createDatabase(databasePath: string): DatabaseSync {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const db = new DatabaseSync(databasePath);

  // Write-ahead logging: readers no longer block on a writer. Ignored for
  // in-memory databases, which is why it is safe to run unconditionally.
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  return db;
}
