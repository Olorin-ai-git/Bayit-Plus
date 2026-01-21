// @ts-ignore - Export conflicts/**
 * CVPlus Multimedia - Processing Constants
 * 
 * Processing-related constants for multimedia operations.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

// ============================================================================
// PROCESSING STAGES
// ============================================================================

export const PROCESSING_STAGES = {
  VALIDATION: 'validation',
  UPLOAD: 'upload',
  PREPROCESSING: 'preprocessing',
  PROCESSING: 'processing',
  POSTPROCESSING: 'postprocessing',
  OPTIMIZATION: 'optimization',
  DELIVERY: 'delivery',
  COMPLETE: 'complete',
  ERROR: 'error'
} as const;

export type ProcessingStage = typeof PROCESSING_STAGES[keyof typeof PROCESSING_STAGES];

// ============================================================================
// PROCESSING PRIORITIES
// ============================================================================

export const PROCESSING_PRIORITIES = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4,
  CRITICAL: 5
} as const;

export type ProcessingPriority = typeof PROCESSING_PRIORITIES[keyof typeof PROCESSING_PRIORITIES];

// ============================================================================
// PROCESSING TIMEOUTS (in milliseconds)
// ============================================================================

export const PROCESSING_TIMEOUTS = {
  VALIDATION: 5000,
  UPLOAD: 30000,
  PREPROCESSING: 60000,
  PROCESSING: 300000, // 5 minutes
  POSTPROCESSING: 60000,
  OPTIMIZATION: 120000,
  DELIVERY: 30000
} as const;

// ============================================================================
// BATCH PROCESSING CONSTANTS
// ============================================================================

export const BATCH_PROCESSING = {
  MAX_CONCURRENT_JOBS: 5,
  MAX_BATCH_SIZE: 100,
  BATCH_TIMEOUT: 600000, // 10 minutes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000
} as const;

// ============================================================================
// RESOURCE LIMITS
// ============================================================================

export const RESOURCE_LIMITS = {
  MAX_CPU_PERCENTAGE: 80,
  MAX_MEMORY_MB: 2048,
  MAX_DISK_USAGE_MB: 5120,
  MAX_NETWORK_BANDWIDTH_MBPS: 100
} as const;

// ============================================================================
// PROCESSING QUEUES
// ============================================================================

export const PROCESSING_QUEUES = {
  HIGH_PRIORITY: 'high-priority',
  NORMAL_PRIORITY: 'normal-priority',
  LOW_PRIORITY: 'low-priority',
  BATCH_PROCESSING: 'batch-processing'
} as const;

export type ProcessingQueue = typeof PROCESSING_QUEUES[keyof typeof PROCESSING_QUEUES];