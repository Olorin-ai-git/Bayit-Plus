/**
 * Activity Monitor Section
 * Feature: 004-new-olorin-frontend
 *
 * Collapsible panel with EKG activity monitor.
 */

import React from 'react';
import { CollapsiblePanel, EnhancedEKGMonitor } from '@shared/components';
import type { EKGMetrics } from '../../utils/ekgMetricsCalculator';

interface ActivityMonitorSectionProps {
  ekgMetrics: EKGMetrics;
  isConnected: boolean;
}

export const ActivityMonitorSection: React.FC<ActivityMonitorSectionProps> = React.memo(({
  ekgMetrics,
  isConnected
}) => {
  return (
    <CollapsiblePanel
      title="Activity Monitor"
      defaultExpanded={true}
      badges={[
        <span key="bpm" className="text-xs px-2 py-1 bg-corporate-success/30 text-corporate-success rounded">
          BPM: {40 + (ekgMetrics.running * 6)}
        </span>,
        <span key="status" className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded">
          {ekgMetrics.running} Running
        </span>
      ]}
      className="mb-6"
    >
      <EnhancedEKGMonitor
        progress={ekgMetrics.progress}
        completed={ekgMetrics.completed}
        running={ekgMetrics.running}
        queued={ekgMetrics.queued}
        failed={ekgMetrics.failed}
        isConnected={isConnected}
        expectedTotal={ekgMetrics.expectedTotal}
      />
    </CollapsiblePanel>
  );
});
