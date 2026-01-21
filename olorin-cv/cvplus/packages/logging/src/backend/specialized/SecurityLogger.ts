/**
 * T026: Security-specific logging implementation
 * CVPlus Logging System - Security Event Logger
  */

import { BaseLogger } from '../core/BaseLogger';
import { LogLevel, LogDomain } from '../types';

export class SecurityLogger extends BaseLogger {
  constructor(serviceName: string = 'security-service') {
    super(serviceName, {
      package: '@cvplus/auth',
      level: LogLevel.WARN
    });
  }

  /**
   * Log brute force attack detection
    */
  bruteForceDetected(context: {
    ipAddress?: string;
    targetEmail?: string;
    attemptCount?: number;
    timeWindow?: string;
    firstAttempt?: string;
    lastAttempt?: string;
    userAgent?: string;
    actionTaken?: string;
    blockDuration?: number;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.ERROR, 'Brute force attack detected', {
      domain: LogDomain.SECURITY,
      event: 'BRUTE_FORCE_DETECTED',
      ipAddress: context.ipAddress,
      targetEmail: '[EMAIL_REDACTED]', // PII redacted
      attemptCount: context.attemptCount,
      timeWindow: context.timeWindow,
      actionTaken: context.actionTaken,
      blockDuration: context.blockDuration,
      severity: 'critical'
    });
  }

  /**
   * Log account takeover attempts
    */
  accountTakeoverAttempt(context: {
    userId?: string;
    suspiciousActivities?: string[];
    riskScore?: number;
    ipAddress?: string;
    deviceFingerprint?: string;
    geoLocation?: string;
    userAgent?: string;
    actionTaken?: string;
    notificationSent?: boolean;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.ERROR, 'Account takeover attempt detected', {
      domain: LogDomain.SECURITY,
      event: 'ACCOUNT_TAKEOVER_ATTEMPT',
      userId: context.userId,
      suspiciousActivities: context.suspiciousActivities,
      riskScore: context.riskScore,
      actionTaken: context.actionTaken,
      notificationSent: context.notificationSent,
      severity: 'critical'
    });
  }

  /**
   * Log MFA bypass attempts
    */
  mfaBypassAttempt(context: {
    userId?: string;
    bypassMethod?: string;
    attemptedFactors?: string[];
    ipAddress?: string;
    deviceId?: string;
    geoLocation?: string;
    timeFromLastLogin?: number;
    suspicionLevel?: string;
    actionTaken?: string;
    alertLevel?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.ERROR, 'MFA bypass attempt detected', {
      domain: LogDomain.SECURITY,
      event: 'MFA_BYPASS_ATTEMPT',
      userId: context.userId,
      bypassMethod: context.bypassMethod,
      attemptedFactors: context.attemptedFactors,
      suspicionLevel: context.suspicionLevel,
      actionTaken: context.actionTaken,
      alertLevel: context.alertLevel,
      severity: 'critical'
    });
  }

  /**
   * Log privilege escalation attempts
    */
  privilegeEscalationAttempt(context: {
    userId?: string;
    currentRole?: string;
    attemptedRole?: string;
    method?: string;
    endpoint?: string;
    ipAddress?: string;
    sessionId?: string;
    timestamp?: string;
    actionTaken?: string;
    alertSent?: boolean;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.ERROR, 'Privilege escalation attempt detected', {
      domain: LogDomain.SECURITY,
      event: 'PRIVILEGE_ESCALATION_ATTEMPT',
      userId: context.userId,
      currentRole: context.currentRole,
      attemptedRole: context.attemptedRole,
      method: context.method,
      endpoint: context.endpoint,
      actionTaken: context.actionTaken,
      alertSent: context.alertSent,
      severity: 'high'
    });
  }

  /**
   * Log unauthorized API access attempts
    */
  unauthorizedAPIAccess(context: {
    userId?: string;
    endpoint?: string;
    method?: string;
    userTier?: string;
    requiredTier?: string;
    ipAddress?: string;
    userAgent?: string;
    referer?: string | null;
    timestamp?: string;
    responseCode?: number;
    actionTaken?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.WARN, 'Unauthorized API access attempt', {
      domain: LogDomain.SECURITY,
      event: 'UNAUTHORIZED_API_ACCESS',
      userId: context.userId,
      endpoint: context.endpoint,
      method: context.method,
      userTier: context.userTier,
      requiredTier: context.requiredTier,
      responseCode: context.responseCode,
      actionTaken: context.actionTaken
    });
  }

  /**
   * Log sensitive data access events
    */
  sensitiveDataAccess(context: {
    userId?: string;
    adminUserId?: string;
    dataType?: string;
    accessReason?: string;
    ticketId?: string;
    accessedFields?: string[];
    ipAddress?: string;
    timestamp?: string;
    duration?: number;
    complianceNote?: string;
    correlationId?: string;
  } = {}): string {
    const performance = context.duration ? {
      duration: context.duration
    } : undefined;

    return this.log(LogLevel.INFO, 'Sensitive data accessed', {
      domain: LogDomain.AUDIT,
      event: 'SENSITIVE_DATA_ACCESS',
      userId: context.userId,
      adminUserId: context.adminUserId,
      dataType: context.dataType,
      accessReason: context.accessReason,
      accessedFieldsCount: context.accessedFields?.length,
      complianceNote: context.complianceNote,
      performance
    });
  }

  /**
   * Log data privacy requests
    */
  dataPrivacyRequest(context: {
    userId?: string;
    requestType?: string;
    requestId?: string;
    requestedData?: string[];
    legalBasis?: string;
    processingTime?: number;
    status?: string;
    deliveryMethod?: string;
    ipAddress?: string;
    correlationId?: string;
  } = {}): string {
    const performance = context.processingTime ? {
      duration: context.processingTime
    } : undefined;

    return this.log(LogLevel.INFO, 'Data privacy request processed', {
      domain: LogDomain.AUDIT,
      event: 'DATA_PRIVACY_REQUEST',
      userId: context.userId,
      requestType: context.requestType,
      requestId: context.requestId,
      legalBasis: context.legalBasis,
      status: context.status,
      deliveryMethod: context.deliveryMethod,
      requestedDataTypes: context.requestedData?.length,
      performance
    });
  }

  /**
   * Log suspicious system activity
    */
  systemSuspiciousActivity(context: {
    pattern?: string;
    metrics?: {
      normalBaseline: number;
      currentRate: number;
      percentageIncrease: number;
    };
    timeWindow?: string;
    affectedEndpoints?: string[];
    potentialThreat?: string;
    riskLevel?: string;
    actionTaken?: string;
    alertsSent?: string[];
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.ERROR, 'Suspicious system activity detected', {
      domain: LogDomain.SECURITY,
      event: 'SYSTEM_SUSPICIOUS_ACTIVITY',
      pattern: context.pattern,
      timeWindow: context.timeWindow,
      percentageIncrease: context.metrics?.percentageIncrease,
      affectedEndpointsCount: context.affectedEndpoints?.length,
      potentialThreat: context.potentialThreat,
      riskLevel: context.riskLevel,
      actionTaken: context.actionTaken,
      severity: 'high'
    });
  }

  /**
   * Log security configuration changes
    */
  securityConfigurationChange(context: {
    adminUserId?: string;
    configType?: string;
    changedSettings?: Array<{
      setting: string;
      oldValue: string;
      newValue: string;
    }>;
    changeReason?: string;
    approvalId?: string;
    ipAddress?: string;
    timestamp?: string;
    rollbackPlan?: string;
    correlationId?: string;
  } = {}): string {
    return this.log(LogLevel.WARN, 'Security configuration changed', {
      domain: LogDomain.AUDIT,
      event: 'SECURITY_CONFIGURATION_CHANGE',
      adminUserId: context.adminUserId,
      configType: context.configType,
      changedSettingsCount: context.changedSettings?.length,
      changeReason: context.changeReason,
      approvalId: context.approvalId,
      rollbackPlan: context.rollbackPlan
    });
  }

  /**
   * Execute callback with correlation ID context
    */
  withCorrelation(correlationId: string, callback: () => string): string {
    return super.withCorrelation(correlationId, callback);
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