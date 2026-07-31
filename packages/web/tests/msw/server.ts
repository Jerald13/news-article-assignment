import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Shared MSW server. Started once in tests/setup.ts. */
export const server = setupServer(...handlers);
