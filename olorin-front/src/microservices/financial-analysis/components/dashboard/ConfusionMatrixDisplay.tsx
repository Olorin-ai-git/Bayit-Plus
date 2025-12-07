/**
 * ConfusionMatrixDisplay Component
 * Feature: 025-financial-analysis-frontend
 *
 * Displays aggregate confusion matrix with visual breakdown.
 */

import React from 'react';
import { Card } from '@shared/components/ui/Card';
import type { AggregateConfusionMatrix } from '../../../investigation/types/financialMetrics';

interface ConfusionMatrixDisplayProps {
  matrix: AggregateConfusionMatrix | null;
  className?: string;
}

export const ConfusionMatrixDisplay: React.FC<ConfusionMatrixDisplayProps> = ({ matrix, className = '' }) => {
  if (!matrix) {
    return (
      <Card className={className}>
        <div className="text-center text-corporate-textTertiary py-8">
          No confusion matrix data available
        </div>
      </Card>
    );
  }

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <Card className={className}>
      <h3 className="text-lg font-semibold text-white mb-4">Aggregate Confusion Matrix</h3>
      <div className="grid grid-cols-3 gap-2 text-xs mb-6">
        <div />
        <div className="text-center text-corporate-textTertiary font-medium py-2">Pred: Fraud</div>
        <div className="text-center text-corporate-textTertiary font-medium py-2">Pred: Legit</div>
        <div className="text-right text-corporate-textTertiary font-medium py-2 pr-2">Actual: Fraud</div>
        <div className="bg-green-900/30 p-4 text-center rounded">
          <span className="text-2xl text-green-400 font-bold">{matrix.totalTP}</span>
          <div className="text-xs text-green-400/70 mt-1">True Positive</div>
        </div>
        <div className="bg-red-900/30 p-4 text-center rounded">
          <span className="text-2xl text-red-400 font-bold">{matrix.totalFN}</span>
          <div className="text-xs text-red-400/70 mt-1">False Negative</div>
        </div>
        <div className="text-right text-corporate-textTertiary font-medium py-2 pr-2">Actual: Legit</div>
        <div className="bg-red-900/30 p-4 text-center rounded">
          <span className="text-2xl text-red-400 font-bold">{matrix.totalFP}</span>
          <div className="text-xs text-red-400/70 mt-1">False Positive</div>
        </div>
        <div className="bg-green-900/30 p-4 text-center rounded">
          <span className="text-2xl text-green-400 font-bold">{matrix.totalTN}</span>
          <div className="text-xs text-green-400/70 mt-1">True Negative</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-corporate-borderPrimary pt-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-corporate-textPrimary">{formatPercent(matrix.avgPrecision)}</div>
          <div className="text-xs text-corporate-textTertiary">Avg Precision</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-corporate-textPrimary">{formatPercent(matrix.avgRecall)}</div>
          <div className="text-xs text-corporate-textTertiary">Avg Recall</div>
        </div>
      </div>
    </Card>
  );
};
