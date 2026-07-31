import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig } from 'axios';
import type { ApiError } from './ApiError';
import { axiosInstance } from './axiosInstance';
import { normalizeError } from './normalizeError';

export interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: unknown;
  params?: unknown;
}

/**
 * The bridge between Axios and RTK Query.
 *
 * RTK Query ships `fetchBaseQuery`, which uses `fetch`. The brief requires
 * Axios. A custom `baseQuery` is the documented way to supply your own
 * transport, so this satisfies both without compromising either: Axios really
 * is the client, and RTK Query still provides caching, request deduplication,
 * loading and error state, and tag-based invalidation.
 *
 * Two things must hold, and both are easy to get wrong:
 *
 * 1. **It must never throw.** RTK Query expects `{ data }` or `{ error }` as a
 *    return value; an exception escapes its error channel entirely and the
 *    hook's `error` field stays undefined while the UI shows nothing.
 * 2. **It must forward `api.signal`.** That is what lets RTK Query abort a
 *    request when a component unmounts or a newer query supersedes this one —
 *    which is how a slow response for "a" is prevented from landing after the
 *    fast response for "abc".
 */
export function axiosBaseQuery(): BaseQueryFn<AxiosBaseQueryArgs, unknown, ApiError> {
  return async ({ url, method = 'GET', data, params }, api) => {
    try {
      const response = await axiosInstance({
        url,
        method,
        data,
        params,
        signal: api.signal,
      });

      return { data: response.data as unknown };
    } catch (error) {
      // The interceptor has already normalised this, but normalising again is
      // idempotent and guards against a throw from anywhere else in the chain.
      return { error: normalizeError(error) };
    }
  };
}
