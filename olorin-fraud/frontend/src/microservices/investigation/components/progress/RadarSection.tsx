/**
 * Radar Section
 * Feature: 004-new-olorin-frontend
 *
 * Radar HUD header and collapsible visualization panel.
 */

import React from 'react';
import {
  CollapsiblePanel,
  RadarHUDHeader,
  RadarVisualization
} from '@shared/components';
import type { RadarVisualizationState, RadarAnomaly } from '@shared/types/radar.types';

interface RadarSectionProps {
  radarState: RadarVisualizationState;
  onAnomalySelected: (anomaly: RadarAnomaly) => void;
  onToggleScanning: () => void;
  onToggleLabels: () => void;
}

export const RadarSection: React.FC<RadarSectionProps> = React.memo(({
  radarState,
  onAnomalySelected,
  onToggleScanning,
  onToggleLabels
}) => {
  return (
    <>
      <RadarHUDHeader
        stats={radarState.stats}
        metadata={radarState.metadata}
        isScanning={radarState.uiState.isScanning}
      />

      <CollapsiblePanel
        title="Threat Radar"
        defaultExpanded={true}
        badges={[
          <span key="anomalies" className="text-xs px-2 py-1 bg-red-900/30 text-corporate-error rounded">
            {radarState.stats.totalAnomalies} Anomalies
          </span>,
          <span key="critical" className="text-xs px-2 py-1 bg-red-900/50 text-red-300 rounded">
            {radarState.stats.criticalThreats} Critical
          </span>
        ]}
        className="mb-6"
      >
        <RadarVisualization
          state={radarState}
          onAnomalySelected={onAnomalySelected}
          onToggleScanning={onToggleScanning}
          onToggleLabels={onToggleLabels}
        />
      </CollapsiblePanel>
    </>
  );
});
