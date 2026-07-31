import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import { articlesApi } from '@/features/articles';
import { env } from '@/shared/config/env';

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
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(articlesApi.middleware),

    // Naming the instance makes it identifiable in the Redux DevTools
    // dropdown rather than appearing as an anonymous store.
    devTools: env.isDevelopment && { name: 'News Articles' },
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
  }
}

// Exposed in development only, so the store can be inspected without the
// DevTools extension installed:
//
//   store.getState()                      the whole tree
//   store.getState().articlesApi.queries  every cached request and its data
//   store.dispatch(...)                   drive it by hand
//
// Guarded by the dev flag so it is stripped from the production bundle and
// never becomes a foothold on a real deployment.
if (env.isDevelopment) {
  window.store = store;
}
