/**
 * Delta Strip Component
 *
 * Displays delta metrics (B - A) as badges with ▲/▼ indicators
 * and color semantics (green↑, red↓, amber for pending).
 *
 * Constitutional Compliance:
 * - All deltas from API response
 * - Accessible with aria-labels
 * - Keyboard navigable
 */

import React from 'react';
import { Badge } from '@shared/components/ui/Badge';
import type { DeltaMetrics } from '../types/comparison';

interface DeltaStripProps {
  delta: DeltaMetrics;
}

export const DeltaStrip: React.FC<DeltaStripProps> = ({ delta }) => {
  const deltas = [
    { key: 'precision', label: 'Precision', value: delta.precision },
    { key: 'recall', label: 'Recall', value: delta.recall },
    { key: 'f1', label: 'F1', value: delta.f1 },
    { key: 'accuracy', label: 'Accuracy', value: delta.accuracy },
    { key: 'fraud_rate', label: 'Fraud Rate', value: delta.fraud_rate }
  ];

  // Add distribution drift metrics if available
  if (delta.psi_predicted_risk !== undefined) {
    deltas.push({ key: 'psi', label: 'PSI', value: delta.psi_predicted_risk });
  }
  if (delta.ks_stat_predicted_risk !== undefined) {
    deltas.push({ key: 'ks', label: 'KS Stat', value: delta.ks_stat_predicted_risk });
  }

  const formatDelta = (value: number, key: string): string => {
    // PSI and KS are already in 0-1 range, format differently
    if (key === 'psi' || key === 'ks') {
      return value.toFixed(3);
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}pp`;
  };

  const getVariant = (value: number): 'success' | 'error' | 'warning' => {
    if (value > 0) return 'success';
    if (value < 0) return 'error';
    return 'warning';
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-medium text-corporate-textPrimary mr-2">
        Deltas (B - A):
      </span>
      {deltas.map((d) => (
        <Badge
          key={d.key}
          variant={getVariant(d.value)}
          aria-label={`Delta ${d.label}: ${formatDelta(d.value, d.key)}`}
          tabIndex={0}
        >
          {d.key !== 'psi' && d.key !== 'ks' && (d.value > 0 ? '▲' : d.value < 0 ? '▼' : '—')} {d.label}: {formatDelta(d.value, d.key)}
        </Badge>
      ))}
    </div>
  );
};

