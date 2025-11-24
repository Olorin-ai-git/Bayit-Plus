/**
 * Log Stream Component
 * Feature: 004-new-olorin-frontend
 *
 * Real-time log display with color-coded severity levels.
 * Auto-scrolls to latest entries with Olorin purple styling.
 */

import React, { useRef, useEffect } from 'react';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  source?: string;
}

export interface LogStreamProps {
  logs: LogEntry[];
  maxHeight?: string;
  autoScroll?: boolean;
  showTimestamps?: boolean;
  showSource?: boolean;
  className?: string;
}

/**
 * Log stream with auto-scroll and color-coded severity
 */
export const LogStream: React.FC<LogStreamProps> = ({
  logs,
  maxHeight = 'max-h-96',
  autoScroll = true,
  showTimestamps = true,
  showSource = false,
  className = ''
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (logs.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-sm text-corporate-textTertiary">No logs available</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={`${maxHeight} overflow-y-auto bg-black/40 backdrop-blur-md rounded-lg border-2 border-corporate-accentPrimary/40 p-4 font-mono text-sm ${className}`}
    >
      {logs.map((log, index) => (
        <div
          key={`log-${index}-${log.timestamp}`}
          className={`py-2 px-3 mb-1 rounded transition-all ${getLogLevelColor(log.level)}`}
        >
          {/* Timestamp */}
          {showTimestamps && (
            <span className="text-corporate-textTertiary mr-3 font-semibold">
              {formatTimestamp(log.timestamp)}
            </span>
          )}

          {/* Level Badge */}
          <span
            className={`px-2 py-1 rounded text-xs font-semibold mr-3 inline-block ${getLogLevelBadge(
              log.level
            )}`}
          >
            {log.level.toUpperCase()}
          </span>

          {/* Source */}
          {showSource && log.source && (
            <span className="text-corporate-textTertiary mr-3">[{log.source}]</span>
          )}

          {/* Message */}
          <span className="text-corporate-textSecondary">{log.message}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Get text color based on log level
 */
function getLogLevelColor(level: LogEntry['level']): string {
  const colors: Record<LogEntry['level'], string> = {
    info: 'text-corporate-accentPrimary',
    warning: 'text-corporate-warning',
    error: 'text-corporate-error',
    debug: 'text-corporate-textTertiary'
  };
  return colors[level];
}

/**
 * Get badge styling based on log level
 */
function getLogLevelBadge(level: LogEntry['level']): string {
  const badges: Record<LogEntry['level'], string> = {
    info: 'bg-corporate-accentPrimary/20 text-corporate-accentPrimary border-2 border-corporate-accentPrimary/50',
    warning: 'bg-corporate-warning/20 text-corporate-warning border-2 border-corporate-warning/50',
    error: 'bg-corporate-error/20 text-corporate-error border-2 border-corporate-error/50',
    debug: 'bg-corporate-borderPrimary/20 text-corporate-textTertiary border-2 border-corporate-borderPrimary/50'
  };
  return badges[level];
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export default LogStream;
