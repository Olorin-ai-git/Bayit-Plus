// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const getAuthHeaders = (): HeadersInit => {
  const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authData?.state?.token) {
    headers['Authorization'] = `Bearer ${authData.state.token}`;
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
  issues_count: number;
  fixes_count: number;
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
  description: string | null;
  auto_approved: boolean;
  rolled_back: boolean;
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
