// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts/**
 * Processing workflow and operation types
 * 
 * This module defines types for CV processing workflows, operations,
 * and pipeline management.
 */

import { CVData } from '../shared/types';

// Processing workflow types
export interface ProcessingWorkflow {
  id: string;
  name: string;
  description: string;
  steps: ProcessingStep[];
  config: WorkflowConfig;
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingStep {
  id: string;
  type: ProcessingStepType;
  name: string;
  description: string;
  config: StepConfig;
  dependencies: string[];
  timeout: number;
  retries: number;
}

export enum ProcessingStepType {
  PARSE = 'parse',
  ANALYZE = 'analyze',
  ENHANCE = 'enhance',
  VALIDATE = 'validate',
  GENERATE = 'generate',
  EXPORT = 'export',
  NOTIFY = 'notify'
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface WorkflowConfig {
  priority: WorkflowPriority;
  timeout: number;
  retryPolicy: RetryPolicy;
  errorHandling: ErrorHandling;
  notifications: NotificationSettings;
}

export enum WorkflowPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: BackoffStrategy;
  retryableErrors: string[];
}

export enum BackoffStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential'
}

export interface ErrorHandling {
  continueOnError: boolean;
  rollbackOnFailure: boolean;
  failureActions: FailureAction[];
}

export interface FailureAction {
  type: 'log' | 'notify' | 'rollback' | 'retry';
  config: Record<string, any>;
}

export interface NotificationSettings {
  onStart: boolean;
  onComplete: boolean;
  onError: boolean;
  channels: NotificationChannel[];
}

export interface NotificationChannel {
  type: 'email' | 'webhook' | 'sms';
  config: Record<string, any>;
}

// Processing job types
export interface ProcessingJob {
  id: string;
  workflowId: string;
  cvId: string;
  userId: string;
  status: JobStatus;
  progress: JobProgress;
  result?: ProcessingResult;
  error?: ProcessingError;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export enum JobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface JobProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  percentage: number;
  estimatedCompletion?: Date;
}

export interface ProcessingResult {
  outputData: CVData;
  artifacts: ProcessingArtifact[];
  metrics: ProcessingMetrics;
  quality: QualityScore;
}

export interface ProcessingArtifact {
  type: ArtifactType;
  url: string;
  metadata: Record<string, any>;
  expiresAt?: Date;
}

export enum ArtifactType {
  PDF = 'pdf',
  HTML = 'html',
  DOCX = 'docx',
  JSON = 'json',
  PREVIEW = 'preview',
  ANALYSIS = 'analysis'
}

export interface ProcessingMetrics {
  duration: number;
  tokensUsed: number;
  apiCalls: number;
  cacheHits: number;
  errorCount: number;
}

export interface QualityScore {
  overall: number;
  dimensions: QualityDimension[];
}

export interface QualityDimension {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface ProcessingError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  step?: string;
  timestamp: Date;
}

// Step configuration types
export interface StepConfig {
  [key: string]: any;
}

export interface ParseStepConfig extends StepConfig {
  inputFormat: 'pdf' | 'docx' | 'txt' | 'html';
  extractImages: boolean;
  preserveFormatting: boolean;
}

export interface AnalyzeStepConfig extends StepConfig {
  analysisTypes: AnalysisType[];
  aiModel: string;
  includeKeywords: boolean;
  scoreThreshold: number;
}

export interface EnhanceStepConfig extends StepConfig {
  enhancementTypes: EnhancementType[];
  aiModel: string;
  preserveOriginal: boolean;
  customPrompts?: Record<string, string>;
}

export enum AnalysisType {
  CONTENT = 'content',
  STRUCTURE = 'structure',
  KEYWORDS = 'keywords',
  ATS = 'ats',
  READABILITY = 'readability'
}

export enum EnhancementType {
  GRAMMAR = 'grammar',
  STYLE = 'style',
  KEYWORDS = 'keywords',
  STRUCTURE = 'structure',
  CONTENT = 'content'
}