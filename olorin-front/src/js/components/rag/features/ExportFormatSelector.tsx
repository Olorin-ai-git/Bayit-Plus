import React from 'react';
import { RAGExportOptions } from '../../../types/RAGTypes';

interface ExportFormatSelectorProps {
  selectedFormat: RAGExportOptions['format'];
  onFormatChange: (format: RAGExportOptions['format']) => void;
}

const ExportFormatSelector: React.FC<ExportFormatSelectorProps> = ({
  selectedFormat,
  onFormatChange,
}) => {
  const formatOptions = [
    { value: 'pdf', label: 'PDF Report', icon: '📜', description: 'Formatted report with charts and analysis' },
    { value: 'csv', label: 'CSV Data', icon: '📈', description: 'Raw data for spreadsheet analysis' },
    { value: 'json', label: 'JSON Export', icon: '💾', description: 'Structured data for API integration' },
    { value: 'excel', label: 'Excel Workbook', icon: '📂', description: 'Multi-sheet workbook with charts' },
  ] as const;

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Export Format</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {formatOptions.map((format) => (
          <div 
            key={format.value}
            className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
              selectedFormat === format.value 
                ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onFormatChange(format.value)}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">{format.icon}</div>
              <div className="text-sm font-medium text-gray-900">{format.label}</div>
              <div className="text-xs text-gray-500 mt-1">{format.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExportFormatSelector;