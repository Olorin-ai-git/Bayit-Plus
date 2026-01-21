// @ts-ignore - Export conflicts/**
 * Processing pipeline and job management types for CVPlus multimedia module
 */

import { MediaFile, ProcessingStatus, QualityLevel } from './media.types';
// Removed core dependency for minimal build

// Minimal ErrorDetails interface for local use
interface ErrorDetails {
  message: string;
  code?: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// PROCESSING JOB TYPES
// ============================================================================

export interface ProcessingJob<T = unknown> {
  /** Unique job identifier */
  id: string;
  
  /** Job type */
  type: ProcessingJobType;
  
  /** Processing status */
  status: ProcessingStatus;
  
  /** Input files */
  inputs: MediaFile[];
  
  /** Processing options */
  options: T;
  
  /** Job priority (1-10, 10 being highest) */
  priority: number;
  
  /** Job creation timestamp */
  createdAt: Date;
  
  /** Job started timestamp */
  startedAt?: Date;
  
  /** Job completion timestamp */
  completedAt?: Date;
  
  /** Processing progress (0-100) */
  progress: number;
  
  /** Current processing stage */
  currentStage?: ProcessingStage;
  
  /** Processing results */
  results: ProcessingJobResult[];
  
  /** Error information */
  error?: ProcessingError;
  
  /** Job metadata */
  metadata: JobMetadata;
  
  /** Resource usage */
  resourceUsage?: ResourceUsage;
  
  /** Dependencies on other jobs */
  dependencies?: string[];
  
  /** Retry configuration */
  retryConfig?: RetryConfiguration;
  
  /** User ID who created the job */
  userId: string;
  
  /** Callback URL for status updates */
  callbackUrl?: string;
  
  /** Job expiration timestamp */
  expiresAt?: Date;
}

export type ProcessingJobType = 
  | 'image-processing'
  | 'video-transcoding'
  | 'audio-processing'
  | 'batch-processing'
  | 'format-conversion'
  | 'quality-optimization'
  | 'thumbnail-generation'
  | 'waveform-generation'
  | 'metadata-extraction';

export interface ProcessingStage {
  /** Stage name */
  name: string;
  
  /** Stage description */
  description: string;
  
  /** Stage progress (0-100) */
  progress: number;
  
  /** Stage start time */
  startedAt: Date;
  
  /** Estimated completion time */
  estimatedCompletionAt?: Date;
  
  /** Stage-specific metadata */
  metadata?: Record<string, unknown>;
}

export interface ProcessingJobResult {
  /** Result type */
  type: 'processed-file' | 'thumbnail' | 'metadata' | 'analysis' | 'error';
  
  /** Result data */
  data: unknown;
  
  /** Result file (if applicable) */
  file?: MediaFile;
  
  /** Result URL (if applicable) */
  url?: string;
  
  /** Result creation timestamp */
  createdAt: Date;
  
  /** Result metadata */
  metadata?: Record<string, unknown>;
}

export interface ProcessingError extends ErrorDetails {
  /** Error stage */
  stage?: string;
  
  /** Recovery suggestions */
  recoverySuggestions?: string[];
  
  /** Is recoverable */
  recoverable: boolean;
  
  /** Retry count */
  retryCount?: number;
  
  /** Technical details */
  technicalDetails?: Record<string, unknown>;
}

export interface JobMetadata {
  /** Job name/title */
  name?: string;
  
  /** Job description */
  description?: string;
  
  /** Job tags */
  tags?: string[];
  
  /** Source application */
  source?: string;
  
  /** Processing version */
  version?: string;
  
  /** Custom metadata */
  custom?: Record<string, unknown>;
  
  /** Processing environment */
  environment?: ProcessingEnvironment;
}

export interface ProcessingEnvironment {
  /** Processing node ID */
  nodeId: string;
  
  /** Processing region */
  region: string;
  
  /** Available resources */
  availableResources: AvailableResources;
  
  /** Processing engine version */
  engineVersion: string;
  
  /** System information */
  systemInfo?: SystemInfo;
}

export interface AvailableResources {
  /** CPU cores */
  cpuCores: number;
  
  /** Memory (MB) */
  memoryMB: number;
  
  /** Disk space (MB) */
  diskSpaceMB: number;
  
  /** GPU available */
  gpuAvailable: boolean;
  
  /** GPU memory (MB) */
  gpuMemoryMB?: number;
  
  /** Network bandwidth (Mbps) */
  networkBandwidthMbps: number;
}

export interface SystemInfo {
  /** Operating system */
  os: string;
  
  /** Architecture */
  architecture: string;
  
  /** Node.js version */
  nodeVersion: string;
  
  /** Processing libraries versions */
  libraryVersions: Record<string, string>;
}

export interface ResourceUsage {
  /** CPU usage percentage */
  cpuUsage: number;
  
  /** Memory usage (MB) */
  memoryUsageMB: number;
  
  /** Peak memory usage (MB) */
  peakMemoryUsageMB: number;
  
  /** Disk I/O (MB/s) */
  diskIORate: number;
  
  /** Network I/O (MB/s) */
  networkIORate: number;
  
  /** GPU usage percentage */
  gpuUsage?: number;
  
  /** Processing efficiency score (0-100) */
  efficiencyScore: number;
  
  /** Resource usage timeline */
  timeline: ResourceUsagePoint[];
}

export interface ResourceUsagePoint {
  /** Timestamp */
  timestamp: Date;
  
  /** CPU usage at this point */
  cpuUsage: number;
  
  /** Memory usage at this point */
  memoryUsage: number;
  
  /** Processing stage at this point */
  stage?: string;
}

export interface RetryConfiguration {
  /** Maximum retry attempts */
  maxAttempts: number;
  
  /** Initial delay (ms) */
  initialDelayMs: number;
  
  /** Delay multiplier for exponential backoff */
  delayMultiplier: number;
  
  /** Maximum delay (ms) */
  maxDelayMs: number;
  
  /** Retry on specific error types */
  retryOnErrorTypes: string[];
  
  /** Stop retry on specific error types */
  stopOnErrorTypes: string[];
  
  /** Jitter for retry timing */
  jitter: boolean;
}

// ============================================================================
// PROCESSING PIPELINE TYPES
// ============================================================================

export interface ProcessingPipeline {
  /** Pipeline ID */
  id: string;
  
  /** Pipeline name */
  name: string;
  
  /** Pipeline description */
  description?: string;
  
  /** Pipeline stages */
  stages: PipelineStage[];
  
  /** Input requirements */
  inputRequirements: InputRequirements;
  
  /** Output specifications */
  outputSpecifications: OutputSpecifications;
  
  /** Pipeline configuration */
  configuration: PipelineConfiguration;
  
  /** Pipeline metadata */
  metadata: PipelineMetadata;
  
  /** Version information */
  version: string;
  
  /** Pipeline status */
  status: PipelineStatus;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last modified timestamp */
  lastModifiedAt: Date;
}

export interface PipelineStage {
  /** Stage ID */
  id: string;
  
  /** Stage name */
  name: string;
  
  /** Stage type */
  type: PipelineStageType;
  
  /** Stage configuration */
  configuration: StageConfiguration;
  
  /** Stage dependencies */
  dependencies: string[];
  
  /** Parallel execution */
  parallel: boolean;
  
  /** Stage timeout (ms) */
  timeoutMs?: number;
  
  /** Retry configuration for this stage */
  retryConfig?: RetryConfiguration;
  
  /** Stage validation */
  validation?: StageValidation;
  
  /** Resource requirements */
  resourceRequirements?: ResourceRequirements;
}

export type PipelineStageType = 
  | 'input-validation'
  | 'format-detection'
  | 'preprocessing'
  | 'processing'
  | 'postprocessing'
  | 'quality-check'
  | 'output-generation'
  | 'cleanup';

export interface StageConfiguration {
  /** Stage processor */
  processor: string;
  
  /** Processor version */
  version?: string;
  
  /** Processor options */
  options: Record<string, unknown>;
  
  /** Input mapping */
  inputMapping?: Record<string, string>;
  
  /** Output mapping */
  outputMapping?: Record<string, string>;
  
  /** Conditional execution */
  condition?: StageCondition;
}

export interface StageCondition {
  /** Condition expression */
  expression: string;
  
  /** Condition variables */
  variables: Record<string, unknown>;
  
  /** Skip stage if condition false */
  skipIfFalse: boolean;
}

export interface StageValidation {
  /** Input validation */
  input?: ValidationRule[];
  
  /** Output validation */
  output?: ValidationRule[];
  
  /** Performance validation */
  performance?: PerformanceValidation;
}

export interface ValidationRule {
  /** Rule type */
  type: 'required' | 'format' | 'size' | 'quality' | 'custom';
  
  /** Rule parameters */
  parameters: Record<string, unknown>;
  
  /** Error message */
  errorMessage?: string;
  
  /** Rule severity */
  severity: 'error' | 'warning' | 'info';
}

export interface PerformanceValidation {
  /** Maximum processing time (ms) */
  maxProcessingTimeMs?: number;
  
  /** Maximum memory usage (MB) */
  maxMemoryUsageMB?: number;
  
  /** Maximum output size (bytes) */
  maxOutputSizeBytes?: number;
  
  /** Minimum quality score */
  minQualityScore?: number;
}

export interface ResourceRequirements {
  /** CPU cores required */
  cpuCores?: number;
  
  /** Memory required (MB) */
  memoryMB?: number;
  
  /** Disk space required (MB) */
  diskSpaceMB?: number;
  
  /** GPU required */
  gpuRequired?: boolean;
  
  /** GPU memory required (MB) */
  gpuMemoryMB?: number;
  
  /** Network bandwidth required (Mbps) */
  networkBandwidthMbps?: number;
}

export interface InputRequirements {
  /** Supported media types */
  supportedTypes: string[];
  
  /** Maximum file size */
  maxFileSizeBytes: number;
  
  /** Minimum file size */
  minFileSizeBytes?: number;
  
  /** Supported formats */
  supportedFormats: string[];
  
  /** Required metadata fields */
  requiredMetadata?: string[];
  
  /** Input validation rules */
  validationRules: ValidationRule[];
}

export interface OutputSpecifications {
  /** Output types generated */
  outputTypes: string[];
  
  /** Output formats */
  outputFormats: string[];
  
  /** Quality levels available */
  qualityLevels: QualityLevel[];
  
  /** Output metadata */
  outputMetadata: string[];
  
  /** Output validation */
  outputValidation: ValidationRule[];
}

export interface PipelineConfiguration {
  /** Processing mode */
  processingMode: ProcessingMode;
  
  /** Quality settings */
  qualitySettings: QualitySettings;
  
  /** Performance settings */
  performanceSettings: PerformanceSettings;
  
  /** Error handling */
  errorHandling: ErrorHandlingSettings;
  
  /** Logging configuration */
  logging: LoggingConfiguration;
  
  /** Notification settings */
  notifications: NotificationSettings;
}

export type ProcessingMode = 'fast' | 'balanced' | 'quality' | 'custom';

export interface QualitySettings {
  /** Target quality level */
  targetQuality: QualityLevel;
  
  /** Quality validation enabled */
  qualityValidation: boolean;
  
  /** Minimum acceptable quality */
  minAcceptableQuality?: number;
  
  /** Quality assessment method */
  assessmentMethod: QualityAssessmentMethod;
  
  /** Custom quality metrics */
  customMetrics?: QualityMetric[];
}

export type QualityAssessmentMethod = 'ssim' | 'psnr' | 'vmaf' | 'perceptual' | 'combined';

export interface QualityMetric {
  /** Metric name */
  name: string;
  
  /** Metric weight in overall score */
  weight: number;
  
  /** Metric threshold */
  threshold?: number;
  
  /** Metric calculation method */
  method: string;
}

export interface PerformanceSettings {
  /** Processing priority */
  priority: ProcessingPriority;
  
  /** Resource allocation */
  resourceAllocation: ResourceAllocationSettings;
  
  /** Optimization level */
  optimizationLevel: OptimizationLevel;
  
  /** Parallel processing */
  parallelProcessing: ParallelProcessingSettings;
  
  /** Caching settings */
  caching: ProcessingCacheSettings;
}

export type ProcessingPriority = 'low' | 'normal' | 'high' | 'urgent';
export type OptimizationLevel = 'none' | 'basic' | 'standard' | 'aggressive';

export interface ResourceAllocationSettings {
  /** CPU allocation mode */
  cpuAllocation: 'shared' | 'dedicated' | 'adaptive';
  
  /** Memory allocation (MB) */
  memoryAllocationMB?: number;
  
  /** GPU allocation */
  gpuAllocation?: 'shared' | 'dedicated';
  
  /** Resource limits */
  resourceLimits: ResourceLimits;
}

export interface ResourceLimits {
  /** Maximum CPU usage percentage */
  maxCpuUsage: number;
  
  /** Maximum memory usage (MB) */
  maxMemoryUsageMB: number;
  
  /** Maximum processing time (ms) */
  maxProcessingTimeMs: number;
  
  /** Maximum disk usage (MB) */
  maxDiskUsageMB: number;
}

export interface ParallelProcessingSettings {
  /** Enable parallel processing */
  enabled: boolean;
  
  /** Maximum concurrent operations */
  maxConcurrentOperations: number;
  
  /** Chunk size for parallel processing */
  chunkSize?: number;
  
  /** Load balancing strategy */
  loadBalancingStrategy: LoadBalancingStrategy;
}

export type LoadBalancingStrategy = 'round-robin' | 'least-loaded' | 'resource-aware' | 'adaptive';

export interface ProcessingCacheSettings {
  /** Enable result caching */
  enableResultCache: boolean;
  
  /** Cache TTL (seconds) */
  cacheTTLSeconds: number;
  
  /** Cache key strategy */
  cacheKeyStrategy: CacheKeyStrategy;
  
  /** Maximum cache size (MB) */
  maxCacheSizeMB: number;
  
  /** Cache cleanup strategy */
  cleanupStrategy: CacheCleanupStrategy;
}

export type CacheKeyStrategy = 'content-hash' | 'options-hash' | 'combined-hash' | 'custom';
export type CacheCleanupStrategy = 'lru' | 'ttl' | 'size-based' | 'manual';

export interface ErrorHandlingSettings {
  /** Error handling strategy */
  strategy: ErrorHandlingStrategy;
  
  /** Retry configuration */
  retryConfig: RetryConfiguration;
  
  /** Fallback options */
  fallbackOptions?: FallbackOptions;
  
  /** Error reporting */
  errorReporting: ErrorReportingSettings;
  
  /** Graceful degradation */
  gracefulDegradation: boolean;
}

export type ErrorHandlingStrategy = 'fail-fast' | 'retry' | 'fallback' | 'graceful-degradation';

export interface FallbackOptions {
  /** Use lower quality settings */
  lowerQuality: boolean;
  
  /** Use alternative processing method */
  alternativeMethod?: string;
  
  /** Skip optional stages */
  skipOptionalStages: boolean;
  
  /** Return partial results */
  returnPartialResults: boolean;
}

export interface ErrorReportingSettings {
  /** Enable error reporting */
  enabled: boolean;
  
  /** Error reporting endpoint */
  endpoint?: string;
  
  /** Include technical details */
  includeTechnicalDetails: boolean;
  
  /** Report performance metrics */
  reportMetrics: boolean;
  
  /** Error severity levels to report */
  severityLevels: string[];
}

export interface LoggingConfiguration {
  /** Log level */
  level: LogLevel;
  
  /** Log destinations */
  destinations: LogDestination[];
  
  /** Include performance metrics */
  includeMetrics: boolean;
  
  /** Include resource usage */
  includeResourceUsage: boolean;
  
  /** Log retention period (days) */
  retentionDays: number;
  
  /** Structured logging */
  structured: boolean;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogDestination = 'console' | 'file' | 'database' | 'external';

export interface NotificationSettings {
  /** Enable notifications */
  enabled: boolean;
  
  /** Notification channels */
  channels: NotificationChannel[];
  
  /** Notification triggers */
  triggers: NotificationTrigger[];
  
  /** Notification templates */
  templates: Record<string, NotificationTemplate>;
  
  /** Rate limiting */
  rateLimiting?: NotificationRateLimiting;
}

export interface NotificationChannel {
  /** Channel type */
  type: NotificationChannelType;
  
  /** Channel configuration */
  configuration: Record<string, unknown>;
  
  /** Channel priority */
  priority: number;
  
  /** Fallback channel */
  fallback?: string;
}

export type NotificationChannelType = 'email' | 'sms' | 'webhook' | 'push' | 'slack';

export interface NotificationTrigger {
  /** Trigger event */
  event: NotificationEvent;
  
  /** Trigger condition */
  condition?: string;
  
  /** Channels to use */
  channels: string[];
  
  /** Template to use */
  template: string;
  
  /** Trigger enabled */
  enabled: boolean;
}

export type NotificationEvent = 
  | 'job-started'
  | 'job-completed' 
  | 'job-failed'
  | 'job-progress'
  | 'quality-issue'
  | 'performance-issue'
  | 'error-threshold-exceeded';

export interface NotificationTemplate {
  /** Template subject */
  subject: string;
  
  /** Template body */
  body: string;
  
  /** Template variables */
  variables: string[];
  
  /** Template format */
  format: 'text' | 'html' | 'json';
}

export interface NotificationRateLimiting {
  /** Maximum notifications per hour */
  maxPerHour: number;
  
  /** Burst limit */
  burstLimit: number;
  
  /** Rate limiting by event type */
  byEventType: Record<NotificationEvent, number>;
}

export interface PipelineMetadata {
  /** Pipeline category */
  category: string;
  
  /** Pipeline tags */
  tags: string[];
  
  /** Created by */
  createdBy: string;
  
  /** Pipeline documentation URL */
  documentationUrl?: string;
  
  /** Performance benchmarks */
  benchmarks?: PerformanceBenchmark[];
  
  /** Compatibility information */
  compatibility: CompatibilityInfo;
}

export interface PerformanceBenchmark {
  /** Benchmark name */
  name: string;
  
  /** Test conditions */
  conditions: Record<string, unknown>;
  
  /** Performance metrics */
  metrics: PerformanceMetrics;
  
  /** Benchmark date */
  benchmarkDate: Date;
}

export interface PerformanceMetrics {
  /** Average processing time (ms) */
  avgProcessingTimeMs: number;
  
  /** Throughput (files per hour) */
  throughputFph: number;
  
  /** Quality score */
  qualityScore: number;
  
  /** Resource efficiency */
  resourceEfficiency: number;
  
  /** Success rate */
  successRate: number;
}

export interface CompatibilityInfo {
  /** Supported input formats */
  supportedInputFormats: string[];
  
  /** Supported output formats */
  supportedOutputFormats: string[];
  
  /** Minimum system requirements */
  minSystemRequirements: SystemRequirements;
  
  /** Platform compatibility */
  platformCompatibility: string[];
}

export interface SystemRequirements {
  /** Minimum CPU cores */
  minCpuCores: number;
  
  /** Minimum memory (MB) */
  minMemoryMB: number;
  
  /** Minimum disk space (MB) */
  minDiskSpaceMB: number;
  
  /** Required libraries */
  requiredLibraries: string[];
  
  /** Operating system requirements */
  osRequirements: string[];
}

export type PipelineStatus = 'draft' | 'active' | 'deprecated' | 'maintenance';

// ============================================================================
// ADDITIONAL REQUIRED EXPORTS
// ============================================================================

// Basic processing interfaces for compatibility
export interface ProcessingOptions {
  /** Processing quality level */
  quality?: QualityLevel;
  
  /** Processing mode */
  mode?: ProcessingMode;
  
  /** Processing priority */
  priority?: ProcessingPriority;
  
  /** Custom options */
  custom?: Record<string, unknown>;
}

export interface ProcessingResult {
  /** Processing success */
  success: boolean;
  
  /** Result data */
  data?: unknown;
  
  /** Error information */
  error?: ProcessingError;
  
  /** Processing metadata */
  metadata?: Record<string, unknown>;
}

export interface CircuitBreakerConfig {
  /** Failure threshold */
  failureThreshold: number;
  
  /** Recovery timeout (ms) */
  recoveryTimeoutMs: number;
  
  /** Monitor window (ms) */
  monitorWindowMs: number;
  
  /** Expected errors */
  expectedErrors?: string[];
}

export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  
  /** Initial delay (ms) */
  initialDelayMs: number;
  
  /** Delay multiplier */
  delayMultiplier: number;
  
  /** Maximum delay (ms) */
  maxDelayMs: number;
}

export interface ServiceConfig {
  /** Service name */
  name: string;
  
  /** Service version */
  version: string;
  
  /** Service endpoint */
  endpoint?: string;
  
  /** Service configuration */
  config?: Record<string, unknown>;
}