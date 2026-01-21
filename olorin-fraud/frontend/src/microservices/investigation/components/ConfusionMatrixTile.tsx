/**
 * Confusion Matrix Tile Component
 *
 * Visualizes confusion matrix as a 2×2 grid showing TP, FP, TN, FN.
 * Color-coded for easy interpretation.
 *
 * Constitutional Compliance:
 * - All values from API response
 * - Accessible with proper labels
 * - No hardcoded values
 */

import React from 'react';
import { Card } from '@shared/components/ui/Card';

interface ConfusionMatrixTileProps {
  TP: number;
  FP: number;
  TN: number;
  FN: number;
  title?: string;
}

export const ConfusionMatrixTile: React.FC<ConfusionMatrixTileProps> = ({
  TP,
  FP,
  TN,
  FN,
  title = 'Confusion Matrix'
}) => {
  const total = TP + FP + TN + FN;

  return (
    <Card variant="default" padding="md">
      <h4 className="text-sm font-semibold text-corporate-textPrimary mb-3">{title}</h4>
      <div className="grid grid-cols-2 gap-2">
        {/* True Negative */}
        <div
          className="p-3 rounded-lg border-2 border-green-500/40 bg-green-900/20 text-center"
          aria-label={`True Negatives: ${TN}`}
        >
          <div className="text-xs text-corporate-textSecondary mb-1">True Negative</div>
          <div className="text-2xl font-bold text-green-400">{TN}</div>
          {total > 0 && (
            <div className="text-xs text-corporate-textTertiary mt-1">
              {((TN / total) * 100).toFixed(1)}%
            </div>
          )}
        </div>

        {/* False Positive */}
        <div
          className="p-3 rounded-lg border-2 border-yellow-500/40 bg-yellow-900/20 text-center"
          aria-label={`False Positives: ${FP}`}
        >
          <div className="text-xs text-corporate-textSecondary mb-1">False Positive</div>
          <div className="text-2xl font-bold text-yellow-400">{FP}</div>
          {total > 0 && (
            <div className="text-xs text-corporate-textTertiary mt-1">
              {((FP / total) * 100).toFixed(1)}%
            </div>
          )}
        </div>

        {/* False Negative */}
        <div
          className="p-3 rounded-lg border-2 border-orange-500/40 bg-orange-900/20 text-center"
          aria-label={`False Negatives: ${FN}`}
        >
          <div className="text-xs text-corporate-textSecondary mb-1">False Negative</div>
          <div className="text-2xl font-bold text-orange-400">{FN}</div>
          {total > 0 && (
            <div className="text-xs text-corporate-textTertiary mt-1">
              {((FN / total) * 100).toFixed(1)}%
            </div>
          )}
        </div>

        {/* True Positive */}
        <div
          className="p-3 rounded-lg border-2 border-red-500/40 bg-red-900/20 text-center"
          aria-label={`True Positives: ${TP}`}
        >
          <div className="text-xs text-corporate-textSecondary mb-1">True Positive</div>
          <div className="text-2xl font-bold text-red-400">{TP}</div>
          {total > 0 && (
            <div className="text-xs text-corporate-textTertiary mt-1">
              {((TP / total) * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 text-xs text-corporate-textTertiary text-center">
        Total: {total.toLocaleString()} transactions
      </div>
    </Card>
  );
};

