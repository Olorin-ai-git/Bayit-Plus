import { env } from '@shared/config/env.config';
import {
  ChartConfig,
  NetworkGraphData,
  TimelineItem,
  VisualizationTheme,
  MapConfig,
  DashboardConfig,
  ExportOptions,
  DataSource,
  VisualizationWidget,
  DrillDownConfig,
  FilterConfig,
  ChartType,
  NetworkLayout
} from '../types/visualization';

export interface VisualizationApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SaveVisualizationRequest {
  name: string;
  description?: string;
  config: ChartConfig | NetworkGraphData | TimelineItem[] | MapConfig | DashboardConfig;
  type: 'chart' | 'network' | 'timeline' | 'map' | 'dashboard';
  tags?: string[];
  isPublic?: boolean;
}

export interface VisualizationListItem {
  id: string;
  name: string;
  description?: string;
  type: 'chart' | 'network' | 'timeline' | 'map' | 'dashboard';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isPublic: boolean;
  thumbnail?: string;
}

export interface DataExportRequest {
  config: ChartConfig;
  data: any[];
  options: ExportOptions;
}

export interface NetworkAnalysisRequest {
  data: NetworkGraphData;
  algorithms?: ('pagerank' | 'betweenness' | 'closeness' | 'clustering')[];
  layout?: NetworkLayout;
}

export interface NetworkAnalysisResult {
  nodeMetrics: {
    [nodeId: string]: {
      pagerank?: number;
      betweenness?: number;
      closeness?: number;
      clustering?: number;
    };
  };
  networkMetrics: {
    density: number;
    transitivity: number;
    averagePathLength: number;
    components: number;
  };
}

export interface TimelineAnalysisRequest {
  items: TimelineItem[];
  analysisType: 'patterns' | 'anomalies' | 'trends' | 'correlations';
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface TimelineAnalysisResult {
  patterns: {
    type: string;
    confidence: number;
    description: string;
    timeRange: {
      start: Date;
      end: Date;
    };
  }[];
  anomalies: {
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[];
  trends: {
    metric: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    slope: number;
  }[];
}

class VisualizationService {
  private baseUrl: string;
  private apiKey: string | undefined;

  constructor() {
    this.baseUrl = env.api.baseUrl;
    this.apiKey = env.api.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<VisualizationApiResponse<T>> {
    const url = `${this.baseUrl}/api/visualization${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  }

  // Chart operations
  async createChart(config: ChartConfig): Promise<VisualizationApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('/charts', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getChart(id: string): Promise<VisualizationApiResponse<ChartConfig>> {
    return this.request<ChartConfig>(`/charts/${id}`);
  }

  async updateChart(id: string, config: ChartConfig): Promise<VisualizationApiResponse<void>> {
    return this.request<void>(`/charts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async deleteChart(id: string): Promise<VisualizationApiResponse<void>> {
    return this.request<void>(`/charts/${id}`, {
      method: 'DELETE',
    });
  }

  // Network graph operations
  async createNetworkGraph(data: NetworkGraphData): Promise<VisualizationApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('/networks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getNetworkGraph(id: string): Promise<VisualizationApiResponse<NetworkGraphData>> {
    return this.request<NetworkGraphData>(`/networks/${id}`);
  }

  async analyzeNetwork(request: NetworkAnalysisRequest): Promise<VisualizationApiResponse<NetworkAnalysisResult>> {
    return this.request<NetworkAnalysisResult>('/networks/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Timeline operations
  async createTimeline(items: TimelineItem[]): Promise<VisualizationApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('/timelines', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async getTimeline(id: string): Promise<VisualizationApiResponse<{ items: TimelineItem[] }>> {
    return this.request<{ items: TimelineItem[] }>(`/timelines/${id}`);
  }

  async analyzeTimeline(request: TimelineAnalysisRequest): Promise<VisualizationApiResponse<TimelineAnalysisResult>> {
    return this.request<TimelineAnalysisResult>('/timelines/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Data source operations
  async getDataSources(): Promise<VisualizationApiResponse<DataSource[]>> {
    return this.request<DataSource[]>('/data-sources');
  }

  async getDataSource(id: string): Promise<VisualizationApiResponse<DataSource>> {
    return this.request<DataSource>(`/data-sources/${id}`);
  }

  async queryDataSource(id: string, query: any): Promise<VisualizationApiResponse<any[]>> {
    return this.request<any[]>(`/data-sources/${id}/query`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // Theme operations
  async getThemes(): Promise<VisualizationApiResponse<VisualizationTheme[]>> {
    return this.request<VisualizationTheme[]>('/themes');
  }

  async createTheme(theme: VisualizationTheme): Promise<VisualizationApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('/themes', {
      method: 'POST',
      body: JSON.stringify(theme),
    });
  }

  async updateTheme(id: string, theme: VisualizationTheme): Promise<VisualizationApiResponse<void>> {
    return this.request<void>(`/themes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(theme),
    });
  }

  // Export operations
  async exportVisualization(request: DataExportRequest): Promise<VisualizationApiResponse<{ url: string }>> {
    return this.request<{ url: string }>('/export', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async exportToPng(
    elementId: string,
    filename?: string,
    options?: { width?: number; height?: number }
  ): Promise<void> {
    // Client-side PNG export using html2canvas
    const { default: html2canvas } = await import('html2canvas');

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const canvas = await html2canvas(element, {
      width: options?.width,
      height: options?.height,
      scale: 2, // Higher resolution
      logging: false,
    });

    const link = document.createElement('a');
    link.download = filename || 'visualization.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async exportToSvg(elementId: string, filename?: string): Promise<void> {
    // Client-side SVG export
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    const svgElement = element.querySelector('svg');
    if (!svgElement) {
      throw new Error('No SVG element found in the specified container');
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });

    const link = document.createElement('a');
    link.download = filename || 'visualization.svg';
    link.href = URL.createObjectURL(blob);
    link.click();

    URL.revokeObjectURL(link.href);
  }

  // Saved visualizations
  async saveVisualization(request: SaveVisualizationRequest): Promise<VisualizationApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('/saved', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSavedVisualizations(): Promise<VisualizationApiResponse<VisualizationListItem[]>> {
    return this.request<VisualizationListItem[]>('/saved');
  }

  async getSavedVisualization(id: string): Promise<VisualizationApiResponse<SaveVisualizationRequest & { id: string }>> {
    return this.request<SaveVisualizationRequest & { id: string }>(`/saved/${id}`);
  }

  async deleteSavedVisualization(id: string): Promise<VisualizationApiResponse<void>> {
    return this.request<void>(`/saved/${id}`, {
      method: 'DELETE',
    });
  }

  // Dashboard operations
  async createDashboard(config: DashboardConfig): Promise<VisualizationApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('/dashboards', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getDashboard(id: string): Promise<VisualizationApiResponse<DashboardConfig>> {
    return this.request<DashboardConfig>(`/dashboards/${id}`);
  }

  async updateDashboard(id: string, config: DashboardConfig): Promise<VisualizationApiResponse<void>> {
    return this.request<void>(`/dashboards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // Utility methods
  async validateChartConfig(config: ChartConfig): Promise<VisualizationApiResponse<{ valid: boolean; errors: string[] }>> {
    return this.request<{ valid: boolean; errors: string[] }>('/validate/chart', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getChartTypes(): Promise<VisualizationApiResponse<{ type: ChartType; label: string; description: string }[]>> {
    return this.request<{ type: ChartType; label: string; description: string }[]>('/chart-types');
  }

  async getColorPalettes(): Promise<VisualizationApiResponse<{ name: string; colors: string[] }[]>> {
    return this.request<{ name: string; colors: string[] }[]>('/color-palettes');
  }

  // Real-time updates
  subscribeToVisualizationUpdates(
    visualizationId: string,
    callback: (data: any) => void
  ): () => void {
    // WebSocket connection for real-time updates
    const ws = new WebSocket(`ws://localhost:8090/api/visualization/ws/${visualizationId}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Return cleanup function
    return () => {
      ws.close();
    };
  }
}

export const visualizationService = new VisualizationService();
export default visualizationService;