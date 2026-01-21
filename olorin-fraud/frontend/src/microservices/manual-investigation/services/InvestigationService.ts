import { ApiService } from './ApiService';
import {
  Investigation,
  CreateInvestigationRequest,
  UpdateInvestigationRequest,
  InvestigationListResponse,
  InvestigationStatsResponse,
  PaginationParams,
  FilterParams,
  ApiResponse
} from '../types';

export class InvestigationService extends ApiService {
  private readonly basePath = '/api/investigations';

  /**
   * Create a new investigation
   */
  async create(data: CreateInvestigationRequest): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(this.basePath, data);
    return this.handleResponse(response);
  }

  /**
   * Get investigation by ID
   */
  async getById(id: string): Promise<Investigation> {
    const response = await this.get<ApiResponse<Investigation>>(`${this.basePath}/${id}`);
    return this.handleResponse(response);
  }

  /**
   * Update investigation
   */
  async update(id: string, data: UpdateInvestigationRequest): Promise<Investigation> {
    const response = await this.put<ApiResponse<Investigation>>(`${this.basePath}/${id}`, data);
    return this.handleResponse(response);
  }

  /**
   * Delete investigation
   */
  async delete(id: string): Promise<void> {
    const response = await this.del<ApiResponse<void>>(`${this.basePath}/${id}`);
    this.handleResponse(response);
  }

  /**
   * List investigations with pagination and filters
   */
  async list(
    pagination: PaginationParams = {},
    filters: FilterParams = {}
  ): Promise<InvestigationListResponse> {
    const params = new URLSearchParams();

    // Add pagination parameters
    if (pagination.page) params.append('page', pagination.page.toString());
    if (pagination.per_page) params.append('per_page', pagination.per_page.toString());
    if (pagination.sort_by) params.append('sort_by', pagination.sort_by);
    if (pagination.sort_order) params.append('sort_order', pagination.sort_order);

    // Add filter parameters
    if (filters.search) params.append('search', filters.search);
    if (filters.status?.length) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters.priority?.length) {
      filters.priority.forEach(priority => params.append('priority', priority));
    }
    if (filters.created_after) params.append('created_after', filters.created_after);
    if (filters.created_before) params.append('created_before', filters.created_before);
    if (filters.assigned_to?.length) {
      filters.assigned_to.forEach(userId => params.append('assigned_to', userId));
    }
    if (filters.tags?.length) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }

    const url = params.toString() ? `${this.basePath}?${params}` : this.basePath;
    const response = await this.get<ApiResponse<InvestigationListResponse>>(url);
    return this.handleResponse(response);
  }

  /**
   * Get investigation statistics
   */
  async getStats(): Promise<InvestigationStatsResponse> {
    const response = await this.get<ApiResponse<InvestigationStatsResponse>>(`${this.basePath}/stats`);
    return this.handleResponse(response);
  }

  /**
   * Start investigation execution
   */
  async start(id: string): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(`${this.basePath}/${id}/start`, {});
    return this.handleResponse(response);
  }

  /**
   * Pause investigation execution
   */
  async pause(id: string): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(`${this.basePath}/${id}/pause`, {});
    return this.handleResponse(response);
  }

  /**
   * Resume investigation execution
   */
  async resume(id: string): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(`${this.basePath}/${id}/resume`, {});
    return this.handleResponse(response);
  }

  /**
   * Cancel investigation execution
   */
  async cancel(id: string): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(`${this.basePath}/${id}/cancel`, {});
    return this.handleResponse(response);
  }

  /**
   * Clone an existing investigation
   */
  async clone(id: string, data: { name: string; description?: string }): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(
      `${this.basePath}/${id}/clone`,
      data
    );
    return this.handleResponse(response);
  }

  /**
   * Archive investigation
   */
  async archive(id: string): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(`${this.basePath}/${id}/archive`, {});
    return this.handleResponse(response);
  }

  /**
   * Restore investigation from archive
   */
  async restore(id: string): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(`${this.basePath}/${id}/restore`, {});
    return this.handleResponse(response);
  }

  /**
   * Get investigation timeline/history
   */
  async getTimeline(id: string): Promise<Array<{
    id: string;
    event_type: string;
    description: string;
    user_id: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>> {
    const response = await this.get<ApiResponse<any[]>>(`${this.basePath}/${id}/timeline`);
    return this.handleResponse(response);
  }

  /**
   * Export investigation data
   */
  async export(id: string, format: 'json' | 'csv' | 'xlsx' = 'json'): Promise<Blob> {
    const response = await this.getBinaryResponse(`${this.basePath}/${id}/export?format=${format}`);
    return response;
  }

  /**
   * Get investigation progress summary
   */
  async getProgress(id: string): Promise<{
    overall_progress: number;
    steps_progress: Array<{
      step_id: string;
      name: string;
      status: string;
      progress: number;
    }>;
    estimated_completion?: string;
    current_step?: string;
  }> {
    const response = await this.get<ApiResponse<any>>(`${this.basePath}/${id}/progress`);
    return this.handleResponse(response);
  }

  /**
   * Assign investigation to user
   */
  async assign(id: string, userId: string): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(
      `${this.basePath}/${id}/assign`,
      { assigned_to: userId }
    );
    return this.handleResponse(response);
  }

  /**
   * Unassign investigation
   */
  async unassign(id: string): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(
      `${this.basePath}/${id}/unassign`,
      {}
    );
    return this.handleResponse(response);
  }

  /**
   * Update investigation priority
   */
  async updatePriority(id: string, priority: Investigation['priority']): Promise<Investigation> {
    const response = await this.patch<ApiResponse<Investigation>>(
      `${this.basePath}/${id}`,
      { priority }
    );
    return this.handleResponse(response);
  }

  /**
   * Add tags to investigation
   */
  async addTags(id: string, tags: string[]): Promise<Investigation> {
    const response = await this.post<ApiResponse<Investigation>>(
      `${this.basePath}/${id}/tags`,
      { tags }
    );
    return this.handleResponse(response);
  }

  /**
   * Remove tags from investigation
   */
  async removeTags(id: string, tags: string[]): Promise<Investigation> {
    const response = await this.del<ApiResponse<Investigation>>(
      `${this.basePath}/${id}/tags`,
      { tags }
    );
    return this.handleResponse(response);
  }
}