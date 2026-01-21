import { BaseApiService } from './BaseApiService';
import { ReportComment, ReportGeneration } from '../../microservices/reporting/types/reporting';
import { env} from '../config/env.config';

export interface GenerateReportRequest {
  reportId: string;
  format?: string;
}

export interface CommentListResponse {
  comments: ReportComment[];
  total: number;
}

export class ReportingApiService extends BaseApiService {
  constructor() {
    super(env.apiBaseUrl);
  }

  async generateReport(request: GenerateReportRequest): Promise<ReportGeneration> {
    return this.post<ReportGeneration>('/api/reports/generate', request);
  }

  async retryReportGeneration(generationId: string): Promise<ReportGeneration> {
    return this.post<ReportGeneration>(`/api/reports/generations/${generationId}/retry`, {});
  }

  async addComment(comment: Omit<ReportComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportComment> {
    return this.post<ReportComment>('/api/reports/comments', comment);
  }

  async getComments(reportId: string): Promise<CommentListResponse> {
    return this.get<CommentListResponse>(`/api/reports/${reportId}/comments`);
  }
}

export const reportingApiService = new ReportingApiService();
