/**
 * Cohort Table Component - Display cohort metrics table.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { formatPercentage, formatCurrency } from '../../utils/formatters';
import type { Cohort } from '../../types/cohort';

interface CohortTableProps {
  cohorts: Cohort[];
}

const CohortTable: React.FC<CohortTableProps> = ({ cohorts }) => {
  if (!cohorts || cohorts.length === 0) {
    return (
      <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
        <p className="text-corporate-textSecondary text-center">
          No cohort data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-corporate-borderPrimary">
            <th className="text-left p-3 text-corporate-textSecondary">Cohort</th>
            <th className="text-right p-3 text-corporate-textSecondary">Precision</th>
            <th className="text-right p-3 text-corporate-textSecondary">Recall</th>
            <th className="text-right p-3 text-corporate-textSecondary">F1</th>
            <th className="text-right p-3 text-corporate-textSecondary">Capture Rate</th>
            <th className="text-right p-3 text-corporate-textSecondary">Approval Rate</th>
            <th className="text-right p-3 text-corporate-textSecondary">FP Cost</th>
            <th className="text-right p-3 text-corporate-textSecondary">Transactions</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr
              key={cohort.id}
              className="border-b border-corporate-borderPrimary/30 hover:bg-corporate-bgPrimary/30 transition-colors"
            >
              <td className="p-3 text-corporate-textPrimary font-medium">
                {cohort.name}
              </td>
              <td className="p-3 text-right text-corporate-success">
                {formatPercentage(cohort.metrics.precision)}
              </td>
              <td className="p-3 text-right text-corporate-info">
                {formatPercentage(cohort.metrics.recall)}
              </td>
              <td className="p-3 text-right text-corporate-accentPrimary">
                {formatPercentage(cohort.metrics.f1Score)}
              </td>
              <td className="p-3 text-right text-corporate-warning">
                {formatPercentage(cohort.metrics.captureRate)}
              </td>
              <td className="p-3 text-right text-corporate-success">
                {formatPercentage(cohort.metrics.approvalRate)}
              </td>
              <td className="p-3 text-right text-corporate-error">
                {formatCurrency(cohort.metrics.falsePositiveCost)}
              </td>
              <td className="p-3 text-right text-corporate-textSecondary">
                {cohort.transactionCount.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CohortTable;

