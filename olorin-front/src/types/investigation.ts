export enum InvestigationType {
  TRANSACTION = 'TRANSACTION',
  USER = 'USER',
  DEVICE = 'DEVICE',
  FRAUD = 'FRAUD',
  ATO = 'ATO',
  NETWORK = 'NETWORK',
}

export interface AgentResult {
  agentName: string;
  status: 'completed' | 'failed' | 'in_progress' | 'running';
  executionTime: number;
  result: any;
  riskFactors: string[];
}

export interface InvestigationDetails {
  transactionId?: string;
  userId?: string;
  deviceId?: string;
  timestamp: string;
  riskFactors: string[];
}

export interface InvestigationResult {
  id: string;
  type: InvestigationType;
  status: 'SUCCESS' | 'FAILURE' | 'IN_PROGRESS' | 'CANCELLED';
  riskScore: number;
  details: InvestigationDetails;
  agentResults: AgentResult[];
  userId?: string;
  startTime?: string;
  endTime?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvestigationParams {
  type: InvestigationType;
  entityId: string;
  entityType: 'user_id' | 'device_id' | 'transaction_id';
  additionalParams?: Record<string, any>;
}

// Legacy Investigation interface for backward compatibility
export interface Investigation {
  id: string;
  entity_id: string;
  entity_type: 'user_id' | 'device_id';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  steps: any[];
  overall_risk_score?: number;
  created_at?: string;
  updated_at?: string;
  userId?: string;
  riskScore?: number;
  agentResults?: AgentResult[];
} 