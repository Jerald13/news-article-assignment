import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import type { Article } from '@news/contracts';

export interface DeleteArticleDialogProps {
  /** The article awaiting confirmation, or null when the dialog is closed. */
  article: Article | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation before a destructive, irreversible action.
 *
 * The article's title is quoted back rather than asking "Delete this article?",
 * so the reader can verify they are about to delete the one they meant — the
 * whole point of a confirmation is to catch a misclick, and a generic prompt
 * cannot.
 *
 * MUI's Dialog handles the accessibility contract: focus moves inside on open,
 * is trapped while open, returns to the trigger on close, Escape dismisses, and
 * the rest of the page is inert to screen readers. Hand-rolling that correctly
 * is most of a day's work and is the main reason this project uses a component
 * library rather than styling from scratch.
 */
export function DeleteArticleDialog({
  article,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteArticleDialogProps) {
  return (
    <Dialog
      open={article !== null}
      onClose={isDeleting ? undefined : onCancel}
      aria-labelledby="delete-article-title"
      aria-describedby="delete-article-description"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="delete-article-title">Delete this article?</DialogTitle>

      <DialogContent>
        <DialogContentText id="delete-article-description">
          “{article?.title}” will be permanently removed. This cannot be undone.
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={isDeleting}>
          Cancel
        </Button>

        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={isDeleting}
          startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
