import React, { useState } from 'react';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CodeBracketIcon,
  PrinterIcon,
  ShareIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Investigation } from '../types/investigation';

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json' | 'excel';
  sections: {
    summary: boolean;
    riskAnalysis: boolean;
    findings: boolean;
    recommendations: boolean;
    evidence: boolean;
    agentResults: boolean;
    timeline: boolean;
    charts: boolean;
  };
  dateRange?: {
    start: string;
    end: string;
  };
  includeMetadata: boolean;
  includeRawData: boolean;
}

interface ExportReportingProps {
  investigation: Investigation;
  onExport: (options: ExportOptions) => Promise<void>;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'pdf' | 'csv' | 'json' | 'excel';
  defaultSections: Partial<ExportOptions['sections']>;
  isCustom: boolean;
}

const defaultTemplates: ReportTemplate[] = [
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'High-level overview for executives and stakeholders',
    format: 'pdf',
    defaultSections: {
      summary: true,
      riskAnalysis: true,
      findings: true,
      recommendations: true,
      charts: true
    },
    isCustom: false
  },
  {
    id: 'technical-report',
    name: 'Technical Report',
    description: 'Detailed technical analysis for investigators',
    format: 'pdf',
    defaultSections: {
      summary: true,
      riskAnalysis: true,
      findings: true,
      recommendations: true,
      evidence: true,
      agentResults: true,
      timeline: true,
      charts: true
    },
    isCustom: false
  },
  {
    id: 'data-export',
    name: 'Data Export',
    description: 'Raw data export for further analysis',
    format: 'json',
    defaultSections: {
      summary: true,
      findings: true,
      evidence: true,
      agentResults: true,
      timeline: true
    },
    isCustom: false
  },
  {
    id: 'evidence-package',
    name: 'Evidence Package',
    description: 'Evidence and findings for legal review',
    format: 'pdf',
    defaultSections: {
      summary: true,
      findings: true,
      evidence: true,
      timeline: true
    },
    isCustom: false
  }
];

export const ExportReporting: React.FC<ExportReportingProps> = ({
  investigation,
  onExport
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customOptions, setCustomOptions] = useState<ExportOptions>({
    format: 'pdf',
    sections: {
      summary: true,
      riskAnalysis: true,
      findings: true,
      recommendations: true,
      evidence: false,
      agentResults: false,
      timeline: false,
      charts: true
    },
    includeMetadata: true,
    includeRawData: false
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<Array<{
    id: string;
    timestamp: string;
    format: string;
    template: string;
    status: 'completed' | 'failed';
  }>>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      format: 'PDF',
      template: 'Executive Summary',
      status: 'completed'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      format: 'JSON',
      template: 'Data Export',
      status: 'completed'
    }
  ]);

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf': return <DocumentTextIcon className="h-5 w-5 text-red-500" />;
      case 'csv': return <TableCellsIcon className="h-5 w-5 text-green-500" />;
      case 'json': return <CodeBracketIcon className="h-5 w-5 text-blue-500" />;
      case 'excel': return <TableCellsIcon className="h-5 w-5 text-green-600" />;
      default: return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setCustomOptions(prev => ({
      ...prev,
      format: template.format,
      sections: {
        ...prev.sections,
        ...template.defaultSections
      }
    }));
  };

  const handleSectionToggle = (section: keyof ExportOptions['sections']) => {
    setCustomOptions(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: !prev.sections[section]
      }
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(customOptions);

      // Add to export history
      const newExport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        format: customOptions.format.toUpperCase(),
        template: selectedTemplate?.name || 'Custom',
        status: 'completed' as const
      };
      setExportHistory(prev => [newExport, ...prev]);

    } catch (error) {
      console.error('Export failed:', error);
      // Add failed export to history
      const failedExport = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        format: customOptions.format.toUpperCase(),
        template: selectedTemplate?.name || 'Custom',
        status: 'failed' as const
      };
      setExportHistory(prev => [failedExport, ...prev]);
    } finally {
      setIsExporting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!investigation.results) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <ArrowDownTrayIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Export Not Available</h3>
        <p className="text-gray-600">
          {investigation.status === 'completed'
            ? 'No results available to export.'
            : 'Export options will be available when the investigation is complete.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Export & Reporting</h2>
          <p className="text-gray-600">Generate reports and export investigation data</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <ClockIcon className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Report Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {defaultTemplates.map(template => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getFormatIcon(template.format)}
                      <span className="font-medium text-gray-900">{template.name}</span>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {template.format.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Options */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Export Options</h3>

            {/* Format Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Export Format</label>
              <div className="grid grid-cols-4 gap-2">
                {['pdf', 'csv', 'json', 'excel'].map(format => (
                  <button
                    key={format}
                    onClick={() => setCustomOptions(prev => ({ ...prev, format: format as any }))}
                    className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium border ${
                      customOptions.format === format
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {getFormatIcon(format)}
                    <span>{format.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-3 block">Include Sections</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(customOptions.sections).map(([section, enabled]) => (
                  <label key={section} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => handleSectionToggle(section as keyof ExportOptions['sections'])}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {section.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Options */}
            <div className="space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customOptions.includeMetadata}
                  onChange={(e) => setCustomOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include metadata and system information</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customOptions.includeRawData}
                  onChange={(e) => setCustomOptions(prev => ({ ...prev, includeRawData: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include raw data and technical details</span>
              </label>
            </div>
          </div>
        </div>

        {/* Export History & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleTemplateSelect(defaultTemplates[0])}
                className="w-full flex items-center space-x-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <PrinterIcon className="h-5 w-5 text-gray-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Print Report</div>
                  <div className="text-sm text-gray-600">Generate printable summary</div>
                </div>
              </button>

              <button
                onClick={() => handleTemplateSelect(defaultTemplates[2])}
                className="w-full flex items-center space-x-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ShareIcon className="h-5 w-5 text-gray-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Share Data</div>
                  <div className="text-sm text-gray-600">Export for sharing</div>
                </div>
              </button>

              <button
                onClick={() => handleTemplateSelect(defaultTemplates[3])}
                className="w-full flex items-center space-x-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">Legal Package</div>
                  <div className="text-sm text-gray-600">Evidence compilation</div>
                </div>
              </button>
            </div>
          </div>

          {/* Export History */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Exports</h3>
            <div className="space-y-3">
              {exportHistory.length > 0 ? (
                exportHistory.slice(0, 5).map(exportItem => (
                  <div key={exportItem.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      {getFormatIcon(exportItem.format)}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{exportItem.template}</div>
                        <div className="text-xs text-gray-500">{formatTimestamp(exportItem.timestamp)}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {exportItem.status === 'completed' ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <ClockIcon className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs text-gray-600">{exportItem.format}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No exports yet</p>
              )}
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Export Preview</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Format:</dt>
                <dd className="text-sm font-medium text-gray-900">{customOptions.format.toUpperCase()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Sections:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {Object.values(customOptions.sections).filter(Boolean).length} selected
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Template:</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {selectedTemplate?.name || 'Custom'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600">Size:</dt>
                <dd className="text-sm font-medium text-gray-900">~2.3 MB</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};