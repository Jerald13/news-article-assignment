import { ThemeProvider } from '@mui/material/styles';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { createStore } from '@/app/store';
import { theme } from '@/app/theme';
import { SnackbarProvider } from '@/shared/ui/SnackbarProvider';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial URL, so components reading search params see a real location. */
  route?: string;
  /** Route pattern, when the component under test reads a path param. */
  path?: string;
}

/**
 * Render with the same provider stack the app uses.
 *
 * A fresh store per render: RTK Query caches by endpoint and arguments, so a
 * shared store would let one test's fetched data satisfy the next test's query
 * and hide a real failure.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path, ...options }: RenderWithProvidersOptions = {},
): RenderResult {
  const store = createStore();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider theme={theme}>
        <Provider store={store}>
          <MemoryRouter initialEntries={[route]}>
            <SnackbarProvider>
              {path ? (
                <Routes>
                  <Route path={path} element={children} />
                </Routes>
              ) : (
                children
              )}
            </SnackbarProvider>
          </MemoryRouter>
        </Provider>
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
