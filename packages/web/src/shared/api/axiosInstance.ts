import axios from 'axios';
import { env } from '../config/env';

/**
 * The application's single HTTP client.
 *
 * Deliberately plain. An earlier version normalised errors in a response
 * interceptor, which sounds tidier but is worse here: it would have to reject
 * with a non-`Error` object to keep the payload serialisable for the Redux
 * store, and the only consumer is `axiosBaseQuery`, which has to catch and
 * convert anyway. Normalising in exactly one place — the base query — keeps the
 * error path traceable instead of splitting it across two files.
 */
export const axiosInstance = axios.create({
  baseURL: env.apiBaseUrl,

  // Long enough for a slow connection, short enough that a hung request fails
  // visibly instead of leaving a spinner on screen forever.
  timeout: 8_000,

  headers: {
    'Content-Type': 'application/json',
  },
});
