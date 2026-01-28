/**
 * DeviceInfo Error Boundary
 * Catches and recovers from React Native 0.83.1 DeviceInfo TurboModule timing bug
 * Production-safe workaround until React Native upgrade
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class DeviceInfoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is the specific DeviceInfo error we can handle
    const isDeviceInfoError = error.message?.includes('DeviceInfo') ||
                              error.message?.includes('TurboModuleRegistry');

    if (isDeviceInfoError) {
      console.warn('DeviceInfo error caught by boundary, attempting recovery');
      return { hasError: true, error };
    }

    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to crash reporting service
    console.error('DeviceInfo Error Boundary caught error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Auto-retry once after a brief delay
    if (this.state.retryCount === 0) {
      setTimeout(() => {
        this.handleRetry();
      }, 1000);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError && this.state.retryCount >= 2) {
      // Show fallback UI after auto-retry failed
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Initialization Error</Text>
            <Text style={styles.message}>
              Bayit+ encountered a temporary initialization issue.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleRetry}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
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
    padding: 20,
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 32,
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
