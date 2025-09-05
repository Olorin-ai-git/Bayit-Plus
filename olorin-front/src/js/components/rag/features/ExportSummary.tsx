import React from 'react';
import { RAGExportOptions } from '../../../types/RAGTypes';

interface ExportSummaryProps {
  exportOptions: RAGExportOptions;
  selectedCustomFields: Set<string>;
}

const ExportSummary: React.FC<ExportSummaryProps> = ({
  exportOptions,
  selectedCustomFields,
}) => {
  const formatOptions = [
    { value: 'pdf', label: 'PDF Report' },
    { value: 'csv', label: 'CSV Data' },
    { value: 'json', label: 'JSON Export' },
    { value: 'excel', label: 'Excel Workbook' },
  ] as const;

  const getSelectedDataTypesCount = () => {
    return [
      exportOptions.includeInsights && 'Insights',
      exportOptions.includeMetrics && 'Metrics',
      exportOptions.includeJourney && 'Journey'
    ].filter(Boolean).length;
  };

  return (
    <div className="bg-blue-50 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-blue-900 mb-2">Export Summary</h4>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-blue-700">Format:</span>
          <span className="ml-2 font-medium text-blue-900">
            {formatOptions.find(f => f.value === exportOptions.format)?.label}
          </span>
        </div>
        <div>
          <span className="text-blue-700">Date Range:</span>
          <span className="ml-2 font-medium text-blue-900">
            {new Date(exportOptions.dateRange.start).toLocaleDateString()} - {new Date(exportOptions.dateRange.end).toLocaleDateString()}
          </span>
        </div>
        <div>
          <span className="text-blue-700">Data Types:</span>
          <span className="ml-2 font-medium text-blue-900">
            {getSelectedDataTypesCount()} selected
          </span>
        </div>
        <div>
          <span className="text-blue-700">Custom Fields:</span>
          <span className="ml-2 font-medium text-blue-900">{selectedCustomFields.size}</span>
        </div>
      </div>
    </div>
  );
};

export default ExportSummary;