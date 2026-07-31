import Box from '@mui/material/Box';
import { useEffect } from 'react';
import {
  ArticleEmptyState,
  ArticleList,
  ArticleListSkeleton,
  ArticleResultsHeader,
  useArticleQueryParams,
  useListArticlesQuery,
} from '@/features/articles';
import { normalizeError } from '@/shared/api/normalizeError';
import { ErrorState } from '@/shared/ui/ErrorState';

/**
 * Page 2 — fetch and display articles.
 *
 * The page owns three things and nothing else: which query is active (from the
 * URL), which of the render states applies, and what happens when the reader
 * changes page. Everything visual lives in the feature's components.
 *
 * `isLoading` and `isFetching` are deliberately different branches. `isLoading`
 * is the very first load, when there is nothing to show and a skeleton is
 * right. `isFetching` covers later refetches, where the previous results are
 * still valid — replacing them with a skeleton would make paging feel like the
 * page had crashed and reloaded.
 */
export function ArticleListPage() {
  const { query, setQuery } = useArticleQueryParams();
  const { data, isLoading, isFetching, error, refetch } = useListArticlesQuery(query);

  useEffect(() => {
    document.title = 'Articles · News Articles';
  }, []);

  if (isLoading) {
    return (
      <>
        <ArticleResultsHeader total={0} />
        <ArticleListSkeleton count={query.limit > 5 ? 5 : query.limit} />
      </>
    );
  }

  if (error) {
    // RTK Query widens the error to `ApiError | SerializedError`; the normaliser
    // collapses that back to the single shape the UI renders.
    return (
      <ErrorState
        title="Could not load articles"
        message={normalizeError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!data) {
    return null;
  }

  const hasResults = data.data.length > 0;

  return (
    <Box>
      <ArticleResultsHeader total={data.meta.total} isRefreshing={isFetching} />

      {hasResults ? (
        <ArticleList
          articles={data.data}
          meta={data.meta}
          onPageChange={(page) => {
            setQuery({ page });
            // Without this the reader lands mid-page on the new results, at the
            // scroll offset of the page they just left.
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : (
        <ArticleEmptyState
          searchTerm={query.q}
          onClearSearch={() => {
            setQuery({ q: '' });
          }}
        />
      )}
    </Box>
  );
}
