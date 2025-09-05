import React, { useState } from 'react';
import { RAGExportControlsProps, RAGExportOptions } from '../../../types/RAGTypes';
import ExportHeader from './ExportHeader';
import ExportFormatSelector from './ExportFormatSelector';
import ExportDataTypeSelector from './ExportDataTypeSelector';
import ExportDateRange from './ExportDateRange';
import ExportAdvancedOptions from './ExportAdvancedOptions';
import ExportSummary from './ExportSummary';
import ExportPresets from './ExportPresets';

/**
 * RAG Export Controls Component
 * Provides comprehensive data export functionality with custom filtering
 */
const RAGExportControls: React.FC<RAGExportControlsProps> = ({
  investigationId,
  availableData,
  onExport,
  isExporting = false,
}) => {
  const [exportOptions, setExportOptions] = useState<RAGExportOptions>({
    format: 'pdf',
    includeInsights: true,
    includeMetrics: true,
    includeJourney: true,
    dateRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
      end: new Date().toISOString().split('T')[0], // Today
    },
    customFields: [],
  });
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedCustomFields, setSelectedCustomFields] = useState<Set<string>>(new Set());

  const handleFormatChange = (format: RAGExportOptions['format']) => {
    setExportOptions(prev => ({ ...prev, format }));
  };

  const handleDataTypeChange = (key: keyof RAGExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setExportOptions(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  const handleCustomFieldToggle = (field: string) => {
    const newSelected = new Set(selectedCustomFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedCustomFields(newSelected);
    setExportOptions(prev => ({
      ...prev,
      customFields: Array.from(newSelected)
    }));
  };

  const handlePresetApply = (presetOptions: Partial<RAGExportOptions>, customFields: Set<string>) => {
    setExportOptions(prev => ({ ...prev, ...presetOptions }));
    setSelectedCustomFields(customFields);
  };

  const handleExport = async () => {
    try {
      await onExport(exportOptions);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getEstimatedFileSize = () => {
    let baseSize = 100; // KB base
    
    if (exportOptions.includeInsights) baseSize += 200;
    if (exportOptions.includeMetrics) baseSize += 150;
    if (exportOptions.includeJourney) baseSize += 300;
    baseSize += selectedCustomFields.size * 50;
    
    // Adjust for format
    switch (exportOptions.format) {
      case 'pdf': baseSize *= 1.5; break;
      case 'excel': baseSize *= 1.3; break;
      case 'json': baseSize *= 0.8; break;
      case 'csv': baseSize *= 0.6; break;
    }
    
    if (baseSize < 1000) return `${Math.round(baseSize)} KB`;
    return `${(baseSize / 1000).toFixed(1)} MB`;
  };

  const isExportDisabled = () => {
    return !exportOptions.includeInsights && 
           !exportOptions.includeMetrics && 
           !exportOptions.includeJourney && 
           selectedCustomFields.size === 0;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <ExportHeader
        investigationId={investigationId}
        availableDataCount={availableData.length}
        estimatedFileSize={getEstimatedFileSize()}
      />

      <div className="p-6 space-y-6">
        <ExportFormatSelector
          selectedFormat={exportOptions.format}
          onFormatChange={handleFormatChange}
        />

        <ExportDataTypeSelector
          exportOptions={exportOptions}
          onDataTypeChange={handleDataTypeChange}
        />

        <ExportDateRange
          dateRange={exportOptions.dateRange}
          onDateRangeChange={handleDateRangeChange}
        />

        <ExportAdvancedOptions
          isOpen={isAdvancedOpen}
          selectedCustomFields={selectedCustomFields}
          onToggleOpen={() => setIsAdvancedOpen(!isAdvancedOpen)}
          onCustomFieldToggle={handleCustomFieldToggle}
        />

        <ExportSummary
          exportOptions={exportOptions}
          selectedCustomFields={selectedCustomFields}
        />

        <ExportPresets onApplyPreset={handlePresetApply} />

        {/* Export Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {isExportDisabled() ? 'Select at least one data type to export' : 'Ready to export'}
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting || isExportDisabled()}
            className={`px-6 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
              isExporting || isExportDisabled()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
            }`}
          >
            {isExporting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>📤</span>
                <span>Export Data</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RAGExportControls;