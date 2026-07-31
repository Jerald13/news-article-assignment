import { type ListQuery, listQuerySchema } from '@news/contracts';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/** Values that are implied, so they are left out of the URL. */
const DEFAULTS = listQuerySchema.parse({});

export interface UseArticleQueryParamsResult {
  query: ListQuery;
  /** Merge a partial change into the URL. Returning to page 1 is automatic. */
  setQuery: (patch: Partial<ListQuery>) => void;
}

/**
 * The article list's query state, stored in the URL rather than in React.
 *
 * This is the point where "which page am I on" stops being component state.
 * Keeping it in the address bar means the back button steps through pages, a
 * refresh does not silently reset to page 1, and a link to page 3 of a search
 * can be pasted to someone else and still show page 3 of that search. All of
 * that comes free; a `useState` copy would have to reimplement each of them
 * and would drift out of sync with the URL besides.
 *
 * Parsing goes through the same contract schema the API validates against, so
 * a hand-edited URL is coerced and clamped rather than crashing the page.
 */
export function useArticleQueryParams(): UseArticleQueryParamsResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(
    () => listQuerySchema.parse(Object.fromEntries(searchParams)),
    [searchParams],
  );

  const setQuery = useCallback(
    (patch: Partial<ListQuery>) => {
      const next: ListQuery = {
        ...query,
        ...patch,
        // Any change to what is being *searched for* invalidates the current
        // page number. Staying on page 4 while narrowing a search to two
        // results shows an empty list and looks broken.
        page: patch.page ?? (patch.q === undefined ? query.page : 1),
      };

      const params = new URLSearchParams();

      for (const [key, value] of Object.entries(next)) {
        const isDefault = value === DEFAULTS[key as keyof ListQuery];

        // Only non-default values reach the URL, so the common case stays
        // /articles rather than /articles?page=1&limit=10&q=&sort=date&order=desc
        if (!isDefault && value !== '') {
          params.set(key, String(value));
        }
      }

      setSearchParams(params);
    },
    [query, setSearchParams],
  );

  return { query, setQuery };
}
