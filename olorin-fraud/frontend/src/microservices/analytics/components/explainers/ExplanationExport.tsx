/**
 * Explanation Export Component - Export explanations to various formats.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import React from 'react';
import { analyticsService } from '../../services/analyticsService';

interface ExplanationExportProps {
  decisionId?: string;
  cohortId?: string;
  startDate?: string;
  endDate?: string;
  format?: 'json' | 'csv' | 'pdf';
}

const ExplanationExport: React.FC<ExplanationExportProps> = ({
  decisionId,
  cohortId,
  startDate,
  endDate,
  format = 'json',
}) => {
  const handleExport = async () => {
    try {
      let data: any = {};

      if (decisionId) {
        data = await analyticsService.explainDecision(decisionId);
      } else if (cohortId && startDate && endDate) {
        data = await analyticsService.getCohortTopDrivers(cohortId, startDate, endDate);
      }

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `explanation-${decisionId || cohortId}-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        let csv = '';
        if (data.topFeatures) {
          csv = 'Feature,Value,Attribution\n';
          data.topFeatures.forEach((f: any) => {
            csv += `${f.name},${f.value},${f.attribution}\n`;
          });
        } else if (data.topDrivers) {
          csv = 'Feature,Impact\n';
          data.topDrivers.forEach((d: any) => {
            csv += `${d.feature},${d.impact}\n`;
          });
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `explanation-${decisionId || cohortId}-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={format}
        onChange={(e) => {
          // Format selection handled by parent if needed
        }}
        className="px-3 py-1 rounded-lg bg-corporate-bgSecondary border border-corporate-border text-corporate-textPrimary text-sm"
      >
        <option value="json">JSON</option>
        <option value="csv">CSV</option>
      </select>
      <button
        onClick={handleExport}
        className="px-4 py-2 rounded-lg bg-corporate-accentPrimary text-white hover:bg-corporate-accentPrimary/90 text-sm"
      >
        Export
      </button>
    </div>
  );
};

export default ExplanationExport;

