import type { Article, Paginated } from '@news/contracts';
import type { Middleware } from '@reduxjs/toolkit';
import type { AppStore, RootState } from './store';

/**
 * Development-only console tooling for Redux.
 *
 * Everything here is behind the dev flag and therefore stripped from the
 * production bundle — a live deployment should not narrate its state to the
 * console or hand out a handle to its store.
 */

const LOG_PREFERENCE_KEY = 'redux-log';

/**
 * RTK Query re-broadcasts its subscriber map on every mount, unmount and hook
 * render. Measured over five navigations, that bookkeeping was 10 of 18
 * dispatched actions — enough to bury the four that said anything.
 *
 * The filter is therefore about *subscription* plumbing specifically, not
 * internal actions in general. Anything under `queries/` describes the cache
 * itself and stays visible, however rarely it fires: `removeQueryResult` is the
 * only signal that an entry was evicted, and hiding it makes tag invalidation
 * look like it silently did nothing.
 *
 * `redux-log` set to `all` shows everything.
 */
// Matched as substrings of the action type, and deliberately without the slice
// name: the reducerPath is `articlesApi`, so a pattern beginning `api/` would
// miss `articlesApi/…` on the capital A.
const MUTED_ACTIONS = [
  'internalSubscriptions/',
  '/config/middlewareRegistered',
  '/subscriptions/unsubscribeQueryResult',
];

type LogMode = 'on' | 'off' | 'all';

function readLogMode(): LogMode {
  try {
    const stored = localStorage.getItem(LOG_PREFERENCE_KEY);
    if (stored === 'off' || stored === 'all') {
      return stored;
    }
  } catch {
    // Private browsing can throw on localStorage access; logging is optional.
  }

  return 'on';
}

function getActionType(action: unknown): string {
  if (typeof action === 'object' && action !== null && 'type' in action) {
    const { type } = action;

    if (typeof type === 'string') {
      return type;
    }
  }

  return '(unknown action)';
}

function isMuted(type: string): boolean {
  return MUTED_ACTIONS.some((muted) => type.includes(muted));
}

/**
 * Logs every action with the state before and after it, in a collapsed group —
 * the classic redux-logger behaviour, without the dependency and with the
 * RTK Query bookkeeping filtered out.
 */
export const loggerMiddleware: Middleware = (api) => (next) => (action) => {
  const mode = readLogMode();
  const type = getActionType(action);

  if (mode === 'off' || (mode === 'on' && isMuted(type))) {
    return next(action);
  }

  const previousState = api.getState() as RootState;
  const startedAt = performance.now();
  const result = next(action);
  const elapsed = performance.now() - startedAt;

  /* eslint-disable no-console -- this module exists to write to the console */
  console.groupCollapsed(
    `%credux%c ${type} %c+${elapsed.toFixed(1)}ms`,
    'background:#00767f;color:#fff;padding:1px 5px;border-radius:2px;font-weight:600',
    'color:inherit;font-weight:600',
    'color:#888;font-weight:400',
  );
  console.log('%cprev state', 'color:#888;font-weight:600', previousState);
  console.log('%caction    ', 'color:#00767f;font-weight:600', action);
  console.log('%cnext state', 'color:#2e7d32;font-weight:600', api.getState());
  console.groupEnd();
  /* eslint-enable no-console */

  return result;
};

export interface CacheEntrySummary {
  /** The endpoint and arguments this entry is keyed by. */
  query: string;
  /** How many articles the entry holds. */
  rows: number;
  /** How many mounted components are watching it. */
  subscribers: number;
}

/**
 * One row per cache entry, for `console.table(cache)`.
 *
 * `subscribers` is the interesting column: it decides what a tag invalidation
 * does to the entry. Anything being watched is refetched in place; anything at
 * zero is dropped from the store outright.
 */
function summariseCache(state: RootState): CacheEntrySummary[] {
  const { queries, subscriptions } = state.articlesApi;

  return Object.entries(queries).map(([key, entry]) => {
    const data: unknown = entry?.data;
    let rows = 0;

    if (typeof data === 'object' && data !== null && 'data' in data) {
      const { data: list } = data as Paginated<Article>;

      if (Array.isArray(list)) {
        rows = list.length;
      }
    }

    return { query: key, rows, subscribers: Object.keys(subscriptions[key] ?? {}).length };
  });
}

/** Every article currently held in the RTK Query cache, across all queries. */
function collectCachedArticles(state: RootState): Article[] {
  const articles: Article[] = [];

  for (const entry of Object.values(state.articlesApi.queries)) {
    const data: unknown = entry?.data;

    if (typeof data === 'object' && data !== null && 'data' in data) {
      const { data: rows } = data as Paginated<Article>;

      if (Array.isArray(rows)) {
        articles.push(...rows);
      }
    }
  }

  return articles;
}

/**
 * Attach console helpers to `window`.
 *
 * Getters rather than functions, so the shortest possible thing can be typed
 * into the console — `state` on its own prints the tree.
 */
export function attachConsoleHelpers(store: AppStore): void {
  window.store = store;

  Object.defineProperty(window, 'state', {
    configurable: true,
    get: () => store.getState(),
  });

  Object.defineProperty(window, 'articles', {
    configurable: true,
    get: () => collectCachedArticles(store.getState()),
  });

  Object.defineProperty(window, 'cache', {
    configurable: true,
    get: () => summariseCache(store.getState()),
  });

  /* eslint-disable no-console -- introducing the helpers is the point */
  console.log(
    '%credux%c console helpers ready\n' +
      '  state      → the whole state tree\n' +
      '  cache      → one row per cache entry, with its subscriber count\n' +
      '  articles   → articles currently in the RTK Query cache\n' +
      '  store      → dispatch, subscribe, getState\n' +
      "  localStorage.setItem('redux-log','off')  → silence the action log\n" +
      "  localStorage.setItem('redux-log','all')  → include internal RTK Query actions",
    'background:#00767f;color:#fff;padding:1px 5px;border-radius:2px;font-weight:600',
    'color:#888',
  );
  /* eslint-enable no-console */
}
