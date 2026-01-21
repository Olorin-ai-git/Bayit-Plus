/**
 * System Monitoring Types
 * 
 * Types for system health monitoring, performance tracking, and alerting.
  */

// ============================================================================
// System Health & Status
// ============================================================================

export interface SystemHealthStatus {
  overall: SystemHealthScore;
  services: ServiceHealthStatus[];
  resources: ResourceUtilization;
  database: any; // TODO: Define DatabaseHealth interface
  dependencies: ExternalDependencyHealth[];
  lastChecked: Date;
  trends: HealthTrends;
}

export interface SystemHealthScore {
  score: number; // 0-100
  status: HealthStatus;
  issues: HealthIssue[];
  uptime: number;
  availability: number;
  lastIncident?: Date;
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline'
}

export interface HealthIssue {
  id: string;
  severity: IssueSeverity;
  component: string;
  title: string;
  description: string;
  detectedAt: Date;
  estimatedResolution?: Date;
  affectedServices: string[];
  impact: ImpactLevel;
  resolution?: IssueResolution;
}

export enum IssueSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ImpactLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  SEVERE = 'severe'
}

export interface IssueResolution {
  action: string;
  estimatedTime: number;
  assignedTo?: string;
  status: ResolutionStatus;
}

export enum ResolutionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated'
}

// ============================================================================
// Service Health Monitoring
// ============================================================================

export interface ServiceHealthStatus {
  serviceName: string;
  status: HealthStatus;
  responseTime: number;
  uptime: number;
  errorRate: number;
  throughput: number;
  lastCheck: Date;
  endpoints: EndpointHealth[];
  dependencies: ServiceDependency[];
  metrics: ServiceMetrics;
  alerts: any[];
}

export interface EndpointHealth {
  path: string;
  method: string;
  status: HealthStatus;
  responseTime: number;
  successRate: number;
  errorCount: number;
  lastCheck: Date;
  slaCompliance: number;
}

export interface ServiceDependency {
  name: string;
  type: DependencyType;
  status: HealthStatus;
  responseTime: number;
  errorRate: number;
  isRequired: boolean;
  fallbackAvailable: boolean;
}

export enum DependencyType {
  DATABASE = 'database',
  CACHE = 'cache',
  QUEUE = 'queue',
  STORAGE = 'storage',
  EXTERNAL_API = 'external_api',
  MICROSERVICE = 'microservice',
  CDN = 'cdn'
}

export interface ServiceMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIo: NetworkMetrics;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  connectionsActive: number;
}

// ============================================================================
// Resource Monitoring
// ============================================================================

export interface ResourceUtilization {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  database: DatabaseMetrics;
  timestamp: Date;
}

export interface CpuMetrics {
  usage: number; // percentage
  cores: number;
  load: number[];
  temperature?: number;
  throttling: boolean;
  processes: ProcessMetrics[];
}

export interface ProcessMetrics {
  pid: number;
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  status: ProcessStatus;
}

export enum ProcessStatus {
  RUNNING = 'running',
  SLEEPING = 'sleeping',
  STOPPED = 'stopped',
  ZOMBIE = 'zombie'
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  cached: number;
  buffers: number;
  swap: SwapMetrics;
  usage: number; // percentage
}

export interface SwapMetrics {
  total: number;
  used: number;
  free: number;
  usage: number; // percentage
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  usage: number; // percentage
  iops: number;
  readBytesPerSec: number;
  writeBytesPerSec: number;
  partitions: PartitionMetrics[];
}

export interface PartitionMetrics {
  device: string;
  mountPoint: string;
  total: number;
  used: number;
  free: number;
  usage: number; // percentage
}

export interface DatabaseMetrics {
  connections: ConnectionMetrics;
  performance: DatabasePerformanceMetrics;
  storage: DatabaseStorageMetrics;
  replication?: ReplicationMetrics;
}

export interface ConnectionMetrics {
  active: number;
  idle: number;
  waiting: number;
  maxConnections: number;
  usage: number; // percentage
}

export interface DatabasePerformanceMetrics {
  queriesPerSecond: number;
  averageQueryTime: number;
  slowQueries: number;
  lockWaitTime: number;
  cacheHitRatio: number;
  indexUsage: number;
}

export interface DatabaseStorageMetrics {
  totalSize: number;
  dataSize: number;
  indexSize: number;
  logSize: number;
  freeSpace: number;
  fragmentationRatio: number;
}

export interface ReplicationMetrics {
  status: ReplicationStatus;
  lag: number;
  replicas: ReplicaMetrics[];
}

export enum ReplicationStatus {
  HEALTHY = 'healthy',
  LAGGING = 'lagging',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export interface ReplicaMetrics {
  id: string;
  status: ReplicationStatus;
  lag: number;
  lastSync: Date;
}

// ============================================================================
// External Dependencies
// ============================================================================

export interface ExternalDependencyHealth {
  name: string;
  type: ExternalServiceType;
  status: HealthStatus;
  responseTime: number;
  uptime: number;
  errorRate: number;
  lastCheck: Date;
  sla: SlaMetrics;
  configuration: DependencyConfiguration;
}

export enum ExternalServiceType {
  ANTHROPIC_API = 'anthropic_api',
  STRIPE_API = 'stripe_api',
  GOOGLE_APIS = 'google_apis',
  CALENDLY_API = 'calendly_api',
  EMAIL_SERVICE = 'email_service',
  CDN = 'cdn',
  MONITORING_SERVICE = 'monitoring_service',
  LOGGING_SERVICE = 'logging_service'
}

export interface SlaMetrics {
  target: number; // percentage
  actual: number; // percentage
  breaches: SlaBreach[];
  credits: number;
}

export interface SlaBreach {
  startTime: Date;
  endTime: Date;
  duration: number;
  impact: ImpactLevel;
  cause: string;
}

export interface DependencyConfiguration {
  timeout: number;
  retries: number;
  circuitBreakerEnabled: boolean;
  rateLimiting: RateLimitConfig;
  authentication: AuthConfig;
}

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerSecond: number;
  burstLimit: number;
  backoffStrategy: BackoffStrategy;
}

export enum BackoffStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  JITTER = 'jitter'
}

export interface AuthConfig {
  type: AuthType;
  tokenExpiry?: number;
  refreshEnabled?: boolean;
}

export enum AuthType {
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  JWT = 'jwt',
  BASIC_AUTH = 'basic_auth'
}

// ============================================================================
// Performance Monitoring
// ============================================================================

export interface PerformanceMetrics {
  timestamp: Date;
  responseTime: ResponseTimeMetrics;
  throughput: ThroughputMetrics;
  errors: ErrorMetrics;
  availability: AvailabilityMetrics;
  userExperience: UserExperienceMetrics;
}

export interface ResponseTimeMetrics {
  average: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  distribution: ResponseTimeDistribution[];
}

export interface ResponseTimeDistribution {
  bucket: string; // e.g., "0-100ms", "100-500ms"
  count: number;
  percentage: number;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  peakThroughput: number;
  minimumThroughput: number;
  averageThroughput: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number; // percentage
  errorsByType: ErrorTypeMetrics[];
  errorsByService: ServiceErrorMetrics[];
  criticalErrors: number;
}

export interface ErrorTypeMetrics {
  type: ErrorType;
  count: number;
  rate: number;
  trend: TrendDirection;
}

export enum ErrorType {
  HTTP_4XX = 'http_4xx',
  HTTP_5XX = 'http_5xx',
  TIMEOUT = 'timeout',
  CONNECTION_ERROR = 'connection_error',
  VALIDATION_ERROR = 'validation_error',
  BUSINESS_LOGIC_ERROR = 'business_logic_error',
  INFRASTRUCTURE_ERROR = 'infrastructure_error'
}

export interface ServiceErrorMetrics {
  serviceName: string;
  errorCount: number;
  errorRate: number;
  topErrors: TopError[];
}

export interface TopError {
  message: string;
  count: number;
  lastOccurrence: Date;
  impact: ImpactLevel;
}

export interface AvailabilityMetrics {
  uptime: number; // percentage
  downtime: number; // minutes
  mtbf: number; // mean time between failures
  mttr: number; // mean time to recovery
  incidents: IncidentSummary[];
}

export interface IncidentSummary {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  severity: IssueSeverity;
  impact: ImpactLevel;
  cause: string;
  resolution?: string;
}

export interface UserExperienceMetrics {
  apdex: number; // application performance index
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  bounceRate: number;
}

// ============================================================================
// Alerting & Notifications
// ============================================================================

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  component: string;
  timestamp: Date;
  status: AlertStatus;
  assignedTo?: string;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  escalationLevel: number;
  metadata: AlertMetadata;
  actions: AlertAction[];
}

export enum AlertType {
  SYSTEM_HEALTH = 'system_health',
  PERFORMANCE = 'performance',
  ERROR_RATE = 'error_rate',
  RESOURCE_USAGE = 'resource_usage',
  DEPENDENCY_FAILURE = 'dependency_failure',
  SECURITY_EVENT = 'security_event',
  SLA_BREACH = 'sla_breach',
  CAPACITY_WARNING = 'capacity_warning'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
  ESCALATED = 'escalated'
}

export interface AlertMetadata {
  source: string;
  tags: string[];
  relatedAlerts: string[];
  threshold: AlertThreshold;
  actualValue: number;
  context: Record<string, any>;
}

export interface AlertThreshold {
  metric: string;
  operator: ThresholdOperator;
  value: number;
  duration: number;
}

export enum ThresholdOperator {
  GREATER_THAN = 'gt',
  GREATER_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_EQUAL = 'lte',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne'
}

export interface AlertAction {
  id: string;
  type: AlertActionType;
  label: string;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  canUndo: boolean;
}

export enum AlertActionType {
  ACKNOWLEDGE = 'acknowledge',
  RESOLVE = 'resolve',
  ESCALATE = 'escalate',
  SUPPRESS = 'suppress',
  RESTART_SERVICE = 'restart_service',
  SCALE_UP = 'scale_up',
  FAILOVER = 'failover',
  NOTIFY_ONCALL = 'notify_oncall'
}

// ============================================================================
// Monitoring Configuration
// ============================================================================

export interface MonitoringConfiguration {
  healthChecks: HealthCheckConfig[];
  alertRules: AlertRule[];
  dashboards: DashboardConfig[];
  notifications: NotificationConfig;
  retention: RetentionPolicy;
}

export interface HealthCheckConfig {
  id: string;
  name: string;
  type: HealthCheckType;
  target: string;
  interval: number;
  timeout: number;
  retries: number;
  parameters: Record<string, any>;
  enabled: boolean;
}

export enum HealthCheckType {
  HTTP = 'http',
  TCP = 'tcp',
  DATABASE = 'database',
  CUSTOM = 'custom',
  SYNTHETIC = 'synthetic'
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  suppressions: AlertSuppression[];
  notifications: NotificationTarget[];
}

export interface AlertCondition {
  threshold: AlertThreshold;
  aggregation: AggregationType;
  window: number;
  frequency: number;
}

export enum AggregationType {
  AVERAGE = 'avg',
  MINIMUM = 'min',
  MAXIMUM = 'max',
  SUM = 'sum',
  COUNT = 'count',
  PERCENTILE = 'percentile'
}

export interface AlertSuppression {
  id: string;
  reason: string;
  startTime: Date;
  endTime: Date;
  createdBy: string;
}

export interface NotificationTarget {
  type: NotificationType;
  target: string;
  severity: AlertSeverity[];
  enabled: boolean;
}

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  PAGERDUTY = 'pagerduty'
}

export interface DashboardConfig {
  id: string;
  name: string;
  layout: DashboardLayout;
  widgets: WidgetConfig[];
  permissions: string[];
}

export interface DashboardLayout {
  rows: number;
  columns: number;
  responsive: boolean;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  metrics: string[];
  timeRange: TimeRange;
  refreshInterval: number;
}

export enum WidgetType {
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  GAUGE = 'gauge',
  TABLE = 'table',
  SINGLE_STAT = 'single_stat',
  HEAT_MAP = 'heat_map'
}

export interface WidgetPosition {
  row: number;
  column: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
  preset?: TimeRangePreset;
}

export enum TimeRangePreset {
  LAST_5_MINUTES = 'last_5m',
  LAST_15_MINUTES = 'last_15m',
  LAST_HOUR = 'last_1h',
  LAST_4_HOURS = 'last_4h',
  LAST_24_HOURS = 'last_24h',
  LAST_7_DAYS = 'last_7d',
  LAST_30_DAYS = 'last_30d'
}

export interface NotificationConfig {
  channels: NotificationChannel[];
  escalationPolicies: EscalationPolicy[];
  oncallSchedules: OncallSchedule[];
}

export interface NotificationChannel {
  id: string;
  type: NotificationType;
  name: string;
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  steps: EscalationStep[];
}

export interface EscalationStep {
  delayMinutes: number;
  targets: NotificationTarget[];
}

export interface OncallSchedule {
  id: string;
  name: string;
  rotations: OncallRotation[];
}

export interface OncallRotation {
  id: string;
  users: string[];
  startTime: Date;
  rotationDays: number;
}

export interface RetentionPolicy {
  metrics: MetricRetention[];
  logs: LogRetention;
  alerts: AlertRetention;
}

export interface MetricRetention {
  metric: string;
  resolution: string;
  retentionDays: number;
}

export interface LogRetention {
  level: LogLevel[];
  retentionDays: number;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface AlertRetention {
  resolved: number;
  active: number;
}

// ============================================================================
// Trends & Historical Data
// ============================================================================

export interface HealthTrends {
  availability: TrendData;
  performance: TrendData;
  errors: TrendData;
  capacity: TrendData;
}

export interface TrendData {
  direction: TrendDirection;
  changePercent: number;
  dataPoints: TrendDataPoint[];
  prediction?: TrendPrediction;
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable'
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface TrendPrediction {
  nextValue: number;
  confidence: number;
  timeframe: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  impact: number;
  confidence: number;
}