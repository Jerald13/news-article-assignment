import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { Article } from '@news/contracts';
import { formatArticleDate, toSummaryPoints } from '../model/formatArticleDate';
import { ArticleActionsMenu } from './ArticleActionsMenu';

export interface ArticleCardProps {
  article: Article;
  onDelete: (article: Article) => void;
}

/**
 * One article, laid out to match `sample-display-page-design.png`.
 *
 * Reading the design as a specification: uppercase publisher and relative date
 * in muted micro-text, a large headline at regular weight, a hairline rule, and
 * the summary as bullet points rather than a paragraph. The action sits top
 * right where the mock puts its bookmark icon — bookmarking is not in the
 * brief, so the slot holds the action that is: editing.
 *
 * Purely presentational. It takes an article and renders it; it does not fetch,
 * dispatch, or know that Redux exists. That is what makes it trivial to test
 * and safe to reuse.
 */
export function ArticleCard({ article, onDelete }: ArticleCardProps) {
  const summaryPoints = toSummaryPoints(article.summary);

  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3 }, position: 'relative' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="overline" component="p">
            {article.publisher}
            <Box component="span" sx={{ mx: 1, color: 'divider' }} aria-hidden="true">
              •
            </Box>
            {/* The machine-readable date stays available to assistive tech and
                crawlers even though the visible text is relative. */}
            <Box component="time" dateTime={article.date}>
              {formatArticleDate(article.date)}
            </Box>
          </Typography>

          <Typography variant="h2" component="h3" sx={{ mt: 0.5 }}>
            {article.title}
          </Typography>
        </Box>

        <ArticleActionsMenu article={article} onDelete={onDelete} />
      </Box>

      <Divider sx={{ mt: 2 }} />

      <Box component="ul" sx={summaryListStyles}>
        {summaryPoints.map((point) => (
          <Typography key={point} component="li" variant="body2" sx={{ mb: 0.75 }}>
            {point}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
}

const summaryListStyles = {
  mt: 2,
  mb: 0,
  pl: 2.5,
  listStyleType: 'disc',
  '& li::marker': { color: 'text.secondary' },
} as const;
