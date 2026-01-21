/**
 * Confusion Matrix Table Columns
 * Feature: 025-financial-analysis-frontend
 *
 * Column definitions for confusion matrix metrics in the investigations table.
 */

import React from 'react';
import type { Column } from '@shared/components/Table';
import { ConfusionMetricsCell } from './ConfusionMetricsCell';
import { ConfusionMatrixTooltip } from './ConfusionMatrixTooltip';
import type { ConfusionMetrics } from '../../types/financialMetrics';

interface InvestigationWithConfusion {
  id: string;
  status: string;
  confusionMetrics?: ConfusionMetrics | null;
}

export function createTpFpColumn<T extends InvestigationWithConfusion>(): Column<T> {
  return {
    header: 'TP/FP',
    id: 'tpFp',
    sortable: true,
    width: '100px',
    accessor: (row) => row.confusionMetrics?.truePositives ?? null,
    cell: (_, row) => {
      if (row.status !== 'COMPLETED') {
        return <span className="text-corporate-textTertiary">--</span>;
      }
      if (!row.confusionMetrics) {
        return <span className="text-corporate-textTertiary">--</span>;
      }
      return (
        <ConfusionMatrixTooltip metrics={row.confusionMetrics}>
          <div className="cursor-help">
            <ConfusionMetricsCell metrics={row.confusionMetrics} />
          </div>
        </ConfusionMatrixTooltip>
      );
    },
  };
}

export function createPrecisionColumn<T extends InvestigationWithConfusion>(): Column<T> {
  return {
    header: 'Precision',
    id: 'precision',
    sortable: true,
    width: '90px',
    accessor: (row) => row.confusionMetrics?.precision ?? null,
    cell: (value, row) => {
      if (row.status !== 'COMPLETED') {
        return <span className="text-corporate-textTertiary">--</span>;
      }
      if (value === null || value === undefined) {
        return <span className="text-corporate-textTertiary">--</span>;
      }
      const percent = (value * 100).toFixed(1);
      const colorClass = value >= 0.8 ? 'text-green-500' : value >= 0.5 ? 'text-yellow-500' : 'text-red-500';
      return (
        <ConfusionMatrixTooltip metrics={row.confusionMetrics!}>
          <span className={`font-medium cursor-help ${colorClass}`}>{percent}%</span>
        </ConfusionMatrixTooltip>
      );
    },
  };
}

export function getConfusionColumns<T extends InvestigationWithConfusion>(): Column<T>[] {
  return [createTpFpColumn<T>(), createPrecisionColumn<T>()];
}
