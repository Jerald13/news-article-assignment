import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <Box sx={{ py: 10, textAlign: 'center' }}>
      <Typography variant="overline" component="p">
        Error 404
      </Typography>

      <Typography variant="h1" component="h1" sx={{ mt: 1 }}>
        Page not found
      </Typography>

      <Typography variant="body1" sx={{ mt: 2 }}>
        The page you are looking for does not exist or has been moved.
      </Typography>

      <Button component={Link} to="/articles" variant="contained" sx={{ mt: 4 }}>
        Back to articles
      </Button>
    </Box>
  );
}
