/**
 * Monitoring System
 * Central export point for all monitoring functionality
 */

export * from './HealthMonitor';
export * from './AlertManager';

// Re-export key types for convenience
export type {
  HealthStatus,
  HealthIssue,
  HealthMetrics,
  HealthTrend,
  HealthCheckConfig,
  AlertConfig,
  AlertChannel,
  AlertRule,
  MonitoringReport,
  SystemMetrics
} from './HealthMonitor';

export type {
  Alert,
  AlertRule as AlertManagerRule,
  AlertCondition,
  AlertFilter,
  NotificationChannel,
  NotificationChannelConfig,
  RetryPolicy,
  EscalationPolicy,
  EscalationLevel,
  AlertStats
} from './AlertManager';

// Monitoring constants
export const HEALTH_STATUS_THRESHOLDS = {
  HEALTHY: 90,
  DEGRADED: 60,
  CRITICAL: 30,
  OFFLINE: 0
} as const;

export const ALERT_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const ALERT_CATEGORIES = {
  HEALTH: 'health',
  PERFORMANCE: 'performance',
  AVAILABILITY: 'availability',
  SECURITY: 'security',
  DEPENDENCY: 'dependency'
} as const;

export const NOTIFICATION_CHANNELS = {
  CONSOLE: 'console',
  EMAIL: 'email',
  SLACK: 'slack',
  WEBHOOK: 'webhook',
  SMS: 'sms',
  FILE: 'file'
} as const;

// Utility functions
export const getHealthStatusFromScore = (score: number): 'healthy' | 'degraded' | 'critical' | 'offline' => {
  if (score >= HEALTH_STATUS_THRESHOLDS.HEALTHY) return 'healthy';
  if (score >= HEALTH_STATUS_THRESHOLDS.DEGRADED) return 'degraded';
  if (score >= HEALTH_STATUS_THRESHOLDS.CRITICAL) return 'critical';
  return 'offline';
};

export const getSeverityWeight = (severity: string): number => {
  const weights = {
    critical: 100,
    high: 80,
    medium: 60,
    low: 40
  };
  return weights[severity as keyof typeof weights] || 0;
};

export const formatHealthScore = (score: number): string => {
  return `${score}/100`;
};

export const formatUptime = (uptimeMs: number): string => {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export const formatResponseTime = (responseTimeMs: number): string => {
  if (responseTimeMs >= 1000) {
    return `${(responseTimeMs / 1000).toFixed(2)}s`;
  }
  return `${Math.round(responseTimeMs)}ms`;
};

export const formatErrorRate = (errorRate: number): string => {
  return `${(errorRate * 100).toFixed(2)}%`;
};

export const formatThroughput = (throughput: number): string => {
  return `${throughput.toFixed(1)} req/min`;
};

// Monitoring factory functions
export const createDefaultHealthMonitor = (workspacePath: string) => {
  const { HealthMonitor } = require('./HealthMonitor');
  return new HealthMonitor(workspacePath);
};

export const createDefaultAlertManager = (workspacePath: string) => {
  const { AlertManager } = require('./AlertManager');
  return new AlertManager(workspacePath);
};

// Configuration templates
export const DEFAULT_HEALTH_CHECK_CONFIG: Partial<import('./HealthMonitor').HealthCheckConfig> = {
  interval: 30000, // 30 seconds
  retryAttempts: 3,
  timeout: 10000, // 10 seconds
  enableAutoRecovery: true,
  alertThresholds: {
    critical: 30,
    degraded: 60,
    errorRate: 0.05, // 5%
    responseTime: 5000 // 5 seconds
  }
};

export const DEFAULT_ALERT_CONFIG: Partial<import('./HealthMonitor').AlertConfig> = {
  enabled: true,
  cooldownPeriod: 15, // 15 minutes
  channels: [
    {
      type: 'console',
      config: {},
      enabled: true
    }
  ]
};

// Monitoring event types
export const MONITORING_EVENTS = {
  HEALTH_CHECK_STARTED: 'health-check-started',
  HEALTH_CHECK_COMPLETED: 'health-check-completed',
  HEALTH_CHECK_FAILED: 'health-check-failed',
  MONITORING_STARTED: 'monitoring-started',
  MONITORING_STOPPED: 'monitoring-stopped',
  MONITORING_ERROR: 'monitoring-error',
  ALERT_CREATED: 'alert-created',
  ALERT_ACKNOWLEDGED: 'alert-acknowledged',
  ALERT_RESOLVED: 'alert-resolved',
  ALERT_ESCALATED: 'alert-escalated',
  ALERT_SUPPRESSED: 'alert-suppressed',
  NOTIFICATION_SENT: 'notification-sent',
  NOTIFICATION_FAILED: 'notification-failed',
  AUTO_RECOVERY_SUCCESS: 'auto-recovery-success',
  AUTO_RECOVERY_FAILED: 'auto-recovery-failed'
} as const;

// Level 2 modules for CVPlus architecture
export const LEVEL_2_MODULES = [
  'auth',
  'i18n',
  'cv-processing',
  'multimedia',
  'analytics',
  'premium',
  'public-profiles',
  'recommendations',
  'admin',
  'workflow',
  'payments'
] as const;

export type Level2Module = typeof LEVEL_2_MODULES[number];

// Module health check priorities (higher number = higher priority)
export const MODULE_PRIORITIES = {
  'core': 100,       // Critical system core
  'auth': 95,        // Authentication is critical
  'payments': 90,    // Payment processing is high priority
  'cv-processing': 85, // Core business functionality
  'admin': 80,       // Admin functions
  'analytics': 75,   // Data and insights
  'multimedia': 70,  // Media processing
  'recommendations': 65, // AI recommendations
  'public-profiles': 60, // Public features
  'workflow': 55,    // Job management
  'premium': 50,     // Premium features
  'i18n': 45        // Internationalization
} as const;

export const getModulePriority = (moduleId: string): number => {
  return MODULE_PRIORITIES[moduleId as keyof typeof MODULE_PRIORITIES] || 50;
};

// Health check result aggregation
export const aggregateHealthScores = (scores: number[]): {
  average: number;
  weighted: number;
  min: number;
  max: number;
  healthy: number;
  degraded: number;
  critical: number;
  offline: number;
} => {
  if (scores.length === 0) {
    return {
      average: 0,
      weighted: 0,
      min: 0,
      max: 0,
      healthy: 0,
      degraded: 0,
      critical: 0,
      offline: 0
    };
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  // Simple weighted average (in real implementation, weight by module importance)
  const weighted = average;

  // Count by status
  const healthy = scores.filter(score => score >= HEALTH_STATUS_THRESHOLDS.HEALTHY).length;
  const degraded = scores.filter(score =>
    score >= HEALTH_STATUS_THRESHOLDS.DEGRADED && score < HEALTH_STATUS_THRESHOLDS.HEALTHY).length;
  const critical = scores.filter(score =>
    score >= HEALTH_STATUS_THRESHOLDS.CRITICAL && score < HEALTH_STATUS_THRESHOLDS.DEGRADED).length;
  const offline = scores.filter(score => score < HEALTH_STATUS_THRESHOLDS.CRITICAL).length;

  return {
    average: Math.round(average),
    weighted: Math.round(weighted),
    min,
    max,
    healthy,
    degraded,
    critical,
    offline
  };
};