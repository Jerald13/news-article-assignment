import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { NavLink, Outlet } from 'react-router';

/**
 * Navigation shared by both pages.
 *
 * The brief asks for a link from the form to the list *and* from the list back
 * to the form. Putting both in the layout satisfies that on every route and
 * removes the chance of one page shipping without its link.
 *
 * `NavLink` sets `aria-current="page"` on the active route by itself, so the
 * current location is announced to a screen reader as well as shown visually.
 */
export function AppLayout() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg" disableGutters>
          <Toolbar disableGutters sx={{ px: { xs: 2, sm: 3 }, gap: 2 }}>
            <Typography
              variant="h1"
              sx={{ fontSize: '1.125rem', fontWeight: 700, flexGrow: 1, letterSpacing: '-0.01em' }}
            >
              News Articles
            </Typography>

            <Stack direction="row" component="nav" aria-label="Main" spacing={0.5}>
              <Button component={NavLink} to="/articles" end sx={navLinkStyles}>
                Browse
              </Button>
              <Button component={NavLink} to="/articles/new" sx={navLinkStyles}>
                New article
              </Button>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, py: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}

const navLinkStyles = {
  color: 'text.secondary',
  px: 1.5,
  '&.active': {
    color: 'primary.main',
    backgroundColor: 'action.hover',
  },
} as const;
