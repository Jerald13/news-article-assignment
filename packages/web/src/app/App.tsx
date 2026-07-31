import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { router } from './router';
import { createStore } from './store';
import { theme } from './theme';

/**
 * The composition root: the only place providers are assembled.
 *
 * Order matters. The error boundary is outermost so it can still render a
 * recovery screen if anything below it throws during render, and the theme sits
 * above the router so that recovery screen is styled rather than unstyled HTML.
 */
export function App() {
  // One store for the lifetime of the app. Created here rather than at module
  // scope so tests can mount App with a fresh store instead of inheriting
  // cached data from a previous test.
  const store = useMemo(() => createStore(), []);

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
