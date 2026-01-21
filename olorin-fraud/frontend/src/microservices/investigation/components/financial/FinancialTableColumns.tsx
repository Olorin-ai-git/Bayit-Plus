/**
 * Financial Table Columns
 * Feature: 025-financial-analysis-frontend
 *
 * Column definitions for financial metrics in the investigations table.
 */

import React from 'react';
import type { Column } from '@shared/components/Table';
import { CurrencyDisplay } from './CurrencyDisplay';
import { NetValueCell } from './NetValueCell';
import type { RevenueMetrics } from '../../types/financialMetrics';

interface InvestigationWithFinancials {
  id: string;
  status: string;
  financialMetrics?: RevenueMetrics | null;
}

export function createSavedGmvColumn<T extends InvestigationWithFinancials>(): Column<T> {
  return {
    header: 'Saved GMV',
    id: 'savedGmv',
    sortable: true,
    width: '120px',
    accessor: (row) => row.financialMetrics?.savedFraudGmv ?? null,
    cell: (value, row) => {
      if (row.status !== 'COMPLETED') {
        return <span className="text-corporate-textTertiary">--</span>;
      }
      if (row.financialMetrics?.skippedDueToPrediction) {
        return (
          <span className="text-corporate-textTertiary text-xs" title="Skipped: No fraud prediction">
            N/A
          </span>
        );
      }
      if (value === null || value === undefined) {
        return <span className="text-corporate-textTertiary">--</span>;
      }
      return <CurrencyDisplay value={value} format="compact" className="text-green-500" />;
    },
  };
}

export function createLostRevenuesColumn<T extends InvestigationWithFinancials>(): Column<T> {
  return {
    header: 'Lost Rev',
    id: 'lostRevenues',
    sortable: true,
    width: '120px',
    accessor: (row) => row.financialMetrics?.lostRevenues ?? null,
    cell: (value, row) => {
      if (row.status !== 'COMPLETED') {
        return <span className="text-corporate-textTertiary">--</span>;
      }
      if (row.financialMetrics?.skippedDueToPrediction) {
        return (
          <span className="text-corporate-textTertiary text-xs" title="Skipped: No fraud prediction">
            N/A
          </span>
        );
      }
      if (value === null || value === undefined) {
        return <span className="text-corporate-textTertiary">--</span>;
      }
      return <CurrencyDisplay value={value} format="compact" className="text-red-500" />;
    },
  };
}

export function createNetValueColumn<T extends InvestigationWithFinancials>(): Column<T> {
  return {
    header: 'Net Value',
    id: 'netValue',
    sortable: true,
    width: '140px',
    accessor: (row) => row.financialMetrics?.netValue ?? null,
    cell: (value, row) => {
      if (row.status !== 'COMPLETED') {
        return <span className="text-corporate-textTertiary">--</span>;
      }
      if (row.financialMetrics?.skippedDueToPrediction) {
        return (
          <span className="text-corporate-textTertiary text-xs" title="Skipped: No fraud prediction">
            N/A
          </span>
        );
      }
      if (value === null || value === undefined || !row.financialMetrics) {
        return <span className="text-corporate-textTertiary">--</span>;
      }
      return (
        <NetValueCell
          netValue={value}
          confidenceLevel={row.financialMetrics.confidenceLevel}
          skippedDueToPrediction={row.financialMetrics.skippedDueToPrediction}
        />
      );
    },
  };
}

export function getFinancialColumns<T extends InvestigationWithFinancials>(): Column<T>[] {
  return [
    createSavedGmvColumn<T>(),
    createLostRevenuesColumn<T>(),
    createNetValueColumn<T>(),
  ];
}
