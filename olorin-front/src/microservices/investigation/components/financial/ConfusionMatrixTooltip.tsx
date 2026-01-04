/**
 * ConfusionMatrixTooltip Component
 * Feature: 025-financial-analysis-frontend
 *
 * Displays a full confusion matrix breakdown in a tooltip/popover format.
 */

import React, { useState } from 'react';
import type { ConfusionMetrics } from '../../types/financialMetrics';

interface ConfusionMatrixTooltipProps {
  metrics: ConfusionMetrics;
  children: React.ReactNode;
}

export const ConfusionMatrixTooltip: React.FC<ConfusionMatrixTooltipProps> = ({ metrics, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  const { truePositives, falsePositives, trueNegatives, falseNegatives, precision, recall, f1Score, accuracy } = metrics;

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="relative inline-block" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-corporate-bgSecondary border border-corporate-borderPrimary rounded-lg shadow-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 text-center">Confusion Matrix</div>
          <div className="grid grid-cols-3 gap-1 text-xs mb-4">
            <div />
            <div className="text-center text-corporate-textTertiary font-medium">Pred: Fraud</div>
            <div className="text-center text-corporate-textTertiary font-medium">Pred: Legit</div>
            <div className="text-right text-corporate-textTertiary font-medium pr-2">Actual: Fraud</div>
            <div className="bg-green-900/30 p-2 text-center rounded">
              <span className="text-green-400 font-bold">{truePositives}</span>
              <div className="text-[10px] text-green-400/70">TP</div>
            </div>
            <div className="bg-red-900/30 p-2 text-center rounded">
              <span className="text-red-400 font-bold">{falseNegatives}</span>
              <div className="text-[10px] text-red-400/70">FN</div>
            </div>
            <div className="text-right text-corporate-textTertiary font-medium pr-2">Actual: Legit</div>
            <div className="bg-red-900/30 p-2 text-center rounded">
              <span className="text-red-400 font-bold">{falsePositives}</span>
              <div className="text-[10px] text-red-400/70">FP</div>
            </div>
            <div className="bg-green-900/30 p-2 text-center rounded">
              <span className="text-green-400 font-bold">{trueNegatives}</span>
              <div className="text-[10px] text-green-400/70">TN</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-corporate-borderPrimary pt-3">
            <div className="flex justify-between">
              <span className="text-corporate-textTertiary">Precision:</span>
              <span className="text-white font-medium">{formatPercent(precision)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-corporate-textTertiary">Recall:</span>
              <span className="text-white font-medium">{formatPercent(recall)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-corporate-textTertiary">F1 Score:</span>
              <span className="text-white font-medium">{formatPercent(f1Score)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-corporate-textTertiary">Accuracy:</span>
              <span className="text-white font-medium">{formatPercent(accuracy)}</span>
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-3 h-3 bg-corporate-bgSecondary border-r border-b border-corporate-borderPrimary rotate-45" />
        </div>
      )}
    </div>
  );
};
