/**
 * Activity Metrics Display Component
 * Feature: 007-progress-wizard-page
 *
 * Shows real-time tool execution rate and processing status
 */

import React from 'react';

interface ActivityMetricsProps {
  toolsPerSec: number;
  isProcessing: boolean;
}

export const ActivityMetrics: React.FC<ActivityMetricsProps> = ({ toolsPerSec, isProcessing }) => (
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2">
      <span className="text-sm text-corporate-textSecondary font-medium">Activity:</span>
      <span className="text-sm font-bold text-corporate-accentPrimary">{toolsPerSec.toFixed(2)} tools/sec</span>
    </div>
    {isProcessing && (
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 bg-corporate-accentPrimary rounded-full animate-pulse" />
        <span className="text-sm text-corporate-accentPrimary font-medium">Processing</span>
      </div>
    )}
  </div>
);

export default ActivityMetrics;
