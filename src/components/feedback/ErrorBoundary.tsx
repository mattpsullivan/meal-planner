// ErrorBoundary component
// React error boundary for catching render errors

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { ErrorScreen } from './ErrorScreen';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorScreen
          title="Something went wrong"
          message={this.state.error?.message ?? 'An unexpected error occurred'}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
