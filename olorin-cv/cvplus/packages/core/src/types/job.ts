/**
 * Job Types
 * Core job processing and management type definitions
  */

export interface Job {
  id: string;
  userId: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  config: JobConfig;
  metadata: JobMetadata;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export enum JobType {
  CV_PROCESSING = 'cv_processing',
  PORTFOLIO_GENERATION = 'portfolio_generation',
  VIDEO_GENERATION = 'video_generation',
  PODCAST_GENERATION = 'podcast_generation',
  ANALYTICS_PROCESSING = 'analytics_processing',
  PORTAL_GENERATION = 'portal_generation',
  RAG_PROCESSING = 'rag_processing'
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRY = 'retry'
}

export enum JobPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface JobConfig {
  timeout?: number;
  retryDelay?: number;
  dependencies?: string[];
  resources?: {
    memory?: string;
    cpu?: number;
    timeout?: number;
  };
}

export interface JobMetadata {
  source: string;
  version: string;
  environment: string;
  correlationId?: string;
  parentJobId?: string;
  tags?: string[];
  [key: string]: any;
}

export interface JobResult {
  jobId: string;
  status: JobStatus;
  data?: any;
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
  duration: number;
  metadata: Record<string, any>;
}

export interface JobQueue {
  name: string;
  concurrency: number;
  priority: JobPriority;
  jobs: Job[];
}

export interface ParsedCV {
  id: string;
  userId: string;
  originalText: string;
  extractedData: {
    personalInfo: {
      name: string;
      email: string;
      phone: string;
      location: string;
    };
    experience: Array<{
      company: string;
      position: string;
      startDate: string;
      endDate: string;
      description: string;
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field: string;
      year: string;
    }>;
    skills: string[];
    certifications: string[];
  };
  analysis: {
    atsScore: number;
    keywords: string[];
    recommendations: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}