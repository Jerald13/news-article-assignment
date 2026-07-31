import { API_BASE_PATH } from '@news/contracts';
import { createApp } from './app';
import { loadConfig } from './config';
import { createDatabase } from './db/connection';
import { migrate } from './db/migrate';
import { seedIfEmpty } from './db/seed';
import { SqliteArticleRepository } from './repositories/SqliteArticleRepository';

const config = loadConfig();

const db = createDatabase(config.databasePath);

// Migrate and seed on boot so a clean clone works with `npm run dev` alone —
// no database to create, no migration command to remember, no setup step in
// the README beyond `npm install`.
migrate(db);
const seeded = await seedIfEmpty(db);

if (seeded > 0) {
  console.log(`[api] seeded ${seeded} sample articles`);
}

const app = createApp({
  repository: new SqliteArticleRepository(db),
  corsOrigins: config.corsOrigins,
});

const server = app.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}${API_BASE_PATH}`);
});

/**
 * Close the listener and the database on shutdown. Without this, an abrupt exit
 * can leave the write-ahead log unmerged, and `tsx watch` restarts would leak a
 * file handle on every reload.
 */
function shutdown(signal: string): void {
  console.log(`[api] ${signal} received, shutting down`);

  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
