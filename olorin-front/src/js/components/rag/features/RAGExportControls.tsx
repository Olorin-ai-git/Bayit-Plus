import React, { useState } from 'react';
import { RAGExportControlsProps, RAGExportOptions } from '../../../types/RAGTypes';

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

  const formatOptions = [
    { value: 'pdf', label: 'PDF Report', icon: '📜', description: 'Formatted report with charts and analysis' },
    { value: 'csv', label: 'CSV Data', icon: '📈', description: 'Raw data for spreadsheet analysis' },
    { value: 'json', label: 'JSON Export', icon: '💾', description: 'Structured data for API integration' },
    { value: 'excel', label: 'Excel Workbook', icon: '📂', description: 'Multi-sheet workbook with charts' },
  ];

  const dataTypeOptions = [
    { key: 'includeInsights', label: 'RAG Insights', icon: '💡', description: 'Tool recommendations and reasoning' },
    { key: 'includeMetrics', label: 'Performance Metrics', icon: '📈', description: 'Success rates, response times, and KPIs' },
    { key: 'includeJourney', label: 'Investigation Journey', icon: '🗺️', description: 'Step-by-step progression and timeline' },
  ];

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
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Export RAG Data</h3>
            <p className="text-sm text-gray-500">
              Investigation: {investigationId} • {availableData.length} data types available
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Est. size:</span>
            <span className="text-sm font-medium text-gray-700">{getEstimatedFileSize()}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Format Selection */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Export Format</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {formatOptions.map((format) => (
              <div 
                key={format.value}
                className={`border rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                  exportOptions.format === format.value 
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleFormatChange(format.value as RAGExportOptions['format'])}
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

        {/* Data Types */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Include Data Types</h4>
          <div className="space-y-3">
            {dataTypeOptions.map((option) => (
              <div key={option.key} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={option.key}
                  checked={exportOptions[option.key as keyof RAGExportOptions] as boolean}
                  onChange={() => handleDataTypeChange(option.key as keyof RAGExportOptions)}
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

        {/* Date Range */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Date Range</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={exportOptions.dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={exportOptions.dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div>
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="flex items-center space-x-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            <span>Advanced Options</span>
            <span className={`transition-transform duration-200 ${
              isAdvancedOpen ? 'rotate-180' : ''
            }`}>▼</span>
          </button>
          
          {isAdvancedOpen && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-semibold text-gray-900 mb-3">Custom Fields</h5>
              <div className="grid grid-cols-2 gap-2">
                {customFieldOptions.map((field) => (
                  <label key={field} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCustomFields.has(field)}
                      onChange={() => handleCustomFieldToggle(field)}
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

        {/* Export Summary */}
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
                {[exportOptions.includeInsights && 'Insights', exportOptions.includeMetrics && 'Metrics', exportOptions.includeJourney && 'Journey']
                  .filter(Boolean).length || 0} selected
              </span>
            </div>
            <div>
              <span className="text-blue-700">Custom Fields:</span>
              <span className="ml-2 font-medium text-blue-900">{selectedCustomFields.size}</span>
            </div>
          </div>
        </div>

        {/* Quick Export Presets */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Presets</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setExportOptions(prev => ({
                  ...prev,
                  format: 'pdf',
                  includeInsights: true,
                  includeMetrics: true,
                  includeJourney: true
                }));
                setSelectedCustomFields(new Set());
              }}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              📜 Complete Report
            </button>
            <button
              onClick={() => {
                setExportOptions(prev => ({
                  ...prev,
                  format: 'csv',
                  includeInsights: false,
                  includeMetrics: true,
                  includeJourney: false
                }));
                setSelectedCustomFields(new Set(['processing_times', 'confidence_scores']));
              }}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              📈 Metrics Only
            </button>
            <button
              onClick={() => {
                setExportOptions(prev => ({
                  ...prev,
                  format: 'json',
                  includeInsights: true,
                  includeMetrics: false,
                  includeJourney: true
                }));
                setSelectedCustomFields(new Set(['knowledge_sources_used', 'tool_alternatives']));
              }}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              💾 API Integration
            </button>
          </div>
        </div>

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