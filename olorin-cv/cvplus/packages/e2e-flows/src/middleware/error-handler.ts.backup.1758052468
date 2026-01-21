/**
 * Error Handling and Logging Middleware
 * Comprehensive error handling, logging, and monitoring for E2E testing flows
 */

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  scenarioId?: string;
  testPhase?: string;
  environment?: string;
  timestamp: Date;
  userAgent?: string;
  clientIP?: string;
  additionalInfo?: Record<string, any>;
}

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: Date;
  context: ErrorContext;
  stack?: string;
  errorCode?: string;
  category: 'system' | 'validation' | 'business' | 'security' | 'performance';
  metadata?: Record<string, any>;
}

export interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  errorsByCategory: Record<string, number>;
  errorsByCode: Record<string, number>;
  topErrors: Array<{ message: string; count: number; lastSeen: Date }>;
  responseTimeImpact: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: 'error_rate' | 'error_count' | 'specific_error' | 'response_time';
  threshold: number;
  timeWindow: number; // in milliseconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[]; // notification channels
  metadata?: Record<string, any>;
}

export interface AlertNotification {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  details: Record<string, any>;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export class ErrorHandler {
  private logs: LogEntry[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertNotification> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private logBuffer: LogEntry[] = [];
  private readonly maxLogEntries: number = 10000;
  private readonly maxLogAge: number = 24 * 60 * 60 * 1000; // 24 hours
  private flushInterval?: NodeJS.Timeout;

  constructor(options: {
    maxLogEntries?: number;
    maxLogAge?: number;
    autoFlush?: boolean;
    flushIntervalMs?: number;
  } = {}) {
    this.maxLogEntries = options.maxLogEntries || this.maxLogEntries;
    this.maxLogAge = options.maxLogAge || this.maxLogAge;

    if (options.autoFlush !== false) {
      this.startAutoFlush(options.flushIntervalMs || 60000); // 1 minute default
    }

    this.initializeDefaultRules();

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  // Error Handling
  public handleError(error: Error, context: Partial<ErrorContext> = {}): LogEntry {
    const errorId = this.generateId();
    const logEntry: LogEntry = {
      id: errorId,
      level: 'error',
      message: error.message,
      timestamp: new Date(),
      context: {
        timestamp: new Date(),
        ...context
      },
      stack: error.stack,
      category: this.categorizeError(error),
      metadata: {
        errorName: error.name,
        errorType: error.constructor.name
      }
    };

    this.addLogEntry(logEntry);
    this.updateErrorMetrics(logEntry);
    this.checkAlertRules(logEntry);

    return logEntry;
  }

  public handleValidationError(message: string, context: Partial<ErrorContext> = {}): LogEntry {
    return this.log('error', message, {
      ...context,
      category: 'validation'
    });
  }

  public handleBusinessError(message: string, errorCode: string, context: Partial<ErrorContext> = {}): LogEntry {
    return this.log('error', message, {
      ...context,
      category: 'business',
      errorCode
    });
  }

  public handleSecurityError(message: string, context: Partial<ErrorContext> = {}): LogEntry {
    return this.log('error', message, {
      ...context,
      category: 'security'
    });
  }

  public handlePerformanceError(message: string, responseTime: number, context: Partial<ErrorContext> = {}): LogEntry {
    return this.log('error', message, {
      ...context,
      category: 'performance',
      metadata: { responseTime }
    });
  }

  // Logging
  public log(
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
    message: string,
    options: Partial<ErrorContext & { category?: string; errorCode?: string; metadata?: Record<string, any> }> = {}
  ): LogEntry {
    const logEntry: LogEntry = {
      id: this.generateId(),
      level,
      message,
      timestamp: new Date(),
      context: {
        timestamp: new Date(),
        ...options
      },
      errorCode: options.errorCode,
      category: (options.category as any) || 'system',
      metadata: options.metadata
    };

    this.addLogEntry(logEntry);

    if (level === 'error' || level === 'fatal') {
      this.updateErrorMetrics(logEntry);
      this.checkAlertRules(logEntry);
    }

    return logEntry;
  }

  public debug(message: string, context: Partial<ErrorContext> = {}): LogEntry {
    return this.log('debug', message, context);
  }

  public info(message: string, context: Partial<ErrorContext> = {}): LogEntry {
    return this.log('info', message, context);
  }

  public warn(message: string, context: Partial<ErrorContext> = {}): LogEntry {
    return this.log('warn', message, context);
  }

  public error(message: string, context: Partial<ErrorContext> = {}): LogEntry {
    return this.log('error', message, context);
  }

  public fatal(message: string, context: Partial<ErrorContext> = {}): LogEntry {
    return this.log('fatal', message, context);
  }

  // Alert Management
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  public removeAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  public getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      this.activeAlerts.delete(alertId);
      return true;
    }
    return false;
  }

  public getActiveAlerts(): AlertNotification[] {
    return Array.from(this.activeAlerts.values());
  }

  // Query and Analytics
  public getLogs(filter: {
    level?: string[];
    category?: string[];
    timeRange?: { start: Date; end: Date };
    searchTerm?: string;
    limit?: number;
  } = {}): LogEntry[] {
    let filteredLogs = [...this.logs];

    // Filter by level
    if (filter.level && filter.level.length > 0) {
      filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
    }

    // Filter by category
    if (filter.category && filter.category.length > 0) {
      filteredLogs = filteredLogs.filter(log => filter.category!.includes(log.category));
    }

    // Filter by time range
    if (filter.timeRange) {
      filteredLogs = filteredLogs.filter(log =>
        log.timestamp >= filter.timeRange!.start && log.timestamp <= filter.timeRange!.end
      );
    }

    // Filter by search term
    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        (log.stack && log.stack.toLowerCase().includes(searchLower))
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }

    return filteredLogs;
  }

  public getErrorMetrics(timeWindow: number = 60 * 60 * 1000): ErrorMetrics { // Default: 1 hour
    const cutoffTime = new Date(Date.now() - timeWindow);
    const recentLogs = this.logs.filter(log =>
      (log.level === 'error' || log.level === 'fatal') && log.timestamp >= cutoffTime
    );

    const totalRequests = this.logs.filter(log => log.timestamp >= cutoffTime).length;
    const errorCount = recentLogs.length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    // Group by category
    const errorsByCategory: Record<string, number> = {};
    recentLogs.forEach(log => {
      errorsByCategory[log.category] = (errorsByCategory[log.category] || 0) + 1;
    });

    // Group by error code
    const errorsByCode: Record<string, number> = {};
    recentLogs.forEach(log => {
      if (log.errorCode) {
        errorsByCode[log.errorCode] = (errorsByCode[log.errorCode] || 0) + 1;
      }
    });

    // Top errors
    const errorGroups = new Map<string, { count: number; lastSeen: Date }>();
    recentLogs.forEach(log => {
      const key = log.message;
      const existing = errorGroups.get(key);
      if (existing) {
        existing.count++;
        if (log.timestamp > existing.lastSeen) {
          existing.lastSeen = log.timestamp;
        }
      } else {
        errorGroups.set(key, { count: 1, lastSeen: log.timestamp });
      }
    });

    const topErrors = Array.from(errorGroups.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate response time impact (simplified)
    const responseTimeImpact = this.calculateResponseTimeImpact(recentLogs);

    return {
      errorCount,
      errorRate,
      errorsByCategory,
      errorsByCode,
      topErrors,
      responseTimeImpact
    };
  }

  // Export and Import
  public exportLogs(format: 'json' | 'csv' | 'text' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.logs, null, 2);

      case 'csv':
        return this.logsToCsv();

      case 'text':
        return this.logsToText();

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  public clearLogs(): void {
    this.logs = [];
    this.errorCounts.clear();
  }

  // Cleanup and Maintenance
  public cleanup(): void {
    const cutoffTime = new Date(Date.now() - this.maxLogAge);

    // Remove old logs
    this.logs = this.logs.filter(log => log.timestamp >= cutoffTime);

    // Trim to max entries if needed
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, this.maxLogEntries);
    }

    // Clean up resolved alerts older than 24 hours
    const alertCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const [id, alert] of this.activeAlerts) {
      if (alert.resolvedAt && alert.resolvedAt < alertCutoff) {
        this.activeAlerts.delete(id);
      }
    }
  }

  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = undefined;
    }
  }

  // Private Methods
  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);

    // Immediate cleanup if we exceed limits significantly
    if (this.logs.length > this.maxLogEntries * 1.2) {
      this.cleanup();
    }
  }

  private categorizeError(error: Error): 'system' | 'validation' | 'business' | 'security' | 'performance' {
    const message = error.message.toLowerCase();
    const stack = (error.stack || '').toLowerCase();

    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation';
    }

    if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('authentication')) {
      return 'security';
    }

    if (message.includes('timeout') || message.includes('slow') || message.includes('performance')) {
      return 'performance';
    }

    if (error.name.includes('Business') || message.includes('business logic')) {
      return 'business';
    }

    return 'system';
  }

  private updateErrorMetrics(logEntry: LogEntry): void {
    const key = logEntry.message;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  private checkAlertRules(logEntry: LogEntry): void {
    const now = new Date();

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      let shouldAlert = false;
      let alertDetails: Record<string, any> = {};

      switch (rule.condition) {
        case 'error_count':
          const recentErrors = this.logs.filter(log =>
            (log.level === 'error' || log.level === 'fatal') &&
            log.timestamp >= new Date(now.getTime() - rule.timeWindow)
          );

          if (recentErrors.length >= rule.threshold) {
            shouldAlert = true;
            alertDetails = { errorCount: recentErrors.length, threshold: rule.threshold };
          }
          break;

        case 'error_rate':
          const windowStart = new Date(now.getTime() - rule.timeWindow);
          const totalLogs = this.logs.filter(log => log.timestamp >= windowStart);
          const errorLogs = totalLogs.filter(log => log.level === 'error' || log.level === 'fatal');
          const currentErrorRate = totalLogs.length > 0 ? (errorLogs.length / totalLogs.length) * 100 : 0;

          if (currentErrorRate >= rule.threshold) {
            shouldAlert = true;
            alertDetails = { errorRate: currentErrorRate, threshold: rule.threshold };
          }
          break;

        case 'specific_error':
          if (logEntry.level === 'error' || logEntry.level === 'fatal') {
            const errorPattern = rule.metadata?.pattern;
            if (errorPattern && logEntry.message.includes(errorPattern)) {
              shouldAlert = true;
              alertDetails = { errorMessage: logEntry.message, pattern: errorPattern };
            }
          }
          break;
      }

      if (shouldAlert) {
        this.createAlert(rule, alertDetails);
      }
    }
  }

  private createAlert(rule: AlertRule, details: Record<string, any>): void {
    // Check if we already have an active alert for this rule (to prevent spam)
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(alert => alert.ruleId === rule.id && !alert.resolvedAt);

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alertId = this.generateId();
    const alert: AlertNotification = {
      id: alertId,
      ruleId: rule.id,
      severity: rule.severity,
      message: `Alert: ${rule.name}`,
      timestamp: new Date(),
      details,
      acknowledged: false
    };

    this.activeAlerts.set(alertId, alert);

    // In a real implementation, this would send notifications to configured channels
    console.warn(`🚨 Performance Alert [${rule.severity.toUpperCase()}]: ${rule.name}`, details);
  }

  private calculateResponseTimeImpact(errorLogs: LogEntry[]): number {
    // Simplified calculation - in reality, this would correlate with actual response time metrics
    const performanceErrors = errorLogs.filter(log => log.category === 'performance');
    return performanceErrors.length * 100; // Each performance error adds 100ms impact
  }

  private logsToCsv(): string {
    const headers = 'timestamp,level,category,message,context,errorCode\n';
    const rows = this.logs.map(log => {
      const context = JSON.stringify(log.context).replace(/"/g, '""');
      return `${log.timestamp.toISOString()},${log.level},${log.category},"${log.message.replace(/"/g, '""')}","${context}",${log.errorCode || ''}`;
    });

    return headers + rows.join('\n');
  }

  private logsToText(): string {
    return this.logs.map(log => {
      let line = `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}`;

      if (log.context.scenarioId) {
        line += ` (Scenario: ${log.context.scenarioId})`;
      }

      if (log.errorCode) {
        line += ` (Code: ${log.errorCode})`;
      }

      if (log.stack) {
        line += `\n${log.stack}`;
      }

      return line;
    }).join('\n\n');
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startAutoFlush(intervalMs: number): void {
    this.flushInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.handleError(new Error(`Unhandled Promise Rejection: ${reason}`), {
        category: 'system',
        additionalInfo: { promise: promise.toString() }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.handleError(error, {
        category: 'system',
        additionalInfo: { uncaught: true }
      });
    });
  }

  private initializeDefaultRules(): void {
    // High error rate alert
    this.addAlertRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: 'error_rate',
      threshold: 10, // 10% error rate
      timeWindow: 5 * 60 * 1000, // 5 minutes
      severity: 'high',
      enabled: true,
      channels: ['console']
    });

    // Error spike alert
    this.addAlertRule({
      id: 'error-spike',
      name: 'Error Count Spike',
      condition: 'error_count',
      threshold: 50, // 50 errors
      timeWindow: 1 * 60 * 1000, // 1 minute
      severity: 'medium',
      enabled: true,
      channels: ['console']
    });

    // Critical system error alert
    this.addAlertRule({
      id: 'critical-system-error',
      name: 'Critical System Error',
      condition: 'specific_error',
      threshold: 1,
      timeWindow: 1 * 60 * 1000, // 1 minute
      severity: 'critical',
      enabled: true,
      channels: ['console'],
      metadata: {
        pattern: 'FATAL'
      }
    });
  }
}

// Create a singleton instance for global use
export const globalErrorHandler = new ErrorHandler();

// Express-style middleware factory
export function createErrorMiddleware(errorHandler: ErrorHandler = globalErrorHandler) {
  return (error: any, req: any, res: any, next: any) => {
    const context: ErrorContext = {
      requestId: req.headers['x-request-id'] || req.id,
      userId: req.user?.id,
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      clientIP: req.ip || req.connection.remoteAddress,
      additionalInfo: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
      }
    };

    const logEntry = errorHandler.handleError(error, context);

    // Set response based on error type
    if (!res.headersSent) {
      let statusCode = 500;
      let message = 'Internal Server Error';

      if (logEntry.category === 'validation') {
        statusCode = 400;
        message = 'Validation Error';
      } else if (logEntry.category === 'security') {
        statusCode = 401;
        message = 'Unauthorized';
      } else if (logEntry.category === 'business') {
        statusCode = 422;
        message = 'Business Logic Error';
      }

      res.status(statusCode).json({
        error: message,
        errorId: logEntry.id,
        timestamp: logEntry.timestamp
      });
    }

    if (next) {
      next();
    }
  };
}

export default ErrorHandler;