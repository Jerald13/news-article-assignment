/**
 * The transport envelope: how every response is shaped, successful or not.
 */

/** Mount point for every API route. Used by the server to mount, by the client to call. */
export const API_BASE_PATH = '/api';

export interface PaginationMeta {
  page: number;
  limit: number;
  /** Total rows matching the query, ignoring pagination. */
  total: number;
  totalPages: number;
}

/** Envelope for every list endpoint. */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Codes the server can emit. Deliberately narrow — a client that switches on
 * this should have to handle every case.
 */
export type ServerErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR';

/**
 * Failures that never reach the server, so they can never appear in a response
 * body. They are produced by the client's own error normaliser.
 */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN_ERROR';

export type ApiErrorCode = ServerErrorCode | ClientErrorCode;

/**
 * One invalid field. `field` matches the schema key exactly, which is what lets
 * a server-side validation failure be mapped straight onto the form input that
 * caused it via React Hook Form's `setError`.
 */
export interface FieldError {
  field: string;
  message: string;
}

/** The body of every non-2xx response, without exception. */
export interface ApiErrorBody {
  error: {
    code: ServerErrorCode;
    /** Safe to render to a user as-is. Never contains internals or stack traces. */
    message: string;
    /** Present only for VALIDATION_ERROR. */
    details?: FieldError[];
  };
}
