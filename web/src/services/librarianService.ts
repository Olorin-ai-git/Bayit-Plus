import i18n from 'i18next';
import { useAuthStore } from '@/stores/authStore';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getAuthHeaders = (): HeadersInit => {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept-Language': i18n.language || 'en',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// TypeScript Interfaces
export interface ScheduleConfig {
  cron: string;
  time: string;
  mode: 'Rule-based' | 'AI Agent';
  cost: string;
  status: 'ENABLED' | 'DISABLED';
  description: string;
}

export interface AuditLimits {
  max_iterations: number;
  default_budget_usd: number;
  min_budget_usd: number;
  max_budget_usd: number;
  budget_step_usd: number;
}

export interface PaginationConfig {
  reports_limit: number;
  actions_limit: number;
  activity_page_size: number;
}

export interface UIConfig {
  id_truncate_length: number;
  modal_max_height: number;
}

export interface ActionTypeConfig {
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

export interface TriggerAuditRequest {
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

export interface TriggerAuditResponse {
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

export interface RollbackResponse {
  success: boolean;
  message: string;
}

// API Methods
export const getLibrarianConfig = async (): Promise<LibrarianConfig> => {
  const response = await fetch(`${API_BASE_URL}/admin/librarian/config`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch librarian configuration' }));
    throw new Error(errorData.detail || 'Failed to fetch librarian configuration');
  }

  return response.json();
};

export const getLibrarianStatus = async (): Promise<LibrarianStatus> => {
  const response = await fetch(`${API_BASE_URL}/admin/librarian/status`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch librarian status');
  }

  return response.json();
};

export const triggerAudit = async (
  request: TriggerAuditRequest
): Promise<TriggerAuditResponse> => {
  const response = await fetch(`${API_BASE_URL}/admin/librarian/run-audit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to trigger audit');
  }

  return response.json();
};

export const getAuditReports = async (
  limit: number = 10,
  auditType?: string
): Promise<AuditReport[]> => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (auditType) {
    params.append('audit_type', auditType);
  }

  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/reports?${params.toString()}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch audit reports');
  }

  return response.json();
};

export const getAuditReportDetails = async (
  auditId: string
): Promise<AuditReportDetail> => {
  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/reports/${auditId}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch audit report details');
  }

  return response.json();
};

export const clearAuditReports = async (): Promise<{ deleted_count: number; message: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/reports`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to clear audit reports');
  }

  return response.json();
};

export const pauseAudit = async (auditId: string): Promise<{ status: string; message: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/audits/${auditId}/pause`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to pause audit');
  }

  return response.json();
};

export const resumeAudit = async (auditId: string): Promise<{ status: string; message: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/audits/${auditId}/resume`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to resume audit');
  }

  return response.json();
};

export const cancelAudit = async (auditId: string): Promise<{ status: string; message: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/audits/${auditId}/cancel`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to cancel audit');
  }

  return response.json();
};

export interface InterjectMessageResponse {
  success: boolean;
  message: string;
  audit_id: string;
}

export const interjectAuditMessage = async (
  auditId: string,
  message: string
): Promise<InterjectMessageResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/audits/${auditId}/interject`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, source: 'admin' }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to send interjection' }));
    throw new Error(errorData.detail || 'Failed to send interjection');
  }

  return response.json();
};

export const getLibrarianActions = async (
  auditId?: string,
  actionType?: string,
  limit: number = 50
): Promise<LibrarianAction[]> => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (auditId) {
    params.append('audit_id', auditId);
  }
  if (actionType) {
    params.append('action_type', actionType);
  }

  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/actions?${params.toString()}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch librarian actions');
  }

  return response.json();
};

export const rollbackAction = async (
  actionId: string
): Promise<RollbackResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/actions/${actionId}/rollback`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to rollback action');
  }

  return response.json();
};

// Voice Command Interface
export interface VoiceCommandRequest {
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
  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/voice-command`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        command,
        language: language || i18n.language || 'en'
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to execute voice command');
  }

  return response.json();
};

// Reapply fixes from a completed audit
export interface ReapplyFixesRequest {
  dry_run?: boolean;
  fix_types?: string[];
}

export interface ReapplyFixesResponse {
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
  const response = await fetch(
    `${API_BASE_URL}/admin/librarian/audits/${auditId}/reapply-fixes`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        dry_run: options.dry_run ?? false,
        fix_types: options.fix_types ?? [
          'titles',
          'metadata',
          'posters',
          'subtitles',
          'misclassifications',
          'broken_streams',
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to reapply fixes');
  }

  return response.json();
};
