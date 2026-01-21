/**
 * T023: Authentication-specific logging implementation
 * CVPlus Logging System - Auth Module Logger
  */

import { BaseLogger } from '../core/BaseLogger';
import { LogLevel, LogDomain } from '../types';
import { generateCorrelationId } from '../utils/correlation';

export class AuthLogger extends BaseLogger {
  constructor(serviceName: string = 'auth-service') {
    super(serviceName, {
      package: '@cvplus/auth',
      level: LogLevel.INFO
    });
  }

  /**
   * Log successful login events
    */
  logLoginSuccess(userId: string, context: {
    ipAddress?: string;
    userAgent?: string;
    provider?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'User login successful', {
      domain: LogDomain.SECURITY,
      event: 'LOGIN_SUCCESS',
      userId,
      ipAddress: context.ipAddress,
      provider: context.provider,
      outcome: 'success'
    });
  }

  /**
   * Log failed login attempts
    */
  logLoginFailure(email: string, failureReason: string, context: {
    ipAddress?: string;
    attempts?: number;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.WARN, 'User login failed', {
      domain: LogDomain.SECURITY,
      event: 'LOGIN_FAILED',
      email: '[EMAIL_REDACTED]', // PII will be handled by formatter
      ipAddress: context.ipAddress,
      failureReason,
      attempts: context.attempts,
      outcome: 'failure'
    });
  }

  /**
   * Log password reset events
    */
  logPasswordReset(userId: string, context: {
    tokenId?: string;
    initiatedBy?: string;
    expiresAt?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'Password reset initiated', {
      domain: LogDomain.AUDIT,
      event: 'PASSWORD_RESET',
      userId,
      tokenId: context.tokenId,
      initiatedBy: context.initiatedBy,
      outcome: 'initiated'
    });
  }

  /**
   * Log session creation
    */
  logSessionCreate(userId: string, sessionId: string, context: {
    expiresAt?: string;
    deviceInfo?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'User session created', {
      domain: LogDomain.AUDIT,
      event: 'SESSION_CREATE',
      userId,
      sessionId,
      deviceInfo: context.deviceInfo,
      action: 'session_create'
    });
  }

  /**
   * Log session termination
    */
  logSessionTerminate(sessionId: string, context: {
    reason?: string;
    userId?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'User session terminated', {
      domain: LogDomain.AUDIT,
      event: 'SESSION_TERMINATE',
      sessionId,
      reason: context.reason,
      userId: context.userId,
      action: 'session_terminate'
    });
  }

  /**
   * Log suspicious authentication activity
    */
  logSuspiciousActivity(pattern: string, context: {
    ipAddress?: string;
    attempts?: number;
    timeWindow?: string;
    riskScore?: number;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.ERROR, 'Suspicious authentication activity detected', {
      domain: LogDomain.SECURITY,
      event: 'SUSPICIOUS_ACTIVITY',
      pattern,
      ipAddress: context.ipAddress,
      attempts: context.attempts,
      riskScore: context.riskScore,
      severity: 'high'
    });
  }

  /**
   * Log privilege escalation attempts
    */
  logPrivilegeEscalation(userId: string, targetRole: string, context: {
    currentRole?: string;
    approved?: boolean;
    requestId?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.WARN, 'Privilege escalation attempted', {
      domain: LogDomain.SECURITY,
      event: 'PRIVILEGE_ESCALATION',
      userId,
      targetRole,
      currentRole: context.currentRole,
      approved: context.approved,
      outcome: 'attempted'
    });
  }

  /**
   * Log login attempts for correlation tracking
    */
  logLoginAttempt(email: string, context: {
    provider?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'Login attempt initiated', {
      domain: LogDomain.SECURITY,
      event: 'LOGIN_ATTEMPT',
      email: '[EMAIL_REDACTED]',
      provider: context.provider
    });
  }

  /**
   * Log account locked events
    */
  logAccountLocked(context: {
    userId?: string;
    reason?: string;
    duration?: number;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.WARN, 'User account locked', {
      domain: LogDomain.SECURITY,
      event: 'ACCOUNT_LOCKED',
      userId: context.userId,
      reason: context.reason,
      duration: context.duration,
      action: 'account_locked'
    });
  }

  /**
   * Log security notifications sent
    */
  logSecurityNotificationSent(context: {
    userId?: string;
    notificationType?: string;
    channels?: string[];
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'Security notification sent', {
      domain: LogDomain.AUDIT,
      event: 'SECURITY_NOTIFICATION',
      userId: context.userId,
      notificationType: context.notificationType,
      channels: context.channels,
      action: 'notification_sent'
    });
  }

  /**
   * Log authentication performance metrics
    */
  logAuthPerformance(operation: string, context: {
    duration?: number;
    provider?: string;
    steps?: string[];
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.INFO, 'Authentication operation completed', {
      domain: LogDomain.PERFORMANCE,
      event: 'AUTH_PERFORMANCE',
      operation,
      provider: context.provider,
      steps: context.steps,
      performance: {
        duration: context.duration
      }
    });
  }

  /**
   * Execute callback with correlation ID context
    */
  withCorrelationId(correlationId: string, callback: () => string): string {
    return this.withCorrelation(correlationId, callback);
  }

  /**
   * Log suspicious login attempt (for correlation chain testing)
    */
  suspiciousLoginAttempt(context: {
    userId?: string;
    ipAddress?: string;
    reason?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.WARN, 'Suspicious login attempt detected', {
      domain: LogDomain.SECURITY,
      event: 'SUSPICIOUS_LOGIN',
      userId: context.userId,
      ipAddress: context.ipAddress,
      reason: context.reason,
      severity: 'medium'
    });
  }

  /**
   * Get last log entry (for testing)
    */
  getLastLogEntry() {
    return super.getLastLogEntry();
  }

  /**
   * Get all log entries (for testing)
    */
  getAllLogEntries() {
    return super.getAllLogEntries();
  }
}