import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';

export interface ArticleSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Search across title, summary and publisher.
 *
 * Controlled by the page so the text updates on every keystroke while the
 * *request* is debounced — the field must never feel laggy, only the query
 * behind it is delayed.
 *
 * `type="search"` rather than `type="text"`: it tells assistive technology what
 * the field is for and gives mobile keyboards a search key. The clear button is
 * explicit rather than relying on the browser's native one, which Firefox does
 * not render at all.
 */
export function ArticleSearchField({ value, onChange }: ArticleSearchFieldProps) {
  return (
    <TextField
      id="article-search"
      type="search"
      size="small"
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      placeholder="Search articles…"
      sx={{ width: { xs: '100%', sm: 280 } }}
      slotProps={{
        // `aria-label` passed to TextField lands on the root wrapper, not the
        // <input>, leaving the field with no accessible name — invisible to a
        // screen reader and unreachable by name in a test. It has to be routed
        // to the input slot explicitly.
        htmlInput: { 'aria-label': 'Search articles by title, summary or publisher' },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                // Distinct from the empty state's "Clear search" button. Two
                // controls sharing one accessible name is indistinguishable to
                // anyone navigating by a list of buttons.
                aria-label="Clear search field"
                onClick={() => {
                  onChange('');
                }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        },
      }}
    />
  );
}
