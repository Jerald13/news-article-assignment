import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface SnackbarOptions {
  severity?: AlertColor;
  /** An optional control rendered inside the message, such as "View articles". */
  action?: ReactNode;
}

interface SnackbarContextValue {
  showMessage: (message: string, options?: SnackbarOptions) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

interface SnackbarState extends SnackbarOptions {
  message: string;
  /** Forces a remount so a repeated identical message still re-announces. */
  key: number;
}

/**
 * Application-wide transient messages.
 *
 * A shared provider rather than a Snackbar per page, so confirmations look and
 * behave the same everywhere and there is one place that governs how long a
 * message stays on screen.
 *
 * MUI's Alert renders `role="alert"`, so messages are announced rather than
 * only shown. `key` is bumped on every call because a Snackbar whose props are
 * unchanged does not re-announce — submitting the same form twice would show
 * the confirmation silently the second time.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SnackbarState | null>(null);

  const showMessage = useCallback((message: string, options: SnackbarOptions = {}) => {
    setState({ message, ...options, key: Date.now() });
  }, []);

  const value = useMemo(() => ({ showMessage }), [showMessage]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}

      <Snackbar
        key={state?.key}
        open={state !== null}
        autoHideDuration={6_000}
        onClose={(_event, reason) => {
          // Ignore click-away: dismissing a confirmation because the user
          // happened to click elsewhere is surprising.
          if (reason !== 'clickaway') {
            setState(null);
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={state?.severity ?? 'success'}
          variant="filled"
          action={state?.action}
          onClose={() => {
            setState(null);
          }}
          sx={{ alignItems: 'center' }}
        >
          {state?.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext);

  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }

  return context;
}
