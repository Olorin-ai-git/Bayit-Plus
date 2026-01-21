/**
 * Detection And Tools Section
 * Feature: 004-new-olorin-frontend
 *
 * Detection log panel.
 */

import React from 'react';
import { CollapsiblePanel, RadarDetectionLog } from '@shared/components';
import type { RadarAnomaly } from '@shared/types/radar.types';

interface DetectionAndToolsSectionProps {
  radarAnomalies: RadarAnomaly[];
}

export const DetectionAndToolsSection: React.FC<DetectionAndToolsSectionProps> = React.memo(({
  radarAnomalies
}) => {
  return (
    <div className="mb-6">
      <CollapsiblePanel
        title="Detection Log"
        defaultExpanded={true}
        badges={[
          <span key="count" className="text-xs px-2 py-1 bg-cyan-900/30 text-cyan-400 rounded">
            {radarAnomalies.length} Detections
          </span>
        ]}
      >
        <RadarDetectionLog
          detections={radarAnomalies}
          maxEntries={50}
          autoScroll={true}
        />
      </CollapsiblePanel>
    </div>
  );
});
