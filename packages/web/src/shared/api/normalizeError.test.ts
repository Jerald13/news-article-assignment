import { AxiosError, AxiosHeaders, CanceledError } from 'axios';
import { describe, expect, it } from 'vitest';
import type { ApiError } from './ApiError';
import { normalizeError } from './normalizeError';

/**
 * Builds an AxiosError the way Axios actually produces one, so the tests
 * exercise the real shape rather than a convenient approximation.
 */
function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', config);

  error.response = {
    status,
    data,
    statusText: '',
    headers: new AxiosHeaders(),
    config,
  };

  return error;
}

describe('normalizeError — no response', () => {
  it('reports a network failure when the request never reached the server', () => {
    // error.response is undefined: server down, DNS failure, CORS block, offline.
    const result = normalizeError(new AxiosError('Network Error', 'ERR_NETWORK'));

    expect(result).toEqual<ApiError>({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
    });
  });

  it('distinguishes a timeout from being offline', () => {
    // The advice differs: "check your connection" is wrong when the server is
    // reachable but slow.
    const result = normalizeError(new AxiosError('timeout of 8000ms', 'ECONNABORTED'));

    expect(result.code).toBe('TIMEOUT');
    expect(result.message).toMatch(/took too long/i);
  });

  it('treats a cancellation as harmless rather than as a failure', () => {
    // Fires whenever a component unmounts mid-request or a newer search
    // supersedes an older one. Surfacing it would show an error for something
    // the user caused deliberately.
    const result = normalizeError(new CanceledError('canceled'));

    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toMatch(/cancelled/i);
  });
});

describe('normalizeError — structured API responses', () => {
  it('passes through the code, message and per-field details of a 400', () => {
    const result = normalizeError(
      axiosErrorWithResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The submitted data is invalid.',
          details: [{ field: 'title', message: 'Article title is required' }],
        },
      }),
    );

    expect(result).toEqual<ApiError>({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'The submitted data is invalid.',
      details: [{ field: 'title', message: 'Article title is required' }],
    });
  });

  it('keeps a 404 message from the server', () => {
    const result = normalizeError(
      axiosErrorWithResponse(404, {
        error: { code: 'NOT_FOUND', message: 'No article exists with that id.' },
      }),
    );

    expect(result.status).toBe(404);
    expect(result.code).toBe('NOT_FOUND');
    expect(result.details).toBeUndefined();
  });
});

describe('normalizeError — responses we do not recognise', () => {
  it('survives a 500 that returns an HTML page instead of JSON', () => {
    // The classic error-handler-that-errors: a proxy or crashed dev server
    // returns HTML, so response.data is a string, and reaching for
    // .error.message on it throws inside the error path itself.
    const html = '<!doctype html><html><body><h1>502 Bad Gateway</h1></body></html>';

    expect(() => normalizeError(axiosErrorWithResponse(502, html))).not.toThrow();

    const result = normalizeError(axiosErrorWithResponse(502, html));
    expect(result.status).toBe(502);
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.message).not.toContain('<');
  });

  it('does not leak an unrecognised body into the message shown to a user', () => {
    const result = normalizeError(
      axiosErrorWithResponse(500, { stack: 'at Object.<anonymous> (/srv/app/db.js:42)' }),
    );

    expect(result.message).toBe('Something went wrong. Please try again.');
  });

  it('handles a JSON body that is almost but not quite the error envelope', () => {
    const result = normalizeError(axiosErrorWithResponse(400, { error: 'just a string' }));

    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.message).toBe('Something went wrong. Please try again.');
  });

  it('maps an unrecognised 404 body to NOT_FOUND rather than a server error', () => {
    const result = normalizeError(axiosErrorWithResponse(404, 'Cannot GET /api/nope'));

    expect(result.code).toBe('NOT_FOUND');
  });
});

describe('normalizeError — values that are not errors', () => {
  it.each([
    ['a string', 'boom'],
    ['null', null],
    ['undefined', undefined],
    ['a number', 42],
    ['a plain object', { unexpected: true }],
    ['a bare Error', new Error('something broke')],
  ])('never throws when handed %s', (_label, thrown) => {
    expect(() => normalizeError(thrown)).not.toThrow();
    expect(normalizeError(thrown).code).toBe('UNKNOWN_ERROR');
  });
});

describe('normalizeError — idempotence', () => {
  it('returns an already-normalised error unchanged', () => {
    // The Axios interceptor normalises on the way out, so anything caught
    // further up the chain has usually been through here already. A second
    // pass must not flatten a validation failure into a generic message and
    // discard the field details the form needs.
    const alreadyNormalised: ApiError = {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'The submitted data is invalid.',
      details: [{ field: 'publisher', message: 'Publisher is required' }],
    };

    expect(normalizeError(alreadyNormalised)).toEqual(alreadyNormalised);
    expect(normalizeError(normalizeError(alreadyNormalised))).toEqual(alreadyNormalised);
  });
});
