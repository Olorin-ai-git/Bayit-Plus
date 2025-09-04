export enum InvestigationType {
  TRANSACTION = 'TRANSACTION',
  USER = 'USER',
  DEVICE = 'DEVICE',
}

export interface InvestigationParams {
  type: InvestigationType;
  userId?: string;
  deviceId?: string;
  transactionId?: string;
}

export interface AgentResult {
  agentName: string;
  status: string;
  executionTime: number;
  result: any;
  riskFactors: string[];
}

export interface Investigation {
  id: string;
  type: InvestigationType;
  status: 'SUCCESS' | 'FAILURE';
  riskScore: number;
  details: {
    userId?: string;
    deviceId?: string;
    transactionId?: string;
    timestamp: string;
    riskFactors: string[];
  };
  agentResults: AgentResult[];
}

export interface InvestigationResult extends Investigation {}