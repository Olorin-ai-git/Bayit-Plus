/**
 * TypeScript types for Reports Microservice
 * Matches backend schemas from app/schemas/report_schemas.py
 */

export type ReportStatus = 'Draft' | 'Published' | 'Archived';

export interface Report {
  id: string;
  title: string;
  content: string;
  owner: string;
  status: ReportStatus;
  tags: string[];
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface ReportCreate {
  title: string;
  content: string;
  tags?: string[];
}

export interface ReportUpdate {
  title?: string;
  content?: string;
  status?: ReportStatus;
  tags?: string[];
}

export interface ReportListResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
}

export interface InvestigationStatistics {
  total: number;
  completed: number;
  success_rate: number;
  investigations: Array<{
    id: string;
    name: string;
    owner: string;
    status: string;
    updated: string | null; // Can be null if investigation has no updated_at timestamp
    sources?: string[]; // Optional: tools/sources used in investigation (from progress_json)
  }>;
}

export interface ReportShareResponse {
  share_url: string;
}

export interface ReportExportRequest {
  format: 'json' | 'pdf' | 'html';
}

export interface ReportPublishRequest {
  status: 'Published' | 'Draft';
}

/**
 * Investigation Report Types
 * Matches backend schemas for investigation report generation
 */

export interface InvestigationReportGenerateRequest {
  investigation_id: string;
  title?: string;
}

export interface InvestigationReportGenerateResponse {
  investigation_id: string;
  report_path: string;
  file_size_bytes: number;
  generated_at: string; // ISO datetime
  summary: {
    investigation_id: string;
    report_path: string;
    file_size_bytes: number;
  };
}

/**
 * Investigation Report List Types
 * Matches backend schemas for browsing investigation reports
 */

export interface InvestigationReportListItem {
  investigation_id: string;
  title: string | null;
  generated_at: string; // ISO datetime
  file_size_bytes: number;
  overall_risk_score: number | null;
  entity_id: string | null;
  entity_type: string | null;
  status: string | null;
  owner: string | null;
}

export interface InvestigationReportListResponse {
  reports: InvestigationReportListItem[];
  total: number;
  page: number;
  limit: number;
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

