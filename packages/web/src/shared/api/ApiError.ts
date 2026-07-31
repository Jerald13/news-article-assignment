import type { ApiErrorCode, FieldError } from '@news/contracts';

/**
 * The one error shape the UI ever has to handle.
 *
 * Everything that can go wrong — a dead server, a timeout, a validation
 * rejection, a proxy returning an HTML error page — is converted to this by
 * `normalizeError` before it reaches a component. Without that funnel every
 * call site ends up re-implementing "is this an AxiosError, does it have a
 * response, is the body JSON" and getting it subtly wrong.
 */
export interface ApiError {
  /** HTTP status, or 0 when the request never got a response at all. */
  status: number;
  code: ApiErrorCode;
  /** Safe to render directly to a user. */
  message: string;
  /** Present for validation failures. Maps 1:1 onto form fields. */
  details?: FieldError[];
}

/** True when the failure carries per-field messages a form can display. */
export function hasFieldErrors(error: ApiError): error is ApiError & { details: FieldError[] } {
  return Array.isArray(error.details) && error.details.length > 0;
}

/**
 * True when a value has already been through `normalizeError`.
 *
 * The Axios interceptor normalises on the way out, so anything caught further
 * up the chain is usually already an `ApiError`. Without this check a second
 * pass would see a plain object — not an AxiosError — and flatten a perfectly
 * good validation failure into a generic "something went wrong", losing the
 * per-field details the form needs.
 */
export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { status, code, message } = value as Partial<ApiError>;

  return typeof status === 'number' && typeof code === 'string' && typeof message === 'string';
}
