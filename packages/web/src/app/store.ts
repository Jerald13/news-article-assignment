import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import type { Article } from '@news/contracts';
import { articlesApi } from '@/features/articles';
import { attachConsoleHelpers, loggerMiddleware } from './devtools';

/**
 * Build a store.
 *
 * Exported as a factory so each test gets a clean one — RTK Query caches by
 * endpoint and arguments, and a shared store would let one test's fetched data
 * satisfy the next test's query and hide a real failure.
 *
 * The application itself uses the single instance created below, **not** this
 * factory. See the note there.
 */
export function createStore() {
  const store = configureStore({
    reducer: {
      [articlesApi.reducerPath]: articlesApi.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware().concat(articlesApi.middleware);

      // Added last so it observes the state *after* the API middleware has
      // handled the action, which is what makes the "next state" it prints the
      // real one rather than an intermediate.
      //
      // `import.meta.env.DEV` rather than the `env` helper: Vite substitutes the
      // literal at build time, so the branch folds to `false` and the whole
      // devtools module is tree-shaken out. Reading it through an object
      // property defeats that — the code never runs in production, but every
      // string in it still ships.
      return import.meta.env.DEV ? middleware.concat(loggerMiddleware) : middleware;
    },

    // Naming the instance makes it identifiable in the Redux DevTools
    // dropdown rather than appearing as an anonymous store.
    devTools: import.meta.env.DEV && { name: 'News Articles' },
  });

  // Enables refetchOnFocus / refetchOnReconnect for any endpoint that opts in.
  setupListeners(store.dispatch);

  return store;
}

/**
 * The application's store. Created once, at module scope.
 *
 * It deliberately does *not* live in a `useMemo` inside a component. React
 * StrictMode double-invokes render in development, so the factory ran twice and
 * built two stores: `<Provider>` used one while both registered with the Redux
 * DevTools extension, and the panel would attach to the orphan — showing
 * `@@INIT` and no actions, as though Redux were not being used at all.
 *
 * `useMemo` is a performance hint rather than a guarantee in any case, and React
 * may discard and recompute it. A store is not a memoisable value: creating one
 * has side effects, and `setupListeners` subscribes to window events that the
 * discarded copy never releases.
 */
export const store = createStore();

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

/**
 * Pre-typed hooks. Components use these instead of the raw react-redux ones, so
 * state and dispatch are typed without a generic argument at every call site.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

declare global {
  interface Window {
    /** Development-only handle for inspecting Redux from the browser console. */
    store?: AppStore;
    /** Development-only getter: the current state tree. */
    readonly state?: RootState;
    /** Development-only getter: articles held in the RTK Query cache. */
    readonly articles?: Article[];
  }
}

// Console helpers, development only. The literal keeps this eliminable at
// build time, so none of it reaches a real deployment — verified by grepping
// the production bundle, not assumed.
if (import.meta.env.DEV) {
  attachConsoleHelpers(store);
}
