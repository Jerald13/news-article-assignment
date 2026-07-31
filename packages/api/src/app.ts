import { API_BASE_PATH } from '@news/contracts';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import type { ArticleRepository } from './repositories/ArticleRepository';
import { createArticlesRouter } from './routes/articles.routes';

export interface CreateAppOptions {
  repository: ArticleRepository;
  corsOrigins?: string[];
}

/**
 * Build the Express application.
 *
 * Separate from `index.ts` so tests can mount the real app with an in-memory
 * repository and drive it through supertest — exercising routing, validation,
 * status codes and the error handler for real, without binding a port.
 */
export function createApp({ repository, corsOrigins }: CreateAppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors(corsOrigins ? { origin: corsOrigins } : undefined));

  // A news article is text. Capping the body size means a malicious or
  // accidental multi-megabyte payload is rejected before it is parsed.
  app.use(express.json({ limit: '100kb' }));

  app.get(`${API_BASE_PATH}/health`, (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(`${API_BASE_PATH}/articles`, createArticlesRouter(repository));

  // Order matters: unmatched routes first, then the single error funnel last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
