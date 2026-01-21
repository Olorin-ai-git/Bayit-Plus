/**
 * Connection Status Component
 * Feature: 008-live-investigation-updates (US1 Real-Time Progress)
 *
 * Displays real-time connection status (SSE vs Polling).
 * Shows network activity and connection health.
 */

import React, { useMemo } from 'react';
import './ConnectionStatus.css';

export interface ConnectionStatusProps {
  isConnected: boolean;
  isUsingSSE: boolean;
  isUsingPolling: boolean;
  lastUpdate?: Date;
  pollingInterval?: number;
  error?: string | null;
}

/**
 * Get connection badge styling
 */
function getConnectionBadge(isConnected: boolean, isUsingSSE: boolean): {
  color: string;
  icon: string;
  text: string;
} {
  if (!isConnected) {
    return {
      color: 'connection-disconnected',
      icon: '⊗',
      text: 'Disconnected'
    };
  }

  if (isUsingSSE) {
    return {
      color: 'connection-sse',
      icon: '⚡',
      text: 'Live (SSE)'
    };
  }

  return {
    color: 'connection-polling',
    icon: '↻',
    text: 'Polling'
  };
}

/**
 * Format last update time
 */
function formatLastUpdate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 1) {
    return 'Just now';
  }
  if (diffSec < 60) {
    return `${diffSec}s ago`;
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}h ago`;
}

/**
 * Connection Status Component
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isUsingSSE,
  isUsingPolling,
  lastUpdate,
  pollingInterval,
  error
}) => {
  const badge = useMemo(
    () => getConnectionBadge(isConnected, isUsingSSE),
    [isConnected, isUsingSSE]
  );

  const lastUpdateText = useMemo(() => {
    if (!lastUpdate) return 'Never';
    return formatLastUpdate(lastUpdate);
  }, [lastUpdate]);

  return (
    <div className="connection-status-container">
      {/* Status Badge */}
      <div className={`connection-badge ${badge.color}`}>
        <span className="badge-icon" role="status" aria-live="polite">
          {badge.icon}
        </span>
        <span className="badge-text">{badge.text}</span>
      </div>

      {/* Connection Details */}
      <div className="connection-details">
        {isConnected && (
          <>
            {isUsingSSE && (
              <div className="detail-item sse-info">
                <span className="detail-label">Real-time streaming active</span>
                <span className="detail-icon">⚡</span>
              </div>
            )}

            {isUsingPolling && pollingInterval && (
              <div className="detail-item polling-info">
                <span className="detail-label">
                  Polling every {(pollingInterval / 1000).toFixed(0)}s
                </span>
                <span className="detail-icon">↻</span>
              </div>
            )}

            <div className="detail-item last-update">
              <span className="detail-label">Last update:</span>
              <span className="detail-value">{lastUpdateText}</span>
            </div>
          </>
        )}

        {!isConnected && error && (
          <div className="detail-item error-info">
            <span className="detail-label">Error:</span>
            <span className="detail-value">{error}</span>
          </div>
        )}

        {!isConnected && !error && (
          <div className="detail-item disconnected-info">
            <span className="detail-label">Connection lost</span>
            <span className="detail-label-sub">Attempting to reconnect...</span>
          </div>
        )}
      </div>

      {/* Activity Indicator */}
      <div className={`connection-activity ${isConnected ? 'active' : 'inactive'}`}>
        <span className="activity-dot" />
      </div>
    </div>
  );
};

ConnectionStatus.displayName = 'ConnectionStatus';

