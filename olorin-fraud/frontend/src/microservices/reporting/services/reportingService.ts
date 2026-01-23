import { getConfig } from '@shared/config/env.config';
import {
  Report,
  ReportConfig,
  ReportTemplate,
  ReportGeneration,
  ReportAnalytics,
  ReportScheduler,
  ReportShare,
  ReportComment,
  ReportVersion,
  ReportNotification,
  ReportAuditLog,
  ReportPreview,
  ReportExportOptions,
  ReportDataSource,
  ReportFilter,
  SaveVisualizationRequest
} from '../types/reporting';

export interface ReportingApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateReportRequest {
  name: string;
  description?: string;
  templateId: string;
  config: ReportConfig;
  tags?: string[];
}

export interface UpdateReportRequest extends Partial<CreateReportRequest> {
  id: string;
}

export interface GenerateReportRequest {
  reportId: string;
  format?: string[];
  schedule?: boolean;
}

export interface ReportListOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ShareReportRequest {
  reportId: string;
  permissions: ('view' | 'download' | 'comment')[];
  expiresAt?: string;
  passwordProtected?: boolean;
  password?: string;
}

class ReportingService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const config = getConfig();
    this.baseUrl = config.api.baseUrl;
    // Note: API_KEY not in schema - using process.env directly
    this.apiKey = process.env.REACT_APP_API_KEY || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ReportingApiResponse<T>> {
    const url = `${this.baseUrl}/api/reporting${endpoint}`;

    try {
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Report CRUD operations
  async createReport(request: CreateReportRequest): Promise<ReportingApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('/reports', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getReport(id: string): Promise<ReportingApiResponse<Report>> {
    return this.request<Report>(`/reports/${id}`);
  }

  async updateReport(request: UpdateReportRequest): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/reports/${request.id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async deleteReport(id: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/reports/${id}`, {
      method: 'DELETE',
    });
  }

  async listReports(options: ReportListOptions = {}): Promise<ReportingApiResponse<{
    reports: Report[];
    total: number;
    page: number;
    limit: number;
  }>> {
    const searchParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.set(key, value.toString());
        }
      }
    });

    return this.request<{
      reports: Report[];
      total: number;
      page: number;
      limit: number;
    }>(`/reports?${searchParams.toString()}`);
  }

  async duplicateReport(id: string, name: string): Promise<ReportingApiResponse<{ id: string }>> {
    return this.request<{ id: string }>(`/reports/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Report generation
  async generateReport(request: GenerateReportRequest): Promise<ReportingApiResponse<{ generationId: string }>> {
    return this.request<{ generationId: string }>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getReportGeneration(generationId: string): Promise<ReportingApiResponse<ReportGeneration>> {
    return this.request<ReportGeneration>(`/generations/${generationId}`);
  }

  async listReportGenerations(reportId: string): Promise<ReportingApiResponse<ReportGeneration[]>> {
    return this.request<ReportGeneration[]>(`/reports/${reportId}/generations`);
  }

  async downloadReportGeneration(generationId: string): Promise<ReportingApiResponse<{ url: string }>> {
    return this.request<{ url: string }>(`/generations/${generationId}/download`);
  }

  async cancelReportGeneration(generationId: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/generations/${generationId}/cancel`, {
      method: 'POST',
    });
  }

  // Report preview
  async previewReport(config: ReportConfig): Promise<ReportingApiResponse<ReportPreview>> {
    return this.request<ReportPreview>('/reports/preview', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // Templates
  async listTemplates(): Promise<ReportingApiResponse<ReportTemplate[]>> {
    return this.request<ReportTemplate[]>('/templates');
  }

  async getTemplate(id: string): Promise<ReportingApiResponse<ReportTemplate>> {
    return this.request<ReportTemplate>(`/templates/${id}`);
  }

  async createTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<ReportingApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateTemplate(id: string, template: Partial<ReportTemplate>): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  async deleteTemplate(id: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // Data sources
  async listDataSources(): Promise<ReportingApiResponse<ReportDataSource[]>> {
    return this.request<ReportDataSource[]>('/data-sources');
  }

  async getDataSource(id: string): Promise<ReportingApiResponse<ReportDataSource>> {
    return this.request<ReportDataSource>(`/data-sources/${id}`);
  }

  async queryDataSource(id: string, query: any): Promise<ReportingApiResponse<any[]>> {
    return this.request<any[]>(`/data-sources/${id}/query`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  async testDataSourceConnection(id: string): Promise<ReportingApiResponse<{ connected: boolean; message: string }>> {
    return this.request<{ connected: boolean; message: string }>(`/data-sources/${id}/test`, {
      method: 'POST',
    });
  }

  // Scheduling
  async scheduleReport(reportId: string, schedule: Omit<ReportScheduler, 'id' | 'reportId' | 'lastRun' | 'nextRun' | 'failureCount'>): Promise<ReportingApiResponse<{ id: string }>> {
    return this.request<{ id: string }>(`/reports/${reportId}/schedule`, {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  }

  async updateReportSchedule(scheduleId: string, schedule: Partial<ReportScheduler>): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/schedules/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(schedule),
    });
  }

  async deleteReportSchedule(scheduleId: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/schedules/${scheduleId}`, {
      method: 'DELETE',
    });
  }

  async listReportSchedules(): Promise<ReportingApiResponse<ReportScheduler[]>> {
    return this.request<ReportScheduler[]>('/schedules');
  }

  async enableReportSchedule(scheduleId: string, enabled: boolean): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/schedules/${scheduleId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  // Sharing
  async shareReport(request: ShareReportRequest): Promise<ReportingApiResponse<{ shareId: string; url: string }>> {
    return this.request<{ shareId: string; url: string }>('/reports/share', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getReportShare(shareId: string): Promise<ReportingApiResponse<ReportShare>> {
    return this.request<ReportShare>(`/shares/${shareId}`);
  }

  async listReportShares(reportId: string): Promise<ReportingApiResponse<ReportShare[]>> {
    return this.request<ReportShare[]>(`/reports/${reportId}/shares`);
  }

  async revokeReportShare(shareId: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/shares/${shareId}/revoke`, {
      method: 'POST',
    });
  }

  async accessSharedReport(token: string, password?: string): Promise<ReportingApiResponse<Report>> {
    return this.request<Report>(`/shared/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // Comments
  async addReportComment(comment: Omit<ReportComment, 'id' | 'createdAt' | 'updatedAt' | 'replies'>): Promise<ReportingApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('/reports/comments', {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  }

  async listReportComments(reportId: string): Promise<ReportingApiResponse<ReportComment[]>> {
    return this.request<ReportComment[]>(`/reports/${reportId}/comments`);
  }

  async updateReportComment(commentId: string, content: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteReportComment(commentId: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async resolveReportComment(commentId: string, resolved: boolean): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/comments/${commentId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolved }),
    });
  }

  // Versioning
  async createReportVersion(reportId: string, changeLog?: string): Promise<ReportingApiResponse<{ versionId: string }>> {
    return this.request<{ versionId: string }>(`/reports/${reportId}/versions`, {
      method: 'POST',
      body: JSON.stringify({ changeLog }),
    });
  }

  async listReportVersions(reportId: string): Promise<ReportingApiResponse<ReportVersion[]>> {
    return this.request<ReportVersion[]>(`/reports/${reportId}/versions`);
  }

  async getReportVersion(versionId: string): Promise<ReportingApiResponse<ReportVersion>> {
    return this.request<ReportVersion>(`/versions/${versionId}`);
  }

  async restoreReportVersion(versionId: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/versions/${versionId}/restore`, {
      method: 'POST',
    });
  }

  async deleteReportVersion(versionId: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/versions/${versionId}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getReportAnalytics(dateRange?: { start: string; end: string }): Promise<ReportingApiResponse<ReportAnalytics>> {
    const params = dateRange ? new URLSearchParams({
      start: dateRange.start,
      end: dateRange.end,
    }).toString() : '';

    return this.request<ReportAnalytics>(`/analytics${params ? '?' + params : ''}`);
  }

  async getReportUsageStats(reportId: string): Promise<ReportingApiResponse<{
    views: number;
    downloads: number;
    shares: number;
    comments: number;
    lastAccessed: string;
  }>> {
    return this.request<{
      views: number;
      downloads: number;
      shares: number;
      comments: number;
      lastAccessed: string;
    }>(`/reports/${reportId}/stats`);
  }

  // Export
  async exportReport(reportId: string, options: ReportExportOptions): Promise<ReportingApiResponse<{ url: string }>> {
    return this.request<{ url: string }>(`/reports/${reportId}/export`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async bulkExportReports(reportIds: string[], options: ReportExportOptions): Promise<ReportingApiResponse<{ url: string }>> {
    return this.request<{ url: string }>('/reports/bulk-export', {
      method: 'POST',
      body: JSON.stringify({ reportIds, options }),
    });
  }

  // Notifications
  async listReportNotifications(): Promise<ReportingApiResponse<ReportNotification[]>> {
    return this.request<ReportNotification[]>('/notifications');
  }

  async markNotificationAsRead(notificationId: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  async deleteNotification(notificationId: string): Promise<ReportingApiResponse<void>> {
    return this.request<void>(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  // Audit logs
  async getReportAuditLogs(reportId: string): Promise<ReportingApiResponse<ReportAuditLog[]>> {
    return this.request<ReportAuditLog[]>(`/reports/${reportId}/audit`);
  }

  async getSystemAuditLogs(options: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    action?: string;
    userId?: string;
  } = {}): Promise<ReportingApiResponse<{
    logs: ReportAuditLog[];
    total: number;
    page: number;
    limit: number;
  }>> {
    const searchParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, value.toString());
      }
    });

    return this.request<{
      logs: ReportAuditLog[];
      total: number;
      page: number;
      limit: number;
    }>(`/audit${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
  }

  // Bulk operations
  async bulkDeleteReports(reportIds: string[]): Promise<ReportingApiResponse<{ deleted: number; failed: string[] }>> {
    return this.request<{ deleted: number; failed: string[] }>('/reports/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ reportIds }),
    });
  }

  async bulkGenerateReports(reportIds: string[]): Promise<ReportingApiResponse<{ generationIds: string[] }>> {
    return this.request<{ generationIds: string[] }>('/reports/bulk-generate', {
      method: 'POST',
      body: JSON.stringify({ reportIds }),
    });
  }

  async bulkUpdateReportTags(reportIds: string[], tags: string[]): Promise<ReportingApiResponse<void>> {
    return this.request<void>('/reports/bulk-tags', {
      method: 'POST',
      body: JSON.stringify({ reportIds, tags }),
    });
  }

  // Search
  async searchReports(query: string, filters?: {
    tags?: string[];
    status?: string;
    dateRange?: { start: string; end: string };
  }): Promise<ReportingApiResponse<Report[]>> {
    return this.request<Report[]>('/reports/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters }),
    });
  }

  // Real-time updates
  subscribeToReportUpdates(
    reportId: string,
    callback: (data: any) => void
  ): () => void {
    const wsUrl = process.env.REACT_APP_WS_URL;
    if (!wsUrl) throw new Error('REACT_APP_WS_URL must be set');
    const ws = new WebSocket(`${wsUrl}/api/reporting/ws/reports/${reportId}`);

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

    return () => {
      ws.close();
    };
  }

  subscribeToGenerationUpdates(
    generationId: string,
    callback: (generation: ReportGeneration) => void
  ): () => void {
    const wsUrl = process.env.REACT_APP_WS_URL;
    if (!wsUrl) throw new Error('REACT_APP_WS_URL must be set');
    const ws = new WebSocket(`${wsUrl}/api/reporting/ws/generations/${generationId}`);

    ws.onmessage = (event) => {
      try {
        const generation = JSON.parse(event.data);
        callback(generation);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }

  // Utility methods
  async validateReportConfig(config: ReportConfig): Promise<ReportingApiResponse<{ valid: boolean; errors: string[] }>> {
    return this.request<{ valid: boolean; errors: string[] }>('/reports/validate', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getReportFormats(): Promise<ReportingApiResponse<{ format: string; label: string; description: string }[]>> {
    return this.request<{ format: string; label: string; description: string }[]>('/formats');
  }

  async getSystemHealth(): Promise<ReportingApiResponse<{
    status: 'healthy' | 'degraded' | 'down';
    services: {
      database: 'up' | 'down';
      scheduler: 'up' | 'down';
      generator: 'up' | 'down';
    };
    lastCheck: string;
  }>> {
    return this.request<{
      status: 'healthy' | 'degraded' | 'down';
      services: {
        database: 'up' | 'down';
        scheduler: 'up' | 'down';
        generator: 'up' | 'down';
      };
      lastCheck: string;
    }>('/health');
  }
}

export const reportingService = new ReportingService();
export default reportingService;