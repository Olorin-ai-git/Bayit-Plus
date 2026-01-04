/**
 * Cohort Comparison Component - Side-by-side cohort comparison.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { formatPercentage } from '../../utils/formatters';
import type { Cohort } from '../../types/cohort';

interface CohortComparisonProps {
  cohorts: Cohort[];
}

const CohortComparison: React.FC<CohortComparisonProps> = ({ cohorts }) => {
  if (!cohorts || cohorts.length === 0) {
    return (
      <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
        <p className="text-corporate-textSecondary text-center">
          No cohorts available for comparison
        </p>
      </div>
    );
  }

  return (
    <div className="bg-corporate-bgSecondary/50 backdrop-blur-md border border-corporate-borderPrimary/30 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-corporate-textPrimary mb-4">
        Cohort Comparison
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-corporate-borderPrimary">
              <th className="text-left p-2 text-corporate-textSecondary">Cohort</th>
              <th className="text-right p-2 text-corporate-textSecondary">Precision</th>
              <th className="text-right p-2 text-corporate-textSecondary">Recall</th>
              <th className="text-right p-2 text-corporate-textSecondary">F1</th>
              <th className="text-right p-2 text-corporate-textSecondary">Transactions</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr
                key={cohort.id}
                className="border-b border-corporate-borderPrimary/30 hover:bg-corporate-bgPrimary/30"
              >
                <td className="p-2 text-corporate-textPrimary">{cohort.name}</td>
                <td className="p-2 text-right text-corporate-success">
                  {formatPercentage(cohort.metrics.precision)}
                </td>
                <td className="p-2 text-right text-corporate-info">
                  {formatPercentage(cohort.metrics.recall)}
                </td>
                <td className="p-2 text-right text-corporate-accentPrimary">
                  {formatPercentage(cohort.metrics.f1Score)}
                </td>
                <td className="p-2 text-right text-corporate-textSecondary">
                  {cohort.transactionCount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CohortComparison;

