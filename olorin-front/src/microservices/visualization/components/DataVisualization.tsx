import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler,
  ScatterController,
  BubbleController
} from 'chart.js';
import { Chart, getElementAtEvent, getDatasetAtEvent, getElementsAtEvent } from 'react-chartjs-2';
import {
  ChartConfig,
  ChartType,
  VisualizationTheme,
  ExportOptions,
  VisualizationError,
  DrillDownAction,
  VisualizationEvent
} from '../types/visualization';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler,
  ScatterController,
  BubbleController
);

// Props interface
interface DataVisualizationProps {
  config: ChartConfig;
  data?: any;
  theme?: VisualizationTheme;
  width?: number;
  height?: number;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  enableInteractions?: boolean;
  enableDrillDown?: boolean;
  enableExport?: boolean;
  enableFullscreen?: boolean;
  refreshInterval?: number;
  loading?: boolean;
  error?: VisualizationError | null;
  className?: string;
  onDataClick?: (event: VisualizationEvent) => void;
  onDataHover?: (event: VisualizationEvent) => void;
  onDrillDown?: (action: DrillDownAction) => void;
  onExport?: (options: ExportOptions) => Promise<void>;
  onError?: (error: VisualizationError) => void;
  onRender?: (chart: ChartJS) => void;
}

// Loading skeleton component
const LoadingSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div
    className="animate-pulse bg-gray-200 rounded-lg flex items-center justify-center"
    style={{ height: `${height}px` }}
  >
    <div className="text-gray-400 text-center">
      <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
      <div className="h-4 bg-gray-300 rounded w-32 mx-auto mb-2"></div>
      <div className="h-3 bg-gray-300 rounded w-24 mx-auto"></div>
    </div>
  </div>
);

// Error display component
const ErrorDisplay: React.FC<{ error: VisualizationError; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
    <div className="text-red-600 text-4xl mb-4">⚠️</div>
    <h3 className="text-lg font-semibold text-red-800 mb-2">Visualization Error</h3>
    <p className="text-red-700 mb-4">{error.message}</p>
    {error.suggestions && error.suggestions.length > 0 && (
      <div className="text-left bg-white rounded-lg p-4 mb-4">
        <h4 className="font-medium text-red-800 mb-2">Suggestions:</h4>
        <ul className="text-sm text-red-700 space-y-1">
          {error.suggestions.map((suggestion, index) => (
            <li key={index}>• {suggestion}</li>
          ))}
        </ul>
      </div>
    )}
    {onRetry && error.recoverable && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

// Chart toolbar component
const ChartToolbar: React.FC<{
  onExport?: () => void;
  onFullscreen?: () => void;
  onRefresh?: () => void;
  enableExport: boolean;
  enableFullscreen: boolean;
}> = ({ onExport, onFullscreen, onRefresh, enableExport, enableFullscreen }) => (
  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-t-lg border-b">
    <div className="flex-1"></div>
    {onRefresh && (
      <button
        onClick={onRefresh}
        title="Refresh"
        className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
      >
        🔄
      </button>
    )}
    {enableExport && onExport && (
      <button
        onClick={onExport}
        title="Export"
        className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
      >
        📊
      </button>
    )}
    {enableFullscreen && onFullscreen && (
      <button
        onClick={onFullscreen}
        title="Fullscreen"
        className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
      >
        ⛶
      </button>
    )}
  </div>
);

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  config,
  data,
  theme,
  width,
  height = 400,
  responsive = true,
  maintainAspectRatio,
  enableInteractions = true,
  enableDrillDown = false,
  enableExport = false,
  enableFullscreen = false,
  refreshInterval,
  loading = false,
  error = null,
  className = '',
  onDataClick,
  onDataHover,
  onDrillDown,
  onExport,
  onError,
  onRender
}) => {
  // Refs
  const chartRef = useRef<ChartJS>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartInstance, setChartInstance] = useState<ChartJS | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Auto-refresh effect
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      setRefreshCounter(prev => prev + 1);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Apply theme to chart configuration
  const themedConfig = useMemo(() => {
    if (!theme) return config;

    const themedChartConfig = { ...config };

    // Apply theme colors to datasets if not explicitly set
    if (themedChartConfig.datasets) {
      themedChartConfig.datasets = themedChartConfig.datasets.map((dataset, index) => ({
        ...dataset,
        backgroundColor: dataset.backgroundColor || theme.colors.primary[index % theme.colors.primary.length],
        borderColor: dataset.borderColor || theme.colors.primary[index % theme.colors.primary.length]
      }));
    }

    // Apply theme to chart elements
    if (themedChartConfig.scales) {
      Object.keys(themedChartConfig.scales).forEach(key => {
        const scale = themedChartConfig.scales![key];
        if (scale.grid) {
          scale.grid.color = scale.grid.color || theme.chart.gridColor;
        }
        if (scale.ticks) {
          scale.ticks.color = scale.ticks.color || theme.chart.tickColor;
        }
      });
    }

    // Apply theme to tooltip
    if (themedChartConfig.tooltip) {
      themedChartConfig.tooltip.backgroundColor = themedChartConfig.tooltip.backgroundColor || theme.chart.tooltipBackground;
      themedChartConfig.tooltip.borderColor = themedChartConfig.tooltip.borderColor || theme.chart.tooltipBorder;
      themedChartConfig.tooltip.titleColor = themedChartConfig.tooltip.titleColor || theme.text.primary;
      themedChartConfig.tooltip.bodyColor = themedChartConfig.tooltip.bodyColor || theme.text.secondary;
    }

    return themedChartConfig;
  }, [config, theme]);

  // Convert config to Chart.js format
  const chartData = useMemo(() => {
    const datasets = themedConfig.datasets.map(dataset => ({
      label: dataset.label,
      data: dataset.data.map(point => ({
        x: point.x,
        y: point.y,
        r: point.size || 3 // For bubble charts
      })),
      backgroundColor: dataset.backgroundColor,
      borderColor: dataset.borderColor,
      borderWidth: dataset.borderWidth || 2,
      fill: dataset.fill || false,
      tension: dataset.tension || 0,
      pointRadius: dataset.pointRadius || 3,
      pointHoverRadius: dataset.pointHoverRadius || 5,
      hidden: dataset.hidden || false,
      yAxisID: dataset.yAxisID,
      xAxisID: dataset.xAxisID
    }));

    return {
      labels: themedConfig.labels || [],
      datasets
    };
  }, [themedConfig]);

  // Chart options
  const chartOptions = useMemo(() => {
    const options: any = {
      responsive: responsive,
      maintainAspectRatio: maintainAspectRatio ?? false,
      interaction: {
        mode: themedConfig.interaction?.mode || 'nearest',
        intersect: themedConfig.interaction?.intersect ?? false
      },
      plugins: {
        title: {
          display: themedConfig.title?.display || false,
          text: themedConfig.title?.text || '',
          position: themedConfig.title?.position || 'top',
          font: themedConfig.title?.font || {},
          color: themedConfig.title?.color || theme?.text.primary,
          padding: themedConfig.title?.padding || 20
        },
        legend: {
          display: themedConfig.legend?.display ?? true,
          position: themedConfig.legend?.position || 'top',
          align: themedConfig.legend?.align || 'center',
          maxHeight: themedConfig.legend?.maxHeight,
          maxWidth: themedConfig.legend?.maxWidth,
          fullSize: themedConfig.legend?.fullSize,
          reverse: themedConfig.legend?.reverse,
          labels: {
            color: themedConfig.legend?.labels?.color || theme?.chart.legendColor,
            font: themedConfig.legend?.labels?.font || {},
            padding: themedConfig.legend?.labels?.padding || 10,
            usePointStyle: themedConfig.legend?.labels?.usePointStyle || false
          }
        },
        tooltip: {
          enabled: themedConfig.tooltip?.enabled ?? true,
          mode: themedConfig.tooltip?.mode || 'nearest',
          intersect: themedConfig.tooltip?.intersect ?? false,
          position: themedConfig.tooltip?.position || 'average',
          backgroundColor: themedConfig.tooltip?.backgroundColor || theme?.chart.tooltipBackground || 'rgba(0,0,0,0.8)',
          titleColor: themedConfig.tooltip?.titleColor || theme?.text.inverse || '#fff',
          bodyColor: themedConfig.tooltip?.bodyColor || theme?.text.inverse || '#fff',
          borderColor: themedConfig.tooltip?.borderColor || theme?.chart.tooltipBorder,
          borderWidth: themedConfig.tooltip?.borderWidth || 1,
          cornerRadius: themedConfig.tooltip?.cornerRadius || 6,
          displayColors: themedConfig.tooltip?.displayColors ?? true,
          callbacks: themedConfig.tooltip?.callbacks || {}
        }
      },
      animation: themedConfig.animation || {
        duration: 750,
        easing: 'easeInOutQuart'
      },
      onClick: enableInteractions ? (event: any, elements: any[]) => {
        if (elements.length > 0 && onDataClick) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataset = chartData.datasets[datasetIndex];
          const dataPoint = dataset.data[index];

          const visualizationEvent: VisualizationEvent = {
            type: 'click',
            target: themedConfig.datasets[datasetIndex]?.id || `dataset-${datasetIndex}`,
            data: {
              datasetIndex,
              index,
              dataset: dataset.label,
              value: dataPoint,
              originalData: themedConfig.datasets[datasetIndex]?.data[index]
            },
            position: {
              x: event.native?.offsetX || 0,
              y: event.native?.offsetY || 0
            },
            timestamp: new Date().toISOString()
          };

          onDataClick(visualizationEvent);
        }
      } : undefined,
      onHover: enableInteractions ? (event: any, elements: any[]) => {
        if (elements.length > 0 && onDataHover) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataset = chartData.datasets[datasetIndex];
          const dataPoint = dataset.data[index];

          const visualizationEvent: VisualizationEvent = {
            type: 'hover',
            target: themedConfig.datasets[datasetIndex]?.id || `dataset-${datasetIndex}`,
            data: {
              datasetIndex,
              index,
              dataset: dataset.label,
              value: dataPoint,
              originalData: themedConfig.datasets[datasetIndex]?.data[index]
            },
            position: {
              x: event.native?.offsetX || 0,
              y: event.native?.offsetY || 0
            },
            timestamp: new Date().toISOString()
          };

          onDataHover(visualizationEvent);
        }
      } : undefined
    };

    // Add scales configuration
    if (themedConfig.scales) {
      options.scales = {};
      Object.entries(themedConfig.scales).forEach(([key, scale]) => {
        options.scales[key] = {
          type: scale.type,
          position: scale.position,
          display: scale.display ?? true,
          min: scale.min,
          max: scale.max,
          suggestedMin: scale.suggestedMin,
          suggestedMax: scale.suggestedMax,
          title: {
            display: scale.title?.display || false,
            text: scale.title?.text || '',
            font: scale.title?.font || {},
            color: scale.title?.color || theme?.text.primary
          },
          ticks: {
            stepSize: scale.ticks?.stepSize,
            maxTicksLimit: scale.ticks?.maxTicksLimit,
            color: scale.ticks?.callback ? undefined : (theme?.chart.tickColor || theme?.text.secondary),
            callback: scale.ticks?.callback
          },
          grid: {
            display: scale.grid?.display ?? true,
            color: scale.grid?.color || theme?.chart.gridColor,
            lineWidth: scale.grid?.lineWidth || 1,
            drawBorder: scale.grid?.drawBorder ?? true,
            drawOnChartArea: scale.grid?.drawOnChartArea ?? true,
            drawTicks: scale.grid?.drawTicks ?? true
          },
          time: scale.time
        };
      });
    }

    // Add axis-specific configurations
    if (themedConfig.xAxis && !themedConfig.scales?.x) {
      options.scales = options.scales || {};
      options.scales.x = {
        type: themedConfig.xAxis.type || 'category',
        position: themedConfig.xAxis.position || 'bottom',
        display: themedConfig.xAxis.display ?? true,
        title: {
          display: themedConfig.xAxis.title?.display || false,
          text: themedConfig.xAxis.title?.text || '',
          font: themedConfig.xAxis.title?.font || {},
          color: themedConfig.xAxis.title?.color || theme?.text.primary
        },
        ticks: {
          color: theme?.chart.tickColor || theme?.text.secondary,
          ...themedConfig.xAxis.ticks
        },
        grid: {
          display: themedConfig.xAxis.grid?.display ?? true,
          color: themedConfig.xAxis.grid?.color || theme?.chart.gridColor,
          ...themedConfig.xAxis.grid
        }
      };
    }

    if (themedConfig.yAxis && !themedConfig.scales?.y) {
      options.scales = options.scales || {};
      options.scales.y = {
        type: themedConfig.yAxis.type || 'linear',
        position: themedConfig.yAxis.position || 'left',
        display: themedConfig.yAxis.display ?? true,
        title: {
          display: themedConfig.yAxis.title?.display || false,
          text: themedConfig.yAxis.title?.text || '',
          font: themedConfig.yAxis.title?.font || {},
          color: themedConfig.yAxis.title?.color || theme?.text.primary
        },
        ticks: {
          color: theme?.chart.tickColor || theme?.text.secondary,
          ...themedConfig.yAxis.ticks
        },
        grid: {
          display: themedConfig.yAxis.grid?.display ?? true,
          color: themedConfig.yAxis.grid?.color || theme?.chart.gridColor,
          ...themedConfig.yAxis.grid
        }
      };
    }

    return options;
  }, [themedConfig, theme, responsive, maintainAspectRatio, enableInteractions, chartData, onDataClick, onDataHover]);

  // Handle chart reference
  const handleChartRef = useCallback((chart: ChartJS | null) => {
    setChartInstance(chart);
    if (chart && onRender) {
      onRender(chart);
    }
  }, [onRender]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!chartInstance || !onExport) return;

    try {
      const exportOptions: ExportOptions = {
        format: 'png',
        quality: 1,
        dimensions: {
          width: chartInstance.width,
          height: chartInstance.height
        },
        backgroundColor: theme?.background.surface || '#ffffff',
        title: themedConfig.title?.text
      };

      await onExport(exportOptions);
    } catch (error) {
      const vizError: VisualizationError = {
        type: 'render',
        message: 'Failed to export chart',
        details: error,
        timestamp: new Date().toISOString(),
        recoverable: true,
        suggestions: ['Try again', 'Check if chart is fully loaded']
      };

      onError?.(vizError);
    }
  }, [chartInstance, onExport, theme, themedConfig.title, onError]);

  // Handle fullscreen
  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (isFullscreen) {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    }
  }, [isFullscreen]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle chart errors
  const handleChartError = useCallback((error: Error) => {
    const vizError: VisualizationError = {
      type: 'render',
      message: error.message || 'Chart rendering failed',
      details: error,
      timestamp: new Date().toISOString(),
      recoverable: true,
      suggestions: [
        'Check data format and configuration',
        'Ensure all required chart.js plugins are registered',
        'Try refreshing the chart'
      ]
    };

    onError?.(vizError);
  }, [onError]);

  // Render loading state
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        {(enableExport || enableFullscreen || refreshInterval) && (
          <ChartToolbar
            enableExport={false}
            enableFullscreen={false}
          />
        )}
        <div className="p-4">
          <LoadingSkeleton height={height} />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        {(enableExport || enableFullscreen || refreshInterval) && (
          <ChartToolbar
            enableExport={false}
            enableFullscreen={false}
          />
        )}
        <div className="p-4">
          <ErrorDisplay
            error={error}
            onRetry={error.recoverable ? handleRefresh : undefined}
          />
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-lg shadow-sm border ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}
    >
      {/* Toolbar */}
      {(enableExport || enableFullscreen || refreshInterval) && (
        <ChartToolbar
          onExport={enableExport ? handleExport : undefined}
          onFullscreen={enableFullscreen ? handleFullscreen : undefined}
          onRefresh={refreshInterval ? handleRefresh : undefined}
          enableExport={enableExport}
          enableFullscreen={enableFullscreen}
        />
      )}

      {/* Chart Container */}
      <div
        className="p-4"
        style={{
          width: width ? `${width}px` : '100%',
          height: isFullscreen ? 'calc(100vh - 60px)' : `${height}px`
        }}
      >
        <Chart
          ref={(chart) => {
            chartRef.current = chart;
            handleChartRef(chart);
          }}
          type={themedConfig.type as any}
          data={chartData}
          options={chartOptions}
          onError={handleChartError}
          key={`${themedConfig.type}-${refreshCounter}`}
        />
      </div>
    </div>
  );
};

export default DataVisualization;