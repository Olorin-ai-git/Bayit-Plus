/**
 * Per-Merchant Table Component
 *
 * Sortable table displaying per-merchant metrics with A, B, and Δ columns.
 * Sticky header for better UX when scrolling.
 *
 * Constitutional Compliance:
 * - All data from API response
 * - Sortable columns
 * - Accessible table structure
 */

import React, { useState, useMemo } from 'react';
import type { PerMerchantMetrics } from '../types/comparison';

interface PerMerchantTableProps {
  data: PerMerchantMetrics[];
}

type SortColumn = 'merchant_id' | 'total_transactions' | 'precision' | 'recall' | 'f1' | 'fraud_rate';
type SortDirection = 'asc' | 'desc';

export const PerMerchantTable: React.FC<PerMerchantTableProps> = ({ data }) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('total_transactions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (sortColumn === 'merchant_id') {
        aValue = a.merchant_id.localeCompare(b.merchant_id);
        bValue = 0;
        return sortDirection === 'asc' ? aValue : -aValue;
      }

      // Get value from Window B (most recent)
      if (sortColumn === 'total_transactions') {
        aValue = a.B.total_transactions || 0;
        bValue = b.B.total_transactions || 0;
      } else {
        aValue = a.B[sortColumn] || 0;
        bValue = b.B[sortColumn] || 0;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [data, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const formatMetric = (value: number | undefined): string => {
    if (value === undefined) return '—';
    return typeof value === 'number' ? (value * 100).toFixed(1) + '%' : String(value);
  };

  const formatDelta = (value: number | undefined): string => {
    if (value === undefined) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}pp`;
  };

  const getDeltaColor = (value: number | undefined): string => {
    if (value === undefined) return 'text-corporate-textSecondary';
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-corporate-textSecondary';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-black/80 backdrop-blur z-10">
          <tr className="border-b border-corporate-borderPrimary">
            <th
              className="px-4 py-3 text-left text-xs font-medium text-corporate-textSecondary cursor-pointer hover:text-corporate-textPrimary"
              onClick={() => handleSort('merchant_id')}
            >
              Merchant ID {sortColumn === 'merchant_id' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th
              className="px-4 py-3 text-right text-xs font-medium text-corporate-textSecondary cursor-pointer hover:text-corporate-textPrimary"
              onClick={() => handleSort('total_transactions')}
            >
              Total Tx {sortColumn === 'total_transactions' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-corporate-textSecondary">
              Precision
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-corporate-textSecondary">
              Recall
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-corporate-textSecondary">
              F1
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-corporate-textSecondary">
              Fraud Rate
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-corporate-textSecondary">
              Δ Precision
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-corporate-textSecondary">
              Δ Recall
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-corporate-textSecondary">
              Δ F1
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((merchant) => (
            <tr
              key={merchant.merchant_id}
              className="border-b border-corporate-borderPrimary/50 hover:bg-corporate-bgTertiary/50"
            >
              <td className="px-4 py-3 text-sm text-corporate-textPrimary font-mono">
                {merchant.merchant_id}
              </td>
              <td className="px-4 py-3 text-sm text-corporate-textPrimary text-right">
                {merchant.B.total_transactions || 0}
              </td>
              <td className="px-4 py-3 text-sm text-corporate-textPrimary text-right">
                {formatMetric(merchant.B.precision)}
              </td>
              <td className="px-4 py-3 text-sm text-corporate-textPrimary text-right">
                {formatMetric(merchant.B.recall)}
              </td>
              <td className="px-4 py-3 text-sm text-corporate-textPrimary text-right">
                {formatMetric(merchant.B.f1)}
              </td>
              <td className="px-4 py-3 text-sm text-corporate-textPrimary text-right">
                {formatMetric(merchant.B.fraud_rate)}
              </td>
              <td className={`px-4 py-3 text-sm text-right ${getDeltaColor(merchant.delta.precision)}`}>
                {formatDelta(merchant.delta.precision)}
              </td>
              <td className={`px-4 py-3 text-sm text-right ${getDeltaColor(merchant.delta.recall)}`}>
                {formatDelta(merchant.delta.recall)}
              </td>
              <td className={`px-4 py-3 text-sm text-right ${getDeltaColor(merchant.delta.f1)}`}>
                {formatDelta(merchant.delta.f1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sortedData.length === 0 && (
        <div className="text-center py-8 text-corporate-textSecondary">
          No merchant data available
        </div>
      )}
    </div>
  );
};

