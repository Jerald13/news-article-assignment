import { type Article, type Paginated, articleInputSchema, listQuerySchema } from '@news/contracts';
import type { Request, RequestHandler, Response } from 'express';
import { NotFoundError } from '../errors/HttpError';
import { parseOrThrow } from '../lib/validate';
import type { ArticleRepository } from '../repositories/ArticleRepository';

/**
 * Express 5 types `req.params` values as `string | string[]`, because a wildcard
 * segment can capture several. Declaring the shape a route actually has narrows
 * it once, here, instead of casting at every use.
 */
type IdRequest = Request<{ id: string }>;

/**
 * Controllers receive the repository rather than importing one, so the routes
 * can be mounted against SQLite in production and an in-memory database in
 * tests without a mocking framework.
 *
 * Handlers are arrow functions, not object methods: they are passed to the
 * router by reference, and a detached method would arrive with no `this`.
 */
export function createArticlesController(repository: ArticleRepository) {
  const list: RequestHandler = async (req, res) => {
    // Never throws: every field in the list query falls back to a default, so a
    // hand-edited URL serves page 1 rather than a 400.
    const query = listQuerySchema.parse(req.query);
    const { data, total } = await repository.list(query);

    const body: Paginated<Article> = {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        // At least 1, so an empty collection reads as "page 1 of 1" rather than
        // "page 1 of 0".
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };

    res.json(body);
  };

  const getById = async (req: IdRequest, res: Response): Promise<void> => {
    const article = await repository.findById(req.params.id);

    if (!article) {
      throw new NotFoundError('No article exists with that id.');
    }

    res.json(article);
  };

  const create: RequestHandler = async (req, res) => {
    const input = parseOrThrow(articleInputSchema, req.body);
    const article = await repository.create(input);

    // 201 with the created resource, so the client never has to re-fetch to
    // learn the server-assigned id and timestamps.
    res.status(201).json(article);
  };

  const update = async (req: IdRequest, res: Response): Promise<void> => {
    // Validate before looking anything up: a bad body is a bad body whether or
    // not the article exists, and reporting 404 first would leak which ids are
    // real to a caller sending garbage.
    const input = parseOrThrow(articleInputSchema, req.body);
    const article = await repository.update(req.params.id, input);

    if (!article) {
      throw new NotFoundError('No article exists with that id.');
    }

    res.json(article);
  };

  const remove = async (req: IdRequest, res: Response): Promise<void> => {
    const deleted = await repository.remove(req.params.id);

    if (!deleted) {
      throw new NotFoundError('No article exists with that id.');
    }

    // 204: the deletion succeeded and there is nothing meaningful to return.
    res.status(204).end();
  };

  return { list, getById, create, update, remove };
}
