/**
 * Core logging types for CVPlus platform
 * These types define the structure for comprehensive logging system
  */

/**
 * Log severity levels following RFC 5424 standard
  */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Log domain categories for organizing logs by functional area
  */
export enum LogDomain {
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  BUSINESS = 'business',
  SYSTEM = 'system',
  AUDIT = 'audit'
}

/**
 * Alert severity levels
  */
export enum AlertSeverity {
  LOW = 'low',
  INFO = 'info',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Audit actions
  */
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

/**
 * Error details structure for log entries
  */
export interface LogError {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  details?: Record<string, unknown>;
}

/**
 * Performance metrics structure for log entries
  */
export interface LogPerformance {
  duration?: number; // milliseconds
  memoryUsage?: number; // bytes
  cpuUsage?: number; // percentage
  requestSize?: number; // bytes
  responseSize?: number; // bytes
  [key: string]: number | undefined;
}

/**
 * Core log entry structure
  */
export interface LogEntry {
  timestamp: string; // ISO 8601 format
  level: LogLevel;
  message: string;
  correlationId: string;
  domain: LogDomain | string;
  package: string; // e.g., '@cvplus/auth'
  context: Record<string, unknown>;
  error?: LogError;
  performance?: LogPerformance;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

/**
 * Log stream configuration
  */
export interface LogStream {
  id: string;
  name: string;
  package: string;
  domain: LogDomain;
  level: LogLevel;
  enabled: boolean;
  retention?: number; // days
  tags?: string[];
}

/**
 * Alert rule configuration
  */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  actions: AlertAction[];
  enabled: boolean;
  cooldownMinutes?: number;
}

/**
 * Alert condition types
  */
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

/**
 * Alert action types
  */
export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'firebase';
  config: Record<string, unknown>;
}

/**
 * Audit trail entry
  */
export interface AuditTrail {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure';
  details: Record<string, unknown>;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Logger configuration options
  */
export interface LoggerConfig {
  level?: LogLevel;
  service?: string;
  environment?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableFirebase?: boolean;
  filePath?: string;
  maxFileSize?: string;
  maxFiles?: number;
  enablePiiRedaction?: boolean;
  customRedactionPatterns?: Record<string, RegExp>;
}

/**
 * Transport configuration for different log outputs
  */
export interface TransportConfig {
  console?: {
    level: LogLevel;
    colorize: boolean;
    timestamp: boolean;
  };
  file?: {
    level: LogLevel;
    filename: string;
    maxsize: number;
    maxFiles: number;
    format: 'json' | 'simple';
  };
  firebase?: {
    level: LogLevel;
    projectId: string;
    logName: string;
    resource?: {
      type: string;
      labels: Record<string, string>;
    };
  };
}

/**
 * Formatted log entry for different outputs
  */
export interface FormattedLogEntry {
  '@timestamp': string;
  level: string;
  message: string;
  correlationId: string;
  domain: string;
  package: string;
  context: Record<string, unknown>;
  error?: LogError;
  performance?: LogPerformance;
  [key: string]: unknown;
}

/**
 * Firebase Cloud Logging format
  */
export interface FirebaseLogEntry {
  timestamp: string;
  severity: string;
  message: string;
  labels: Record<string, string>;
  jsonPayload?: Record<string, unknown>;
  resource?: {
    type: string;
    labels: Record<string, string>;
  };
}

/**
 * PII redaction configuration
  */
export interface PiiRedactionConfig {
  enabled: boolean;
  patterns: Record<string, RegExp>;
  replacement: (match: string, patternName: string) => string;
}

/**
 * Log aggregation metrics
  */
export interface LogMetrics {
  timestamp: string;
  period: number; // minutes
  counts: {
    [level in LogLevel]: number;
  };
  domains: {
    [domain: string]: number;
  };
  packages: {
    [packageName: string]: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  performance: {
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
  };
}

/**
 * Logger interface that all loggers must implement
  */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>, error?: Error): void;
  fatal(message: string, context?: Record<string, unknown>, error?: Error): void;

  // Domain-specific logging methods
  security(message: string, context?: Record<string, unknown>): void;
  performance(message: string, metrics?: LogPerformance, context?: Record<string, unknown>): void;
  audit(action: string, resource: string, outcome: 'success' | 'failure', context?: Record<string, unknown>): void;

  // Correlation and context
  withCorrelationId(correlationId: string, callback: () => void | Promise<void>): void | Promise<void>;
  setContext(context: Record<string, unknown>): void;
  clearContext(): void;
}

/**
 * Logger factory interface
  */
export interface LoggerFactory {
  createLogger(service: string, config?: LoggerConfig): Logger;
  getLogger(service: string): Logger;
  getAllLoggers(): Record<string, Logger>;
  updateLogLevel(service: string, level: LogLevel): void;
  updateLogLevel(level: LogLevel): void; // Update all loggers
  reset(): void;
}