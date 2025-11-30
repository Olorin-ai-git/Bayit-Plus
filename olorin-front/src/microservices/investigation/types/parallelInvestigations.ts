// Types for Parallel Investigations Monitoring

export interface ParallelInvestigation {
  id: string;
  investigationId?: string;
  entityValue?: string;
  status: InvestigationStatusType;
  riskScore: number;
  startTime: string;
  createdAt?: string;
  progress?: number;
  settings?: {
    entities?: Array<{
      entityValue: string;
    }>;
  };
}

export type InvestigationStatusType =
  | 'CREATED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ERROR'
  | 'CANCELLED';

export interface InvestigationPollingHookReturn {
  investigations: ParallelInvestigation[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface InvestigationFiltersProps {
  selectedStatuses: InvestigationStatusType[];
  onStatusChange: (statuses: InvestigationStatusType[]) => void;
  disabled?: boolean;
}
