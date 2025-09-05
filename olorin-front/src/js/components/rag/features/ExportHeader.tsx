import React from 'react';

interface ExportHeaderProps {
  investigationId: string;
  availableDataCount: number;
  estimatedFileSize: string;
}

const ExportHeader: React.FC<ExportHeaderProps> = ({
  investigationId,
  availableDataCount,
  estimatedFileSize,
}) => {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export RAG Data</h3>
          <p className="text-sm text-gray-500">
            Investigation: {investigationId} • {availableDataCount} data types available
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Est. size:</span>
          <span className="text-sm font-medium text-gray-700">{estimatedFileSize}</span>
        </div>
      </div>
    </div>
  );
};

export default ExportHeader;