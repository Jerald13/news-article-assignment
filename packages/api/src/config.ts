import { fileURLToPath, URL } from 'node:url';

export interface AppConfig {
  port: number;
  /** Absolute path to the SQLite file, or ':memory:' in tests. */
  databasePath: string;
  /** Origins allowed by CORS. In development the Vite proxy means this is rarely exercised. */
  corsOrigins: string[];
}

const DEFAULT_PORT = 3001;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? DEFAULT_PORT);

  return {
    port: Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT,
    databasePath:
      env.DATABASE_PATH ?? fileURLToPath(new URL('../data/articles.db', import.meta.url)),
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
  };
}
