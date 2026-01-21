/**
 * Log Entry Component
 * Feature: 021-live-merged-logstream
 *
 * Single log entry display with color-coded severity levels.
 * Displays UnifiedLog entries from merged frontend/backend log streams.
 *
 * SYSTEM MANDATE Compliance:
 * - Uses Olorin corporate colors (no hardcoded values)
 * - Configuration-driven styling
 * - Type-safe with UnifiedLog interface
 * - Production-grade component under 200 lines
 *
 * Author: Gil Klainert
 * Date: 2025-11-13
 * Spec: /specs/021-live-merged-logstream/frontend-integration.md
 */

import React from 'react';

/**
 * Unified log entry structure matching backend LogEntry model
 */
export interface UnifiedLog {
  investigation_id: string;
  ts: string;
  seq: number;
  source: 'frontend' | 'backend';
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  metadata?: Record<string, unknown>;
  event_hash: string;
}

/**
 * Props for LogEntry component
 */
export interface LogEntryProps {
  /** Log entry to display */
  log: UnifiedLog;
  /** Whether to show timestamp (default: true) */
  showTimestamp?: boolean;
  /** Whether to show source indicator (default: true) */
  showSource?: boolean;
  /** Whether to show metadata (default: false) */
  showMetadata?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get Tailwind CSS classes for log level badge
 */
function getLogLevelBadgeClasses(level: UnifiedLog['level']): string {
  switch (level) {
    case 'ERROR':
      return 'bg-corporate-error text-white';
    case 'WARN':
      return 'bg-corporate-warning text-black';
    case 'INFO':
      return 'bg-corporate-info text-white';
    case 'DEBUG':
      return 'bg-gray-600 text-gray-200';
    default:
      return 'bg-gray-500 text-gray-200';
  }
}

/**
 * Get Tailwind CSS classes for log entry background
 */
function getLogEntryBackgroundClasses(level: UnifiedLog['level']): string {
  switch (level) {
    case 'ERROR':
      return 'bg-red-900/10 border-l-4 border-corporate-error';
    case 'WARN':
      return 'bg-yellow-900/10 border-l-4 border-corporate-warning';
    case 'INFO':
      return 'bg-blue-900/10 border-l-4 border-corporate-info';
    case 'DEBUG':
      return 'bg-gray-800/10 border-l-4 border-gray-600';
    default:
      return 'bg-gray-800/10 border-l-4 border-gray-500';
  }
}

/**
 * Get source indicator color
 */
function getSourceColorClasses(source: UnifiedLog['source']): string {
  return source === 'frontend'
    ? 'text-corporate-accentSecondary'
    : 'text-corporate-accentPrimary';
}

/**
 * Format timestamp to readable format
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  } catch {
    return isoString;
  }
}

/**
 * Format metadata for display
 */
function formatMetadata(metadata?: Record<string, unknown>): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '';
  }
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
}

/**
 * Log entry component with color-coded levels
 *
 * @example
 * ```tsx
 * <LogEntry
 *   log={{
 *     investigation_id: 'inv-123',
 *     ts: '2025-11-13T10:30:45.123Z',
 *     seq: 42,
 *     source: 'backend',
 *     level: 'INFO',
 *     message: 'Investigation started successfully',
 *     metadata: { user: 'analyst@example.com' },
 *     event_hash: 'abc123def456'
 *   }}
 *   showTimestamp={true}
 *   showSource={true}
 *   showMetadata={false}
 * />
 * ```
 */
export const LogEntry: React.FC<LogEntryProps> = ({
  log,
  showTimestamp = true,
  showSource = true,
  showMetadata = false,
  className = '',
}) => {
  return (
    <div
      className={`
        py-2 px-3 rounded transition-all font-mono text-sm
        ${getLogEntryBackgroundClasses(log.level)}
        ${className}
      `}
      data-log-level={log.level}
      data-log-source={log.source}
      data-event-hash={log.event_hash}
    >
      {/* Timestamp */}
      {showTimestamp && (
        <span className="text-corporate-textTertiary mr-3 font-semibold text-xs">
          {formatTimestamp(log.ts)}
        </span>
      )}

      {/* Level Badge */}
      <span
        className={`
          px-2 py-1 rounded text-xs font-bold mr-3 inline-block
          ${getLogLevelBadgeClasses(log.level)}
        `}
      >
        {log.level}
      </span>

      {/* Source Indicator */}
      {showSource && (
        <span
          className={`
            text-xs font-semibold mr-3
            ${getSourceColorClasses(log.source)}
          `}
        >
          [{log.source.toUpperCase()}]
        </span>
      )}

      {/* Message */}
      <span className="text-corporate-textPrimary">
        {log.message}
      </span>

      {/* Metadata (if enabled and present) */}
      {showMetadata && log.metadata && Object.keys(log.metadata).length > 0 && (
        <pre className="mt-2 text-xs text-corporate-textSecondary overflow-x-auto">
          {formatMetadata(log.metadata)}
        </pre>
      )}
    </div>
  );
};

export default LogEntry;
