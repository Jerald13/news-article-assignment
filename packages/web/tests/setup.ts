import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

// `error` rather than `warn`: an unhandled request means a test is silently
// hitting a real endpoint, which is exactly the failure mode mocking exists to
// prevent.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  // Undo any per-test server.use(...) overrides so tests cannot leak into each
  // other and pass or fail depending on execution order.
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
