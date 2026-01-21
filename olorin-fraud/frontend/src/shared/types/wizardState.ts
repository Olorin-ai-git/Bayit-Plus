/**
 * TypeScript type definitions for wizard state.
 * Feature: 005-polling-and-persistence
 *
 * Mirrors backend Pydantic schemas for type safety.
 *
 * SYSTEM MANDATE Compliance:
 * - No hardcoded values
 * - Complete type definitions
 * - Matches backend contract exactly
 */

export enum WizardStep {
  SETTINGS = 'SETTINGS',
  PROGRESS = 'PROGRESS'
}

export enum LifecycleStage {
  CREATED = 'CREATED',
  SETTINGS = 'SETTINGS',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum InvestigationStatus {
  CREATED = 'CREATED',
  SETTINGS = 'SETTINGS',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED'
}

export enum EntityType {
  USER_ID = 'user_id',
  EMAIL = 'email',
  IP_ADDRESS = 'ip_address',
  DEVICE_ID = 'device_id',
  PHONE_NUMBER = 'phone_number',
  CARD_NUMBER = 'card_number',
  ACCOUNT_ID = 'account_id',
  TRANSACTION_ID = 'transaction_id'
}

export enum CorrelationMode {
  OR = 'OR',
  AND = 'AND'
}

export interface Entity {
  entity_type: EntityType;
  entity_value: string;
}

export interface TimeRange {
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  window_days?: number; // Investigation window duration in days
}

export interface ToolSelection {
  tool_name: string;
  enabled: boolean;
  config?: Record<string, any>;
}

// Import InvestigationSettings from wizard.types.ts (derived from Zod schema)
// This ensures we use the correct type with toolSelections instead of tools
export type { InvestigationSettings } from './wizard.types';

export interface InvestigationPhase {
  phase_name: 'PLANNING' | 'EXECUTION' | 'ANALYSIS' | 'FINALIZATION';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';
  started_at?: string;
  completed_at?: string;
}

export interface ToolExecution {
  tool_name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR' | 'SKIPPED';
  started_at?: string;
  completed_at?: string;
  result_summary?: string;
}

export interface InvestigationProgress {
  current_phase: 'PLANNING' | 'EXECUTION' | 'ANALYSIS' | 'FINALIZATION';
  phases: InvestigationPhase[];
  tools_executed: ToolExecution[];
  percent_complete: number;
}

export interface InvestigationResults {
  risk_score: number;
  findings: Record<string, any>[];
  completed_at: string;
  report_url?: string;
}

export interface WizardState {
  investigation_id: string;
  user_id: string;
  wizard_step: WizardStep;
  settings?: InvestigationSettings;
  progress?: InvestigationProgress;
  results?: InvestigationResults;
  status: InvestigationStatus;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  version: number;
}

export interface WizardStateCreate {
  investigation_id?: string; // Optional - backend will generate UUID if not provided
  lifecycle_stage?: LifecycleStage | string;
  settings?: InvestigationSettings;
  status: InvestigationStatus;
}

export interface WizardStateUpdate {
  wizard_step?: WizardStep;
  settings?: InvestigationSettings;
  progress?: InvestigationProgress;
  results?: InvestigationResults;
  status?: InvestigationStatus;
  version: number;
}

// Polling types
export interface PollingConfig {
  baseInterval: number;        // 2000ms
  fastInterval: number;        // 500ms
  slowInterval: number;        // 5000ms
  maxRetries: number;          // 3
  backoffMultiplier: number;   // 2
  maxBackoff: number;          // 30000ms
}

export interface PollingState {
  isPolling: boolean;
  currentInterval: number;
  retryCount: number;
  lastPollTime: string | null;
  error: string | null;
}

// Store types
export interface WizardStoreState {
  // Wizard data state (Feature 005)
  wizardState: WizardState | null;
  serverState: WizardState | null;
  localChanges: Partial<WizardState> | null;

  // Navigation state removed - derived from URL instead
  // currentStep: derived from location.pathname
  // completedSteps: derived from investigation status or API response

  // UI state
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;

  // Polling state
  polling: PollingState;

  // Settings form state (persisted across navigation)
  settings: InvestigationSettings | null;
  
  // Investigation data removed - fetched from API based on URL ?id=xxx

  // Data actions (Feature 005)
  createState: (data: WizardStateCreate) => Promise<void>;
  loadState: (investigationId: string) => Promise<void>;
  updateState: (updates: Partial<WizardState>) => Promise<void>;
  deleteState: (investigationId: string) => Promise<void>;
  startPolling: (investigationId: string) => void;
  stopPolling: () => void;
  syncWithServer: (investigationId: string) => Promise<void>;

  // Navigation actions removed - use React Router navigation instead
  // Navigation handled via: navigate('/investigation/settings') or navigate('/investigation/progress?id=xxx')
  
  resetWizard: () => void;

  // Backward compatibility actions (Feature 004)
  updateSettings: (settingsUpdate: Partial<InvestigationSettings>) => void;
  startInvestigation: () => void;
}
