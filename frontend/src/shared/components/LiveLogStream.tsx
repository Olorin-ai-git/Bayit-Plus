/**
 * Live Log Stream Component
 * Feature: 021-live-merged-logstream
 *
 * Virtualized log stream with SSE connection and autoscroll.
 * Displays merged frontend/backend logs in real-time.
 *
 * SYSTEM MANDATE Compliance:
 * - Configuration-driven SSE endpoint
 * - Virtualized rendering for performance
 * - Autoscroll to latest logs
 * - Olorin corporate colors
 *
 * Author: Gil Klainert
 * Date: 2025-11-13
 * Spec: /specs/021-live-merged-logstream/frontend-integration.md
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { List } from 'react-window';
import { useLogStream, UseLogStreamConfig } from '../hooks/useLogStream';
import { LogEntry, UnifiedLog } from './LogEntry';

/**
 * Props for LiveLogStream component
 */
export interface LiveLogStreamProps {
  /** Investigation ID to stream logs for */
  investigationId: string;
  /** Base API URL (from environment config) */
  baseUrl?: string;
  /** Height of the log stream container */
  height?: number;
  /** Height of each log entry row */
  rowHeight?: number;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
  /** Whether to auto-scroll to latest logs */
  autoScroll?: boolean;
  /** Whether to show timestamp */
  showTimestamp?: boolean;
  /** Whether to show source indicator */
  showSource?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Live log stream with virtualization and autoscroll
 *
 * @example
 * ```tsx
 * <LiveLogStream
 *   investigationId="inv-123"
 *   baseUrl={process.env.REACT_APP_API_BASE_URL}
 *   height={600}
 *   autoConnect={true}
 *   autoScroll={true}
 * />
 * ```
 */
export const LiveLogStream: React.FC<LiveLogStreamProps> = ({
  investigationId,
  baseUrl,
  height = 600,
  rowHeight = 60,
  autoConnect = true,
  autoScroll = true,
  showTimestamp = true,
  showSource = true,
  className = '',
}) => {
  const listRef = useRef<List>(null);

  // Use log stream hook
  const { logs, isConnected, error, connect, disconnect, clear } = useLogStream({
    investigationId,
    baseUrl,
    autoConnect,
  } as UseLogStreamConfig);

  /**
   * Auto-scroll to bottom when new logs arrive
   */
  useEffect(() => {
    if (autoScroll && listRef.current && logs.length > 0) {
      listRef.current.scrollToItem(logs.length - 1, 'end');
    }
  }, [logs, autoScroll]);

  /**
   * Render a single log entry row
   */
  const renderRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const log = logs[index];
      return (
        <div style={style}>
          <LogEntry
            log={log}
            showTimestamp={showTimestamp}
            showSource={showSource}
            showMetadata={false}
          />
        </div>
      );
    },
    [logs, showTimestamp, showSource]
  );

  /**
   * Handle clear button click
   */
  const handleClear = useCallback(() => {
    clear();
  }, [clear]);

  /**
   * Handle connection toggle
   */
  const handleConnectionToggle = useCallback(() => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  }, [isConnected, connect, disconnect]);

  return (
    <div
      className={`
        bg-black/40 backdrop-blur-md rounded-lg
        border-2 border-corporate-accentPrimary/40
        ${className}
      `}
    >
      {/* Header with controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-corporate-borderPrimary">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-corporate-textPrimary">
            Live Log Stream
          </h3>
          {/* Connection status indicator */}
          <div className="flex items-center space-x-2">
            <div
              className={`
                w-2 h-2 rounded-full
                ${isConnected ? 'bg-corporate-success' : 'bg-corporate-error'}
                ${isConnected ? 'animate-pulse' : ''}
              `}
            />
            <span className="text-xs text-corporate-textSecondary">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {/* Log count */}
          <span className="text-xs text-corporate-textTertiary">
            {logs.length} logs
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleConnectionToggle}
            className="
              px-3 py-1 rounded
              bg-corporate-accentPrimary text-white
              hover:bg-corporate-accentPrimaryHover
              transition-colors text-sm font-medium
            "
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
          <button
            onClick={handleClear}
            disabled={logs.length === 0}
            className="
              px-3 py-1 rounded
              bg-corporate-bgTertiary text-corporate-textSecondary
              hover:bg-corporate-borderPrimary
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors text-sm font-medium
            "
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-3 bg-corporate-error/20 border-l-4 border-corporate-error">
          <p className="text-sm text-corporate-error">
            Error: {error.message}
          </p>
        </div>
      )}

      {/* Log stream */}
      {logs.length === 0 ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-corporate-textTertiary">
            {isConnected ? 'Waiting for logs...' : 'Disconnected'}
          </p>
        </div>
      ) : (
        <List
          ref={listRef}
          height={height}
          itemCount={logs.length}
          itemSize={rowHeight}
          width="100%"
          className="p-4"
        >
          {renderRow}
        </List>
      )}
    </div>
  );
};

export default LiveLogStream;
