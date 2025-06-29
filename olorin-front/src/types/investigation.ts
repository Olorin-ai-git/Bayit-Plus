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

export interface InvestigationResult {
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
}
