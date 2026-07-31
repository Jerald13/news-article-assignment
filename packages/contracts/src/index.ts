/**
 * @news/contracts — the single source of truth for the API surface.
 *
 * Both the Express server and the React client import from here, so a change to
 * a validation rule or a response shape is impossible to apply to only one side.
 *
 * Schemas and their inferred types land in Phase 1.
 */

/** Mount point for every API route. Used by the server to mount and by the client to call. */
export const API_BASE_PATH = '/api';
