/**
 * Blindspot Tooltip Component - Shows cell details on hover.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { BlindspotTooltipProps } from '../../types/blindspot';

const BlindspotTooltip: React.FC<BlindspotTooltipProps> = ({ cell, visible, x, y }) => {
  if (!visible || !cell) {
    return null;
  }

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString();
  };

  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -100%) translateY(-8px)',
      }}
    >
      <div className="bg-corporate-bgPrimary border border-corporate-border rounded-lg shadow-lg p-4 min-w-64">
        <div className="text-sm font-semibold text-corporate-textPrimary mb-3 border-b border-corporate-border pb-2">
          Score: {cell.scoreBinLabel} | GMV: ${cell.gmvBin}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="text-corporate-textSecondary">True Positives:</div>
          <div className="text-corporate-success font-medium text-right">{formatNumber(cell.tp)}</div>

          <div className="text-corporate-textSecondary">False Positives:</div>
          <div className="text-corporate-error font-medium text-right">{formatNumber(cell.fp)}</div>

          <div className="text-corporate-textSecondary">False Negatives:</div>
          <div className="text-corporate-warning font-medium text-right">{formatNumber(cell.fn)}</div>

          <div className="text-corporate-textSecondary">True Negatives:</div>
          <div className="text-corporate-success font-medium text-right">{formatNumber(cell.tn)}</div>
        </div>

        <div className="border-t border-corporate-border mt-3 pt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="text-corporate-textSecondary">FN Rate:</div>
          <div className="text-corporate-warning font-medium text-right">{formatPercent(cell.fnRate)}</div>

          <div className="text-corporate-textSecondary">FP Rate:</div>
          <div className="text-corporate-error font-medium text-right">{formatPercent(cell.fpRate)}</div>

          <div className="text-corporate-textSecondary">Precision:</div>
          <div className="text-corporate-textPrimary font-medium text-right">{formatPercent(cell.precision)}</div>

          <div className="text-corporate-textSecondary">Recall:</div>
          <div className="text-corporate-textPrimary font-medium text-right">{formatPercent(cell.recall)}</div>

          <div className="text-corporate-textSecondary">F1 Score:</div>
          <div className="text-corporate-textPrimary font-medium text-right">{formatPercent(cell.f1)}</div>
        </div>

        <div className="border-t border-corporate-border mt-3 pt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="text-corporate-textSecondary">Total Transactions:</div>
          <div className="text-corporate-textPrimary font-medium text-right">
            {formatNumber(cell.totalTransactions)}
          </div>

          <div className="text-corporate-textSecondary">Fraud GMV:</div>
          <div className="text-corporate-textPrimary font-medium text-right">{formatCurrency(cell.fraudGmv)}</div>

          <div className="text-corporate-textSecondary">Avg Score:</div>
          <div className="text-corporate-textPrimary font-medium text-right">{cell.avgScore.toFixed(3)}</div>
        </div>
      </div>
    </div>
  );
};

export default BlindspotTooltip;
