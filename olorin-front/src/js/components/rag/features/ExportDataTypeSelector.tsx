import React from 'react';
import { RAGExportOptions } from '../../../types/RAGTypes';

interface ExportDataTypeSelectorProps {
  exportOptions: RAGExportOptions;
  onDataTypeChange: (key: keyof RAGExportOptions) => void;
}

const ExportDataTypeSelector: React.FC<ExportDataTypeSelectorProps> = ({
  exportOptions,
  onDataTypeChange,
}) => {
  const dataTypeOptions = [
    { key: 'includeInsights', label: 'RAG Insights', icon: '💡', description: 'Tool recommendations and reasoning' },
    { key: 'includeMetrics', label: 'Performance Metrics', icon: '📈', description: 'Success rates, response times, and KPIs' },
    { key: 'includeJourney', label: 'Investigation Journey', icon: '🗺️', description: 'Step-by-step progression and timeline' },
  ] as const;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Include Data Types</h4>
      <div className="space-y-3">
        {dataTypeOptions.map((option) => (
          <div key={option.key} className="flex items-start space-x-3">
            <input
              type="checkbox"
              id={option.key}
              checked={exportOptions[option.key] as boolean}
              onChange={() => onDataTypeChange(option.key)}
              className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <label htmlFor={option.key} className="flex items-center cursor-pointer">
                <span className="text-lg mr-2">{option.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExportDataTypeSelector;