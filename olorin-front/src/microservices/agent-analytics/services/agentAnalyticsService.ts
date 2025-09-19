import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  AgentMetrics,
  AgentAlert,
  AgentPerformanceData,
  ModelUsageData,
  CostBreakdown,
  UsagePattern,
  AgentComparison,
  AnalyticsFilter,
  AnalyticsSummary,
  AgentConfiguration,
  AnalyticsExport,
  RealtimeMetrics
} from '../types/agentAnalytics';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class AgentAnalyticsService {
  private api: AxiosInstance;
  private baseURL: string;
  private wsConnection: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private wsCallbacks: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090';

    this.api = axios.create({
      baseURL: `${this.baseURL}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for auth
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Agent Metrics Methods
  async getAgentMetrics(
    agentIds?: string[],
    filters?: AnalyticsFilter
  ): Promise<ApiResponse<AgentMetrics[]>> {
    try {
      const params = new URLSearchParams();

      if (agentIds && agentIds.length > 0) {
        params.append('agentIds', agentIds.join(','));
      }

      if (filters) {
        if (filters.dateRange) {
          params.append('startDate', filters.dateRange.start);
          params.append('endDate', filters.dateRange.end);
        }
        if (filters.granularity) {
          params.append('granularity', filters.granularity);
        }
        if (filters.agentTypes && filters.agentTypes.length > 0) {
          params.append('agentTypes', filters.agentTypes.join(','));
        }
        if (filters.metrics && filters.metrics.length > 0) {
          params.append('metrics', filters.metrics.join(','));
        }
      }

      const response: AxiosResponse<ApiResponse<AgentMetrics[]>> =
        await this.api.get(`/analytics/agents?${params.toString()}`);

      return response.data;
    } catch (error) {
      console.error('Error fetching agent metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch agent metrics'
      };
    }
  }

  async getAgentMetric(agentId: string): Promise<ApiResponse<AgentMetrics>> {
    try {
      const response: AxiosResponse<ApiResponse<AgentMetrics>> =
        await this.api.get(`/analytics/agents/${agentId}`);

      return response.data;
    } catch (error) {
      console.error('Error fetching agent metric:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch agent metric'
      };
    }
  }

  async getAgentPerformanceHistory(
    agentId: string,
    filters?: AnalyticsFilter
  ): Promise<ApiResponse<AgentPerformanceData[]>> {
    try {
      const params = new URLSearchParams();

      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange.start);
        params.append('endDate', filters.dateRange.end);
      }
      if (filters?.granularity) {
        params.append('granularity', filters.granularity);
      }

      const response: AxiosResponse<ApiResponse<AgentPerformanceData[]>> =
        await this.api.get(`/analytics/agents/${agentId}/performance?${params.toString()}`);

      return response.data;
    } catch (error) {
      console.error('Error fetching agent performance history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch performance history'
      };
    }
  }

  // Alert Methods
  async getAgentAlerts(
    agentIds?: string[],
    severity?: string[],
    acknowledged?: boolean
  ): Promise<ApiResponse<AgentAlert[]>> {
    try {
      const params = new URLSearchParams();

      if (agentIds && agentIds.length > 0) {
        params.append('agentIds', agentIds.join(','));
      }
      if (severity && severity.length > 0) {
        params.append('severity', severity.join(','));
      }
      if (acknowledged !== undefined) {
        params.append('acknowledged', acknowledged.toString());
      }

      const response: AxiosResponse<ApiResponse<AgentAlert[]>> =
        await this.api.get(`/analytics/alerts?${params.toString()}`);

      return response.data;
    } catch (error) {
      console.error('Error fetching agent alerts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch alerts'
      };
    }
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<ApiResponse<AgentAlert>> {
    try {
      const response: AxiosResponse<ApiResponse<AgentAlert>> =
        await this.api.patch(`/analytics/alerts/${alertId}/acknowledge`, {
          acknowledgedBy
        });

      return response.data;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to acknowledge alert'
      };
    }
  }

  async resolveAlert(alertId: string): Promise<ApiResponse<AgentAlert>> {
    try {
      const response: AxiosResponse<ApiResponse<AgentAlert>> =
        await this.api.patch(`/analytics/alerts/${alertId}/resolve`);

      return response.data;
    } catch (error) {
      console.error('Error resolving alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve alert'
      };
    }
  }

  // Model Analytics Methods
  async getModelUsageData(
    modelNames?: string[],
    providers?: string[],
    filters?: AnalyticsFilter
  ): Promise<ApiResponse<ModelUsageData[]>> {
    try {
      const params = new URLSearchParams();

      if (modelNames && modelNames.length > 0) {
        params.append('modelNames', modelNames.join(','));
      }
      if (providers && providers.length > 0) {
        params.append('providers', providers.join(','));
      }
      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange.start);
        params.append('endDate', filters.dateRange.end);
      }

      const response: AxiosResponse<ApiResponse<ModelUsageData[]>> =
        await this.api.get(`/analytics/models?${params.toString()}`);

      return response.data;
    } catch (error) {
      console.error('Error fetching model usage data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch model usage data'
      };
    }
  }

  async getCostBreakdown(
    filters?: AnalyticsFilter
  ): Promise<ApiResponse<CostBreakdown[]>> {
    try {
      const params = new URLSearchParams();

      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange.start);
        params.append('endDate', filters.dateRange.end);
      }
      if (filters?.agentIds && filters.agentIds.length > 0) {
        params.append('agentIds', filters.agentIds.join(','));
      }

      const response: AxiosResponse<ApiResponse<CostBreakdown[]>> =
        await this.api.get(`/analytics/costs/breakdown?${params.toString()}`);

      return response.data;
    } catch (error) {
      console.error('Error fetching cost breakdown:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cost breakdown'
      };
    }
  }

  // Usage Pattern Methods
  async getUsagePatterns(
    agentIds?: string[],
    filters?: AnalyticsFilter
  ): Promise<ApiResponse<UsagePattern[]>> {
    try {
      const params = new URLSearchParams();

      if (agentIds && agentIds.length > 0) {
        params.append('agentIds', agentIds.join(','));
      }
      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange.start);
        params.append('endDate', filters.dateRange.end);
      }

      const response: AxiosResponse<ApiResponse<UsagePattern[]>> =
        await this.api.get(`/analytics/usage-patterns?${params.toString()}`);

      return response.data;
    } catch (error) {
      console.error('Error fetching usage patterns:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage patterns'
      };
    }
  }

  // Comparison Methods
  async compareAgents(
    agentIds: string[],
    metric: string,
    filters?: AnalyticsFilter
  ): Promise<ApiResponse<AgentComparison[]>> {
    try {
      const params = new URLSearchParams();
      params.append('agentIds', agentIds.join(','));
      params.append('metric', metric);

      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange.start);
        params.append('endDate', filters.dateRange.end);
      }

      const response: AxiosResponse<ApiResponse<AgentComparison[]>> =
        await this.api.get(`/analytics/agents/compare?${params.toString()}`);

      return response.data;
    } catch (error) {
      console.error('Error comparing agents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare agents'
      };
    }
  }

  // Summary Methods
  async getAnalyticsSummary(
    filters?: AnalyticsFilter
  ): Promise<ApiResponse<AnalyticsSummary>> {
    try {
      const params = new URLSearchParams();

      if (filters?.dateRange) {
        params.append('startDate', filters.dateRange.start);
        params.append('endDate', filters.dateRange.end);
      }
      if (filters?.agentIds && filters.agentIds.length > 0) {
        params.append('agentIds', filters.agentIds.join(','));
      }

      const response: AxiosResponse<ApiResponse<AnalyticsSummary>> =
        await this.api.get(`/analytics/summary?${params.toString()}`);

      return response.data;
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics summary'
      };
    }
  }

  // Configuration Methods
  async getAgentConfigurations(): Promise<ApiResponse<AgentConfiguration[]>> {
    try {
      const response: AxiosResponse<ApiResponse<AgentConfiguration[]>> =
        await this.api.get('/analytics/configurations');

      return response.data;
    } catch (error) {
      console.error('Error fetching agent configurations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch configurations'
      };
    }
  }

  async updateAgentConfiguration(
    agentId: string,
    configuration: Partial<AgentConfiguration>
  ): Promise<ApiResponse<AgentConfiguration>> {
    try {
      const response: AxiosResponse<ApiResponse<AgentConfiguration>> =
        await this.api.patch(`/analytics/configurations/${agentId}`, configuration);

      return response.data;
    } catch (error) {
      console.error('Error updating agent configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configuration'
      };
    }
  }

  // Export Methods
  async exportAnalytics(
    format: 'csv' | 'json' | 'pdf' | 'excel',
    dataType: 'agents' | 'performance' | 'models',
    filters?: AnalyticsFilter
  ): Promise<ApiResponse<AnalyticsExport>> {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('dataType', dataType);

      if (filters) {
        if (filters.dateRange) {
          params.append('startDate', filters.dateRange.start);
          params.append('endDate', filters.dateRange.end);
        }
        if (filters.agentIds && filters.agentIds.length > 0) {
          params.append('agentIds', filters.agentIds.join(','));
        }
      }

      const response: AxiosResponse<ApiResponse<AnalyticsExport>> =
        await this.api.post(`/analytics/export?${params.toString()}`);

      return response.data;
    } catch (error) {
      console.error('Error exporting analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export analytics'
      };
    }
  }

  // Real-time Metrics Methods
  async getRealtimeMetrics(): Promise<ApiResponse<RealtimeMetrics>> {
    try {
      const response: AxiosResponse<ApiResponse<RealtimeMetrics>> =
        await this.api.get('/analytics/realtime');

      return response.data;
    } catch (error) {
      console.error('Error fetching realtime metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch realtime metrics'
      };
    }
  }

  // WebSocket Methods for Real-time Updates
  connectWebSocket(
    onMetricsUpdate?: (metrics: RealtimeMetrics) => void,
    onAlert?: (alert: AgentAlert) => void,
    onError?: (error: string) => void
  ): void {
    try {
      const wsUrl = this.baseURL.replace('http', 'ws') + '/analytics/ws';
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('Analytics WebSocket connected');
        this.wsReconnectAttempts = 0;

        // Send authentication
        const token = localStorage.getItem('authToken');
        if (token) {
          this.wsConnection?.send(JSON.stringify({
            type: 'auth',
            token
          }));
        }
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'metrics_update':
              if (onMetricsUpdate) {
                onMetricsUpdate(data.payload);
              }
              break;
            case 'alert':
              if (onAlert) {
                onAlert(data.payload);
              }
              break;
            case 'error':
              if (onError) {
                onError(data.message);
              }
              break;
          }
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('Analytics WebSocket disconnected');
        this.attemptReconnect(onMetricsUpdate, onAlert, onError);
      };

      this.wsConnection.onerror = (error) => {
        console.error('Analytics WebSocket error:', error);
        if (onError) {
          onError('WebSocket connection error');
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : 'WebSocket connection failed');
      }
    }
  }

  private attemptReconnect(
    onMetricsUpdate?: (metrics: RealtimeMetrics) => void,
    onAlert?: (alert: AgentAlert) => void,
    onError?: (error: string) => void
  ): void {
    if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
      this.wsReconnectAttempts++;
      const delay = Math.pow(2, this.wsReconnectAttempts) * 1000; // Exponential backoff

      console.log(`Attempting WebSocket reconnect ${this.wsReconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

      setTimeout(() => {
        this.connectWebSocket(onMetricsUpdate, onAlert, onError);
      }, delay);
    } else {
      console.error('Max WebSocket reconnection attempts reached');
      if (onError) {
        onError('WebSocket connection failed after multiple attempts');
      }
    }
  }

  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.wsCallbacks.clear();
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Create and export singleton instance
export const agentAnalyticsService = new AgentAnalyticsService();
export default agentAnalyticsService;