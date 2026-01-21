/**
 * RadarDetectionLog Component
 * Feature: 004-new-olorin-frontend
 *
 * Scrolling detection log showing real-time anomaly detections.
 * Color-coded by severity with monospace font for HUD aesthetic.
 */

import React, { useRef, useEffect } from 'react';
import type { RadarAnomaly } from '@shared/types/radar.types';

export interface RadarDetectionLogProps {
  detections: RadarAnomaly[];
  maxEntries?: number;
  autoScroll?: boolean;
  className?: string;
}

/**
 * Real-time detection log with auto-scroll
 */
export const RadarDetectionLog: React.FC<RadarDetectionLogProps> = ({
  detections,
  maxEntries = 50,
  autoScroll = true,
  className = ''
}) => {
  const logRef = useRef<HTMLDivElement>(null);
  const displayedDetections = detections.slice(-maxEntries);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [detections, autoScroll]);

  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      {/* Log Entries */}
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto max-h-96 space-y-2"
        style={{ minHeight: '300px' }}
      >
        {displayedDetections.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-gray-500">
              No detections yet...
            </span>
          </div>
        ) : (
          displayedDetections.map((detection) => (
            <LogEntry key={detection.id} detection={detection} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-purple-600/30">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Auto-scroll: {autoScroll ? 'ON' : 'OFF'}</span>
          <span>Real-time monitoring active</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Individual log entry component
 */
const LogEntry: React.FC<{ detection: RadarAnomaly }> = ({ detection }) => {
  const severityColors = {
    critical: {
      bg: 'bg-corporate-error/20',
      text: 'text-corporate-error',
      border: 'border-l-red-500'
    },
    high: {
      bg: 'bg-amber-900/20',
      text: 'text-amber-400',
      border: 'border-l-amber-500'
    },
    medium: {
      bg: 'bg-cyan-900/20',
      text: 'text-cyan-400',
      border: 'border-l-cyan-500'
    },
    low: {
      bg: 'bg-gray-800/20',
      text: 'text-gray-400',
      border: 'border-l-gray-500'
    }
  };

  const colors = severityColors[detection.severity];
  const timestamp = new Date(detection.detected).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div
      className={`px-3 py-2 ${colors.bg} border-l-4 ${colors.border} rounded transition-all duration-200 hover:brightness-110`}
    >
      <div className="flex items-start gap-3">
        {/* Timestamp */}
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {timestamp}
        </span>

        {/* Severity Badge */}
        <span
          className={`px-2 py-0.5 text-xs font-bold uppercase ${colors.text} bg-black/30 rounded`}
        >
          {detection.severity}
        </span>

        {/* Risk Score */}
        <span className="px-2 py-0.5 text-xs font-bold text-gray-200 bg-black/30 rounded">
          {detection.riskLevel}
        </span>

        {/* Detection Info */}
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${colors.text} truncate`}>
            {detection.type}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Detected by {detection.detectedBy.agent} / {detection.detectedBy.tool}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadarDetectionLog;
