import { Router } from 'express';
import { createArticlesController } from '../controllers/articles.controller';
import type { ArticleRepository } from '../repositories/ArticleRepository';

/**
 * Article routes.
 *
 * Handlers are `async` and simply throw on failure. Express 5 forwards a
 * rejected promise to the error handler on its own, so there is no
 * `express-async-errors` shim and no try/catch in any controller.
 */
export function createArticlesRouter(repository: ArticleRepository): Router {
  const controller = createArticlesController(repository);
  const router = Router();

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
