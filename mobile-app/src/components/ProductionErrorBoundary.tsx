/**
 * Production Error Boundary for TestFlight/App Store
 * Gracefully handles React Native 0.83.1 DeviceInfo TurboModule timing bug
 * Shows branded loading experience instead of red error screen
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRecovering: boolean;
}

export class ProductionErrorBoundary extends Component<Props, State> {
  private recoveryTimer?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Only catch known DeviceInfo/TurboModule initialization errors
    const isDeviceInfoError =
      error.message?.includes('DeviceInfo') ||
      error.message?.includes('TurboModuleRegistry') ||
      error.message?.includes('TurboModule');

    if (isDeviceInfoError) {
      console.warn('[ErrorBoundary] Caught DeviceInfo initialization error, attempting recovery');
      return { hasError: true, error, isRecovering: true };
    }

    // Re-throw other errors - don't suppress real bugs
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry/crash reporting
    console.error('[ErrorBoundary] Error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Attempt automatic recovery after brief delay
    this.recoveryTimer = setTimeout(() => {
      console.log('[ErrorBoundary] Attempting automatic recovery');
      this.setState({
        hasError: false,
        error: null,
        isRecovering: false,
      });
    }, 1500);
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }

  render() {
    if (this.state.hasError && this.state.isRecovering) {
      // Show branded loading screen during recovery
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            {/* App logo/branding would go here */}
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>Bayit+</Text>
            </View>

            <ActivityIndicator
              size="large"
              color="#007AFF"
              style={styles.loader}
            />

            <Text style={styles.loadingText}>
              Initializing streaming platform...
            </Text>
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
    backgroundColor: '#0d0d1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
  },
});
