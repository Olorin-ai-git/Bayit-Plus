/**
 * Comparison Controls Component
 *
 * Controls row for entity selection, windows, threshold, and options.
 *
 * Constitutional Compliance:
 * - All state managed by parent
 * - No hardcoded values
 */

import React from 'react';
import { Card } from '@shared/components/ui/Card';
import { Button } from '@shared/components/ui/Button';
import { EntityPicker } from './EntityPicker';
import { WindowPicker } from './WindowPicker';
import { ThresholdControl } from './ThresholdControl';
import { MerchantFilter } from './MerchantFilter';
import type { Entity, WindowSpec } from '../types/comparison';

interface ComparisonControlsProps {
  entity?: Entity;
  onEntityChange: (entity: Entity | undefined) => void;
  windowA: WindowSpec;
  onWindowAChange: (window: WindowSpec) => void;
  windowB: WindowSpec;
  onWindowBChange: (window: WindowSpec) => void;
  matchDurations: boolean;
  onMatchDurationsChange: (match: boolean) => void;
  riskThreshold: number;
  onRiskThresholdChange: (threshold: number) => void;
  merchantIds: string[];
  onMerchantIdsChange: (ids: string[]) => void;
  includeHistograms: boolean;
  onIncludeHistogramsChange: (include: boolean) => void;
  includeTimeseries: boolean;
  onIncludeTimeseriesChange: (include: boolean) => void;
  onCompare: () => void;
  loading: boolean;
  hasPrivilegedRole: boolean;
}

export const ComparisonControls: React.FC<ComparisonControlsProps> = ({
  entity,
  onEntityChange,
  windowA,
  onWindowAChange,
  windowB,
  onWindowBChange,
  matchDurations,
  onMatchDurationsChange,
  riskThreshold,
  onRiskThresholdChange,
  merchantIds,
  onMerchantIdsChange,
  includeHistograms,
  onIncludeHistogramsChange,
  includeTimeseries,
  onIncludeTimeseriesChange,
  onCompare,
  loading,
  hasPrivilegedRole
}) => {
  return (
    <Card variant="elevated" padding="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <EntityPicker value={entity} onChange={onEntityChange} hasPrivilegedRole={hasPrivilegedRole} />
        <WindowPicker label="Window A" value={windowA} onChange={onWindowAChange} />
        <WindowPicker 
          label="Window B" 
          value={windowB} 
          onChange={onWindowBChange}
          matchDuration={matchDurations}
          referenceWindow={windowA}
        />
        <ThresholdControl value={riskThreshold} onChange={onRiskThresholdChange} />
      </div>
      <div className="mt-4">
        <MerchantFilter selectedMerchants={merchantIds} onChange={onMerchantIdsChange} />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={matchDurations}
              onChange={(e) => onMatchDurationsChange(e.target.checked)}
              className="w-4 h-4 rounded border-corporate-accentPrimary/40 bg-black/30 text-corporate-accentPrimary focus:ring-corporate-accentPrimary"
            />
            <span className="text-sm text-corporate-textSecondary">Match durations</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHistograms}
              onChange={(e) => onIncludeHistogramsChange(e.target.checked)}
              className="w-4 h-4 rounded border-corporate-accentPrimary/40 bg-black/30 text-corporate-accentPrimary focus:ring-corporate-accentPrimary"
            />
            <span className="text-sm text-corporate-textSecondary">Include histograms</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTimeseries}
              onChange={(e) => onIncludeTimeseriesChange(e.target.checked)}
              className="w-4 h-4 rounded border-corporate-accentPrimary/40 bg-black/30 text-corporate-accentPrimary focus:ring-corporate-accentPrimary"
            />
            <span className="text-sm text-corporate-textSecondary">Include timeseries</span>
          </label>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={onCompare}
            disabled={loading || (!entity && merchantIds.length === 0)}
            loading={loading}
          >
            Apply
          </Button>
        </div>
      </div>
    </Card>
  );
};

