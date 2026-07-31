import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { keyframes } from '@mui/material/styles';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

export interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

/**
 * Fetch the latest articles without reloading the page.
 *
 * Spinning while in flight and disabled for the duration, so a second click
 * cannot queue a redundant request. Deliberately *not* replacing the list with
 * a skeleton: the results on screen are still valid, and blanking them makes a
 * refresh look like a failure and reflow.
 */
export function RefreshButton({ onRefresh, isRefreshing }: RefreshButtonProps) {
  return (
    <Tooltip title="Refresh articles">
      {/* A disabled button fires no events, so the tooltip needs a wrapper that
          can still receive them — otherwise the label vanishes exactly when the
          user is most likely to wonder why nothing is happening. */}
      <span>
        <IconButton
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={isRefreshing ? 'Refreshing articles' : 'Refresh articles'}
          size="small"
        >
          <RefreshIcon
            fontSize="small"
            sx={isRefreshing ? { animation: `${spin} 800ms linear infinite` } : undefined}
          />
        </IconButton>
      </span>
    </Tooltip>
  );
}
