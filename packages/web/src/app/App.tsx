import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { router } from './router';
import { store } from './store';
import { theme } from './theme';

/**
 * The composition root: the only place providers are assembled.
 *
 * Order matters. The error boundary is outermost so it can still render a
 * recovery screen if anything below it throws during render, and the theme sits
 * above the router so that recovery screen is styled rather than unstyled HTML.
 */
export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Provider store={store}>
          <RouterProvider router={router} />
        </Provider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
