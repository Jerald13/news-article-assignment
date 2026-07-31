import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ArticleInput } from '@news/contracts';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArticleForm,
  useCreateArticleMutation,
  useGetArticleQuery,
  useUpdateArticleMutation,
} from '@/features/articles';
import { normalizeError } from '@/shared/api/normalizeError';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useSnackbar } from '@/shared/ui/SnackbarProvider';

/**
 * Page 1 — create or update an article.
 *
 * One page serves both, as the brief describes. The only differences are where
 * the default values come from and what happens after a successful save, so
 * splitting them into two pages would duplicate the form and let the two copies
 * drift apart.
 */
export function ArticleFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showMessage } = useSnackbar();

  // `skip` keeps the query inert while creating. Fetching by id is what makes
  // /articles/:id/edit work when pasted into a fresh tab, where nothing has
  // been loaded into the cache yet.
  const {
    data: article,
    isLoading,
    error: loadError,
  } = useGetArticleQuery(id ?? '', { skip: !id });

  const [createArticle] = useCreateArticleMutation();
  const [updateArticle] = useUpdateArticleMutation();

  useEffect(() => {
    document.title = isEditing ? 'Edit article · News Articles' : 'New article · News Articles';
  }, [isEditing]);

  // Only the four editable fields; id and timestamps belong to the server.
  const defaultValues = useMemo<ArticleInput | undefined>(
    () =>
      article
        ? {
            title: article.title,
            summary: article.summary,
            date: article.date,
            publisher: article.publisher,
          }
        : undefined,
    [article],
  );

  async function handleSubmit(input: ArticleInput): Promise<void> {
    if (id) {
      // `.unwrap()` re-throws the failure so the form can map field errors.
      // Without it a rejected mutation resolves normally and the form would
      // report success.
      await updateArticle({ id, input }).unwrap();
      showMessage('Article updated.');
      void navigate('/articles');
      return;
    }

    await createArticle(input).unwrap();
    showMessage('Article created.', {
      action: (
        <Button component={Link} to="/articles" color="inherit" size="small">
          View articles
        </Button>
      ),
    });
  }

  if (isEditing && isLoading) {
    return (
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 } }}>
        <Skeleton variant="text" width={220} height={40} />
        <Stack spacing={3} sx={{ mt: 3 }}>
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={56} />
        </Stack>
      </Paper>
    );
  }

  if (isEditing && loadError) {
    const apiError = normalizeError(loadError);

    return (
      <ErrorState
        title={apiError.status === 404 ? 'Article not found' : 'Could not load this article'}
        message={
          apiError.status === 404
            ? 'It may have been deleted, or the link may be wrong.'
            : apiError.message
        }
      />
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 }, maxWidth: 720 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" component="p">
          {isEditing ? 'Edit' : 'Create'}
        </Typography>
        <Typography variant="h1" component="h2">
          {isEditing ? 'Edit article' : 'New article'}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          {isEditing
            ? 'Update the details below and save your changes.'
            : 'All four fields are required. The form clears after saving so you can add another.'}
        </Typography>
      </Box>

      <ArticleForm
        // Remounts when switching between creating and editing a different
        // article, so the form never shows the previous article's values.
        key={id ?? 'new'}
        defaultValues={defaultValues}
        submitLabel={isEditing ? 'Save changes' : 'Create article'}
        resetAfterSubmit={!isEditing}
        onSubmit={handleSubmit}
      />
    </Paper>
  );
}
