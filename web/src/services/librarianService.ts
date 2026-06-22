import i18n from 'i18next';
import api from '@/services/api';

// TypeScript Interfaces
interface ScheduleConfig {
  cron: string;
  time: string;
  mode: 'Rule-based' | 'AI Agent';
  cost: string;
  status: 'ENABLED' | 'DISABLED';
  description: string;
}

interface AuditLimits {
  max_iterations: number;
  default_budget_usd: number;
  min_budget_usd: number;
  max_budget_usd: number;
  budget_step_usd: number;
}

interface PaginationConfig {
  reports_limit: number;
  actions_limit: number;
  activity_page_size: number;
}

export interface UIConfig {
  id_truncate_length: number;
  modal_max_height: number;
}

interface ActionTypeConfig {
  value: string;
  label: string;
  color: string;
  icon: string;
}

export interface LibrarianConfig {
  daily_schedule: ScheduleConfig;
  weekly_schedule: ScheduleConfig;
  audit_limits: AuditLimits;
  pagination: PaginationConfig;
  ui: UIConfig;
  action_types: ActionTypeConfig[];
  gcp_project_id: string;
}

export interface LibrarianStatus {
  last_audit_date: string | null;
  last_audit_status: string | null;
  total_audits_last_30_days: number;
  avg_execution_time: number;
  total_issues_fixed: number;
  system_health: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

interface TriggerAuditRequest {
  audit_type: 'daily_incremental' | 'weekly_full' | 'manual' | 'ai_agent';
  dry_run?: boolean;
  use_ai_agent?: boolean;
  max_iterations?: number;
  budget_limit_usd?: number;
  last_24_hours_only?: boolean;
  // Integrity validation (RUNS FIRST - validates content before other work)
  validate_integrity?: boolean;   // Check stream URLs and database records are valid
  // Capability options (ADDITIVE - multiple can be enabled together)
  cyb_titles_only?: boolean;      // Clean dirty titles
  tmdb_posters_only?: boolean;    // Fetch TMDB posters & metadata
  opensubtitles_enabled?: boolean; // Acquire subtitles
  classify_only?: boolean;        // Verify classification
  remove_duplicates?: boolean;    // Remove duplicate content
  // If false, skip items that already have metadata/posters/subtitles (saves API calls)
  force_updates?: boolean;
}

interface TriggerAuditResponse {
  audit_id: string;
  status: string;
  message: string;
}

export interface AuditReport {
  audit_id: string;
  audit_date: string;
  audit_type: string;
  execution_time_seconds: number;
  status: string;
  summary: Record<string, any>;
  content_results?: Record<string, any>;
  issues_count: number;
  fixes_count: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug' | 'trace';
  message: string;
  source: string;
  itemName?: string; // Content item name (movie/show title)
  contentId?: string; // Content item ID
  metadata?: Record<string, any>; // Structured data (tool_result, tool_input, etc.)
}

export interface AuditReportDetail extends AuditReport {
  content_results: Record<string, any>;
  live_channel_results: Record<string, any>;
  podcast_results: Record<string, any>;
  radio_results: Record<string, any>;
  broken_streams: any[];
  missing_metadata: any[];
  misclassifications: any[];
  orphaned_items: any[];
  fixes_applied: any[];
  manual_review_needed: any[];
  database_health: Record<string, any>;
  ai_insights: string[] | null;
  execution_logs: LogEntry[];
  created_at: string;
  completed_at: string;
}

export interface LibrarianAction {
  action_id: string;
  audit_id: string;
  timestamp: string;
  action_type: string;
  content_id: string;
  content_type: string;
  issue_type: string;
  description: string | null;
  before_state: Record<string, any>;
  after_state: Record<string, any>;
  confidence_score: number | null;
  auto_approved: boolean;
  rolled_back: boolean;
  content_title: string | null;
}

// API Methods
export const getLibrarianConfig = async (): Promise<LibrarianConfig> => {
  try {
    return await api.get('/admin/librarian/config');
  } catch (error: any) {
    throw new Error(error?.detail || 'Failed to fetch librarian configuration');
  }
};

export const getLibrarianStatus = async (): Promise<LibrarianStatus> => {
  try {
    return await api.get('/admin/librarian/status');
  } catch (error: any) {
    throw new Error('Failed to fetch librarian status');
  }
};

export const triggerAudit = async (
  request: TriggerAuditRequest
): Promise<TriggerAuditResponse> => {
  try {
    return await api.post('/admin/librarian/run-audit', request);
  } catch (error: any) {
    throw new Error('Failed to trigger audit');
  }
};

export const getAuditReports = async (
  limit: number = 10,
  auditType?: string
): Promise<AuditReport[]> => {
  try {
    return await api.get('/admin/librarian/reports', {
      params: { limit, ...(auditType ? { audit_type: auditType } : {}) },
    });
  } catch (error: any) {
    throw new Error('Failed to fetch audit reports');
  }
};

export const getAuditReportDetails = async (
  auditId: string
): Promise<AuditReportDetail> => {
  try {
    return await api.get(`/admin/librarian/reports/${auditId}`);
  } catch (error: any) {
    throw new Error('Failed to fetch audit report details');
  }
};

export const clearAuditReports = async (): Promise<{ deleted_count: number; message: string }> => {
  try {
    return await api.delete('/admin/librarian/reports');
  } catch (error: any) {
    throw new Error('Failed to clear audit reports');
  }
};

export const pauseAudit = async (auditId: string): Promise<{ status: string; message: string }> => {
  try {
    return await api.post(`/admin/librarian/audits/${auditId}/pause`);
  } catch (error: any) {
    throw new Error('Failed to pause audit');
  }
};

export const resumeAudit = async (auditId: string): Promise<{ status: string; message: string }> => {
  try {
    return await api.post(`/admin/librarian/audits/${auditId}/resume`);
  } catch (error: any) {
    throw new Error('Failed to resume audit');
  }
};

export const cancelAudit = async (auditId: string): Promise<{ status: string; message: string }> => {
  try {
    return await api.post(`/admin/librarian/audits/${auditId}/cancel`);
  } catch (error: any) {
    throw new Error('Failed to cancel audit');
  }
};

interface InterjectMessageResponse {
  success: boolean;
  message: string;
  audit_id: string;
}

export const interjectAuditMessage = async (
  auditId: string,
  message: string
): Promise<InterjectMessageResponse> => {
  try {
    return await api.post(`/admin/librarian/audits/${auditId}/interject`, {
      message,
      source: 'admin',
    });
  } catch (error: any) {
    throw new Error(error?.detail || 'Failed to send interjection');
  }
};

// Voice Command Interface
interface VoiceCommandRequest {
  command: string;
  language?: string;
}

export interface VoiceCommandResponse {
  message: string;
  spoken_response: string;
  audit_id?: string;
  status: string;
  action_taken?: string;
}

export const executeVoiceCommand = async (
  command: string,
  language?: string
): Promise<VoiceCommandResponse> => {
  try {
    return await api.post('/admin/librarian/voice-command', {
      command,
      language: language || i18n.language || 'en',
    });
  } catch (error: any) {
    throw new Error('Failed to execute voice command');
  }
};

// Reapply fixes from a completed audit
interface ReapplyFixesRequest {
  dry_run?: boolean;
  fix_types?: string[];
}

interface ReapplyFixesResponse {
  fix_audit_id: string;
  source_audit_id: string;
  status: string;
  message: string;
  stats?: Record<string, unknown>;
}

export const reapplyAuditFixes = async (
  auditId: string,
  options: ReapplyFixesRequest = {}
): Promise<ReapplyFixesResponse> => {
  try {
    return await api.post(
      `/admin/librarian/audits/${auditId}/reapply-fixes`,
      {
        dry_run: options.dry_run ?? false,
        fix_types: options.fix_types ?? [
          'titles',
          'metadata',
          'posters',
          'subtitles',
          'misclassifications',
          'broken_streams',
        ],
      },
    );
  } catch (error: any) {
    throw new Error(error?.detail || 'Failed to reapply fixes');
  }
};
