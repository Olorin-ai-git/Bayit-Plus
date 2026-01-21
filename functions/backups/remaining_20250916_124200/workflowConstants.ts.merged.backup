// @ts-ignore - Export conflicts/**
 * Workflow-related constants for the CVPlus Workflow module
 */

import { JobStatus, FeatureStatus, TemplateCategory, BadgeType } from '../types';

// Job Status Constants
export const JOB_STATUS: Record<string, JobStatus> = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
} as const;

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  paused: 'Paused'
} as const;

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
  paused: 'bg-orange-100 text-orange-800'
} as const;

// Feature Status Constants
export const FEATURE_STATUS: Record<string, FeatureStatus> = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  FAILED: 'failed',
  BLOCKED: 'blocked'
} as const;

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  skipped: 'Skipped',
  failed: 'Failed',
  blocked: 'Blocked'
} as const;

export const FEATURE_STATUS_COLORS: Record<FeatureStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  skipped: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  blocked: 'bg-orange-100 text-orange-800'
} as const;

// Template Categories
export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'professional',
  'creative',
  'technical',
  'academic',
  'executive',
  'entry-level',
  'industry-specific'
] as const;

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  professional: 'Professional',
  creative: 'Creative',
  technical: 'Technical',
  academic: 'Academic',
  executive: 'Executive',
  'entry-level': 'Entry Level',
  'industry-specific': 'Industry Specific'
} as const;

// Badge Types
export const BADGE_TYPES: BadgeType[] = [
  'cv-completion',
  'feature-master',
  'template-expert',
  'premium-user',
  'social-sharer',
  'multimedia-creator',
  'analytics-pro',
  'collaboration-champion',
  'early-adopter',
  'power-user'
] as const;

export const BADGE_TYPE_LABELS: Record<BadgeType, string> = {
  'cv-completion': 'CV Master',
  'feature-master': 'Feature Master',
  'template-expert': 'Template Expert',
  'premium-user': 'Premium User',
  'social-sharer': 'Social Sharer',
  'multimedia-creator': 'Multimedia Creator',
  'analytics-pro': 'Analytics Pro',
  'collaboration-champion': 'Collaboration Champion',
  'early-adopter': 'Early Adopter',
  'power-user': 'Power User'
} as const;

// Workflow Configuration
export const WORKFLOW_CONFIG = {
  MAX_FEATURES_PER_JOB: 50,
  MAX_CONCURRENT_JOBS: 5,
  DEFAULT_JOB_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
  FEATURE_TIMEOUT: 5 * 60 * 1000, // 5 minutes in milliseconds
  MONITORING_INTERVAL: 5000, // 5 seconds
  MAX_RETRY_ATTEMPTS: 3,
  BATCH_SIZE: 10,
  MAX_SKIP_PERCENTAGE: 50 // Maximum percentage of features that can be skipped
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  JOB_NOT_FOUND: 'Job not found',
  FEATURE_NOT_FOUND: 'Feature not found',
  TEMPLATE_NOT_FOUND: 'Template not found',
  BADGE_NOT_FOUND: 'Badge not found',
  UNAUTHORIZED: 'Unauthorized access',
  VALIDATION_FAILED: 'Validation failed',
  WORKFLOW_TIMEOUT: 'Workflow execution timeout',
  FEATURE_DEPENDENCY_NOT_MET: 'Feature dependency not met',
  MAX_SKIP_EXCEEDED: 'Maximum skip percentage exceeded',
  CONCURRENT_LIMIT_EXCEEDED: 'Maximum concurrent jobs exceeded'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  JOB_CREATED: 'Job created successfully',
  JOB_COMPLETED: 'Job completed successfully',
  FEATURE_COMPLETED: 'Feature completed successfully',
  FEATURE_SKIPPED: 'Feature skipped successfully',
  TEMPLATE_SELECTED: 'Template selected successfully',
  BADGE_EARNED: 'Badge earned successfully',
  WORKFLOW_INITIALIZED: 'Workflow initialized successfully'
} as const;