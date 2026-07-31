import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './ErrorState';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last line of defence against a white screen.
 *
 * `normalizeError` handles anything that fails *inside* a request. This catches
 * what fails during render — a malformed response reaching a component, a bug
 * in a mapping function — where React's default behaviour is to unmount the
 * whole tree and leave the user staring at nothing.
 *
 * Still a class component: `componentDidCatch` has no hook equivalent.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Where a real deployment would report to Sentry or similar. Logging keeps
    // the diagnostic available without putting a stack trace on screen.
    console.error('Unhandled render error:', error, errorInfo.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="This page could not be displayed"
          message="An unexpected error occurred while rendering. Reloading usually fixes it."
          onRetry={() => {
            window.location.reload();
          }}
          retryLabel="Reload page"
        />
      );
    }

    return this.props.children;
  }
}
