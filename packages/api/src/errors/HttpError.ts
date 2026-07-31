import type { FieldError, ServerErrorCode } from '@news/contracts';

/**
 * An error that carries the HTTP status and error code it should become.
 *
 * Controllers throw these; the centralised error handler is the only place that
 * turns one into a response. That keeps every error path in the application
 * funnelling through a single exit point with a single, consistent body shape.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ServerErrorCode;
  readonly details?: FieldError[];

  constructor(status: number, code: ServerErrorCode, message: string, details?: FieldError[]) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;

    if (details) {
      this.details = details;
    }
  }
}

/** 400 — the request was understood but its contents failed the contract. */
export class ValidationError extends HttpError {
  constructor(details: FieldError[], message = 'The submitted data is invalid.') {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

/** 404 — the resource does not exist. */
export class NotFoundError extends HttpError {
  constructor(message = 'The requested resource was not found.') {
    super(404, 'NOT_FOUND', message);
  }
}
