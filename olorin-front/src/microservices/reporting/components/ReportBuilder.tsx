import React, { useState, useCallback, useEffect } from 'react';
import {
  ReportConfig,
  ReportTemplate,
  ReportBuilderStep,
  ReportPreview,
  ReportParameter,
  ReportFilter,
  ReportFormat,
  ReportSchedule,
  ReportSection,
  ReportDataSource
} from '../types/reporting';

interface ReportBuilderProps {
  initialConfig?: Partial<ReportConfig>;
  templates?: ReportTemplate[];
  dataSources?: ReportDataSource[];
  onConfigChange?: (config: ReportConfig) => void;
  onPreview?: (config: ReportConfig) => Promise<ReportPreview>;
  onSave?: (config: ReportConfig) => Promise<void>;
  onGenerate?: (config: ReportConfig) => Promise<void>;
  className?: string;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  initialConfig,
  templates = [],
  dataSources = [],
  onConfigChange,
  onPreview,
  onSave,
  onGenerate,
  className
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<Partial<ReportConfig>>(initialConfig || {});
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: ReportBuilderStep[] = [
    {
      id: 'template',
      title: 'Select Template',
      description: 'Choose a template for your report',
      component: 'template',
      completed: !!config.templateId,
      validation: {
        required: ['templateId']
      }
    },
    {
      id: 'parameters',
      title: 'Configure Parameters',
      description: 'Set parameter values for your report',
      component: 'parameters',
      completed: !!config.parameters && Object.keys(config.parameters).length > 0,
      validation: {
        required: ['parameters']
      }
    },
    {
      id: 'filters',
      title: 'Apply Filters',
      description: 'Filter the data for your report',
      component: 'filters',
      completed: true, // Filters are optional
      validation: {
        required: []
      }
    },
    {
      id: 'format',
      title: 'Output Format',
      description: 'Choose output format and options',
      component: 'sections',
      completed: !!config.format && config.format.length > 0,
      validation: {
        required: ['format']
      }
    },
    {
      id: 'schedule',
      title: 'Schedule (Optional)',
      description: 'Set up automatic report generation',
      component: 'schedule',
      completed: true, // Scheduling is optional
      validation: {
        required: []
      }
    },
    {
      id: 'preview',
      title: 'Preview & Generate',
      description: 'Preview your report and generate it',
      component: 'preview',
      completed: false,
      validation: {
        required: ['name', 'templateId', 'format']
      }
    }
  ];

  const handleConfigUpdate = useCallback((updates: Partial<ReportConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig as ReportConfig);
  }, [config, onConfigChange]);

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    handleConfigUpdate({
      templateId: template.id,
      parameters: {},
      filters: []
    });
  };

  const handleParameterChange = (parameterId: string, value: any) => {
    const newParameters = {
      ...config.parameters,
      [parameterId]: value
    };
    handleConfigUpdate({ parameters: newParameters });
  };

  const handleFilterChange = (filters: ReportFilter[]) => {
    handleConfigUpdate({ filters });
  };

  const handlePreview = async () => {
    if (!onPreview || !isConfigValid()) return;

    setLoading(true);
    setError(null);

    try {
      const previewResult = await onPreview(config as ReportConfig);
      setPreview(previewResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!onSave || !isConfigValid()) return;

    setLoading(true);
    setError(null);

    try {
      await onSave(config as ReportConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!onGenerate || !isConfigValid()) return;

    setLoading(true);
    setError(null);

    try {
      await onGenerate(config as ReportConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const isConfigValid = () => {
    const currentStepData = steps[currentStep];
    if (!currentStepData.validation) return true;

    return currentStepData.validation.required.every(field => {
      const value = (config as any)[field];
      return value !== undefined && value !== null && value !== '';
    });
  };

  const canProceedToNext = () => {
    return isConfigValid() && currentStep < steps.length - 1;
  };

  const canGoBack = () => {
    return currentStep > 0;
  };

  const nextStep = () => {
    if (canProceedToNext()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (canGoBack()) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.component) {
      case 'template':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Choose a Report Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {template.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {template.sections.length} sections
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'parameters':
        if (!selectedTemplate) return null;
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configure Parameters</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Report Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={config.name || ''}
                    onChange={(e) => handleConfigUpdate({ name: e.target.value })}
                    placeholder="Enter report name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    value={config.description || ''}
                    onChange={(e) => handleConfigUpdate({ description: e.target.value })}
                    placeholder="Enter report description (optional)"
                  />
                </div>
                {selectedTemplate.parameters.map((param) => (
                  <div key={param.id}>
                    <label className="block text-sm font-medium text-gray-700">
                      {param.label}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {param.type === 'select' || param.type === 'multiselect' ? (
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={config.parameters?.[param.id] || param.defaultValue || ''}
                        onChange={(e) => handleParameterChange(param.id, e.target.value)}
                        multiple={param.type === 'multiselect'}
                      >
                        <option value="">Select {param.label.toLowerCase()}</option>
                        {param.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : param.type === 'boolean' ? (
                      <div className="mt-1">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            checked={config.parameters?.[param.id] || param.defaultValue || false}
                            onChange={(e) => handleParameterChange(param.id, e.target.checked)}
                          />
                          <span className="ml-2 text-sm text-gray-600">Enable {param.label.toLowerCase()}</span>
                        </label>
                      </div>
                    ) : (
                      <input
                        type={param.type === 'number' ? 'number' : param.type === 'date' ? 'date' : 'text'}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={config.parameters?.[param.id] || param.defaultValue || ''}
                        onChange={(e) => handleParameterChange(param.id, e.target.value)}
                        placeholder={`Enter ${param.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'filters':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Apply Filters (Optional)</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Filters will be applied to limit the data included in your report.
                  You can skip this step if you want to include all available data.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Filter
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'sections':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Output Format</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Output Formats
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(['pdf', 'html', 'docx', 'csv', 'xlsx'] as ReportFormat[]).map((format) => (
                      <label key={format} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          checked={config.format?.includes(format) || false}
                          onChange={(e) => {
                            const currentFormats = config.format || [];
                            const newFormats = e.target.checked
                              ? [...currentFormats, format]
                              : currentFormats.filter(f => f !== format);
                            handleConfigUpdate({ format: newFormats });
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-700 uppercase">{format}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Report (Optional)</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    checked={!!config.schedule}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleConfigUpdate({
                          schedule: {
                            type: 'once' as ReportSchedule,
                            startDate: new Date().toISOString().split('T')[0],
                            timezone: 'UTC',
                            recipients: []
                          }
                        });
                      } else {
                        handleConfigUpdate({ schedule: undefined });
                      }
                    }}
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable scheduled generation</span>
                </div>

                {config.schedule && (
                  <div className="ml-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Frequency</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={config.schedule.type}
                        onChange={(e) => handleConfigUpdate({
                          schedule: {
                            ...config.schedule!,
                            type: e.target.value as ReportSchedule
                          }
                        })}
                      >
                        <option value="once">Once</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={config.schedule.startDate}
                        onChange={(e) => handleConfigUpdate({
                          schedule: {
                            ...config.schedule!,
                            startDate: e.target.value
                          }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Preview & Generate</h3>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Report Configuration Summary</h4>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name:</dt>
                    <dd className="text-sm text-gray-900">{config.name || 'Untitled Report'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Template:</dt>
                    <dd className="text-sm text-gray-900">{selectedTemplate?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Formats:</dt>
                    <dd className="text-sm text-gray-900">
                      {config.format?.map(f => f.toUpperCase()).join(', ') || 'None selected'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Scheduled:</dt>
                    <dd className="text-sm text-gray-900">
                      {config.schedule ? `Yes (${config.schedule.type})` : 'No'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={loading || !isConfigValid()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Preview Report'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || !isConfigValid()}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Save Report
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || !isConfigValid()}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  Generate Report
                </button>
              </div>

              {preview && (
                <div className="mt-6 border rounded-lg bg-white">
                  <div className="px-4 py-3 border-b">
                    <h4 className="font-medium text-gray-900">Report Preview</h4>
                    <p className="text-sm text-gray-600">
                      {preview.metadata.pageCount} pages • {preview.metadata.dataPoints} data points
                    </p>
                  </div>
                  <div
                    className="p-4 max-h-96 overflow-auto"
                    dangerouslySetInnerHTML={{ __html: preview.html }}
                  />
                </div>
              )}
            </div>
          </div>
        );

      default:
        return <div>Step content not implemented</div>;
    }
  };

  return (
    <div className={`max-w-4xl mx-auto ${className || ''}`}>
      {/* Step Navigation */}
      <nav className="mb-8">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
              <div className="flex items-center">
                <div
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    index < currentStep
                      ? 'bg-blue-600 border-blue-600'
                      : index === currentStep
                      ? 'border-blue-600 bg-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {index < currentStep ? (
                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className={`text-sm font-medium ${index === currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                      {index + 1}
                    </span>
                  )}
                </div>
                <span className={`ml-4 text-sm font-medium ${index === currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
              {index !== steps.length - 1 && (
                <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={previousStep}
          disabled={!canGoBack()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canProceedToNext()}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Next
            <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ReportBuilder;