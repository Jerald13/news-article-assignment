import { API_BASE_PATH } from '@news/contracts';

/**
 * Typed access to build-time configuration.
 *
 * Reading `import.meta.env` in one place means a missing or renamed variable is
 * a single compile error rather than an `undefined` that only shows up at
 * runtime, in production, in someone else's browser.
 *
 * Vite types every custom variable as `any`, so each one is read as `unknown`
 * and narrowed here. That is the whole value of a config module: `any` is
 * contained at the boundary instead of spreading into everything downstream.
 */
const rawApiBaseUrl: unknown = import.meta.env.VITE_API_BASE_URL;

/**
 * Defaults to the relative `/api`, which is what makes the app work with no
 * configuration at all: Vite proxies `/api` in development, and the client and
 * server share an origin in production. The variable is only needed when they
 * are deployed separately.
 */
const apiBaseUrl =
  typeof rawApiBaseUrl === 'string' && rawApiBaseUrl.length > 0 ? rawApiBaseUrl : API_BASE_PATH;

export const env = {
  apiBaseUrl,
  isDevelopment: import.meta.env.DEV,
} as const;
