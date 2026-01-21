export interface UserOutcome {
  userId: string;
  outcome: OutcomeType;
  timestamp: Date;
  context: OutcomeContext;
  metrics: OutcomeMetrics;
}

export enum OutcomeType {
  JOB_APPLICATION = 'JOB_APPLICATION',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  JOB_OFFER = 'JOB_OFFER',
  JOB_ACCEPTED = 'JOB_ACCEPTED',
  PROFILE_VIEW = 'PROFILE_VIEW',
  CONTACT_REQUEST = 'CONTACT_REQUEST'
}

export interface OutcomeContext {
  source: string;
  industry?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface OutcomeMetrics {
  responseTime?: number;
  conversionRate?: number;
  qualityScore?: number;
  userSatisfaction?: number;
}

export interface OutcomeEvent {
  id: string;
  outcomeId: string;
  eventType: string;
  timestamp: Date;
  data: Record<string, any>;
}