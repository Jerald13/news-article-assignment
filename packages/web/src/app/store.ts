import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import { articlesApi } from '@/features/articles';

/**
 * The store is created by a factory rather than as a module-level singleton, so
 * every test gets a clean one. A shared store leaks cached data between test
 * cases and produces failures that depend on execution order.
 */
export function createStore() {
  const store = configureStore({
    reducer: {
      [articlesApi.reducerPath]: articlesApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(articlesApi.middleware),
  });

  // Enables refetchOnFocus / refetchOnReconnect for any endpoint that opts in.
  setupListeners(store.dispatch);

  return store;
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

/**
 * Pre-typed hooks. Components use these instead of the raw react-redux ones, so
 * state and dispatch are typed without a generic argument at every call site.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
