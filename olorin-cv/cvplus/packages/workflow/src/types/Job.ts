/**
 * Job-related type definitions for the CVPlus Workflow module
  */

export type JobStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export interface Job {
  id: string;
  userId: string;
  status: JobStatus;
  title: string;
  description?: string;
  templateId?: string;
  features: string[]; // Array of feature IDs
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  metadata?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
}

export interface JobProgress {
  totalFeatures: number;
  completedFeatures: number;
  skippedFeatures: number;
  remainingFeatures: number;
  progressPercentage: number;
  estimatedCompletion?: Date;
  currentFeature?: string;
}

export interface WorkflowState {
  jobId: string;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  stepsRemaining: number;
  nextSteps: string[];
  blockedSteps: string[];
  workflow: {
    [stepId: string]: {
      status: 'pending' | 'processing' | 'completed' | 'skipped' | 'failed';
      startedAt?: Date;
      completedAt?: Date;
      dependencies: string[];
      metadata?: Record<string, any>;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface JobMetrics {
  totalJobs: number;
  jobsByStatus: Record<JobStatus, number>;
  averageProcessingTime: number;
  successRate: number;
  failureRate: number;
  dailyJobCount: number;
  weeklyJobCount: number;
  monthlyJobCount: number;
}

export interface JobFilter {
  status?: JobStatus[];
  userId?: string;
  templateId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  priority?: ('low' | 'medium' | 'high')[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}