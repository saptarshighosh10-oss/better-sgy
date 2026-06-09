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
          style={{
            padding: '24px',
            background: '#1a1a2e',
            color: '#e94560',
            borderRadius: '12px',
            fontFamily: "'Inter', system-ui, sans-serif",
            margin: '16px',
          }}
        >
          <h2 style={{ margin: '0 0 8px' }}>⚠️ Better Schoology crashed</h2>
          <p style={{ color: '#ccc', margin: '0 0 8px' }}>
            Native Schoology has been restored. You can continue using the site normally.
          </p>
          <pre
            style={{
              fontSize: '12px',
              color: '#888',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '120px',
              overflow: 'auto',
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
