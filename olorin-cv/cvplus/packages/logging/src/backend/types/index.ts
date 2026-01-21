/**
 * T018: Core logging types implementation
 * CVPlus Logging System - Core Type Definitions
  */

import { LeveledLogMethod, Logger as WinstonLogger } from 'winston';

// Core Log Levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  FATAL = 'fatal'
}

// Log Domains for categorization
export enum LogDomain {
  SYSTEM = 'system',
  BUSINESS = 'business',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  AUDIT = 'audit'
}

// Core log entry structure
export interface LogEntry {
  id: string;
  level: LogLevel;
  domain: LogDomain;
  message: string;
  context?: Record<string, any>;
  error?: ErrorInfo;
  performance?: PerformanceInfo;
  timestamp: number;
  correlationId?: string;
  service?: string;
  package?: string;
  source?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

// Log metadata structure
export interface LogMetadata {
  [key: string]: any;
  version?: string;
  environment?: string;
  buildId?: string;
  deploymentId?: string;
  region?: string;
  instanceId?: string;
}

// Log source information
export interface LogSource {
  file?: string;
  function?: string;
  line?: number;
  column?: number;
  module?: string;
  package?: string;
}

// Error information structure
export interface ErrorInfo {
  message: string;
  code?: string;
  stack?: string;
  name?: string;
  details?: Record<string, any>;
  componentStack?: string;
}

// Performance metrics structure
export interface PerformanceInfo {
  duration?: number;
  value?: number;
  requestSize?: number;
  responseSize?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  additionalMetrics?: Record<string, number>;
}

// Logger configuration interface
export interface LoggerConfig {
  level?: LogLevel;
  service?: string;
  environment?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableFirebase?: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  format?: 'json' | 'simple' | 'detailed';
  redactPII?: boolean;
  metadata?: Record<string, any>;
  package?: string;
  enablePiiRedaction?: boolean;
}

// Audit severity levels
export enum AlertSeverity {
  LOW = 'low',
  INFO = 'info',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Audit actions
export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESS = 'access',
  EXPORT = 'export',
  IMPORT = 'import',
  CONFIGURE = 'configure'
}

// Base logger interface that all specialized loggers implement
export interface ILogger {
  // Core logging methods
  error(message: string, context?: Record<string, any>, error?: Error): string;
  warn(message: string, context?: Record<string, any>): string;
  info(message: string, context?: Record<string, any>): string;
  debug(message: string, context?: Record<string, any>): string;

  // Convenience methods
  log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): string;

  // Context management
  withContext(context: Record<string, any>): ILogger;
  withCorrelation(correlationId: string, callback: () => string): string;
  setUserContext(userContext: UserContext): void;
  setContext(context: Record<string, any>): void;
  clearContext(): void;

  // Specialized logging methods
  performanceMetric(metric: string, value: number, context?: Record<string, any>): string;
  businessEvent(event: string, context?: Record<string, any>): string;
  securityEvent(event: string, context?: Record<string, any>): string;
  auditEvent(event: string, context?: Record<string, any>): string;

  // Utility methods
  getLastLogEntry(): LogEntry | null;
  getAllLogEntries(): LogEntry[];
  clearEntries(): void;
}

// User context for logging
export interface UserContext {
  userId?: string;
  sessionId?: string;
  tier?: string;
  role?: string;
  email?: string;
  experimentGroups?: string[];
  metadata?: Record<string, any>;
}

// Correlation context for distributed tracing
export interface CorrelationContext {
  correlationId: string;
  parentId?: string;
  traceId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

// Transport configuration for different output destinations
export interface TransportConfig {
  type: 'console' | 'file' | 'firebase' | 'external';
  level?: LogLevel;
  format?: string;
  options?: Record<string, any>;
}

// Log formatter interface
export interface LogFormatter {
  format(entry: LogEntry): string;
  formatError(error: ErrorInfo): string;
  formatPerformance(perf: PerformanceInfo): string;
  redactPII(data: any): any;
}

// Logger factory configuration
export interface LoggerFactoryConfig {
  defaultLevel?: LogLevel;
  defaultTransports?: TransportConfig[];
  globalContext?: Record<string, any>;
  enableCorrelationTracking?: boolean;
  enablePIIRedaction?: boolean;
  maxLogEntries?: number;
}

// Aggregation and metrics interfaces
export interface LogAggregatorConfig {
  aggregationInterval: number;
  batchSize: number;
  enableMetrics: boolean;
  enableAlerts: boolean;
  retentionPeriod: number;
  storageBackend: 'memory' | 'firebase' | 'external';
}

export interface AggregatedLogData {
  totalLogs: number;
  timeRange: { start: number; end: number };
  logsByLevel: Record<LogLevel, number>;
  logsByDomain: Record<LogDomain, number>;
  logsBySource: Record<string, number>;
  correlationChains?: CorrelationChain[];
  logs?: LogEntry[];
}

export interface CorrelationChain {
  correlationId: string;
  logCount: number;
  sources: string[];
  duration: number;
  timeline?: TimelineEntry[];
  totalDuration?: number;
  services?: string[];
}

export interface TimelineEntry {
  timestamp: number;
  source: string;
  event: string;
  step?: number;
}

// Performance metrics interfaces
export interface PerformanceMetrics {
  averageResponseTimes: Record<string, number>;
  responseTimePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  slowOperations: Array<{
    source: string;
    duration: number;
    message: string;
  }>;
  performanceAlerts: Array<{
    type: string;
    threshold: number;
    actualValue: number;
  }>;
}

// Error analysis interfaces
export interface ErrorAnalysis {
  totalErrors: number;
  errorsByCategory: Record<string, number>;
  errorsBySource: Record<string, number>;
  topErrors: Array<{
    code: string;
    count: number;
    message: string;
    lastOccurrence: number;
  }>;
  errorRate: number;
}

// Alert rule interface
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  actions: AlertAction[];
  enabled: boolean;
  cooldownMinutes?: number;
}

// Alert condition interface
export interface AlertCondition {
  level?: LogLevel;
  domain?: LogDomain;
  package?: string;
  messagePattern?: RegExp | string;
  threshold?: {
    count: number;
    timeWindowMinutes: number;
  };
  customFilter?: (logEntry: LogEntry) => boolean;
}

// Alert action interface
export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'firebase';
  config: Record<string, any>;
}

// Audit trail interface
export interface AuditTrail {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  details: Record<string, any>;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Alert system interfaces
export interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  timestamp: number;
  metadata?: Record<string, any>;
  resolved?: boolean;
}

export type AlertCallback = (alert: Alert) => void;

// Winston logger extension
export interface ExtendedWinstonLogger extends WinstonLogger {
  // Add any winston-specific extensions here
  setLevel(level: LogLevel): void;
  addContext(context: Record<string, any>): void;
}

// Export convenience type unions
export type LoggerMethod = (message: string, context?: Record<string, any>, error?: Error) => string;
export type CorrelationCallback<T = string> = () => T;

// Constants
export const LOG_LEVELS = Object.values(LogLevel);
export const LOG_DOMAINS = Object.values(LogDomain);

// Default configurations
export const DEFAULT_LOGGER_CONFIG: Required<LoggerConfig> = {
  level: LogLevel.INFO,
  service: 'unknown',
  environment: process.env.NODE_ENV || 'development',
  enableConsole: true,
  enableFile: false,
  enableFirebase: false,
  filePath: './logs/application.log',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  format: 'json',
  redactPII: true,
  metadata: {},
  package: 'unknown',
  enablePiiRedaction: true
};

export const DEFAULT_FACTORY_CONFIG: Required<LoggerFactoryConfig> = {
  defaultLevel: LogLevel.INFO,
  defaultTransports: [
    { type: 'console', level: LogLevel.INFO },
    { type: 'file', level: LogLevel.DEBUG }
  ],
  globalContext: {},
  enableCorrelationTracking: true,
  enablePIIRedaction: true,
  maxLogEntries: 1000
};