import { BaseApiService } from '@shared/services/BaseApiService';

export interface Investigation {
  id: string;
  title: string;
  description: string;
  type: 'fraud' | 'account_takeover' | 'device_spoofing' | 'compliance' | 'risk_assessment';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  estimatedCompletion?: string;
  progress: number;
  findings?: InvestigationFinding[];
  evidence?: EvidenceItem[];
  metadata?: Record<string, any>;
}

export interface InvestigationFinding {
  id: string;
  type: 'risk' | 'anomaly' | 'violation' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  confidence: number;
  timestamp: string;
  agentId?: string;
  evidenceIds?: string[];
}

export interface EvidenceItem {
  id: string;
  type: 'log' | 'transaction' | 'device_data' | 'user_behavior' | 'network_data';
  source: string;
  title: string;
  description?: string;
  data: Record<string, any>;
  timestamp: string;
  investigationId: string;
  verified: boolean;
  tags?: string[];
}

export interface InvestigationParams {
  type: Investigation['type'];
  title: string;
  description?: string;
  priority?: Investigation['priority'];
  assignee?: string;
  metadata?: Record<string, any>;
  autoStart?: boolean;
}

export interface InvestigationUpdateParams {
  title?: string;
  description?: string;
  status?: Investigation['status'];
  priority?: Investigation['priority'];
  assignee?: string;
  progress?: number;
  metadata?: Record<string, any>;
}

export interface InvestigationFilters {
  type?: Investigation['type'] | Investigation['type'][];
  status?: Investigation['status'] | Investigation['status'][];
  priority?: Investigation['priority'] | Investigation['priority'][];
  assignee?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginatedInvestigations {
  investigations: Investigation[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface InvestigationStatistics {
  totalInvestigations: number;
  activeInvestigations: number;
  completedToday: number;
  averageCompletionTime: number;
  successRate: number;
  byType: Record<Investigation['type'], number>;
  byStatus: Record<Investigation['status'], number>;
  byPriority: Record<Investigation['priority'], number>;
}

export class InvestigationService extends BaseApiService {
  private readonly baseEndpoint = '/api/investigations';

  constructor(baseUrl: string = process.env.REACT_APP_API_URL || 'http://localhost:8090') {
    super(baseUrl);
  }

  async createInvestigation(params: InvestigationParams): Promise<Investigation> {
    return this.post<Investigation>(this.baseEndpoint, params);
  }

  async getInvestigation(id: string): Promise<Investigation> {
    return this.get<Investigation>(`${this.baseEndpoint}/${id}`);
  }

  async updateInvestigation(id: string, params: InvestigationUpdateParams): Promise<Investigation> {
    return this.patch<Investigation>(`${this.baseEndpoint}/${id}`, params);
  }

  async deleteInvestigation(id: string): Promise<void> {
    return this.delete(`${this.baseEndpoint}/${id}`);
  }

  async getInvestigations(
    filters?: InvestigationFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedInvestigations> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(`${key}[]`, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    return this.get<PaginatedInvestigations>(`${this.baseEndpoint}?${params.toString()}`);
  }

  async startInvestigation(id: string): Promise<Investigation> {
    return this.post<Investigation>(`${this.baseEndpoint}/${id}/start`);
  }

  async pauseInvestigation(id: string): Promise<Investigation> {
    return this.post<Investigation>(`${this.baseEndpoint}/${id}/pause`);
  }

  async resumeInvestigation(id: string): Promise<Investigation> {
    return this.post<Investigation>(`${this.baseEndpoint}/${id}/resume`);
  }

  async cancelInvestigation(id: string, reason?: string): Promise<Investigation> {
    return this.post<Investigation>(`${this.baseEndpoint}/${id}/cancel`, { reason });
  }

  async completeInvestigation(id: string, summary?: string): Promise<Investigation> {
    return this.post<Investigation>(`${this.baseEndpoint}/${id}/complete`, { summary });
  }

  async getInvestigationFindings(id: string): Promise<InvestigationFinding[]> {
    return this.get<InvestigationFinding[]>(`${this.baseEndpoint}/${id}/findings`);
  }

  async addInvestigationFinding(id: string, finding: Omit<InvestigationFinding, 'id' | 'timestamp'>): Promise<InvestigationFinding> {
    return this.post<InvestigationFinding>(`${this.baseEndpoint}/${id}/findings`, finding);
  }

  async getInvestigationEvidence(id: string): Promise<EvidenceItem[]> {
    return this.get<EvidenceItem[]>(`${this.baseEndpoint}/${id}/evidence`);
  }

  async addEvidence(id: string, evidence: Omit<EvidenceItem, 'id' | 'timestamp' | 'investigationId'>): Promise<EvidenceItem> {
    return this.post<EvidenceItem>(`${this.baseEndpoint}/${id}/evidence`, evidence);
  }

  async verifyEvidence(investigationId: string, evidenceId: string, verified: boolean): Promise<EvidenceItem> {
    return this.patch<EvidenceItem>(`${this.baseEndpoint}/${investigationId}/evidence/${evidenceId}`, { verified });
  }

  async getInvestigationStatistics(timeframe?: 'day' | 'week' | 'month' | 'year'): Promise<InvestigationStatistics> {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.get<InvestigationStatistics>(`${this.baseEndpoint}/statistics${params}`);
  }

  async exportInvestigation(id: string, format: 'pdf' | 'json' | 'csv' = 'pdf'): Promise<Blob> {
    const response = await this.fetch(`${this.baseEndpoint}/${id}/export?format=${format}`, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  async duplicateInvestigation(id: string, title?: string): Promise<Investigation> {
    return this.post<Investigation>(`${this.baseEndpoint}/${id}/duplicate`, { title });
  }

  async getInvestigationHistory(id: string): Promise<any[]> {
    return this.get<any[]>(`${this.baseEndpoint}/${id}/history`);
  }

  async assignInvestigation(id: string, assigneeId: string): Promise<Investigation> {
    return this.patch<Investigation>(`${this.baseEndpoint}/${id}/assign`, { assigneeId });
  }

  async unassignInvestigation(id: string): Promise<Investigation> {
    return this.patch<Investigation>(`${this.baseEndpoint}/${id}/unassign`);
  }

  async addComment(id: string, comment: string): Promise<any> {
    return this.post(`${this.baseEndpoint}/${id}/comments`, { comment });
  }

  async getComments(id: string): Promise<any[]> {
    return this.get<any[]>(`${this.baseEndpoint}/${id}/comments`);
  }

  async subscribeToUpdates(id: string, callback: (investigation: Investigation) => void): Promise<() => void> {
    // WebSocket subscription for real-time updates
    const wsUrl = this.baseUrl.replace('http', 'ws') + `/ws/investigations/${id}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const investigation = JSON.parse(event.data);
        callback(investigation);
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
}

export const investigationService = new InvestigationService();