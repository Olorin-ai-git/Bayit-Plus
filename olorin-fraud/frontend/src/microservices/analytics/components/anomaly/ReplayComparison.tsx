/**
 * ReplayComparison Component - Main component for replay comparison results
 * Uses DiffTable to display comparison results
 * Uses Olorin glassmorphic styling with dark/neon theme
 */

import React from 'react';
import { Panel } from '../common/Panel';
import { DiffTable } from './DiffTable';
import { KpiTile } from '../common/KpiTile';
import type { ReplayComparison as ReplayComparisonType } from '../../types/anomaly';

export interface ReplayComparisonProps {
  comparison: ReplayComparisonType;
  className?: string;
}

export const ReplayComparison: React.FC<ReplayComparisonProps> = ({
  comparison,
  className = '',
}) => {
  // Defensive checks - ensure all arrays exist
  // Handle both snake_case and camelCase property names
  const replayAnomalies = comparison.replay_anomalies || (comparison as any).replayAnomalies || [];
  const productionAnomalies = comparison.production_anomalies || (comparison as any).productionAnomalies || [];
  const newAnomalies = comparison.new_anomalies || (comparison as any).newAnomalies || [];
  const missedAnomalies = comparison.missed_anomalies || (comparison as any).missedAnomalies || [];
  const scoreDifferences = comparison.score_differences || (comparison as any).scoreDifferences || [];

  const precisionProxy = replayAnomalies.length > 0
    ? (replayAnomalies.length - missedAnomalies.length) /
      replayAnomalies.length
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiTile
          label="Replay Anomalies"
          value={replayAnomalies.length}
          description="Detected by new config"
        />
        <KpiTile
          label="Production Anomalies"
          value={productionAnomalies.length}
          description="Detected by prod config"
        />
        <KpiTile
          label="New Only"
          value={newAnomalies.length}
          description="Caught by new config"
          trend="up"
          trendValue={`+${newAnomalies.length}`}
        />
        <KpiTile
          label="Precision Proxy"
          value={`${(precisionProxy * 100).toFixed(1)}%`}
          description="Overlap ratio"
        />
      </div>

      {/* Comparison Tables */}
      <Panel title="Comparison Results" variant="outlined" padding="lg">
        <DiffTable
          newAnomalies={newAnomalies}
          missingAnomalies={missedAnomalies}
          scoreDifferences={scoreDifferences}
        />
      </Panel>
    </div>
  );
};

