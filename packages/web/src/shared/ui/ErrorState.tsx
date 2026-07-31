import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * What a failed page shows instead of nothing.
 *
 * A blank screen is not an error message: the user cannot tell whether the app
 * is broken, still loading, or simply empty. This always says what went wrong
 * and always offers the next action.
 *
 * `role="alert"` so the failure is announced rather than silently replacing the
 * content for anyone using a screen reader.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <Box
      role="alert"
      sx={{
        py: 8,
        px: 3,
        textAlign: 'center',
        backgroundColor: 'background.paper',
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="h3" component="h2" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body1" sx={{ maxWidth: '40ch', mx: 'auto' }}>
        {message}
      </Typography>

      {onRetry ? (
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={onRetry} sx={{ mt: 3 }}>
          {retryLabel}
        </Button>
      ) : null}
    </Box>
  );
}
