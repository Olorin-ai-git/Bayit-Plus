/**
 * Investigation Core Types
 * Core investigation interfaces and enums
 * Part of consolidated Investigation types (single source of truth)
 */

import type { BaseEntity } from '../core/base.types';
import type {
  EntityType,
  InvestigationType,
  SeverityLevel,
  FindingCategory,
  Evidence,
  FilterConfig
} from '../common.types';
import type { AgentExecution } from '../agent/agent.types';

// ============================================================================
// STATUS AND PRIORITY TYPES
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

// ============================================================================
// CORE INVESTIGATION INTERFACE
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

  // Status and priority
  status: InvestigationStatus;
  priority?: Priority;

  // Investigation type
  type: InvestigationType;

  // Timestamps
  created: Date;
  updated: Date;

  // Assignment and metadata
  title?: string;
  description?: string;
  assignedTo?: string;
  tags?: string[];

  // Results and analysis
  riskScore?: number;
  findings: Finding[];
  agents: AgentExecution[];

  // Additional metadata
  metadata: InvestigationMetadata;
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
// PARAMETERS AND OPTIONS
// ============================================================================

/**
 * Parameters for starting new investigations
 */
export interface InvestigationParams {
  entityType: EntityType | string;
  entityValue: string;
  type: InvestigationType;
  priority?: Priority;
  tags?: string[];
  options?: InvestigationOptions;
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
// RESULTS
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

// ============================================================================
// FILTERS
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
