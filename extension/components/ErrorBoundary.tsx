import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — Phase 0
 *
 * Wraps the React overlay so a crash never takes down the page.
 * On error: restores native Schoology UI and shows a minimal fallback.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[BS] ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // Restore native Schoology UI so the student is never stuck
    import('../lib/dom-takeover').then(({ restoreNativeUI }) => {
      restoreNativeUI();
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '20px 24px',
            background: '#111827',
            border: '1px solid #1e2535',
            color: '#e8eaf0',
            borderRadius: '12px',
            fontFamily: "'Inter', system-ui, sans-serif",
            margin: '16px',
            maxWidth: 520,
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#f87171' }}>Better SGY hit an error</h2>
          <p style={{ color: '#7a8ea3', margin: '0 0 8px', fontSize: 13, lineHeight: 1.5 }}>
            The normal Schoology page has been restored underneath — you can keep using it.
            Reload the page to try Better SGY again.
          </p>
          <pre
            style={{
              fontSize: '11px',
              color: '#7a8ea3',
              opacity: 0.8,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '120px',
              overflow: 'auto',
              margin: 0,
            }}
          >
            {this.state.error?.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
