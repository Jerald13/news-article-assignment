import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import type { Article } from '@news/contracts';
import { useState } from 'react';
import { Link } from 'react-router';

export interface ArticleActionsMenuProps {
  article: Article;
  onDelete: (article: Article) => void;
}

/**
 * Per-article actions, in the corner where the design mock puts its bookmark
 * icon. Bookmarking is not in the brief; editing and deleting are.
 *
 * A menu rather than two loose icon buttons keeps the card as uncluttered as
 * the sample, and MUI's Menu manages focus and keyboard interaction — arrow
 * keys, Escape, and returning focus to the trigger on close.
 *
 * The label names the article rather than saying "More". With one of these per
 * card, a screen-reader user listing the page's buttons would otherwise hear
 * "More, More, More" with no way to tell them apart.
 */
export function ArticleActionsMenu({ article, onDelete }: ArticleActionsMenuProps) {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const isOpen = anchorElement !== null;

  const close = () => {
    setAnchorElement(null);
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={(event) => {
          setAnchorElement(event.currentTarget);
        }}
        aria-label={`Actions for ${article.title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        sx={{ flexShrink: 0 }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorElement}
        open={isOpen}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem component={Link} to={`/articles/${article.id}/edit`} onClick={close}>
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            close();
            onDelete(article);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteOutlinedIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
