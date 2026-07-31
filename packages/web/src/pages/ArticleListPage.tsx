import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { Article } from '@news/contracts';
import { useEffect, useState } from 'react';
import {
  ArticleEmptyState,
  ArticleList,
  ArticleListSkeleton,
  ArticleResultsHeader,
  ArticleSearchField,
  DeleteArticleDialog,
  RefreshButton,
  useArticleQueryParams,
  useDeleteArticleMutation,
  useListArticlesQuery,
} from '@/features/articles';
import { normalizeError } from '@/shared/api/normalizeError';
import { useDebouncedValue } from '@/shared/lib/useDebouncedValue';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useSnackbar } from '@/shared/ui/SnackbarProvider';

/**
 * Page 2 — fetch and display articles.
 *
 * The page owns what the reader is asking for and which render state applies;
 * everything visual lives in the feature's components.
 *
 * `isLoading` and `isFetching` are deliberately different branches. `isLoading`
 * is the very first load, when there is nothing to show and a skeleton is
 * right. `isFetching` covers refetches — searching, paging, refreshing — where
 * the previous results are still valid; replacing them with a skeleton makes
 * every keystroke look like the page crashed and reloaded.
 */
export function ArticleListPage() {
  const { query, setQuery } = useArticleQueryParams();
  const { showMessage } = useSnackbar();

  // The input updates on every keystroke; only the request behind it waits.
  const [searchText, setSearchText] = useState(query.q);
  const debouncedSearch = useDebouncedValue(searchText, 300);

  const { data, isLoading, isFetching, error, refetch } = useListArticlesQuery(query);
  const [deleteArticle, { isLoading: isDeleting }] = useDeleteArticleMutation();
  const [articlePendingDeletion, setArticlePendingDeletion] = useState<Article | null>(null);

  useEffect(() => {
    document.title = 'Articles · News Articles';
  }, []);

  useEffect(() => {
    if (debouncedSearch !== query.q) {
      // setQuery returns to page 1 on its own when the search term changes.
      setQuery({ q: debouncedSearch });
    }
  }, [debouncedSearch, query.q, setQuery]);

  async function handleConfirmDelete(): Promise<void> {
    if (!articlePendingDeletion) {
      return;
    }

    try {
      await deleteArticle(articlePendingDeletion.id).unwrap();

      // Removing the only row on a page would otherwise leave the reader on an
      // empty page N with no indication of what happened.
      if (data?.data.length === 1 && query.page > 1) {
        setQuery({ page: query.page - 1 });
      }

      setArticlePendingDeletion(null);
      showMessage('Article deleted.');
    } catch (caught) {
      setArticlePendingDeletion(null);
      showMessage(normalizeError(caught).message, { severity: 'error' });
    }
  }

  const controls = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <ArticleSearchField value={searchText} onChange={setSearchText} />
      <RefreshButton onRefresh={() => void refetch()} isRefreshing={isFetching && !isLoading} />
    </Stack>
  );

  if (isLoading) {
    return (
      <>
        <ArticleResultsHeader total={0}>{controls}</ArticleResultsHeader>
        <ArticleListSkeleton count={Math.min(query.limit, 5)} />
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

  return (
    <Box>
      <ArticleResultsHeader total={data.meta.total} isRefreshing={isFetching}>
        {controls}
      </ArticleResultsHeader>

      {data.data.length > 0 ? (
        <ArticleList
          articles={data.data}
          meta={data.meta}
          onDelete={setArticlePendingDeletion}
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
            setSearchText('');
          }}
        />
      )}

      <DeleteArticleDialog
        article={articlePendingDeletion}
        isDeleting={isDeleting}
        onCancel={() => {
          setArticlePendingDeletion(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </Box>
  );
}
