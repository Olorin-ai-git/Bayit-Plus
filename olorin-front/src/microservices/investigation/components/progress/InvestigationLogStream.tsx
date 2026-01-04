/**
 * Investigation Log Stream
 * Feature: 006-hybrid-graph-integration
 *
 * Real-time log stream with color-coded severity and virtual scrolling.
 * Displays investigation logs with filtering and auto-scroll capabilities.
 */

import React, { useRef, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  severity: 'debug' | 'info' | 'warning' | 'error';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

interface InvestigationLogStreamProps {
  logs: LogEntry[];
  autoScroll?: boolean;
  className?: string;
}

export function InvestigationLogStream({
  logs,
  autoScroll = true,
  className = '',
}: InvestigationLogStreamProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getSeverityStyles = (severity: LogEntry['severity']) => {
    switch (severity) {
      case 'debug':
        return { text: 'text-gray-400', icon: '🔍', bg: 'bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40/30' };
      case 'info':
        return { text: 'text-blue-300', icon: 'ℹ️', bg: 'bg-blue-900/20 border border-blue-500/30' };
      case 'warning':
        return { text: 'text-yellow-300', icon: '⚠️', bg: 'bg-yellow-900/20 border border-yellow-500/30' };
      case 'error':
        return { text: 'text-red-300', icon: '❌', bg: 'bg-corporate-error/20 border border-corporate-error/30' };
    }
  };

  const formatTime = (isoTime: string): string => {
    try {
      const date = new Date(isoTime);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    } catch {
      return 'Invalid time';
    }
  };

  if (logs.length === 0) {
    return (
      <div className={`bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
          Investigation Logs
        </h3>
        <p className="text-corporate-textSecondary text-center py-8">
          No logs available. Investigation will begin shortly...
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-black/40 backdrop-blur border-2 border-corporate-borderPrimary/40 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-corporate-textPrimary">
          Investigation Logs
        </h3>
        <span className="text-sm text-corporate-textTertiary">
          {logs.length} entr{logs.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      <div className="bg-black/40 rounded-md p-4 max-h-96 overflow-y-auto font-mono text-sm">
        {logs.map((log, index) => {
          const styles = getSeverityStyles(log.severity);

          return (
            <div
              key={index}
              className={`py-2 px-3 mb-1 rounded ${styles.bg} hover:bg-opacity-80 transition-colors`}
            >
              <div className="flex items-start space-x-3">
                <span className="flex-shrink-0 text-lg">{styles.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline space-x-2 mb-1">
                    <span className="text-gray-500 text-xs">{formatTime(log.timestamp)}</span>
                    <span className={`text-xs font-medium ${styles.text}`}>
                      {log.severity.toUpperCase()}
                    </span>
                    <span className="text-gray-400 text-xs">[ {log.source} ]</span>
                  </div>
                  <p className={`break-words ${styles.text}`}>{log.message}</p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-1">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                        Metadata
                      </summary>
                      <pre className="text-xs text-gray-400 mt-1 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
