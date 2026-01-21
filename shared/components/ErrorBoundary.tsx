/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 * Prevents crashes from propagating and provides user-friendly error handling
 * Integrates with Sentry for error tracking in production
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import logger, { getCorrelationId } from '../utils/logger';

// Sentry-like interface for error capture
interface SentryLike {
  captureException: (error: Error, options?: { extra?: Record<string, unknown> }) => void;
}

// Global Sentry instance (set by initErrorBoundarySentry)
let sentryInstance: SentryLike | null = null;

/**
 * Initialize Sentry for ErrorBoundary.
 * Call this once during app initialization.
 */
export const initErrorBoundarySentry = (sentry: SentryLike): void => {
  sentryInstance = sentry;
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional component name for better error context */
  componentName?: string;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { componentName } = this.props;
    const correlationId = getCorrelationId();

    // Log error using unified logger
    logger.error(
      `ErrorBoundary caught error${componentName ? ` in ${componentName}` : ''}`,
      'ErrorBoundary',
      error
    );

    // Send to Sentry if initialized
    if (sentryInstance) {
      sentryInstance.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
          componentName,
          correlationId,
        },
      });
    }

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.background, padding: spacing.xl }}>
          <View
            className="items-center rounded-lg border"
            style={{
              maxWidth: 500,
              padding: spacing.xl,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: borderRadius.lg,
              borderColor: colors.glassBorder
            }}
          >
            <Text style={{ fontSize: Platform.isTV ? 80 : 60, marginBottom: spacing.lg }}>⚠️</Text>
            <Text
              className="font-bold text-center"
              style={{
                fontSize: Platform.isTV ? 32 : 24,
                color: colors.text,
                marginBottom: spacing.xs
              }}
            >
              משהו השתבש
            </Text>
            <Text
              className="font-semibold text-center"
              style={{
                fontSize: Platform.isTV ? 24 : 18,
                color: colors.textMuted,
                marginBottom: spacing.md
              }}
            >
              Something went wrong
            </Text>
            <Text
              className="text-center"
              style={{
                fontSize: Platform.isTV ? 18 : 14,
                color: colors.textMuted,
                marginBottom: spacing.xl
              }}
            >
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            <Pressable
              onPress={this.handleRetry}
              className="border-2"
              style={({ focused }) => [
                {
                  backgroundColor: colors.primary,
                  paddingHorizontal: spacing.xl,
                  paddingVertical: spacing.md,
                  borderRadius: borderRadius.full,
                  borderColor: focused ? colors.text : 'transparent',
                  transform: focused ? [{ scale: 1.05 }] : [{ scale: 1 }],
                }
              ]}
            >
              <Text
                className="font-semibold"
                style={{
                  fontSize: Platform.isTV ? 20 : 16,
                  color: colors.text
                }}
              >
                נסה שוב / Try Again
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
