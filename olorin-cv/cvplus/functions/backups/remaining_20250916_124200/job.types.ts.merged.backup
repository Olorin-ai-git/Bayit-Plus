// @ts-ignore - Export conflicts/**
 * Job management and queue system types for CVPlus multimedia module
 */

import { ProcessingJobType } from './processing.types';

// ============================================================================
// JOB QUEUE TYPES
// ============================================================================

export interface JobQueue {
  /** Queue name */
  name: string;
  
  /** Queue type */
  type: QueueType;
  
  /** Queue configuration */
  configuration: QueueConfiguration;
  
  /** Queue statistics */
  statistics: QueueStatistics;
  
  /** Queue status */
  status: QueueStatus;
  
  /** Worker configuration */
  workers: WorkerConfiguration;
  
  /** Priority handling */
  priorityHandling: PriorityHandling;
  
  /** Retry policies */
  retryPolicies: RetryPolicy[];
  
  /** Dead letter queue */
  deadLetterQueue?: DeadLetterQueueConfig;
  
  /** Monitoring configuration */
  monitoring: QueueMonitoring;
}

export type QueueType = 'fifo' | 'priority' | 'delayed' | 'rate-limited' | 'topic-based';
export type QueueStatus = 'active' | 'paused' | 'draining' | 'maintenance' | 'error';

export interface QueueConfiguration {
  /** Maximum queue size */
  maxSize: number;
  
  /** Visibility timeout (seconds) */
  visibilityTimeoutSeconds: number;
  
  /** Message retention period (days) */
  retentionDays: number;
  
  /** Batch processing settings */
  batchProcessing: BatchProcessingConfig;
  
  /** Rate limiting */
  rateLimiting?: RateLimitingConfig;
  
  /** Auto-scaling */
  autoScaling?: AutoScalingConfig;
  
  /** Encryption settings */
  encryption?: QueueEncryption;
  
  /** Persistence settings */
  persistence: PersistenceConfig;
}

export interface BatchProcessingConfig {
  /** Enable batch processing */
  enabled: boolean;
  
  /** Maximum batch size */
  maxBatchSize: number;
  
  /** Batch timeout (seconds) */
  batchTimeoutSeconds: number;
  
  /** Batch processing strategy */
  strategy: BatchStrategy;
}

export type BatchStrategy = 'size-based' | 'time-based' | 'adaptive' | 'priority-based';

export interface RateLimitingConfig {
  /** Maximum jobs per second */
  maxJobsPerSecond: number;
  
  /** Burst capacity */
  burstCapacity: number;
  
  /** Rate limiting strategy */
  strategy: RateLimitingStrategy;
  
  /** Rate limiting by user */
  byUser?: boolean;
  
  /** Rate limiting by job type */
  byJobType?: Record<ProcessingJobType, number>;
}

export type RateLimitingStrategy = 'token-bucket' | 'leaky-bucket' | 'fixed-window' | 'sliding-window';

export interface AutoScalingConfig {
  /** Enable auto-scaling */
  enabled: boolean;
  
  /** Minimum workers */
  minWorkers: number;
  
  /** Maximum workers */
  maxWorkers: number;
  
  /** Scaling triggers */
  triggers: ScalingTrigger[];
  
  /** Scale-up cooldown (seconds) */
  scaleUpCooldownSeconds: number;
  
  /** Scale-down cooldown (seconds) */
  scaleDownCooldownSeconds: number;
  
  /** Scaling metrics */
  metrics: ScalingMetric[];
}

export interface ScalingTrigger {
  /** Metric name */
  metric: string;
  
  /** Threshold value */
  threshold: number;
  
  /** Comparison operator */
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  
  /** Scaling action */
  action: 'scale-up' | 'scale-down';
  
  /** Scaling amount */
  scalingAmount: number;
  
  /** Trigger enabled */
  enabled: boolean;
}

export interface ScalingMetric {
  /** Metric name */
  name: string;
  
  /** Metric source */
  source: 'queue' | 'worker' | 'system' | 'custom';
  
  /** Collection interval (seconds) */
  intervalSeconds: number;
  
  /** Aggregation method */
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
  
  /** Metric weight in scaling decisions */
  weight: number;
}

export interface QueueEncryption {
  /** Encryption enabled */
  enabled: boolean;
  
  /** Encryption algorithm */
  algorithm: string;
  
  /** Key management */
  keyManagement: string;
  
  /** Encryption key ID */
  keyId?: string;
}

export interface PersistenceConfig {
  /** Persistence enabled */
  enabled: boolean;
  
  /** Storage backend */
  backend: PersistenceBackend;
  
  /** Backup configuration */
  backup?: BackupConfig;
  
  /** Data retention */
  retention: DataRetentionConfig;
}

export type PersistenceBackend = 'memory' | 'disk' | 'database' | 'distributed';

export interface BackupConfig {
  /** Backup enabled */
  enabled: boolean;
  
  /** Backup interval (hours) */
  intervalHours: number;
  
  /** Backup retention (days) */
  retentionDays: number;
  
  /** Backup storage */
  storage: string;
  
  /** Backup encryption */
  encryption?: boolean;
}

export interface DataRetentionConfig {
  /** Completed job retention (days) */
  completedJobRetentionDays: number;
  
  /** Failed job retention (days) */
  failedJobRetentionDays: number;
  
  /** Log retention (days) */
  logRetentionDays: number;
  
  /** Metric retention (days) */
  metricRetentionDays: number;
  
  /** Auto-cleanup enabled */
  autoCleanup: boolean;
}

export interface QueueStatistics {
  /** Total jobs in queue */
  totalJobs: number;
  
  /** Pending jobs */
  pendingJobs: number;
  
  /** Running jobs */
  runningJobs: number;
  
  /** Completed jobs */
  completedJobs: number;
  
  /** Failed jobs */
  failedJobs: number;
  
  /** Jobs by priority */
  jobsByPriority: Record<number, number>;
  
  /** Jobs by type */
  jobsByType: Record<ProcessingJobType, number>;
  
  /** Average wait time (seconds) */
  avgWaitTimeSeconds: number;
  
  /** Average processing time (seconds) */
  avgProcessingTimeSeconds: number;
  
  /** Throughput (jobs per hour) */
  throughputPerHour: number;
  
  /** Success rate */
  successRate: number;
  
  /** Queue health score */
  healthScore: number;
  
  /** Last updated */
  lastUpdated: Date;
}

export interface WorkerConfiguration {
  /** Number of workers */
  workerCount: number;
  
  /** Worker type */
  workerType: WorkerType;
  
  /** Worker resources */
  resources: WorkerResources;
  
  /** Worker health monitoring */
  healthMonitoring: WorkerHealthMonitoring;
  
  /** Worker scaling */
  scaling: WorkerScaling;
  
  /** Worker specialization */
  specialization?: WorkerSpecialization;
}

export type WorkerType = 'generic' | 'specialized' | 'gpu-accelerated' | 'high-memory' | 'high-cpu';

export interface WorkerResources {
  /** CPU allocation */
  cpu: ResourceAllocation;
  
  /** Memory allocation */
  memory: ResourceAllocation;
  
  /** GPU allocation */
  gpu?: ResourceAllocation;
  
  /** Disk allocation */
  disk: ResourceAllocation;
  
  /** Network allocation */
  network?: ResourceAllocation;
}

export interface ResourceAllocation {
  /** Resource amount */
  amount: number;
  
  /** Resource unit */
  unit: string;
  
  /** Resource guarantees */
  guaranteed?: boolean;
  
  /** Resource limits */
  limits?: ResourceLimits;
  
  /** Resource sharing policy */
  sharing?: ResourceSharingPolicy;
}

export interface ResourceLimits {
  /** Minimum resource */
  min: number;
  
  /** Maximum resource */
  max: number;
  
  /** Burst capacity */
  burstCapacity?: number;
}

export type ResourceSharingPolicy = 'shared' | 'dedicated' | 'burstable';

export interface WorkerHealthMonitoring {
  /** Health check enabled */
  enabled: boolean;
  
  /** Health check interval (seconds) */
  intervalSeconds: number;
  
  /** Health check timeout (seconds) */
  timeoutSeconds: number;
  
  /** Health check retries */
  retries: number;
  
  /** Health metrics */
  metrics: HealthMetric[];
  
  /** Unhealthy threshold */
  unhealthyThreshold: number;
  
  /** Recovery actions */
  recoveryActions: RecoveryAction[];
}

export interface HealthMetric {
  /** Metric name */
  name: string;
  
  /** Metric type */
  type: HealthMetricType;
  
  /** Threshold value */
  threshold: number;
  
  /** Comparison operator */
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  
  /** Metric weight */
  weight: number;
}

export type HealthMetricType = 'cpu-usage' | 'memory-usage' | 'disk-usage' | 'network-latency' | 'job-success-rate' | 'response-time';

export interface RecoveryAction {
  /** Action type */
  type: RecoveryActionType;
  
  /** Action parameters */
  parameters: Record<string, unknown>;
  
  /** Action timeout (seconds) */
  timeoutSeconds: number;
  
  /** Action retries */
  retries: number;
}

export type RecoveryActionType = 'restart-worker' | 'scale-worker' | 'redirect-jobs' | 'alert' | 'custom';

export interface WorkerScaling {
  /** Scaling enabled */
  enabled: boolean;
  
  /** Scaling strategy */
  strategy: WorkerScalingStrategy;
  
  /** Scaling triggers */
  triggers: WorkerScalingTrigger[];
  
  /** Cooldown period (seconds) */
  cooldownSeconds: number;
  
  /** Scaling limits */
  limits: WorkerScalingLimits;
}

export type WorkerScalingStrategy = 'reactive' | 'predictive' | 'scheduled' | 'manual';

export interface WorkerScalingTrigger {
  /** Trigger condition */
  condition: string;
  
  /** Scaling action */
  action: 'scale-up' | 'scale-down';
  
  /** Scaling amount */
  amount: number;
  
  /** Trigger priority */
  priority: number;
}

export interface WorkerScalingLimits {
  /** Minimum workers */
  minWorkers: number;
  
  /** Maximum workers */
  maxWorkers: number;
  
  /** Maximum scale-up per event */
  maxScaleUpPerEvent: number;
  
  /** Maximum scale-down per event */
  maxScaleDownPerEvent: number;
}

export interface WorkerSpecialization {
  /** Job types handled */
  jobTypes: ProcessingJobType[];
  
  /** Resource specialization */
  resourceSpecialization: ResourceSpecializationType[];
  
  /** Performance characteristics */
  performanceProfile: PerformanceProfile;
  
  /** Compatibility requirements */
  requirements: CompatibilityRequirement[];
}

export type ResourceSpecializationType = 'cpu-intensive' | 'memory-intensive' | 'gpu-accelerated' | 'io-intensive' | 'network-intensive';

export interface PerformanceProfile {
  /** Typical processing speed */
  typicalSpeedJobsPerHour: number;
  
  /** Quality level specialty */
  qualitySpecialty: string[];
  
  /** Optimization level */
  optimizationLevel: string;
  
  /** Reliability score */
  reliabilityScore: number;
}

export interface CompatibilityRequirement {
  /** Requirement type */
  type: 'library' | 'hardware' | 'software' | 'os';
  
  /** Requirement specification */
  specification: string;
  
  /** Version requirement */
  version?: string;
  
  /** Optional requirement */
  optional: boolean;
}

export interface PriorityHandling {
  /** Priority levels */
  levels: PriorityLevel[];
  
  /** Priority calculation */
  calculation: PriorityCalculation;
  
  /** Priority aging */
  aging?: PriorityAging;
  
  /** Priority overrides */
  overrides: PriorityOverride[];
}

export interface PriorityLevel {
  /** Priority level */
  level: number;
  
  /** Priority name */
  name: string;
  
  /** Resource allocation percentage */
  resourceAllocation: number;
  
  /** Queue position weighting */
  queueWeighting: number;
  
  /** SLA targets */
  slaTargets?: SLATargets;
}

export interface SLATargets {
  /** Maximum wait time (seconds) */
  maxWaitTimeSeconds: number;
  
  /** Maximum processing time (seconds) */
  maxProcessingTimeSeconds: number;
  
  /** Minimum success rate */
  minSuccessRate: number;
}

export interface PriorityCalculation {
  /** Calculation method */
  method: PriorityMethod;
  
  /** Factors considered */
  factors: PriorityFactor[];
  
  /** Base priority */
  basePriority: number;
  
  /** Dynamic adjustment */
  dynamicAdjustment: boolean;
}

export type PriorityMethod = 'static' | 'dynamic' | 'hybrid' | 'ml-based';

export interface PriorityFactor {
  /** Factor name */
  name: string;
  
  /** Factor weight */
  weight: number;
  
  /** Factor calculation */
  calculation: string;
  
  /** Factor limits */
  limits?: [number, number];
}

export interface PriorityAging {
  /** Aging enabled */
  enabled: boolean;
  
  /** Aging rate */
  rate: number;
  
  /** Aging interval (seconds) */
  intervalSeconds: number;
  
  /** Maximum priority increase */
  maxIncrease: number;
  
  /** Aging curve */
  curve: AgingCurve;
}

export type AgingCurve = 'linear' | 'exponential' | 'logarithmic' | 'custom';

export interface PriorityOverride {
  /** Override condition */
  condition: string;
  
  /** New priority */
  newPriority: number;
  
  /** Override duration (seconds) */
  durationSeconds?: number;
  
  /** Override reason */
  reason: string;
}

export interface RetryPolicy {
  /** Policy name */
  name: string;
  
  /** Job types covered */
  jobTypes: ProcessingJobType[];
  
  /** Error types covered */
  errorTypes: string[];
  
  /** Maximum retry attempts */
  maxAttempts: number;
  
  /** Retry strategy */
  strategy: RetryStrategy;
  
  /** Backoff configuration */
  backoff: BackoffConfig;
  
  /** Retry conditions */
  conditions: RetryCondition[];
}

export interface RetryStrategy {
  /** Strategy type */
  type: RetryStrategyType;
  
  /** Strategy parameters */
  parameters: Record<string, unknown>;
  
  /** Jitter enabled */
  jitter: boolean;
  
  /** Circuit breaker */
  circuitBreaker?: CircuitBreakerConfig;
}

export type RetryStrategyType = 'immediate' | 'fixed-delay' | 'exponential-backoff' | 'linear-backoff' | 'custom';

export interface BackoffConfig {
  /** Initial delay (milliseconds) */
  initialDelayMs: number;
  
  /** Maximum delay (milliseconds) */
  maxDelayMs: number;
  
  /** Multiplier */
  multiplier: number;
  
  /** Randomization factor */
  randomizationFactor: number;
}

export interface RetryCondition {
  /** Condition expression */
  expression: string;
  
  /** Condition priority */
  priority: number;
  
  /** Action if condition met */
  action: 'retry' | 'stop' | 'escalate';
}

export interface CircuitBreakerConfig {
  /** Failure threshold */
  failureThreshold: number;
  
  /** Success threshold */
  successThreshold: number;
  
  /** Timeout (seconds) */
  timeoutSeconds: number;
  
  /** Half-open state duration (seconds) */
  halfOpenDurationSeconds: number;
}

export interface DeadLetterQueueConfig {
  /** Dead letter queue enabled */
  enabled: boolean;
  
  /** Dead letter queue name */
  queueName: string;
  
  /** Maximum delivery attempts */
  maxDeliveryAttempts: number;
  
  /** Retention period (days) */
  retentionDays: number;
  
  /** Notification on dead letter */
  notification?: DeadLetterNotification;
  
  /** Analysis configuration */
  analysis?: DeadLetterAnalysis;
}

export interface DeadLetterNotification {
  /** Notification enabled */
  enabled: boolean;
  
  /** Notification channels */
  channels: string[];
  
  /** Notification threshold */
  threshold: number;
  
  /** Notification template */
  template: string;
}

export interface DeadLetterAnalysis {
  /** Analysis enabled */
  enabled: boolean;
  
  /** Analysis frequency */
  frequency: string;
  
  /** Pattern detection */
  patternDetection: boolean;
  
  /** Root cause analysis */
  rootCauseAnalysis: boolean;
  
  /** Recommendations */
  recommendations: boolean;
}

export interface QueueMonitoring {
  /** Monitoring enabled */
  enabled: boolean;
  
  /** Metrics collection */
  metrics: MetricsCollection;
  
  /** Alerting configuration */
  alerting: AlertingConfig;
  
  /** Dashboard configuration */
  dashboard?: DashboardConfig;
  
  /** Health checks */
  healthChecks: QueueHealthCheck[];
}

export interface MetricsCollection {
  /** Collection interval (seconds) */
  intervalSeconds: number;
  
  /** Metrics to collect */
  metrics: QueueMetric[];
  
  /** Retention period (days) */
  retentionDays: number;
  
  /** Export configuration */
  export?: MetricsExport;
}

export interface QueueMetric {
  /** Metric name */
  name: string;
  
  /** Metric type */
  type: QueueMetricType;
  
  /** Aggregation method */
  aggregation: string;
  
  /** Collection frequency */
  frequency: string;
}

export type QueueMetricType = 
  | 'queue-size'
  | 'processing-time'
  | 'wait-time'
  | 'throughput'
  | 'error-rate'
  | 'success-rate'
  | 'resource-usage'
  | 'worker-efficiency';

export interface MetricsExport {
  /** Export enabled */
  enabled: boolean;
  
  /** Export format */
  format: MetricsExportFormat;
  
  /** Export destination */
  destination: string;
  
  /** Export frequency */
  frequency: string;
}

export type MetricsExportFormat = 'prometheus' | 'json' | 'csv' | 'custom';

export interface AlertingConfig {
  /** Alerting enabled */
  enabled: boolean;
  
  /** Alert rules */
  rules: AlertRule[];
  
  /** Notification channels */
  channels: AlertChannel[];
  
  /** Alert escalation */
  escalation?: AlertEscalation;
}

export interface AlertRule {
  /** Rule name */
  name: string;
  
  /** Rule condition */
  condition: string;
  
  /** Alert severity */
  severity: AlertSeverity;
  
  /** Evaluation interval */
  evaluationInterval: string;
  
  /** Rule enabled */
  enabled: boolean;
  
  /** Channels to notify */
  channels: string[];
}

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AlertChannel {
  /** Channel name */
  name: string;
  
  /** Channel type */
  type: string;
  
  /** Channel configuration */
  configuration: Record<string, unknown>;
  
  /** Channel priority */
  priority: number;
}

export interface AlertEscalation {
  /** Escalation enabled */
  enabled: boolean;
  
  /** Escalation levels */
  levels: EscalationLevel[];
  
  /** Escalation timeout (seconds) */
  timeoutSeconds: number;
}

export interface EscalationLevel {
  /** Level number */
  level: number;
  
  /** Channels for this level */
  channels: string[];
  
  /** Escalation delay (seconds) */
  delaySeconds: number;
}

export interface DashboardConfig {
  /** Dashboard enabled */
  enabled: boolean;
  
  /** Dashboard widgets */
  widgets: DashboardWidget[];
  
  /** Refresh interval (seconds) */
  refreshIntervalSeconds: number;
  
  /** Dashboard access control */
  accessControl?: DashboardAccessControl;
}

export interface DashboardWidget {
  /** Widget type */
  type: DashboardWidgetType;
  
  /** Widget configuration */
  configuration: Record<string, unknown>;
  
  /** Widget position */
  position: WidgetPosition;
  
  /** Widget size */
  size: WidgetSize;
}

export type DashboardWidgetType = 'chart' | 'gauge' | 'table' | 'counter' | 'status' | 'log';

export interface WidgetPosition {
  /** X coordinate */
  x: number;
  
  /** Y coordinate */
  y: number;
}

export interface WidgetSize {
  /** Width */
  width: number;
  
  /** Height */
  height: number;
}

export interface DashboardAccessControl {
  /** Authentication required */
  requireAuth: boolean;
  
  /** Authorized users */
  authorizedUsers?: string[];
  
  /** Authorized roles */
  authorizedRoles?: string[];
  
  /** Public access */
  publicAccess: boolean;
}

export interface QueueHealthCheck {
  /** Health check name */
  name: string;
  
  /** Health check type */
  type: QueueHealthCheckType;
  
  /** Check interval (seconds) */
  intervalSeconds: number;
  
  /** Check timeout (seconds) */
  timeoutSeconds: number;
  
  /** Health check enabled */
  enabled: boolean;
  
  /** Failure threshold */
  failureThreshold: number;
}

export type QueueHealthCheckType = 'connectivity' | 'performance' | 'capacity' | 'data-integrity' | 'worker-health';