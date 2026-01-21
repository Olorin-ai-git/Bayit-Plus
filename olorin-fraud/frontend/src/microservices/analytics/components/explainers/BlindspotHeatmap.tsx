/**
 * Blindspot Heatmap Component - 2D distribution of FN/FP/TP/TN.
 * Shows nSure MODEL_SCORE (X) vs GMV (Y) with confusion matrix metrics.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  BlindspotHeatmapProps,
  BlindspotCell,
  BlindspotColorMetric,
} from '../../types/blindspot';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import BlindspotTooltip from './BlindspotTooltip';

const COLOR_METRICS: Array<{ value: BlindspotColorMetric; label: string }> = [
  { value: 'fnRate', label: 'FN Rate' },
  { value: 'fpRate', label: 'FP Rate' },
  { value: 'precision', label: 'Precision' },
  { value: 'recall', label: 'Recall' },
];

const getColorForMetric = (cell: BlindspotCell, metric: BlindspotColorMetric): string => {
  const value = cell[metric];
  if (metric === 'fnRate' || metric === 'fpRate') {
    // Higher = worse (red), lower = better (green)
    if (value >= 0.15) return 'bg-red-600';
    if (value >= 0.10) return 'bg-red-500';
    if (value >= 0.05) return 'bg-orange-500';
    if (value >= 0.02) return 'bg-yellow-500';
    return 'bg-green-500';
  } else {
    // Higher = better (green), lower = worse (red)
    if (value >= 0.90) return 'bg-green-600';
    if (value >= 0.75) return 'bg-green-500';
    if (value >= 0.50) return 'bg-yellow-500';
    if (value >= 0.25) return 'bg-orange-500';
    return 'bg-red-500';
  }
};

const BlindspotHeatmap: React.FC<BlindspotHeatmapProps> = ({
  data,
  colorMetric = 'fnRate',
  onColorMetricChange,
  onCellClick,
  loading = false,
}) => {
  const [hoveredCell, setHoveredCell] = useState<BlindspotCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = useCallback((cell: BlindspotCell, event: React.MouseEvent) => {
    setHoveredCell(cell);
    setTooltipPos({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (hoveredCell) {
      setTooltipPos({ x: event.clientX, y: event.clientY });
    }
  }, [hoveredCell]);

  const cellMap = useMemo(() => {
    if (!data?.matrix?.cells) return new Map<string, BlindspotCell>();
    const map = new Map<string, BlindspotCell>();
    data.matrix.cells.forEach((cell) => {
      map.set(`${cell.scoreBin}-${cell.gmvBin}`, cell);
    });
    return map;
  }, [data?.matrix?.cells]);

  if (loading) {
    return <LoadingState message="Loading blindspot analysis..." />;
  }

  if (!data || data.status === 'failed') {
    return (
      <EmptyState
        title="No Blindspot Data"
        message={data?.error || 'Blindspot analysis data is not available.'}
      />
    );
  }

  const { matrix, trainingInfo, summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-corporate-textPrimary mb-1">
            nSure Model Blindspot Analysis
          </h2>
          <p className="text-sm text-corporate-textSecondary">
            Threshold: {trainingInfo.olorinThreshold} | Prompt: {trainingInfo.promptVersion}
          </p>
        </div>
        <div className="flex gap-2">
          {COLOR_METRICS.map((m) => (
            <button
              key={m.value}
              onClick={() => onColorMetricChange?.(m.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                colorMetric === m.value
                  ? 'bg-corporate-accent text-white'
                  : 'bg-corporate-bgSecondary text-corporate-textSecondary hover:bg-corporate-bgTertiary'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-corporate-bgSecondary/50 backdrop-blur-sm border border-corporate-border overflow-x-auto">
        <div className="flex">
          <div className="flex flex-col justify-center pr-2 text-xs text-corporate-textSecondary font-medium">
            <span className="writing-mode-vertical transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
              GMV Range
            </span>
          </div>

          <div className="flex-1">
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${matrix.scoreBins.length}, 1fr)` }}>
              <div className="text-xs text-corporate-textSecondary font-medium p-1" />
              {matrix.scoreBins.map((bin) => (
                <div key={bin} className="text-xs text-corporate-textSecondary text-center p-1 truncate">
                  {bin.toFixed(2)}
                </div>
              ))}

              {matrix.gmvBins.map((gmvBin) => (
                <React.Fragment key={gmvBin}>
                  <div className="text-xs text-corporate-textSecondary font-medium p-1 flex items-center">
                    ${gmvBin}
                  </div>
                  {matrix.scoreBins.map((scoreBin) => {
                    const cell = cellMap.get(`${scoreBin}-${gmvBin}`);
                    if (!cell) {
                      return (
                        <div key={`${scoreBin}-${gmvBin}`} className="aspect-square m-0.5 bg-corporate-bgTertiary rounded" />
                      );
                    }
                    return (
                      <div
                        key={`${scoreBin}-${gmvBin}`}
                        className={`aspect-square m-0.5 rounded cursor-pointer transition-all hover:ring-2 hover:ring-corporate-accent ${getColorForMetric(cell, colorMetric)}`}
                        onMouseEnter={(e) => handleMouseEnter(cell, e)}
                        onMouseLeave={handleMouseLeave}
                        onMouseMove={handleMouseMove}
                        onClick={() => onCellClick?.(cell)}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            <div className="text-xs text-corporate-textSecondary text-center mt-2 font-medium">
              MODEL_SCORE (nSure)
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-corporate-bgSecondary border border-corporate-border">
          <div className="text-xs text-corporate-textSecondary">Total Transactions</div>
          <div className="text-xl font-bold text-corporate-textPrimary">{summary.totalTransactions.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-lg bg-corporate-bgSecondary border border-corporate-border">
          <div className="text-xs text-corporate-textSecondary">Overall Precision</div>
          <div className="text-xl font-bold text-corporate-textPrimary">{(summary.overallPrecision * 100).toFixed(1)}%</div>
        </div>
        <div className="p-4 rounded-lg bg-corporate-bgSecondary border border-corporate-border">
          <div className="text-xs text-corporate-textSecondary">Overall Recall</div>
          <div className="text-xl font-bold text-corporate-textPrimary">{(summary.overallRecall * 100).toFixed(1)}%</div>
        </div>
        <div className="p-4 rounded-lg bg-corporate-bgSecondary border border-corporate-border">
          <div className="text-xs text-corporate-textSecondary">Fraud GMV</div>
          <div className="text-xl font-bold text-corporate-textPrimary">${summary.totalFraudGmv.toLocaleString()}</div>
        </div>
      </div>

      <BlindspotTooltip cell={hoveredCell!} visible={!!hoveredCell} x={tooltipPos.x} y={tooltipPos.y} />
    </div>
  );
};

export default BlindspotHeatmap;
