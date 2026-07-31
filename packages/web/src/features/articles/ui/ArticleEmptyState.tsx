import AddIcon from '@mui/icons-material/Add';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';

export interface ArticleEmptyStateProps {
  /** The active search term, if the list is empty because of a filter. */
  searchTerm?: string;
  onClearSearch?: () => void;
}

/**
 * Two genuinely different situations that a single "No articles" message would
 * conflate:
 *
 * - **Nothing exists yet.** The next action is to create something.
 * - **Nothing matched a search.** Articles do exist; the filter is hiding them.
 *   Telling the user to create one here would be actively misleading, and the
 *   useful action is to clear the search.
 *
 * Collapsing the two is one of the most common polish gaps in a CRUD app, and
 * it is the difference between a page that looks broken and one that explains
 * itself.
 */
export function ArticleEmptyState({ searchTerm, onClearSearch }: ArticleEmptyStateProps) {
  const isFiltered = Boolean(searchTerm);

  return (
    <Paper variant="outlined" sx={{ py: 8, px: 3, textAlign: 'center' }}>
      <Box sx={{ color: 'text.secondary', mb: 1 }}>
        {isFiltered ? <SearchOffIcon fontSize="large" /> : <AddIcon fontSize="large" />}
      </Box>

      <Typography variant="h3" component="h2">
        {isFiltered ? 'No matching articles' : 'No articles yet'}
      </Typography>

      <Typography variant="body1" sx={{ mt: 1, maxWidth: '46ch', mx: 'auto' }}>
        {isFiltered
          ? `Nothing matched “${searchTerm ?? ''}”. Try a different search term, or clear the search to see everything.`
          : 'Articles you create will appear here, newest first.'}
      </Typography>

      {isFiltered ? (
        <Button variant="outlined" onClick={onClearSearch} sx={{ mt: 3 }}>
          Clear search
        </Button>
      ) : (
        <Button component={Link} to="/articles/new" variant="contained" sx={{ mt: 3 }}>
          Create the first article
        </Button>
      )}
    </Paper>
  );
}
