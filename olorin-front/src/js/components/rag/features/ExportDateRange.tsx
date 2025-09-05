import React from 'react';
import { RAGExportOptions } from '../../../types/RAGTypes';

interface ExportDateRangeProps {
  dateRange: RAGExportOptions['dateRange'];
  onDateRangeChange: (field: 'start' | 'end', value: string) => void;
}

const ExportDateRange: React.FC<ExportDateRangeProps> = ({
  dateRange,
  onDateRangeChange,
}) => {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Date Range</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => onDateRangeChange('start', e.target.value)}
            className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => onDateRangeChange('end', e.target.value)}
            className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ExportDateRange;