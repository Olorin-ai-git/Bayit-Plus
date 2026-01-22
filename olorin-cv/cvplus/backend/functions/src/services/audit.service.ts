/**
 * Audit Logging Service
 * Tracks security-sensitive operations with 90-day retention
 *
 * INTEGRATES WITH:
 * - Firestore for audit log storage
 * - RBAC for permission tracking
 */

import { firestore } from '../config/firebase';

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_LOGIN_FAILED = 'auth.login_failed',
  AUTH_PASSWORD_RESET = 'auth.password_reset',
  AUTH_MFA_ENABLED = 'auth.mfa_enabled',
  AUTH_MFA_DISABLED = 'auth.mfa_disabled',

  // User management
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_SUSPENDED = 'user.suspended',
  USER_ROLE_CHANGED = 'user.role_changed',
  USER_PERMISSIONS_CHANGED = 'user.permissions_changed',

  // Data operations
  DATA_CREATED = 'data.created',
  DATA_READ = 'data.read',
  DATA_UPDATED = 'data.updated',
  DATA_DELETED = 'data.deleted',
  DATA_EXPORTED = 'data.exported',

  // PII operations
  PII_ENCRYPTED = 'pii.encrypted',
  PII_DECRYPTED = 'pii.decrypted',
  PII_ACCESSED = 'pii.accessed',

  // Security events
  SECURITY_PERMISSION_DENIED = 'security.permission_denied',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  SECURITY_INVALID_TOKEN = 'security.invalid_token',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',

  // GDPR compliance
  GDPR_DATA_EXPORT = 'gdpr.data_export',
  GDPR_DATA_DELETION = 'gdpr.data_deletion',
  GDPR_CONSENT_GIVEN = 'gdpr.consent_given',
  GDPR_CONSENT_WITHDRAWN = 'gdpr.consent_withdrawn',

  // Admin operations
  ADMIN_SETTINGS_CHANGED = 'admin.settings_changed',
  ADMIN_USER_IMPERSONATION = 'admin.user_impersonation',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  status: 'success' | 'failure' | 'warning';
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  expiresAt: Date; // 90 days from creation
}

export class AuditService {
  private collection = firestore.collection('auditLogs');
  private readonly RETENTION_DAYS = 90;

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'expiresAt'>): Promise<string> {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.RETENTION_DAYS);

    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: now,
      expiresAt,
    };

    const docRef = await this.collection.add(auditEntry);

    console.log('Audit log created:', {
      id: docRef.id,
      eventType: entry.eventType,
      userId: entry.userId,
      action: entry.action,
    });

    return docRef.id;
  }

  /**
   * Log authentication event
   */
  async logAuth(
    eventType: AuditEventType,
    userId: string | undefined,
    email: string | undefined,
    status: 'success' | 'failure',
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<string> {
    return this.log({
      eventType,
      userId,
      userEmail: email,
      ipAddress,
      userAgent,
      action: `Authentication: ${eventType}`,
      status,
      details,
    });
  }

  /**
   * Log user management event
   */
  async logUserManagement(
    eventType: AuditEventType,
    actorId: string,
    actorEmail: string,
    actorRole: string,
    targetUserId: string,
    action: string,
    details?: Record<string, any>
  ): Promise<string> {
    return this.log({
      eventType,
      userId: actorId,
      userEmail: actorEmail,
      userRole: actorRole,
      resourceType: 'user',
      resourceId: targetUserId,
      action,
      status: 'success',
      details,
    });
  }

  /**
   * Log data access event
   */
  async logDataAccess(
    eventType: AuditEventType,
    userId: string,
    userEmail: string,
    resourceType: string,
    resourceId: string,
    action: string,
    status: 'success' | 'failure' = 'success',
    details?: Record<string, any>
  ): Promise<string> {
    return this.log({
      eventType,
      userId,
      userEmail,
      resourceType,
      resourceId,
      action,
      status,
      details,
    });
  }

  /**
   * Log PII access event
   */
  async logPIIAccess(
    eventType: AuditEventType,
    userId: string,
    userEmail: string,
    resourceId: string,
    fields: string[],
    ipAddress?: string
  ): Promise<string> {
    return this.log({
      eventType,
      userId,
      userEmail,
      resourceType: 'pii',
      resourceId,
      action: `PII access: ${eventType}`,
      status: 'success',
      ipAddress,
      details: {
        fields,
        fieldCount: fields.length,
      },
    });
  }

  /**
   * Log security event
   */
  async logSecurity(
    eventType: AuditEventType,
    userId: string | undefined,
    userEmail: string | undefined,
    action: string,
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<string> {
    return this.log({
      eventType,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      action,
      status: 'warning',
      details,
    });
  }

  /**
   * Log GDPR compliance event
   */
  async logGDPR(
    eventType: AuditEventType,
    userId: string,
    userEmail: string,
    action: string,
    details?: Record<string, any>
  ): Promise<string> {
    return this.log({
      eventType,
      userId,
      userEmail,
      action,
      status: 'success',
      details,
      metadata: {
        compliance: 'GDPR',
        legalBasis: 'user_request',
      },
    });
  }

  /**
   * Query audit logs
   */
  async query(filters: {
    userId?: string;
    eventType?: AuditEventType;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: 'success' | 'failure' | 'warning';
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    let query: any = this.collection;

    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }

    if (filters.eventType) {
      query = query.where('eventType', '==', filters.eventType);
    }

    if (filters.resourceType) {
      query = query.where('resourceType', '==', filters.resourceType);
    }

    if (filters.resourceId) {
      query = query.where('resourceId', '==', filters.resourceId);
    }

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.startDate) {
      query = query.where('timestamp', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('timestamp', '<=', filters.endDate);
    }

    query = query.orderBy('timestamp', 'desc');

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLogEntry[];
  }

  /**
   * Clean up expired audit logs (90+ days old)
   * Should be run periodically (e.g., daily cron job)
   */
  async cleanupExpiredLogs(): Promise<number> {
    const now = new Date();
    const expiredLogs = await this.collection
      .where('expiresAt', '<', now)
      .limit(500) // Process in batches
      .get();

    if (expiredLogs.empty) {
      console.log('No expired audit logs to clean up');
      return 0;
    }

    const batch = firestore.batch();
    expiredLogs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`Cleaned up ${expiredLogs.size} expired audit logs`);
    return expiredLogs.size;
  }

  /**
   * Get audit statistics
   */
  async getStatistics(userId?: string): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    successRate: number;
    recentFailures: number;
  }> {
    let query: any = this.collection;

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.get();
    const logs: AuditLogEntry[] = snapshot.docs.map((doc: any) => doc.data());

    const eventsByType: Record<string, number> = {};
    let successCount = 0;
    let failureCount = 0;
    let recentFailures = 0;

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    logs.forEach(log => {
      // Count by type
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;

      // Count success/failure
      if (log.status === 'success') {
        successCount++;
      } else if (log.status === 'failure') {
        failureCount++;

        // Count recent failures
        if (log.timestamp >= oneDayAgo) {
          recentFailures++;
        }
      }
    });

    const totalEvents = logs.length;
    const successRate = totalEvents > 0 ? (successCount / totalEvents) * 100 : 0;

    return {
      totalEvents,
      eventsByType,
      successRate,
      recentFailures,
    };
  }
}

export const auditService = new AuditService();
