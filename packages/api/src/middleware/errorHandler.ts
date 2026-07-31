import type { ApiErrorBody } from '@news/contracts';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../errors/HttpError';

/** Anything that reaches here is a route that does not exist. */
export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ApiErrorBody = {
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  };

  res.status(404).json(body);
};

/** A malformed JSON body surfaces as a SyntaxError carrying the raw body. */
function isJsonParseError(error: unknown): boolean {
  return error instanceof SyntaxError && 'body' in error;
}

/**
 * The single exit point for every error in the application.
 *
 * Every failure — thrown, rejected, or raised by body parsing — becomes the same
 * `ApiErrorBody` shape here and nowhere else. The client can therefore rely on
 * one contract for failures just as it does for successes.
 *
 * Unrecognised errors are logged in full but answered with a generic message.
 * Stack traces and driver errors are diagnostics, not something to hand to a
 * browser: they leak file paths, SQL and library versions.
 *
 * The unused fourth parameter is required — Express identifies error handlers by
 * arity, and removing it silently turns this into ordinary middleware.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    const body: ApiErrorBody = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };

    res.status(error.status).json(body);
    return;
  }

  if (isJsonParseError(error)) {
    const body: ApiErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request body is not valid JSON.',
      },
    };

    res.status(400).json(body);
    return;
  }

  console.error('[api] unhandled error:', error);

  const body: ApiErrorBody = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our end. Please try again.',
    },
  };

  res.status(500).json(body);
};
