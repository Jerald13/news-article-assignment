import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';

export interface ArticleListSkeletonProps {
  /** How many placeholder cards to show. Match the page size. */
  count?: number;
}

/**
 * The loading state, shaped like the content it is standing in for.
 *
 * A centred spinner would be less work, but it tells the reader nothing and the
 * page visibly jumps when the real content replaces it. Placeholders of roughly
 * the right height mean the layout is already correct when the data lands, so
 * nothing shifts under the cursor.
 *
 * `aria-busy` with a live region announces the wait rather than leaving a
 * screen-reader user with silence.
 */
export function ArticleListSkeleton({ count = 5 }: ArticleListSkeletonProps) {
  return (
    <Box aria-busy="true" aria-live="polite" sx={{ display: 'grid', gap: 2 }}>
      <Box
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        Loading articles
      </Box>

      {Array.from({ length: count }, (_, index) => (
        <Paper key={index} variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Skeleton variant="text" width={180} height={16} />
          <Skeleton variant="text" width="85%" height={32} sx={{ mt: 1 }} />
          <Skeleton variant="rectangular" height={1} sx={{ my: 2 }} />
          <Skeleton variant="text" width="95%" />
          <Skeleton variant="text" width="88%" />
        </Paper>
      ))}
    </Box>
  );
}
