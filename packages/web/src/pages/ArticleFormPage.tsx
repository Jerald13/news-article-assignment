import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Page 1 — create or update an article.
 *
 * Placeholder until the next-but-one phase, which brings React Hook Form with
 * the shared Zod schema as its resolver, per-field errors, form clearing on
 * successful create, and edit mode reached through /articles/:id/edit.
 */
export function ArticleFormPage() {
  return (
    <Box sx={{ backgroundColor: 'background.paper', border: 1, borderColor: 'divider', p: 4 }}>
      <Typography variant="h1" component="h2">
        New article
      </Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        The article form arrives in the next phase.
      </Typography>
    </Box>
  );
}
