import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useListArticlesQuery } from '@/features/articles';
import { normalizeError } from '@/shared/api/normalizeError';
import { ErrorState } from '@/shared/ui/ErrorState';

/**
 * Page 2 — fetch and display articles.
 *
 * Wired end to end but visually minimal at this stage: the card list built to
 * the supplied design, the toolbar, pagination and search all land in the next
 * phase. What it already proves is the full stack — component to RTK Query to
 * axiosBaseQuery to Axios to Express to SQLite and back.
 */
export function ArticleListPage() {
  const { data, isLoading, error, refetch } = useListArticlesQuery({});

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress aria-label="Loading articles" />
      </Box>
    );
  }

  if (error) {
    // RTK Query widens the error to `ApiError | SerializedError`. Running it
    // back through the normaliser collapses that union to the one shape the UI
    // renders, rather than narrowing it by hand at every call site.
    return (
      <ErrorState
        title="Could not load articles"
        message={normalizeError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <Box>
      <Typography variant="overline" component="h2" sx={{ color: 'primary.main' }}>
        {(data?.meta.total ?? 0).toLocaleString()} articles found
      </Typography>

      <Box sx={{ mt: 2, display: 'grid', gap: 2 }}>
        {data?.data.map((article) => (
          <Box
            key={article.id}
            component="article"
            sx={{ backgroundColor: 'background.paper', border: 1, borderColor: 'divider', p: 3 }}
          >
            <Typography variant="overline" component="p">
              {article.publisher} · {article.date}
            </Typography>
            <Typography variant="h2" component="h3" sx={{ mt: 0.5 }}>
              {article.title}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1.5 }}>
              {article.summary}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
