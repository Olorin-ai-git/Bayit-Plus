import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChartConfig,
  NetworkGraphData,
  TimelineItem,
  VisualizationTheme,
  ExportOptions,
  DataSource,
  DashboardConfig,
  VisualizationEvent,
  FilterConfig,
  DrillDownConfig
} from '../types/visualization';
import {
  visualizationService,
  VisualizationApiResponse,
  SaveVisualizationRequest,
  VisualizationListItem,
  NetworkAnalysisRequest,
  NetworkAnalysisResult,
  TimelineAnalysisRequest,
  TimelineAnalysisResult
} from '../services/visualizationService';

// Hook for managing chart configurations
export const useChart = (initialConfig?: ChartConfig) => {
  const [config, setConfig] = useState<ChartConfig | undefined>(initialConfig);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedChartId, setSavedChartId] = useState<string | null>(null);

  const createChart = useCallback(async (chartConfig: ChartConfig) => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.createChart(chartConfig);
      if (response.success && response.data) {
        setSavedChartId(response.data.id);
        setConfig(chartConfig);
        return response.data.id;
      } else {
        setError(response.error || 'Failed to create chart');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChart = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.getChart(id);
      if (response.success && response.data) {
        setConfig(response.data);
        setSavedChartId(id);
      } else {
        setError(response.error || 'Failed to load chart');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateChart = useCallback(async (chartConfig: ChartConfig) => {
    if (!savedChartId) {
      setError('No chart ID available for update');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.updateChart(savedChartId, chartConfig);
      if (response.success) {
        setConfig(chartConfig);
      } else {
        setError(response.error || 'Failed to update chart');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [savedChartId]);

  const validateConfig = useCallback(async (chartConfig: ChartConfig) => {
    try {
      const response = await visualizationService.validateChartConfig(chartConfig);
      return response.data || { valid: false, errors: ['Validation failed'] };
    } catch (err) {
      return { valid: false, errors: [err instanceof Error ? err.message : 'Validation error'] };
    }
  }, []);

  return {
    config,
    setConfig,
    data,
    setData,
    loading,
    error,
    savedChartId,
    createChart,
    loadChart,
    updateChart,
    validateConfig
  };
};

// Hook for managing network graph data and analysis
export const useNetworkGraph = (initialData?: NetworkGraphData) => {
  const [data, setData] = useState<NetworkGraphData | undefined>(initialData);
  const [analysis, setAnalysis] = useState<NetworkAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createNetwork = useCallback(async (networkData: NetworkGraphData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.createNetworkGraph(networkData);
      if (response.success && response.data) {
        setData(networkData);
        return response.data.id;
      } else {
        setError(response.error || 'Failed to create network');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeNetwork = useCallback(async (request: NetworkAnalysisRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.analyzeNetwork(request);
      if (response.success && response.data) {
        setAnalysis(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to analyze network');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const networkMetrics = useMemo(() => {
    if (!data || !data.nodes || !data.edges) {
      return {
        nodeCount: 0,
        edgeCount: 0,
        density: 0,
        averageDegree: 0
      };
    }

    const nodeCount = data.nodes.length;
    const edgeCount = data.edges.length;
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
    const averageDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;

    return {
      nodeCount,
      edgeCount,
      density,
      averageDegree
    };
  }, [data]);

  return {
    data,
    setData,
    analysis,
    loading,
    error,
    networkMetrics,
    createNetwork,
    analyzeNetwork
  };
};

// Hook for managing timeline visualizations
export const useTimeline = (initialItems?: TimelineItem[]) => {
  const [items, setItems] = useState<TimelineItem[]>(initialItems || []);
  const [analysis, setAnalysis] = useState<TimelineAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<{ start: Date; end: Date } | null>(null);

  const createTimeline = useCallback(async (timelineItems: TimelineItem[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.createTimeline(timelineItems);
      if (response.success && response.data) {
        setItems(timelineItems);
        return response.data.id;
      } else {
        setError(response.error || 'Failed to create timeline');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeTimeline = useCallback(async (request: TimelineAnalysisRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.analyzeTimeline(request);
      if (response.success && response.data) {
        setAnalysis(response.data);
        return response.data;
      } else {
        setError(response.error || 'Failed to analyze timeline');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const addTimelineItem = useCallback((item: TimelineItem) => {
    setItems(prev => [...prev, item]);
  }, []);

  const removeTimelineItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setSelectedItems(prev => prev.filter(itemId => itemId !== id));
  }, []);

  const updateTimelineItem = useCallback((id: string, updates: Partial<TimelineItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const selectTimelineItem = useCallback((id: string, selected: boolean) => {
    setSelectedItems(prev => {
      if (selected) {
        return prev.includes(id) ? prev : [...prev, id];
      } else {
        return prev.filter(itemId => itemId !== id);
      }
    });
  }, []);

  const filteredItems = useMemo(() => {
    if (!timeRange) return items;

    return items.filter(item => {
      const itemStart = new Date(item.start);
      const itemEnd = item.end ? new Date(item.end) : itemStart;

      return (itemStart >= timeRange.start && itemStart <= timeRange.end) ||
             (itemEnd >= timeRange.start && itemEnd <= timeRange.end) ||
             (itemStart <= timeRange.start && itemEnd >= timeRange.end);
    });
  }, [items, timeRange]);

  return {
    items,
    setItems,
    analysis,
    loading,
    error,
    selectedItems,
    timeRange,
    setTimeRange,
    filteredItems,
    createTimeline,
    analyzeTimeline,
    addTimelineItem,
    removeTimelineItem,
    updateTimelineItem,
    selectTimelineItem
  };
};

// Hook for managing data sources
export const useDataSources = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDataSources = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.getDataSources();
      if (response.success && response.data) {
        setDataSources(response.data);
      } else {
        setError(response.error || 'Failed to load data sources');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const queryDataSource = useCallback(async (id: string, query: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.queryDataSource(id, query);
      if (response.success) {
        return response.data || [];
      } else {
        setError(response.error || 'Failed to query data source');
        return [];
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataSources();
  }, [loadDataSources]);

  return {
    dataSources,
    loading,
    error,
    loadDataSources,
    queryDataSource
  };
};

// Hook for managing visualization themes
export const useVisualizationThemes = () => {
  const [themes, setThemes] = useState<VisualizationTheme[]>([]);
  const [activeTheme, setActiveTheme] = useState<VisualizationTheme | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadThemes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.getThemes();
      if (response.success && response.data) {
        setThemes(response.data);
        if (response.data.length > 0) {
          setActiveTheme(response.data[0]);
        }
      } else {
        setError(response.error || 'Failed to load themes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTheme = useCallback(async (theme: VisualizationTheme) => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.createTheme(theme);
      if (response.success && response.data) {
        await loadThemes(); // Refresh themes list
        return response.data.id;
      } else {
        setError(response.error || 'Failed to create theme');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadThemes]);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  return {
    themes,
    activeTheme,
    setActiveTheme,
    loading,
    error,
    loadThemes,
    createTheme
  };
};

// Hook for managing saved visualizations
export const useSavedVisualizations = () => {
  const [savedVisualizations, setSavedVisualizations] = useState<VisualizationListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadSavedVisualizations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.getSavedVisualizations();
      if (response.success && response.data) {
        setSavedVisualizations(response.data);
      } else {
        setError(response.error || 'Failed to load saved visualizations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveVisualization = useCallback(async (request: SaveVisualizationRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.saveVisualization(request);
      if (response.success && response.data) {
        await loadSavedVisualizations(); // Refresh list
        return response.data.id;
      } else {
        setError(response.error || 'Failed to save visualization');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadSavedVisualizations]);

  const deleteSavedVisualization = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await visualizationService.deleteSavedVisualization(id);
      if (response.success) {
        setSavedVisualizations(prev => prev.filter(viz => viz.id !== id));
      } else {
        setError(response.error || 'Failed to delete visualization');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedVisualizations();
  }, [loadSavedVisualizations]);

  return {
    savedVisualizations,
    loading,
    error,
    loadSavedVisualizations,
    saveVisualization,
    deleteSavedVisualization
  };
};

// Hook for visualization export functionality
export const useVisualizationExport = () => {
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportToPng = useCallback(async (
    elementId: string,
    filename?: string,
    options?: { width?: number; height?: number }
  ) => {
    setExporting(true);
    setExportError(null);

    try {
      await visualizationService.exportToPng(elementId, filename, options);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, []);

  const exportToSvg = useCallback(async (elementId: string, filename?: string) => {
    setExporting(true);
    setExportError(null);

    try {
      await visualizationService.exportToSvg(elementId, filename);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    exporting,
    exportError,
    exportToPng,
    exportToSvg
  };
};

// Hook for real-time visualization updates
export const useVisualizationUpdates = (visualizationId: string) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    try {
      const cleanup = visualizationService.subscribeToVisualizationUpdates(
        visualizationId,
        (data) => {
          setLastUpdate(data);
          setError(null);
        }
      );

      cleanupRef.current = cleanup;
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnected(false);
    }
  }, [visualizationId]);

  const disconnect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [connect]);

  return {
    connected,
    lastUpdate,
    error,
    connect,
    disconnect
  };
};

// Hook for handling visualization events
export const useVisualizationEvents = () => {
  const [events, setEvents] = useState<VisualizationEvent[]>([]);

  const addEvent = useCallback((event: VisualizationEvent) => {
    setEvents(prev => [...prev, event]);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const getEventsByType = useCallback((type: VisualizationEvent['type']) => {
    return events.filter(event => event.type === type);
  }, [events]);

  return {
    events,
    addEvent,
    clearEvents,
    getEventsByType
  };
};