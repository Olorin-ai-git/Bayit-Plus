/**
 * CV Job Types
 *
 * Shared TypeScript types for CVPlus CV processing job management.
 * Based on data-model.md specification.
 *
 * @fileoverview CV job processing types including CVJob, ProcessingStatus, and FeatureType
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// Core CV Job Interface
// ============================================================================

/**
 * Represents a CV processing request with comprehensive status tracking
 */
export interface CVJob {
  // Identity
  /** UUID primary key */
  id: string;
  /** Foreign key to UserProfile */
  userId: string;

  // Processing Status
  /** Current processing status */
  status: ProcessingStatus;
  /** Processing progress (0-100 percentage) */
  progress: number;
  /** Error message if status is failed */
  errorMessage?: string;
  /** Detailed error context for debugging */
  errorDetails?: ErrorDetails;

  // Input Information
  /** Original uploaded filename */
  originalFileName: string;
  /** Firebase Storage URL for original file */
  originalFileUrl: string;
  /** Original file size in bytes */
  originalFileSize: number;
  /** Type of input (file upload or URL) */
  inputType: InputType;

  // Processing Configuration
  /** Selected enhancement features */
  selectedFeatures: FeatureType[];
  /** Feature-specific customization settings */
  customizations: Record<string, any>;
  /** Processing priority (based on subscription tier) */
  priority: JobPriority;

  // Performance Tracking
  /** When processing actually started */
  processingStartedAt?: Timestamp;
  /** When processing completed successfully */
  processingCompletedAt?: Timestamp;
  /** Total processing time in milliseconds */
  totalProcessingTimeMs?: number;
  /** Estimated completion time */
  estimatedCompletionAt?: Timestamp;

  // Quality Metrics
  /** Processing steps completed successfully */
  completedSteps: ProcessingStep[];
  /** Any warnings generated during processing */
  warnings: ProcessingWarning[];

  // Audit
  /** Job creation timestamp */
  createdAt: Timestamp;
  /** Last status update timestamp */
  updatedAt: Timestamp;
}

// ============================================================================
// Processing Status Management
// ============================================================================

/**
 * Available processing statuses with clear state transitions
 */
export enum ProcessingStatus {
  /** Job created, waiting to be picked up */
  PENDING = 'pending',
  /** Currently analyzing CV content */
  ANALYZING = 'analyzing',
  /** Generating enhanced content and features */
  GENERATING = 'generating',
  /** All processing completed successfully */
  COMPLETED = 'completed',
  /** Processing failed with error */
  FAILED = 'failed',
  /** Job cancelled by user or system */
  CANCELLED = 'cancelled',
  /** Job expired due to timeout */
  EXPIRED = 'expired'
}

/**
 * Type guard to check if value is a valid ProcessingStatus
 */
export function isProcessingStatus(value: string): value is ProcessingStatus {
  return Object.values(ProcessingStatus).includes(value as ProcessingStatus);
}

/**
 * Check if status represents a terminal state
 */
export function isTerminalStatus(status: ProcessingStatus): boolean {
  return [
    ProcessingStatus.COMPLETED,
    ProcessingStatus.FAILED,
    ProcessingStatus.CANCELLED,
    ProcessingStatus.EXPIRED
  ].includes(status);
}

/**
 * Check if status represents an active processing state
 */
export function isActiveStatus(status: ProcessingStatus): boolean {
  return [
    ProcessingStatus.PENDING,
    ProcessingStatus.ANALYZING,
    ProcessingStatus.GENERATING
  ].includes(status);
}

// ============================================================================
// Input Type Management
// ============================================================================

/**
 * Supported input types for CV processing
 */
export enum InputType {
  /** PDF document upload */
  PDF = 'pdf',
  /** Microsoft Word document upload */
  DOCX = 'docx',
  /** Plain text file upload */
  TXT = 'txt',
  /** CSV format upload */
  CSV = 'csv',
  /** URL to online CV or profile */
  URL = 'url'
}

/**
 * Type guard for InputType validation
 */
export function isInputType(value: string): value is InputType {
  return Object.values(InputType).includes(value as InputType);
}

/**
 * Get MIME type for input type
 */
export function getMimeType(inputType: InputType): string {
  switch (inputType) {
    case InputType.PDF:
      return 'application/pdf';
    case InputType.DOCX:
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case InputType.TXT:
      return 'text/plain';
    case InputType.CSV:
      return 'text/csv';
    case InputType.URL:
      return 'text/uri-list';
    default:
      throw new Error(`Unknown input type: ${inputType}`);
  }
}

/**
 * Get maximum file size allowed for input type (in bytes)
 */
export function getMaxFileSize(inputType: InputType): number {
  switch (inputType) {
    case InputType.PDF:
    case InputType.DOCX:
      return 25 * 1024 * 1024; // 25MB for binary documents
    case InputType.TXT:
    case InputType.CSV:
      return 5 * 1024 * 1024; // 5MB for text files
    case InputType.URL:
      return 0; // No file size limit for URLs
    default:
      return 10 * 1024 * 1024; // 10MB default
  }
}

// ============================================================================
// Feature Type Management
// ============================================================================

/**
 * Available enhancement features for CV processing
 */
export enum FeatureType {
  /** AI-generated career podcast */
  AI_PODCAST = 'ai_podcast',
  /** AI-generated video introduction */
  VIDEO_INTRODUCTION = 'video_introduction',
  /** Interactive career timeline */
  INTERACTIVE_TIMELINE = 'interactive_timeline',
  /** Portfolio gallery showcase */
  PORTFOLIO_GALLERY = 'portfolio_gallery',
  /** ATS (Applicant Tracking System) optimization */
  ATS_OPTIMIZATION = 'ats_optimization',
  /** Personality insights analysis */
  PERSONALITY_INSIGHTS = 'personality_insights',
  /** Public shareable profile */
  PUBLIC_PROFILE = 'public_profile',
  /** QR code generation */
  QR_CODE = 'qr_code'
}

/**
 * Type guard for FeatureType validation
 */
export function isFeatureType(value: string): value is FeatureType {
  return Object.values(FeatureType).includes(value as FeatureType);
}

/**
 * Feature processing time estimates in milliseconds
 */
export function getFeatureProcessingTime(feature: FeatureType): number {
  switch (feature) {
    case FeatureType.ATS_OPTIMIZATION:
      return 30000; // 30 seconds
    case FeatureType.PERSONALITY_INSIGHTS:
      return 45000; // 45 seconds
    case FeatureType.AI_PODCAST:
      return 120000; // 2 minutes
    case FeatureType.VIDEO_INTRODUCTION:
      return 180000; // 3 minutes
    case FeatureType.INTERACTIVE_TIMELINE:
      return 60000; // 1 minute
    case FeatureType.PORTFOLIO_GALLERY:
      return 90000; // 1.5 minutes
    case FeatureType.PUBLIC_PROFILE:
      return 15000; // 15 seconds
    case FeatureType.QR_CODE:
      return 5000; // 5 seconds
    default:
      return 60000; // 1 minute default
  }
}

/**
 * Feature credit costs
 */
export function getFeatureCreditCost(feature: FeatureType): number {
  switch (feature) {
    case FeatureType.ATS_OPTIMIZATION:
      return 1;
    case FeatureType.PERSONALITY_INSIGHTS:
      return 1;
    case FeatureType.AI_PODCAST:
      return 3;
    case FeatureType.VIDEO_INTRODUCTION:
      return 5;
    case FeatureType.INTERACTIVE_TIMELINE:
      return 2;
    case FeatureType.PORTFOLIO_GALLERY:
      return 2;
    case FeatureType.PUBLIC_PROFILE:
      return 1;
    case FeatureType.QR_CODE:
      return 0; // Free feature
    default:
      return 1;
  }
}

// ============================================================================
// Job Priority and Processing
// ============================================================================

/**
 * Job processing priority levels
 */
export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Processing step tracking
 */
export interface ProcessingStep {
  /** Step identifier */
  id: string;
  /** Human-readable step name */
  name: string;
  /** Step completion status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  /** Step progress percentage */
  progress: number;
  /** When step started */
  startedAt?: Timestamp;
  /** When step completed */
  completedAt?: Timestamp;
  /** Step-specific error message */
  errorMessage?: string;
}

/**
 * Processing warning information
 */
export interface ProcessingWarning {
  /** Warning code for categorization */
  code: string;
  /** Human-readable warning message */
  message: string;
  /** Warning severity level */
  severity: 'info' | 'warning' | 'error';
  /** Related processing step */
  stepId?: string;
  /** Warning timestamp */
  timestamp: Timestamp;
}

/**
 * Detailed error information
 */
export interface ErrorDetails {
  /** Error code for categorization */
  code: string;
  /** Technical error message */
  message: string;
  /** Error stack trace (for debugging) */
  stack?: string;
  /** Related step that failed */
  failedStep?: string;
  /** Retry count */
  retryCount: number;
  /** Whether the error is recoverable */
  recoverable: boolean;
  /** Additional error context */
  context?: Record<string, any>;
}

// ============================================================================
// Validation and Utilities
// ============================================================================

/**
 * Validate CVJob data before database operations
 */
export function validateCVJob(job: Partial<CVJob>): string[] {
  const errors: string[] = [];

  // File size validation
  if (job.originalFileSize && job.inputType) {
    const maxSize = getMaxFileSize(job.inputType);
    if (job.originalFileSize > maxSize) {
      errors.push(`File size ${job.originalFileSize} exceeds maximum ${maxSize} bytes for ${job.inputType}`);
    }
  }

  // Progress validation
  if (job.progress !== undefined) {
    if (job.progress < 0 || job.progress > 100) {
      errors.push('Progress must be between 0 and 100');
    }
  }

  // Features validation
  if (job.selectedFeatures) {
    for (const feature of job.selectedFeatures) {
      if (!isFeatureType(feature)) {
        errors.push(`Invalid feature type: ${feature}`);
      }
    }
  }

  // Status validation
  if (job.status && !isProcessingStatus(job.status)) {
    errors.push(`Invalid processing status: ${job.status}`);
  }

  // Input type validation
  if (job.inputType && !isInputType(job.inputType)) {
    errors.push(`Invalid input type: ${job.inputType}`);
  }

  return errors;
}

/**
 * Calculate total estimated processing time
 */
export function calculateTotalProcessingTime(features: FeatureType[]): number {
  const baseProcessingTime = 30000; // 30 seconds base
  const featureTime = features.reduce((total, feature) => {
    return total + getFeatureProcessingTime(feature);
  }, 0);

  return baseProcessingTime + featureTime;
}

/**
 * Calculate total credit cost for features
 */
export function calculateTotalCreditCost(features: FeatureType[]): number {
  return features.reduce((total, feature) => {
    return total + getFeatureCreditCost(feature);
  }, 0);
}

/**
 * Type guard to check if an object is a CVJob
 */
export function isCVJob(obj: any): obj is CVJob {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    isProcessingStatus(obj.status) &&
    typeof obj.progress === 'number' &&
    typeof obj.originalFileName === 'string' &&
    typeof obj.originalFileUrl === 'string' &&
    typeof obj.originalFileSize === 'number' &&
    isInputType(obj.inputType) &&
    Array.isArray(obj.selectedFeatures) &&
    obj.createdAt instanceof Timestamp &&
    obj.updatedAt instanceof Timestamp
  );
}

/**
 * Create a new CVJob with default values
 */
export function createCVJob(
  id: string,
  userId: string,
  fileName: string,
  fileUrl: string,
  fileSize: number,
  inputType: InputType,
  features: FeatureType[]
): CVJob {
  const now = Timestamp.now();

  return {
    id,
    userId,
    status: ProcessingStatus.PENDING,
    progress: 0,
    originalFileName: fileName,
    originalFileUrl: fileUrl,
    originalFileSize: fileSize,
    inputType,
    selectedFeatures: features,
    customizations: {},
    priority: JobPriority.NORMAL,
    completedSteps: [],
    warnings: [],
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Check if job has timed out
 */
export function hasJobTimedOut(job: CVJob, timeoutMs: number = 300000): boolean {
  if (!isActiveStatus(job.status)) return false;

  const now = new Date();
  const startTime = job.processingStartedAt?.toDate() || job.createdAt.toDate();
  const elapsed = now.getTime() - startTime.getTime();

  return elapsed > timeoutMs;
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: ProcessingStatus): string {
  switch (status) {
    case ProcessingStatus.PENDING:
      return 'Job is queued and waiting to be processed';
    case ProcessingStatus.ANALYZING:
      return 'Analyzing CV content and extracting information';
    case ProcessingStatus.GENERATING:
      return 'Generating enhanced content and features';
    case ProcessingStatus.COMPLETED:
      return 'Processing completed successfully';
    case ProcessingStatus.FAILED:
      return 'Processing failed due to an error';
    case ProcessingStatus.CANCELLED:
      return 'Job was cancelled before completion';
    case ProcessingStatus.EXPIRED:
      return 'Job expired due to timeout';
    default:
      return 'Unknown status';
  }
}