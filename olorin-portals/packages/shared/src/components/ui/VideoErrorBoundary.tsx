/**
 * Video Error Boundary
 * Catches errors in video components and provides graceful fallback
 */

import React, { Component, ReactNode } from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class VideoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Video component error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <GlassCard className="p-6 text-center">
          <p className="text-white mb-4">Video playback unavailable</p>
          <GlassButton onClick={this.handleRetry}>
            Retry
          </GlassButton>
        </GlassCard>
      );
    }
    return this.props.children;
  }
}

export default VideoErrorBoundary;
