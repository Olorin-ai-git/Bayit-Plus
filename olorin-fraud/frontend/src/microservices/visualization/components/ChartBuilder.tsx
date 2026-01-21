import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ChartType,
  ChartConfig,
  Dataset,
  DataPoint,
  AxisConfig,
  LegendConfig,
  TooltipConfig,
  VisualizationTheme,
  ValidationResult,
  ExportOptions
} from '../types/visualization';

// Chart Builder Props
interface ChartBuilderProps {
  initialConfig?: Partial<ChartConfig>;
  data?: any[];
  availableDataSources?: DataSource[];
  themes?: VisualizationTheme[];
  onConfigChange?: (config: ChartConfig) => void;
  onPreview?: (config: ChartConfig) => void;
  onSave?: (config: ChartConfig) => Promise<void>;
  onExport?: (config: ChartConfig, options: ExportOptions) => Promise<void>;
  className?: string;
}

// Data source interface
interface DataSource {
  id: string;
  name: string;
  description?: string;
  fields: DataField[];
  preview: any[];
}

interface DataField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  label?: string;
  description?: string;
}

// Default chart config
const defaultChartConfig: ChartConfig = {
  type: 'line',
  datasets: [],
  responsive: true,
  maintainAspectRatio: false,
  title: {
    display: true,
    text: 'New Chart',
    position: 'top'
  },
  legend: {
    display: true,
    position: 'top'
  },
  tooltip: {
    enabled: true,
    mode: 'nearest',
    intersect: false
  }
};

// Chart type options
const chartTypeOptions: { value: ChartType; label: string; icon: string; description: string }[] = [
  { value: 'line', label: 'Line Chart', icon: '📈', description: 'Show trends over time' },
  { value: 'bar', label: 'Bar Chart', icon: '📊', description: 'Compare values across categories' },
  { value: 'pie', label: 'Pie Chart', icon: '🥧', description: 'Show proportions of a whole' },
  { value: 'doughnut', label: 'Doughnut Chart', icon: '🍩', description: 'Pie chart with center hole' },
  { value: 'area', label: 'Area Chart', icon: '📈', description: 'Line chart with filled area' },
  { value: 'scatter', label: 'Scatter Plot', icon: '⚫', description: 'Show relationship between variables' },
  { value: 'bubble', label: 'Bubble Chart', icon: '🫧', description: 'Scatter plot with size dimension' },
  { value: 'radar', label: 'Radar Chart', icon: '📡', description: 'Multi-variable comparison' },
  { value: 'polar', label: 'Polar Chart', icon: '🎯', description: 'Circular data visualization' },
  { value: 'histogram', label: 'Histogram', icon: '📊', description: 'Distribution of continuous data' },
  { value: 'heatmap', label: 'Heatmap', icon: '🔥', description: 'Show data density or correlation' },
  { value: 'treemap', label: 'Treemap', icon: '🗂️', description: 'Hierarchical data visualization' },
  { value: 'funnel', label: 'Funnel Chart', icon: '🔽', description: 'Show conversion stages' },
  { value: 'gauge', label: 'Gauge Chart', icon: '🔧', description: 'Show single value with range' },
  { value: 'waterfall', label: 'Waterfall Chart', icon: '💧', description: 'Show cumulative changes' }
];

// Color palettes
const colorPalettes = {
  default: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'],
  professional: ['#1F2937', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6', '#FFFFFF'],
  vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'],
  pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#D4BAFF', '#FFBAF3', '#FFC3A0'],
  monochrome: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#E0E0E0', '#F0F0F0', '#FFFFFF']
};

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  initialConfig,
  data = [],
  availableDataSources = [],
  themes = [],
  onConfigChange,
  onPreview,
  onSave,
  onExport,
  className = ''
}) => {
  // State management
  const [config, setConfig] = useState<ChartConfig>(() => ({
    ...defaultChartConfig,
    ...initialConfig
  }));

  const [currentStep, setCurrentStep] = useState<'type' | 'data' | 'style' | 'preview'>('type');
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<keyof typeof colorPalettes>('default');
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, errors: [], warnings: [] });
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const chartPreviewRef = useRef<HTMLDivElement>(null);

  // Update parent when config changes
  useEffect(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  // Validate configuration
  const validateConfig = useCallback((chartConfig: ChartConfig): ValidationResult => {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    if (!chartConfig.datasets || chartConfig.datasets.length === 0) {
      errors.push({ field: 'datasets', message: 'At least one dataset is required', severity: 'error' });
    }

    chartConfig.datasets.forEach((dataset, index) => {
      if (!dataset.data || dataset.data.length === 0) {
        errors.push({ field: `datasets[${index}].data`, message: 'Dataset must have data points', severity: 'error' });
      }
      if (!dataset.label) {
        warnings.push({ field: `datasets[${index}].label`, message: 'Dataset should have a label' });
      }
    });

    if (!chartConfig.title?.text) {
      warnings.push({ field: 'title.text', message: 'Chart should have a title' });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }, []);

  // Update chart type
  const updateChartType = useCallback((type: ChartType) => {
    setConfig(prev => {
      const newConfig = { ...prev, type };

      // Apply type-specific default configurations
      switch (type) {
        case 'pie':
        case 'doughnut':
          newConfig.legend = { ...prev.legend, position: 'right' };
          break;
        case 'radar':
        case 'polar':
          newConfig.scales = {
            r: {
              type: 'radialLinear',
              display: true,
              min: 0
            }
          };
          break;
        case 'scatter':
        case 'bubble':
          newConfig.xAxis = { type: 'linear', display: true };
          newConfig.yAxis = { type: 'linear', display: true };
          break;
        default:
          break;
      }

      return newConfig;
    });
  }, []);

  // Add dataset
  const addDataset = useCallback((label: string, data: DataPoint[]) => {
    const colors = colorPalettes[selectedPalette];
    const colorIndex = config.datasets.length % colors.length;

    const newDataset: Dataset = {
      id: `dataset-${Date.now()}`,
      label,
      data,
      color: colors[colorIndex],
      backgroundColor: colors[colorIndex],
      borderColor: colors[colorIndex],
      borderWidth: 2,
      fill: config.type === 'area'
    };

    setConfig(prev => ({
      ...prev,
      datasets: [...prev.datasets, newDataset]
    }));
  }, [config.datasets.length, config.type, selectedPalette]);

  // Update dataset
  const updateDataset = useCallback((index: number, updates: Partial<Dataset>) => {
    setConfig(prev => ({
      ...prev,
      datasets: prev.datasets.map((dataset, i) =>
        i === index ? { ...dataset, ...updates } : dataset
      )
    }));
  }, []);

  // Remove dataset
  const removeDataset = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      datasets: prev.datasets.filter((_, i) => i !== index)
    }));
  }, []);

  // Update chart title
  const updateTitle = useCallback((text: string) => {
    setConfig(prev => ({
      ...prev,
      title: {
        ...prev.title,
        text,
        display: Boolean(text)
      }
    }));
  }, []);

  // Update axis configuration
  const updateAxis = useCallback((axis: 'xAxis' | 'yAxis', updates: Partial<AxisConfig>) => {
    setConfig(prev => ({
      ...prev,
      [axis]: {
        ...prev[axis],
        ...updates
      }
    }));
  }, []);

  // Update legend configuration
  const updateLegend = useCallback((updates: Partial<LegendConfig>) => {
    setConfig(prev => ({
      ...prev,
      legend: {
        ...prev.legend,
        ...updates
      }
    }));
  }, []);

  // Preview chart
  const handlePreview = useCallback(async () => {
    if (!onPreview) return;

    setIsPreviewLoading(true);
    try {
      await onPreview(config);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [config, onPreview]);

  // Save chart
  const handleSave = useCallback(async () => {
    if (!onSave) return;

    const validationResult = validateConfig(config);
    setValidation(validationResult);

    if (!validationResult.valid) return;

    setIsSaving(true);
    try {
      await onSave(config);
    } finally {
      setIsSaving(false);
    }
  }, [config, onSave, validateConfig]);

  // Export chart
  const handleExport = useCallback(async (options: ExportOptions) => {
    if (!onExport) return;

    await onExport(config, options);
  }, [config, onExport]);

  // Generate sample data based on chart type
  const generateSampleData = useCallback((type: ChartType): DataPoint[] => {
    const categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    switch (type) {
      case 'pie':
      case 'doughnut':
        return [
          { x: 'Desktop', y: 60 },
          { x: 'Mobile', y: 35 },
          { x: 'Tablet', y: 5 }
        ];
      case 'scatter':
      case 'bubble':
        return Array.from({ length: 20 }, (_, i) => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          ...(type === 'bubble' && { size: Math.random() * 20 + 5 })
        }));
      default:
        return categories.map(cat => ({
          x: cat,
          y: Math.floor(Math.random() * 100) + 10
        }));
    }
  }, []);

  // Render chart type selection
  const renderChartTypeSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Chart Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {chartTypeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => updateChartType(option.value)}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                config.type === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{option.icon}</div>
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-gray-500 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {config.type && (
        <div className="flex justify-end">
          <button
            onClick={() => setCurrentStep('data')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Next: Configure Data
          </button>
        </div>
      )}
    </div>
  );

  // Render data configuration
  const renderDataConfiguration = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configure Data</h3>

        {availableDataSources.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Source
            </label>
            <select
              value={selectedDataSource?.id || ''}
              onChange={(e) => {
                const source = availableDataSources.find(ds => ds.id === e.target.value);
                setSelectedDataSource(source || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a data source...</option>
              {availableDataSources.map(source => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Datasets</h4>

          {config.datasets.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>No datasets added yet</p>
              <button
                onClick={() => {
                  const sampleData = generateSampleData(config.type);
                  addDataset('Sample Data', sampleData);
                }}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Sample Data
              </button>
            </div>
          )}

          {config.datasets.map((dataset, index) => (
            <div key={dataset.id} className="border rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={dataset.label}
                  onChange={(e) => updateDataset(index, { label: e.target.value })}
                  placeholder="Dataset label"
                  className="flex-1 px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeDataset(index)}
                  className="ml-2 px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Remove dataset"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={dataset.color || '#3B82F6'}
                    onChange={(e) => updateDataset(index, {
                      color: e.target.value,
                      backgroundColor: e.target.value,
                      borderColor: e.target.value
                    })}
                    className="w-full h-8 border border-gray-300 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Data Points
                  </label>
                  <div className="text-sm text-gray-600">
                    {dataset.data.length} points
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color Palette
          </label>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(colorPalettes).map(([name, colors]) => (
              <button
                key={name}
                onClick={() => setSelectedPalette(name as keyof typeof colorPalettes)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  selectedPalette === name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex space-x-1">
                  {colors.slice(0, 4).map((color, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="text-xs mt-1 capitalize">{name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('type')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('style')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Next: Style Chart
        </button>
      </div>
    </div>
  );

  // Render style configuration
  const renderStyleConfiguration = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Style Configuration</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Title</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chart Title
              </label>
              <input
                type="text"
                value={config.title?.text || ''}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Enter chart title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title Position
              </label>
              <select
                value={config.title?.position || 'top'}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  title: {
                    ...prev.title,
                    position: e.target.value as any
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          {/* Legend Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Legend</h4>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showLegend"
                checked={config.legend?.display || false}
                onChange={(e) => updateLegend({ display: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="showLegend" className="ml-2 text-sm text-gray-700">
                Show Legend
              </label>
            </div>

            {config.legend?.display && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Legend Position
                </label>
                <select
                  value={config.legend?.position || 'top'}
                  onChange={(e) => updateLegend({ position: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="chartArea">Chart Area</option>
                </select>
              </div>
            )}
          </div>

          {/* Axes Configuration */}
          {!['pie', 'doughnut', 'radar', 'polar'].includes(config.type) && (
            <>
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">X-Axis</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={config.xAxis?.title?.text || ''}
                    onChange={(e) => updateAxis('xAxis', {
                      title: { display: Boolean(e.target.value), text: e.target.value }
                    })}
                    placeholder="X-axis title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showXGrid"
                    checked={config.xAxis?.grid?.display !== false}
                    onChange={(e) => updateAxis('xAxis', {
                      grid: { display: e.target.checked }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showXGrid" className="ml-2 text-sm text-gray-700">
                    Show Grid Lines
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Y-Axis</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={config.yAxis?.title?.text || ''}
                    onChange={(e) => updateAxis('yAxis', {
                      title: { display: Boolean(e.target.value), text: e.target.value }
                    })}
                    placeholder="Y-axis title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showYGrid"
                    checked={config.yAxis?.grid?.display !== false}
                    onChange={(e) => updateAxis('yAxis', {
                      grid: { display: e.target.checked }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showYGrid" className="ml-2 text-sm text-gray-700">
                    Show Grid Lines
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('data')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('preview')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Next: Preview
        </button>
      </div>
    </div>
  );

  // Render preview and actions
  const renderPreviewAndActions = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Preview & Actions</h3>

        {/* Validation Results */}
        {validation.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-red-800 mb-2">Validation Errors</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>• {error.message}</li>
              ))}
            </ul>
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-yellow-800 mb-2">Warnings</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index}>• {warning.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Chart Preview */}
        <div className="border rounded-lg p-4 bg-gray-50 min-h-96 flex items-center justify-center">
          <div ref={chartPreviewRef} className="w-full h-80">
            {isPreviewLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading preview...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>Chart preview will appear here</p>
                  <button
                    onClick={handlePreview}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Generate Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Configuration Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Type:</span>
              <div className="text-gray-600">{config.type}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Datasets:</span>
              <div className="text-gray-600">{config.datasets.length}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Data Points:</span>
              <div className="text-gray-600">
                {config.datasets.reduce((total, dataset) => total + dataset.data.length, 0)}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Theme:</span>
              <div className="text-gray-600 capitalize">{selectedPalette}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep('style')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>

        <div className="space-x-2">
          {onExport && (
            <button
              onClick={() => handleExport({ format: 'png', quality: 1 })}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Export PNG
            </button>
          )}

          {onSave && (
            <button
              onClick={handleSave}
              disabled={!validation.valid || isSaving}
              className={`px-6 py-2 rounded-lg transition-colors ${
                validation.valid && !isSaving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Chart'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Step Navigation */}
      <div className="border-b border-gray-200 px-6 py-4">
        <nav className="flex space-x-8">
          {[
            { id: 'type', label: 'Chart Type', icon: '📊' },
            { id: 'data', label: 'Data', icon: '📈' },
            { id: 'style', label: 'Style', icon: '🎨' },
            { id: 'preview', label: 'Preview', icon: '👁️' }
          ].map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id as any)}
              className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                currentStep === step.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{step.icon}</span>
              <span className="font-medium">{step.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {currentStep === 'type' && renderChartTypeSelection()}
        {currentStep === 'data' && renderDataConfiguration()}
        {currentStep === 'style' && renderStyleConfiguration()}
        {currentStep === 'preview' && renderPreviewAndActions()}
      </div>
    </div>
  );
};

export default ChartBuilder;