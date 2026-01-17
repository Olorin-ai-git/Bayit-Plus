/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 * Prevents crashes from propagating and provides user-friendly error handling
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
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
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
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
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>משהו השתבש</Text>
            <Text style={styles.titleEn}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            <Pressable
              onPress={this.handleRetry}
              style={({ focused }) => [
                styles.button,
                focused && styles.buttonFocused,
              ]}
            >
              <Text style={styles.buttonText}>נסה שוב / Try Again</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 500,
    padding: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  icon: {
    fontSize: Platform.isTV ? 80 : 60,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: Platform.isTV ? 32 : 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  titleEn: {
    fontSize: Platform.isTV ? 24 : 18,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: Platform.isTV ? 18 : 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  buttonFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.05 }],
  },
  buttonText: {
    fontSize: Platform.isTV ? 20 : 16,
    fontWeight: '600',
    color: colors.text,
  },
});

export default ErrorBoundary;
