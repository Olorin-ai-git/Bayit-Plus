import {
  ManualInvestigation,
  InvestigationTemplate,
  InvestigationFilter,
  InvestigationStats,
  Evidence,
  Comment,
  Collaborator,
  Timeline,
  InvestigationStep,
  ChecklistItem,
  NotificationSettings
} from '../types/manualInvestigation';

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

interface CreateInvestigationRequest {
  investigation: Omit<ManualInvestigation, 'id' | 'createdAt' | 'updatedAt' | 'timeline' | 'progress'>;
}

interface UpdateInvestigationRequest {
  id: string;
  updates: Partial<ManualInvestigation>;
}

interface AddEvidenceRequest {
  investigationId: string;
  evidence: Omit<Evidence, 'id'>;
  file?: File;
}

interface AddCommentRequest {
  comment: Omit<Comment, 'id' | 'createdAt' | 'authorId' | 'authorName'>;
  authorId: string;
  authorName: string;
}

class ManualInvestigationService {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    this.baseUrl = 'http://localhost:8090/api';
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async uploadFile(file: File, investigationId: string): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('investigationId', investigationId);

      const response = await fetch(`${this.baseUrl}/investigations/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('File upload failed');

      const data = await response.json();
      return data.fileUrl;
    } catch (error) {
      console.error('File upload error:', error);
      return null;
    }
  }

  // Investigation CRUD Operations
  async getInvestigations(
    filters?: InvestigationFilter,
    page = 1,
    pageSize = 20
  ): Promise<ApiResponse<PaginatedResponse<ManualInvestigation>>> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    });

    if (filters) {
      if (filters.status?.length) {
        queryParams.append('status', filters.status.join(','));
      }
      if (filters.priority?.length) {
        queryParams.append('priority', filters.priority.join(','));
      }
      if (filters.type?.length) {
        queryParams.append('type', filters.type.join(','));
      }
      if (filters.assignedTo?.length) {
        queryParams.append('assignedTo', filters.assignedTo.join(','));
      }
      if (filters.createdBy?.length) {
        queryParams.append('createdBy', filters.createdBy.join(','));
      }
      if (filters.tags?.length) {
        queryParams.append('tags', filters.tags.join(','));
      }
      if (filters.searchQuery) {
        queryParams.append('search', filters.searchQuery);
      }
      if (filters.dateRange) {
        queryParams.append('startDate', filters.dateRange.start);
        queryParams.append('endDate', filters.dateRange.end);
      }
    }

    return this.makeRequest<PaginatedResponse<ManualInvestigation>>(
      `/investigations/manual?${queryParams.toString()}`
    );
  }

  async getInvestigation(id: string): Promise<ApiResponse<ManualInvestigation>> {
    return this.makeRequest<ManualInvestigation>(`/investigations/manual/${id}`);
  }

  async createInvestigation(
    request: CreateInvestigationRequest
  ): Promise<ApiResponse<ManualInvestigation>> {
    return this.makeRequest<ManualInvestigation>('/investigations/manual', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async updateInvestigation(
    request: UpdateInvestigationRequest
  ): Promise<ApiResponse<ManualInvestigation>> {
    return this.makeRequest<ManualInvestigation>(`/investigations/manual/${request.id}`, {
      method: 'PUT',
      body: JSON.stringify(request.updates)
    });
  }

  async deleteInvestigation(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/investigations/manual/${id}`, {
      method: 'DELETE'
    });
  }

  async getInvestigationStats(): Promise<ApiResponse<InvestigationStats>> {
    return this.makeRequest<InvestigationStats>('/investigations/manual/stats');
  }

  // Template Operations
  async getTemplates(): Promise<ApiResponse<InvestigationTemplate[]>> {
    return this.makeRequest<InvestigationTemplate[]>('/investigations/templates');
  }

  async getTemplate(id: string): Promise<ApiResponse<InvestigationTemplate>> {
    return this.makeRequest<InvestigationTemplate>(`/investigations/templates/${id}`);
  }

  async createTemplate(
    template: Omit<InvestigationTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<InvestigationTemplate>> {
    return this.makeRequest<InvestigationTemplate>('/investigations/templates', {
      method: 'POST',
      body: JSON.stringify(template)
    });
  }

  // Step Operations
  async updateStep(
    investigationId: string,
    stepId: string,
    updates: Partial<InvestigationStep>
  ): Promise<ApiResponse<InvestigationStep>> {
    return this.makeRequest<InvestigationStep>(
      `/investigations/manual/${investigationId}/steps/${stepId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );
  }

  async startStep(
    investigationId: string,
    stepId: string
  ): Promise<ApiResponse<InvestigationStep>> {
    return this.makeRequest<InvestigationStep>(
      `/investigations/manual/${investigationId}/steps/${stepId}/start`,
      { method: 'POST' }
    );
  }

  async completeStep(
    investigationId: string,
    stepId: string,
    notes?: string
  ): Promise<ApiResponse<InvestigationStep>> {
    return this.makeRequest<InvestigationStep>(
      `/investigations/manual/${investigationId}/steps/${stepId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ notes })
      }
    );
  }

  async blockStep(
    investigationId: string,
    stepId: string,
    reason: string
  ): Promise<ApiResponse<InvestigationStep>> {
    return this.makeRequest<InvestigationStep>(
      `/investigations/manual/${investigationId}/steps/${stepId}/block`,
      {
        method: 'POST',
        body: JSON.stringify({ reason })
      }
    );
  }

  async updateChecklist(
    investigationId: string,
    stepId: string,
    itemId: string,
    completed: boolean,
    notes?: string
  ): Promise<ApiResponse<ChecklistItem>> {
    return this.makeRequest<ChecklistItem>(
      `/investigations/manual/${investigationId}/steps/${stepId}/checklist/${itemId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ completed, notes })
      }
    );
  }

  // Evidence Operations
  async addEvidence(request: AddEvidenceRequest): Promise<ApiResponse<Evidence>> {
    let evidenceData = { ...request.evidence };

    // Upload file if provided
    if (request.file) {
      const fileUrl = await this.uploadFile(request.file, request.investigationId);
      if (fileUrl) {
        evidenceData = {
          ...evidenceData,
          fileUrl,
          fileName: request.file.name,
          fileSize: request.file.size,
          mimeType: request.file.type
        };
      }
    }

    return this.makeRequest<Evidence>(
      `/investigations/manual/${request.investigationId}/evidence`,
      {
        method: 'POST',
        body: JSON.stringify(evidenceData)
      }
    );
  }

  async updateEvidence(
    investigationId: string,
    evidenceId: string,
    updates: Partial<Evidence>
  ): Promise<ApiResponse<Evidence>> {
    return this.makeRequest<Evidence>(
      `/investigations/manual/${investigationId}/evidence/${evidenceId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );
  }

  async verifyEvidence(
    investigationId: string,
    evidenceId: string
  ): Promise<ApiResponse<Evidence>> {
    return this.makeRequest<Evidence>(
      `/investigations/manual/${investigationId}/evidence/${evidenceId}/verify`,
      { method: 'POST' }
    );
  }

  async downloadEvidence(
    investigationId: string,
    evidenceId: string
  ): Promise<ApiResponse<Blob>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/investigations/manual/${investigationId}/evidence/${evidenceId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        }
      );

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      return { success: true, data: blob };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  // Comment Operations
  async getComments(investigationId: string): Promise<ApiResponse<Comment[]>> {
    return this.makeRequest<Comment[]>(`/investigations/manual/${investigationId}/comments`);
  }

  async addComment(
    investigationId: string,
    request: AddCommentRequest
  ): Promise<ApiResponse<Comment>> {
    return this.makeRequest<Comment>(
      `/investigations/manual/${investigationId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({
          ...request.comment,
          authorId: request.authorId,
          authorName: request.authorName
        })
      }
    );
  }

  async updateComment(
    investigationId: string,
    commentId: string,
    content: string
  ): Promise<ApiResponse<Comment>> {
    return this.makeRequest<Comment>(
      `/investigations/manual/${investigationId}/comments/${commentId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content })
      }
    );
  }

  async deleteComment(
    investigationId: string,
    commentId: string
  ): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(
      `/investigations/manual/${investigationId}/comments/${commentId}`,
      { method: 'DELETE' }
    );
  }

  // Collaboration Operations
  async getCollaborators(investigationId: string): Promise<ApiResponse<Collaborator[]>> {
    return this.makeRequest<Collaborator[]>(
      `/investigations/manual/${investigationId}/collaborators`
    );
  }

  async addCollaborator(
    investigationId: string,
    collaborator: Omit<Collaborator, 'id' | 'addedAt' | 'addedBy'>
  ): Promise<ApiResponse<Collaborator>> {
    return this.makeRequest<Collaborator>(
      `/investigations/manual/${investigationId}/collaborators`,
      {
        method: 'POST',
        body: JSON.stringify(collaborator)
      }
    );
  }

  async removeCollaborator(
    investigationId: string,
    collaboratorId: string
  ): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(
      `/investigations/manual/${investigationId}/collaborators/${collaboratorId}`,
      { method: 'DELETE' }
    );
  }

  async updateCollaboratorPermissions(
    investigationId: string,
    collaboratorId: string,
    permissions: Collaborator['permissions']
  ): Promise<ApiResponse<Collaborator>> {
    return this.makeRequest<Collaborator>(
      `/investigations/manual/${investigationId}/collaborators/${collaboratorId}/permissions`,
      {
        method: 'PUT',
        body: JSON.stringify({ permissions })
      }
    );
  }

  // Timeline Operations
  async getTimeline(investigationId: string): Promise<ApiResponse<Timeline[]>> {
    return this.makeRequest<Timeline[]>(`/investigations/manual/${investigationId}/timeline`);
  }

  async addTimelineEntry(
    investigationId: string,
    entry: Omit<Timeline, 'id' | 'timestamp'>
  ): Promise<ApiResponse<Timeline>> {
    return this.makeRequest<Timeline>(
      `/investigations/manual/${investigationId}/timeline`,
      {
        method: 'POST',
        body: JSON.stringify(entry)
      }
    );
  }

  // Notification Operations
  async getNotificationSettings(userId: string): Promise<ApiResponse<NotificationSettings>> {
    return this.makeRequest<NotificationSettings>(`/users/${userId}/notification-settings`);
  }

  async updateNotificationSettings(
    userId: string,
    settings: NotificationSettings
  ): Promise<ApiResponse<NotificationSettings>> {
    return this.makeRequest<NotificationSettings>(`/users/${userId}/notification-settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // Export Operations
  async exportInvestigation(
    investigationId: string,
    format: 'pdf' | 'json' | 'csv'
  ): Promise<ApiResponse<Blob>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/investigations/manual/${investigationId}/export?format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          }
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      return { success: true, data: blob };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  // Search and Analytics
  async searchInvestigations(
    query: string,
    filters?: InvestigationFilter
  ): Promise<ApiResponse<ManualInvestigation[]>> {
    const queryParams = new URLSearchParams({ query });

    if (filters) {
      if (filters.status?.length) {
        queryParams.append('status', filters.status.join(','));
      }
      if (filters.type?.length) {
        queryParams.append('type', filters.type.join(','));
      }
    }

    return this.makeRequest<ManualInvestigation[]>(
      `/investigations/manual/search?${queryParams.toString()}`
    );
  }

  async getAvailableUsers(): Promise<ApiResponse<Omit<Collaborator, 'addedAt' | 'addedBy' | 'permissions'>[]>> {
    return this.makeRequest<Omit<Collaborator, 'addedAt' | 'addedBy' | 'permissions'>[]>('/users/available');
  }

  // Utility Methods
  generateInvestigationId(): string {
    return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateEvidenceId(): string {
    return `EVD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateStepId(): string {
    return `STP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  validateInvestigationData(investigation: Partial<ManualInvestigation>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!investigation.title?.trim()) {
      errors.push('Investigation title is required');
    }

    if (!investigation.description?.trim()) {
      errors.push('Investigation description is required');
    }

    if (!investigation.type) {
      errors.push('Investigation type is required');
    }

    if (!investigation.priority) {
      errors.push('Investigation priority is required');
    }

    if (!investigation.leadInvestigator) {
      errors.push('Lead investigator is required');
    }

    if (!investigation.category?.trim()) {
      errors.push('Investigation category is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  calculateInvestigationProgress(investigation: ManualInvestigation): {
    overall: number;
    stepsCompleted: number;
    stepsTotal: number;
    evidenceCollected: number;
    estimatedTimeRemaining: number;
  } {
    const stepsCompleted = investigation.steps.filter(step => step.status === 'completed').length;
    const stepsTotal = investigation.steps.length;
    const overall = stepsTotal > 0 ? Math.round((stepsCompleted / stepsTotal) * 100) : 0;

    const estimatedTimeRemaining = investigation.steps
      .filter(step => step.status !== 'completed' && step.status !== 'skipped')
      .reduce((total, step) => {
        if (step.status === 'in_progress' && step.startedAt) {
          const elapsed = Math.round((Date.now() - new Date(step.startedAt).getTime()) / 60000);
          return total + Math.max(0, step.estimatedDuration - elapsed);
        }
        return total + step.estimatedDuration;
      }, 0);

    return {
      overall,
      stepsCompleted,
      stepsTotal,
      evidenceCollected: investigation.evidence.length,
      estimatedTimeRemaining
    };
  }
}

// Create singleton instance
export const manualInvestigationService = new ManualInvestigationService();

// Export types for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  CreateInvestigationRequest,
  UpdateInvestigationRequest,
  AddEvidenceRequest,
  AddCommentRequest
};