import { toFieldErrors } from '@news/contracts';
import type { ZodType, z } from 'zod';
import { ValidationError } from '../errors/HttpError';

/**
 * Validate untrusted input against a contract schema, or throw a `ValidationError`
 * carrying per-field details.
 *
 * This is the server half of the shared contract. The browser runs the very same
 * schema through `zodResolver` for instant feedback, but that is only user
 * experience — anyone can bypass it with curl. This call is the actual guarantee.
 *
 * It is a helper called inside controllers rather than a piece of middleware, for
 * two reasons: the parsed value stays fully typed at the call site (middleware
 * would have to stash it on `req` and lose the type), and Express 5 made
 * `req.query` a read-only getter, so the usual "overwrite req.query with the
 * parsed value" trick no longer works.
 */
export function parseOrThrow<TSchema extends ZodType>(
  schema: TSchema,
  data: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(toFieldErrors(result.error));
  }

  return result.data;
}
