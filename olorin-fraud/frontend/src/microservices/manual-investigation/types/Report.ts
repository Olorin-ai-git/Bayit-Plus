import { Investigation } from './Investigation';
import { User } from '@/types/User';

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'html' | 'json' | 'chart' | 'table' | 'image';
  order_index: number;
  data?: any;
  metadata?: Record<string, any>;
  visibility: 'public' | 'internal' | 'confidential';
}

export interface ReportChart {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'timeline';
  data: any;
  configuration: {
    width?: number;
    height?: number;
    colors?: string[];
    labels?: Record<string, string>;
    axes?: Record<string, any>;
    legend?: boolean;
    interactive?: boolean;
  };
}

export interface ReportAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  download_url: string;
  description?: string;
  created_at: string;
}

export interface ReportConfiguration {
  template_id?: string;
  include_sections: string[];
  exclude_sections: string[];
  format: 'pdf' | 'html' | 'json' | 'docx';
  styling: {
    theme: 'default' | 'minimal' | 'corporate' | 'dark';
    font_family: string;
    font_size: number;
    include_logo: boolean;
    include_watermark: boolean;
    page_margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  privacy: {
    redact_pii: boolean;
    classification_level: 'public' | 'internal' | 'confidential' | 'restricted';
    access_controls: string[];
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'standard' | 'executive' | 'technical' | 'compliance' | 'custom';
  version: string;

  // Template structure
  sections: Array<{
    id: string;
    title: string;
    description: string;
    required: boolean;
    default_content?: string;
    data_sources: string[];
  }>;

  // Configuration options
  default_configuration: ReportConfiguration;
  customizable_fields: string[];
  supported_formats: ReportConfiguration['format'][];

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  is_public: boolean;
  tags: string[];
  usage_count: number;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  investigation_id: string;
  investigation: Investigation;

  // Report structure and content
  sections: ReportSection[];
  charts: ReportChart[];
  attachments: ReportAttachment[];
  configuration: ReportConfiguration;

  // Status and workflow
  status: 'draft' | 'generating' | 'ready' | 'published' | 'archived' | 'error';
  generation_progress: number;
  current_operation?: string;

  // Access and sharing
  created_by: string;
  created_by_user: User;
  shared_with: Array<{
    user_id: string;
    user: User;
    permission: 'view' | 'edit' | 'admin';
    shared_at: string;
    expires_at?: string;
  }>;

  // Versioning
  version: number;
  parent_report_id?: string;
  revision_notes?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
  expires_at?: string;

  // Generated outputs
  download_urls: Record<ReportConfiguration['format'], string>;
  preview_url?: string;
  file_size?: number;

  // Quality and review
  review_status: 'pending' | 'approved' | 'rejected' | 'requires_changes';
  reviewed_by?: string;
  reviewed_at?: string;
  review_comments?: string;

  // Metadata
  tags: string[];
  custom_fields: Record<string, any>;
  audit_trail: Array<{
    action: string;
    user_id: string;
    timestamp: string;
    details?: Record<string, any>;
  }>;
}

export interface ReportGenerationJob {
  id: string;
  report_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_step: string;

  // Timing
  started_at?: string;
  completed_at?: string;
  estimated_completion?: string;

  // Results
  output_files: Record<string, string>;
  error_message?: string;
  error_details?: Record<string, any>;

  // Resource usage
  processing_time?: number;
  memory_used?: number;
  file_sizes: Record<string, number>;
}

export interface CreateReportRequest {
  title: string;
  description: string;
  investigation_id: string;
  template_id?: string;
  configuration?: Partial<ReportConfiguration>;
  sections?: Partial<ReportSection>[];
  tags?: string[];
  custom_fields?: Record<string, any>;
}

export interface UpdateReportRequest {
  title?: string;
  description?: string;
  sections?: Partial<ReportSection>[];
  configuration?: Partial<ReportConfiguration>;
  tags?: string[];
  custom_fields?: Record<string, any>;
  revision_notes?: string;
}

export interface GenerateReportRequest {
  format: ReportConfiguration['format'];
  configuration?: Partial<ReportConfiguration>;
  priority?: 'low' | 'normal' | 'high';
  notify_on_completion?: boolean;
}

export interface ShareReportRequest {
  user_ids: string[];
  permission: 'view' | 'edit' | 'admin';
  expires_at?: string;
  message?: string;
  notify_users?: boolean;
}

export interface ReportListResponse {
  reports: Report[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
  filters_applied: Record<string, any>;
}

export interface ReportTemplateListResponse {
  templates: ReportTemplate[];
  total: number;
  categories: string[];
  tags: string[];
}

export interface ReportStatsResponse {
  total_reports: number;
  reports_this_month: number;
  most_used_template: ReportTemplate;
  average_generation_time: number;
  by_status: Record<Report['status'], number>;
  by_format: Record<ReportConfiguration['format'], number>;
  recent_reports: Report[];
  popular_templates: ReportTemplate[];
}