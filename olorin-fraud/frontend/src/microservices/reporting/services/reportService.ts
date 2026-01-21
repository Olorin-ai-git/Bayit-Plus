/**
 * Report Service - API client for reports microservice
 * Matches backend API endpoints from app/router/reports_router.py
 */

import axios, { AxiosInstance } from 'axios';
import { getConfig } from '@shared/config/env.config';
import { createAxiosErrorInterceptor } from '@shared/utils/axiosErrorHandler';
import {
  Report,
  ReportCreate,
  ReportUpdate,
  ReportListResponse,
  InvestigationStatistics,
  ReportShareResponse,
  ReportExportRequest,
  ReportPublishRequest,
  InvestigationReportGenerateRequest,
  InvestigationReportGenerateResponse,
} from '../types/reports';

const config = getConfig();
const API_BASE_URL = `${config.api.baseUrl}/api/v1/reports`;

// Create axios instance with auth interceptor
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Check both possible token keys for compatibility
  const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || sessionStorage.getItem('auth_token') || sessionStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Don't warn in dev mode - backend uses require_read_or_dev/require_write_or_dev
  return config;
});

// Response interceptor for error handling and toast notifications
api.interceptors.response.use(
  (response) => response,
  createAxiosErrorInterceptor(true)
);

export class ReportService {
  /**
   * Create a new report
   */
  static async createReport(data: ReportCreate): Promise<Report> {
    const response = await api.post<Report>('/', data);
    return response.data;
  }

  /**
   * List reports with filtering and pagination
   */
  static async listReports(params?: {
    owner?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ReportListResponse> {
    const response = await api.get<ReportListResponse>('/', { params });
    return response.data;
  }

  /**
   * Get a report by ID
   */
  static async getReport(reportId: string): Promise<Report> {
    const response = await api.get<Report>(`/${reportId}`);
    return response.data;
  }

  /**
   * Update a report
   */
  static async updateReport(reportId: string, data: ReportUpdate): Promise<Report> {
    const response = await api.put<Report>(`/${reportId}`, data);
    return response.data;
  }

  /**
   * Delete a report
   */
  static async deleteReport(reportId: string): Promise<void> {
    await api.delete(`/${reportId}`);
  }

  /**
   * Publish or unpublish a report
   */
  static async publishReport(reportId: string, data: ReportPublishRequest): Promise<Report> {
    const response = await api.post<Report>(`/${reportId}/publish`, data);
    return response.data;
  }

  /**
   * Get shareable URL for a report
   */
  static async shareReport(reportId: string): Promise<ReportShareResponse> {
    const response = await api.post<ReportShareResponse>(`/${reportId}/share`);
    return response.data;
  }

  /**
   * Export a report
   */
  static async exportReport(reportId: string, data: ReportExportRequest): Promise<any> {
    const response = await api.post(`/${reportId}/export`, data);
    return response.data;
  }

  /**
   * Get investigation statistics for widgets
   */
  static async getInvestigationStatistics(): Promise<InvestigationStatistics> {
    const response = await api.get<InvestigationStatistics>('/statistics/investigations');
    return response.data;
  }

  /**
   * Generate comprehensive investigation report
   * Triggers backend to generate HTML report from investigation folder
   * Uses extended timeout (3 minutes) for LLM-based report generation
   */
  static async generateInvestigationReport(
    data: InvestigationReportGenerateRequest
  ): Promise<InvestigationReportGenerateResponse> {
    const response = await api.post<InvestigationReportGenerateResponse>(
      '/investigation/generate',
      data,
      {
        timeout: 180000, // 3 minutes timeout for report generation
      }
    );
    return response.data;
  }
}

