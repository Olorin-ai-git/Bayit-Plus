import React, { useState, useEffect } from 'react';
import { Report, ReportTemplate, GenerateReportRequest, ReportConfiguration } from '../types';
import { useServices } from '../services';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import ErrorAlert from '../../../shared/components/ErrorAlert';

interface ReportGeneratorProps {
  investigationId: string;
  onReportGenerated?: (report: Report) => void;
  className?: string;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  investigationId,
  onReportGenerated,
  className = ''
}) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [configuration, setConfiguration] = useState<Partial<ReportConfiguration>>({
    format: 'pdf',
    styling: {
      theme: 'default',
      font_family: 'Arial',
      font_size: 12,
      include_logo: true,
      include_watermark: false,
      page_margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    },
    privacy: {
      redact_pii: false,
      classification_level: 'internal',
      access_controls: []
    }
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/report-templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load report templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);

      // Set default template if available
      if (data.templates.length > 0) {
        setSelectedTemplate(data.templates[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setConfiguration(prev => ({
        ...prev,
        template_id: templateId,
        include_sections: template.sections.filter(s => s.required).map(s => s.id),
        exclude_sections: [],
        format: template.supported_formats[0] || 'pdf'
      }));
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate || !reportTitle.trim()) {
      setError('Please select a template and provide a report title');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      // First create the report
      const createResponse = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          title: reportTitle,
          description: reportDescription,
          investigation_id: investigationId,
          template_id: selectedTemplate,
          configuration
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create report');
      }

      const report = await createResponse.json();

      // Then generate the report
      const generateRequest: GenerateReportRequest = {
        format: configuration.format || 'pdf',
        configuration,
        priority: 'normal',
        notify_on_completion: true
      };

      const generateResponse = await fetch(`/api/reports/${report.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(generateRequest)
      });

      if (!generateResponse.ok) {
        throw new Error('Failed to generate report');
      }

      onReportGenerated?.(report);

      // Reset form
      setReportTitle('');
      setReportDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = () => {
    setPreviewMode(true);
    // In a real implementation, this would open a preview modal or navigate to preview page
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Generate Report</h3>
        <p className="mt-1 text-sm text-gray-500">
          Create a comprehensive investigation report
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-6 py-4 border-b border-gray-200">
          <ErrorAlert message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {/* Form */}
      <div className="px-6 py-4 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Title *
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Enter report title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Brief description of the report..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       focus:border-transparent"
            />
          </div>
        </div>

        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Template *
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-transparent"
          >
            <option value="">Select a template...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.category}
              </option>
            ))}
          </select>

          {selectedTemplateData && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">{selectedTemplateData.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedTemplateData.supported_formats.map((format) => (
                  <span
                    key={format}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                  >
                    {format.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Configuration</h4>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Output Format
            </label>
            <div className="flex space-x-4">
              {['pdf', 'html', 'json', 'docx'].map((format) => (
                <label key={format} className="flex items-center">
                  <input
                    type="radio"
                    value={format}
                    checked={configuration.format === format}
                    onChange={(e) => setConfiguration(prev => ({
                      ...prev,
                      format: e.target.value as any
                    }))}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{format.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Styling Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={configuration.styling?.theme || 'default'}
                onChange={(e) => setConfiguration(prev => ({
                  ...prev,
                  styling: {
                    ...prev.styling!,
                    theme: e.target.value as any
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">Default</option>
                <option value="minimal">Minimal</option>
                <option value="corporate">Corporate</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <input
                type="number"
                min="8"
                max="18"
                value={configuration.styling?.font_size || 12}
                onChange={(e) => setConfiguration(prev => ({
                  ...prev,
                  styling: {
                    ...prev.styling!,
                    font_size: parseInt(e.target.value)
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={configuration.styling?.include_logo || false}
                onChange={(e) => setConfiguration(prev => ({
                  ...prev,
                  styling: {
                    ...prev.styling!,
                    include_logo: e.target.checked
                  }
                }))}
                className="text-blue-600 focus:ring-blue-500 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Include company logo</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={configuration.styling?.include_watermark || false}
                onChange={(e) => setConfiguration(prev => ({
                  ...prev,
                  styling: {
                    ...prev.styling!,
                    include_watermark: e.target.checked
                  }
                }))}
                className="text-blue-600 focus:ring-blue-500 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Include watermark</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={configuration.privacy?.redact_pii || false}
                onChange={(e) => setConfiguration(prev => ({
                  ...prev,
                  privacy: {
                    ...prev.privacy!,
                    redact_pii: e.target.checked
                  }
                }))}
                className="text-blue-600 focus:ring-blue-500 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Redact personal information</span>
            </label>
          </div>

          {/* Classification Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classification Level
            </label>
            <select
              value={configuration.privacy?.classification_level || 'internal'}
              onChange={(e) => setConfiguration(prev => ({
                ...prev,
                privacy: {
                  ...prev.privacy!,
                  classification_level: e.target.value as any
                }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="public">Public</option>
              <option value="internal">Internal</option>
              <option value="confidential">Confidential</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreview}
            disabled={!selectedTemplate || !reportTitle.trim()}
            className="inline-flex items-center px-4 py-2 border border-gray-300
                     text-sm font-medium rounded-md text-gray-700 bg-white
                     hover:bg-gray-50 focus:outline-none focus:ring-2
                     focus:ring-offset-2 focus:ring-blue-500 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            Preview
          </button>

          <button
            onClick={handleGenerateReport}
            disabled={!selectedTemplate || !reportTitle.trim() || generating}
            className="inline-flex items-center px-4 py-2 border border-transparent
                     text-sm font-medium rounded-md text-white bg-blue-600
                     hover:bg-blue-700 focus:outline-none focus:ring-2
                     focus:ring-offset-2 focus:ring-blue-500 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <LoadingSpinner size="sm" className="-ml-1 mr-2" />
                Generating...
              </>
            ) : (
              <>
                <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};