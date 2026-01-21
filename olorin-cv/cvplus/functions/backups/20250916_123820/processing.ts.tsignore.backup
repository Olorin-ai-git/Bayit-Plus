// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Processing Constants
 * 
 * Constants for CV processing, generation, and workflow management.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// PROCESSING STAGES
// ============================================================================

export const PROCESSING_STAGES = {
  UPLOAD: 'upload',
  PARSING: 'parsing',
  ANALYSIS: 'analysis',
  ENHANCEMENT: 'enhancement',
  GENERATION: 'generation',
  FORMATTING: 'formatting',
  OPTIMIZATION: 'optimization',
  FINALIZATION: 'finalization'
} as const;

export type ProcessingStage = typeof PROCESSING_STAGES[keyof typeof PROCESSING_STAGES];

// ============================================================================
// PROCESSING STATUS FLOW
// ============================================================================

export const PROCESSING_STATUS_FLOW = {
  pending: ['queued', 'processing', 'failed'],
  queued: ['initializing', 'cancelled'],
  initializing: ['processing', 'failed'],
  processing: ['analyzing', 'failed', 'cancelled'],
  analyzing: ['generating', 'failed'],
  generating: ['validating', 'failed'],
  validating: ['finalizing', 'failed'],
  finalizing: ['completed', 'failed'],
  completed: [],
  failed: ['pending'], // Can retry
  cancelled: ['pending'], // Can restart
  timeout: ['pending'] // Can retry
} as const;

// ============================================================================
// PROCESSING TIMEOUTS (renamed to avoid conflict)
// ============================================================================

export const CORE_PROCESSING_TIMEOUTS = {
  CV_PARSING: 60 * 1000, // 1 minute
  CV_ANALYSIS: 120 * 1000, // 2 minutes
  CV_GENERATION: 300 * 1000, // 5 minutes
  VIDEO_GENERATION: 600 * 1000, // 10 minutes
  PODCAST_GENERATION: 180 * 1000, // 3 minutes
  BATCH_PROCESSING: 1800 * 1000, // 30 minutes
  PORTFOLIO_PROCESSING: 300 * 1000, // 5 minutes
  ATS_OPTIMIZATION: 60 * 1000, // 1 minute
  DEFAULT: 300 * 1000 // 5 minutes default
} as const;

// ============================================================================
// RETRY CONFIGURATIONS
// ============================================================================

export const RETRY_CONFIGS = {
  DEFAULT: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponential: true,
    jitter: true
  },
  
  NETWORK_REQUESTS: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 5000,
    exponential: true,
    jitter: true
  },
  
  FILE_PROCESSING: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 20000,
    exponential: false,
    jitter: false
  },
  
  AI_SERVICES: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 15000,
    exponential: true,
    jitter: true
  }
} as const;

// ============================================================================
// QUEUE CONFIGURATIONS
// ============================================================================

export const QUEUE_CONFIGS = {
  HIGH_PRIORITY: {
    name: 'high-priority',
    concurrency: 10,
    timeout: 300000, // 5 minutes
    retryAttempts: 3
  },
  
  NORMAL_PRIORITY: {
    name: 'normal-priority',
    concurrency: 5,
    timeout: 600000, // 10 minutes
    retryAttempts: 2
  },
  
  LOW_PRIORITY: {
    name: 'low-priority',
    concurrency: 2,
    timeout: 1800000, // 30 minutes
    retryAttempts: 1
  },
  
  MULTIMEDIA: {
    name: 'multimedia',
    concurrency: 3,
    timeout: 1200000, // 20 minutes
    retryAttempts: 2
  }
} as const;

// ============================================================================
// PROGRESS WEIGHTS
// ============================================================================

export const PROGRESS_WEIGHTS = {
  [PROCESSING_STAGES.UPLOAD]: 5,
  [PROCESSING_STAGES.PARSING]: 15,
  [PROCESSING_STAGES.ANALYSIS]: 20,
  [PROCESSING_STAGES.ENHANCEMENT]: 15,
  [PROCESSING_STAGES.GENERATION]: 25,
  [PROCESSING_STAGES.FORMATTING]: 10,
  [PROCESSING_STAGES.OPTIMIZATION]: 5,
  [PROCESSING_STAGES.FINALIZATION]: 5
} as const;

// ============================================================================
// PROCESSING PRIORITIES
// ============================================================================

export const PROCESSING_PRIORITIES = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
  BATCH: 5
} as const;

export type ProcessingPriority = typeof PROCESSING_PRIORITIES[keyof typeof PROCESSING_PRIORITIES];

// ============================================================================
// RESOURCE LIMITS
// ============================================================================

export const RESOURCE_LIMITS = {
  MAX_CONCURRENT_JOBS_PER_USER: 3,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_PROCESSING_TIME: 30 * 60 * 1000, // 30 minutes
  MAX_MEMORY_USAGE: 512 * 1024 * 1024, // 512MB
  MAX_CPU_TIME: 300, // 5 minutes of CPU time
  MAX_STORAGE_PER_USER: 100 * 1024 * 1024 // 100MB
} as const;

// ============================================================================
// PROCESSING METRICS
// ============================================================================

export const PROCESSING_METRICS = {
  SUCCESS_RATE_THRESHOLD: 0.95, // 95%
  AVERAGE_PROCESSING_TIME_THRESHOLD: 60000, // 1 minute
  ERROR_RATE_THRESHOLD: 0.05, // 5%
  QUEUE_WAIT_TIME_THRESHOLD: 30000, // 30 seconds
  RESOURCE_UTILIZATION_THRESHOLD: 0.8 // 80%
} as const;

// ============================================================================
// CLEANUP CONFIGURATIONS
// ============================================================================

export const CLEANUP_CONFIGS = {
  TEMPORARY_FILES: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    cleanupInterval: 60 * 60 * 1000 // 1 hour
  },
  
  FAILED_JOBS: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  COMPLETED_JOBS: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  LOGS: {
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    cleanupInterval: 6 * 60 * 60 * 1000 // 6 hours
  }
} as const;

// ============================================================================
// PROCESSING EVENTS
// ============================================================================

export const PROCESSING_EVENTS = {
  JOB_CREATED: 'job.created',
  JOB_STARTED: 'job.started',
  JOB_PROGRESS: 'job.progress',
  JOB_COMPLETED: 'job.completed',
  JOB_FAILED: 'job.failed',
  JOB_CANCELLED: 'job.cancelled',
  JOB_TIMEOUT: 'job.timeout',
  STAGE_COMPLETED: 'stage.completed',
  STAGE_FAILED: 'stage.failed',
  RESOURCE_WARNING: 'resource.warning',
  QUEUE_FULL: 'queue.full'
} as const;

// ============================================================================
// ERROR RECOVERY STRATEGIES
// ============================================================================

export const ERROR_RECOVERY_STRATEGIES = {
  RETRY_WITH_BACKOFF: 'retry_with_backoff',
  RETRY_WITH_DIFFERENT_PARAMS: 'retry_with_different_params',
  SKIP_STAGE: 'skip_stage',
  FALLBACK_TO_BASIC: 'fallback_to_basic',
  MANUAL_INTERVENTION: 'manual_intervention',
  FAIL_JOB: 'fail_job'
} as const;