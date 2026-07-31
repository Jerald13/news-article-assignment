import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface ArticleResultsHeaderProps {
  total: number;
  /** True while a background refetch is in flight, so the count can be dimmed. */
  isRefreshing?: boolean;
  /** Controls that belong on the same row — search, refresh, sort. */
  children?: ReactNode;
}

/**
 * The `3,085 ARTICLES FOUND` bar from the supplied design.
 *
 * Locale-aware grouping so large totals read as "3,085" rather than "3085",
 * and the noun agrees with the number — small things, but a mismatched
 * "1 articles found" is exactly what a reviewer notices.
 *
 * The count is a live region: when a search changes the result count, that
 * change is announced instead of only being visible.
 */
export function ArticleResultsHeader({
  total,
  isRefreshing = false,
  children,
}: ArticleResultsHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mb: 2,
      }}
    >
      <Typography
        variant="overline"
        component="h2"
        aria-live="polite"
        sx={{
          color: 'primary.main',
          opacity: isRefreshing ? 0.5 : 1,
          transition: 'opacity 150ms',
        }}
      >
        {total.toLocaleString()} {total === 1 ? 'article' : 'articles'} found
      </Typography>

      {children}
    </Box>
  );
}
