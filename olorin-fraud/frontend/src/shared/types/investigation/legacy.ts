/**
 * Investigation Legacy Types
 * Legacy types for backward compatibility with old API
 * Part of consolidated Investigation types (single source of truth)
 */

/**
 * Investigation result status (legacy)
 */
export type InvestigationResultStatus = 'SUCCESS' | 'FAILURE' | 'IN_PROGRESS' | 'CANCELLED';

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

/**
 * Type alias for backward compatibility with old imports
 * @deprecated Use InvestigationTypeEnum instead, or the new InvestigationType from common.types
 */
export { InvestigationTypeEnum as InvestigationType };

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

/**
 * Legacy Investigation interface for backward compatibility
 */
export interface LegacyInvestigation {
  id: string;
  entity_id: string;
  entity_type: 'user_id' | 'device_id' | 'transaction_id';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  steps: any[];
  overall_risk_score?: number;
  created_at?: string;
  updated_at?: string;
  userId?: string;
  riskScore?: number;
  agentResults?: AgentResult[];
}

/**
 * Legacy investigation parameters
 */
export interface LegacyInvestigationParams {
  type: InvestigationTypeEnum;
  entityId: string;
  entityType: 'user_id' | 'device_id' | 'transaction_id';
  additionalParams?: Record<string, any>;
}

/**
 * Type aliases for backward compatibility with old imports from /src/shared/types/investigation
 * @deprecated Use the explicitly named legacy types or the new types from core.ts
 */
export type Investigation = LegacyInvestigation;
export type InvestigationParams = LegacyInvestigationParams;
