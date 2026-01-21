/**
 * Visualization Service Error Boundary
 *
 * Catches errors in child components and displays a fallback UI
 * instead of crashing the entire microservice.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class VisualizationErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('❌ Visualization Microservice Error:', error);
    console.error('Error Info:', errorInfo);
    this.setState({ error, errorInfo });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-corporate-bgPrimary flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-corporate-bgSecondary border-2 border-corporate-error rounded-lg p-8">
            <h1 className="text-2xl font-bold text-corporate-error mb-4">
              Something Went Wrong
            </h1>

            <p className="text-corporate-textSecondary mb-4">
              The Visualization Microservice encountered an unexpected error.
            </p>

            {this.state.error && (
              <div className="bg-corporate-bgPrimary border border-corporate-borderPrimary rounded p-4 mb-4">
                <p className="text-sm text-corporate-error font-mono break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-corporate-accentPrimary hover:bg-corporate-accentPrimaryHover text-white rounded-lg transition-colors"
            >
              Reload Service
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
