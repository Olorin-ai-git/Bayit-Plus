import React from 'react';

interface ExportAdvancedOptionsProps {
  isOpen: boolean;
  selectedCustomFields: Set<string>;
  onToggleOpen: () => void;
  onCustomFieldToggle: (field: string) => void;
}

const ExportAdvancedOptions: React.FC<ExportAdvancedOptionsProps> = ({
  isOpen,
  selectedCustomFields,
  onToggleOpen,
  onCustomFieldToggle,
}) => {
  const customFieldOptions = [
    'knowledge_sources_used',
    'confidence_scores',
    'processing_times',
    'error_details',
    'user_interactions',
    'context_factors',
    'tool_alternatives',
    'quality_ratings',
    'usage_patterns',
    'optimization_suggestions',
  ];

  return (
    <div>
      <button
        onClick={onToggleOpen}
        className="flex items-center space-x-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        <span>Advanced Options</span>
        <span className={`transition-transform duration-200 ${
          isOpen ? 'rotate-180' : ''
        }`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-semibold text-gray-900 mb-3">Custom Fields</h5>
          <div className="grid grid-cols-2 gap-2">
            {customFieldOptions.map((field) => (
              <label key={field} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCustomFields.has(field)}
                  onChange={() => onCustomFieldToggle(field)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-700 capitalize">
                  {field.replace(/_/g, ' ')}
                </span>
              </label>
            ))}
          </div>
          
          <div className="mt-4">
            <h6 className="text-xs font-semibold text-gray-800 mb-2">Export Options</h6>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span>Include timestamps</span>
                <input type="checkbox" defaultChecked className="rounded border-gray-300" />
              </div>
              <div className="flex items-center justify-between">
                <span>Include raw data</span>
                <input type="checkbox" className="rounded border-gray-300" />
              </div>
              <div className="flex items-center justify-between">
                <span>Compress large files</span>
                <input type="checkbox" defaultChecked className="rounded border-gray-300" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportAdvancedOptions;