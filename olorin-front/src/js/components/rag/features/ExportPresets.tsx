import React from 'react';
import { RAGExportOptions } from '../../../types/RAGTypes';

interface ExportPresetsProps {
  onApplyPreset: (options: Partial<RAGExportOptions>, customFields: Set<string>) => void;
}

const ExportPresets: React.FC<ExportPresetsProps> = ({ onApplyPreset }) => {
  const presets = [
    {
      name: '📜 Complete Report',
      options: {
        format: 'pdf' as const,
        includeInsights: true,
        includeMetrics: true,
        includeJourney: true
      },
      customFields: new Set<string>()
    },
    {
      name: '📈 Metrics Only',
      options: {
        format: 'csv' as const,
        includeInsights: false,
        includeMetrics: true,
        includeJourney: false
      },
      customFields: new Set(['processing_times', 'confidence_scores'])
    },
    {
      name: '💾 API Integration',
      options: {
        format: 'json' as const,
        includeInsights: true,
        includeMetrics: false,
        includeJourney: true
      },
      customFields: new Set(['knowledge_sources_used', 'tool_alternatives'])
    }
  ];

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Presets</h4>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => onApplyPreset(preset.options, preset.customFields)}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExportPresets;