import { InvestigationStep } from './RiskAssessment';

export interface Investigation {
  id: string;
  entity_id: string;
  entity_type: 'user_id' | 'device_id';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  steps: InvestigationStep[];
  overall_risk_score?: number;
  created_at?: string;
  updated_at?: string;
}

export enum InvestigationType {
  FRAUD = 'FRAUD',
  ATO = 'ATO',
  DEVICE = 'DEVICE',
  NETWORK = 'NETWORK',
} 