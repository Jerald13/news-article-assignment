import type { ApiErrorBody } from '@news/contracts';
import axios from 'axios';
import { type ApiError, isApiError } from './ApiError';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Is this the error envelope our own API promises?
 *
 * Checked structurally rather than assumed. A 500 from a proxy, a gateway or a
 * dev-server crash returns an HTML page, so `response.data` is a *string* — and
 * reaching into `.error.message` on a string is how error handling ends up
 * throwing its own error while handling an error.
 */
function isApiErrorBody(data: unknown): data is ApiErrorBody {
  if (typeof data !== 'object' || data === null || !('error' in data)) {
    return false;
  }

  const { error } = data;

  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const { code, message } = error as { code?: unknown; message?: unknown };

  return typeof code === 'string' && typeof message === 'string';
}

/**
 * Turn anything thrown by a request into a single, renderable `ApiError`.
 *
 * The five cases, in the order they are checked:
 *
 * 1. **Cancelled** — the component unmounted or a newer request superseded this
 *    one. Not a failure; it must never surface as an error message.
 * 2. **Timed out** — a slow or hanging server. Distinguished from "offline"
 *    because the advice to the user is different.
 * 3. **No response at all** — server down, DNS failure, CORS block, offline.
 *    `error.response` is undefined and there is no status to report.
 * 4. **A structured response from our API** — pass the code, message and
 *    per-field details straight through.
 * 5. **A response we do not recognise** — an HTML error page, a proxy message,
 *    a plain string. Log it, show something generic; the raw body is a
 *    diagnostic, not a user-facing message.
 */
export function normalizeError(error: unknown): ApiError {
  // Idempotent. The Axios interceptor normalises on the way out, so anything
  // caught further up is usually already an ApiError — and a second pass would
  // otherwise see a plain object, fall through to the last branch, and discard
  // the message and field details it already holds.
  if (isApiError(error)) {
    return error;
  }

  if (axios.isCancel(error)) {
    return {
      status: 0,
      code: 'UNKNOWN_ERROR',
      message: 'The request was cancelled.',
    };
  }

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        status: 0,
        code: 'TIMEOUT',
        message: 'The server took too long to respond. Please try again.',
      };
    }

    if (!error.response) {
      return {
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Check your connection and try again.',
      };
    }

    const { status } = error.response;
    // Axios types `data` as `any`. Widening it to `unknown` forces the checks
    // below to actually run instead of the compiler taking their word for it.
    const data: unknown = error.response.data;

    if (isApiErrorBody(data)) {
      return {
        status,
        code: data.error.code,
        message: data.error.message,
        ...(data.error.details ? { details: data.error.details } : {}),
      };
    }

    return {
      status,
      code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
      message: FALLBACK_MESSAGE,
    };
  }

  // Not an Axios error at all: a bug in our own code, or a non-Error value was
  // thrown. Never let the normaliser itself be the thing that crashes.
  return {
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: FALLBACK_MESSAGE,
  };
}
