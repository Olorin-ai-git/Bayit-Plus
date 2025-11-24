/**
 * Investigation Types - SINGLE SOURCE OF TRUTH
 * CONSOLIDATED from 3 duplicate files into one canonical source
 *
 * Previous files (NOW DELETED):
 * - /src/shared/types/investigation.types.ts (141 lines)
 * - /src/shared/types/investigation.ts (60 lines)
 *
 * All investigation-related types for the Investigation Service
 */

import type { BaseEntity } from '../core/base.types';
import type {
  EntityType,
  InvestigationType,
  EntityStatus,
  ExecutionStatus,
  SeverityLevel,
  FindingCategory,
  Evidence,
  PaginationState,
  FilterConfig
} from '../common.types';
import type { AgentExecution } from '../agent/agent.types';

// ============================================================================
// INVESTIGATION STATUS AND PRIORITY TYPES
// ============================================================================

/**
 * Investigation lifecycle status
 */
export type InvestigationStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'IN_PROGRESS'  // Legacy compatibility
  | 'COMPLETED'    // Legacy compatibility
  | 'CANCELLED';   // Legacy compatibility

/**
 * Investigation priority levels
 */
export type Priority = 'low' | 'normal' | 'medium' | 'high' | 'critical';

/**
 * Investigation result status (legacy)
 */
export type InvestigationResultStatus = 'SUCCESS' | 'FAILURE' | 'IN_PROGRESS' | 'CANCELLED';

// ============================================================================
// INVESTIGATION ENUMS (Legacy compatibility)
// ============================================================================

/**
 * Legacy investigation type enum for backward compatibility
 */
export enum InvestigationTypeEnum {
  TRANSACTION = 'TRANSACTION',
  USER = 'USER',
  DEVICE = 'DEVICE',
  FRAUD = 'FRAUD',
  ATO = 'ATO',
  NETWORK = 'NETWORK'
}

// ============================================================================
// CORE INVESTIGATION INTERFACES
// ============================================================================

/**
 * Core Investigation entity
 * Combines all properties from legacy and new investigation types
 */
export interface Investigation extends BaseEntity {
  // Core identification
  id: string;
  userId: string;

  // Entity information
  entityType: EntityType | string;
  entityValue: string;
  entity_id?: string;  // Legacy compatibility
  entity_type?: 'user_id' | 'device_id' | 'transaction_id';  // Legacy

  // Status and priority
  status: InvestigationStatus;
  priority?: Priority;

  // Investigation type
  type: InvestigationType | InvestigationTypeEnum;

  // Timestamps
  created: Date;
  updated: Date;
  created_at?: string;  // Legacy compatibility
  updated_at?: string;  // Legacy compatibility

  // Assignment and metadata
  title?: string;
  description?: string;
  assignedTo?: string;
  tags?: string[];

  // Results and analysis
  riskScore?: number;
  overall_risk_score?: number;  // Legacy compatibility
  findings: Finding[];
  agents: AgentExecution[];
  agentResults?: AgentResult[];  // Legacy compatibility
  steps?: any[];  // Legacy compatibility

  // Additional metadata
  metadata: InvestigationMetadata | Record<string, any>;
}

/**
 * Finding from an investigation
 */
export interface Finding {
  id: string;
  agentId: string;
  category: FindingCategory;
  severity: SeverityLevel;
  title: string;
  description: string;
  evidence: Evidence[];
  confidence: number; // 0-1
}

/**
 * Investigation metadata
 */
export interface InvestigationMetadata {
  estimatedDuration?: number;
  dataSourcesQueried?: string[];
  apiCallsUsed?: number;
  tokensUsed?: number;
  [key: string]: any;
}

// ============================================================================
// AGENT AND EXECUTION TYPES
// ============================================================================

/**
 * Agent execution result (legacy)
 */
export interface AgentResult {
  agentName: string;
  status: 'completed' | 'failed' | 'in_progress' | 'running';
  executionTime: number;
  result: any;
  riskFactors: string[];
}

/**
 * Investigation execution details (legacy)
 */
export interface InvestigationDetails {
  transactionId?: string;
  userId?: string;
  deviceId?: string;
  timestamp: string;
  riskFactors: string[];
}

// ============================================================================
// INVESTIGATION PARAMETERS AND OPTIONS
// ============================================================================

/**
 * Parameters for starting new investigations
 */
export interface InvestigationParams {
  // New API style
  entityType: EntityType | string;
  entityValue: string;
  type: InvestigationType | InvestigationTypeEnum;
  priority?: Priority;
  tags?: string[];
  options?: InvestigationOptions;

  // Legacy API style
  entityId?: string;
  additionalParams?: Record<string, any>;
}

/**
 * Investigation execution options
 */
export interface InvestigationOptions {
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
  agents?: string[];
  [key: string]: any;
}

// ============================================================================
// INVESTIGATION RESULTS
// ============================================================================

/**
 * Investigation results
 */
export interface InvestigationResults {
  investigationId: string;
  riskScore: number;
  findings: Finding[];
  summary: string;
  recommendations: string[];
  completedAt: Date;
}

/**
 * Investigation result (legacy format)
 */
export interface InvestigationResult {
  id: string;
  type: InvestigationTypeEnum;
  status: InvestigationResultStatus;
  riskScore: number;
  details: InvestigationDetails;
  agentResults: AgentResult[];
  userId?: string;
  startTime?: string;
  endTime?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// INVESTIGATION FILTERS AND QUERIES
// ============================================================================

/**
 * Investigation filters for querying
 */
export interface InvestigationFilters extends FilterConfig {
  status?: InvestigationStatus[];
  type?: InvestigationType[];
  entityType?: EntityType[];
  priority?: Priority[];
  assignedTo?: string;
  tags?: string[];
  riskScoreMin?: number;
  riskScoreMax?: number;
  dateFrom?: Date;
  dateTo?: Date;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// ============================================================================
// INVESTIGATION STATE MANAGEMENT
// ============================================================================

/**
 * Investigation service state
 */
export interface InvestigationState {
  current: Investigation | null;
  history: Investigation[];
  active: Investigation[];
  filters: InvestigationFilters;
  pagination: PaginationState;
}

/**
 * Investigation service actions
 */
export interface InvestigationActions {
  startInvestigation: (params: InvestigationParams) => Promise<Investigation>;
  stopInvestigation: (id: string) => Promise<void>;
  updateProgress: (id: string, progress: number) => void;
  addFinding: (id: string, finding: Finding) => void;
  setRiskScore: (id: string, score: number) => void;
  loadInvestigation: (id: string) => Promise<Investigation>;
  deleteInvestigation: (id: string) => Promise<void>;
  setFilters: (filters: InvestigationFilters) => void;
  clearFilters: () => void;
}

/**
 * Investigation progress update (real-time)
 */
export interface InvestigationProgress {
  investigationId: string;
  progress: number; // 0-100
  currentPhase: string;
  message: string;
  timestamp: Date;
}
