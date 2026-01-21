import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';
import { adminLogger } from '../../../logging/AdminLogger';

/**
 * Security Event Types for comprehensive monitoring
  */
export type SecurityEventType =
  | 'RATE_LIMIT_EXCEEDED'
  | 'RATE_LIMIT_SERVICE_FAILURE'
  | 'USAGE_LIMIT_EXCEEDED'
  | 'USAGE_SERVICE_FAILURE'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'AUTHENTICATION_FAILURE'
  | 'SUBSCRIPTION_BYPASS_ATTEMPT'
  | 'CIRCUIT_BREAKER_OPENED'
  | 'SERVICE_DEGRADATION'
  | 'SECURITY_POLICY_VIOLATION';

/**
 * Security Event Severity Levels
  */
export type SecurityEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Security Event Structure
  */
export interface SecurityEvent {
  id?: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: SecurityEventSeverity;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  featureId?: string;
  service: string;
  message: string;
  details: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

/**
 * Security Alert Configuration
  */
export interface AlertConfig {
  eventType: SecurityEventType;
  threshold: number;
  windowMinutes: number;
  severity: SecurityEventSeverity;
  enabled: boolean;
}

/**
 * Security Monitoring Service with Real-time Alerting
 * 
 * Provides comprehensive security event logging, monitoring, and alerting
 * for the CVPlus platform.
  */
export class SecurityMonitorService {
  private static instance: SecurityMonitorService;
  private db = getFirestore();
  
  // Default alert configurations
  private readonly defaultAlertConfigs: AlertConfig[] = [
    {
      eventType: 'RATE_LIMIT_EXCEEDED',
      threshold: 10,
      windowMinutes: 5,
      severity: 'HIGH',
      enabled: true
    },
    {
      eventType: 'RATE_LIMIT_SERVICE_FAILURE',
      threshold: 1,
      windowMinutes: 1,
      severity: 'CRITICAL',
      enabled: true
    },
    {
      eventType: 'USAGE_SERVICE_FAILURE',
      threshold: 1,
      windowMinutes: 1,
      severity: 'CRITICAL',
      enabled: true
    },
    {
      eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      threshold: 5,
      windowMinutes: 10,
      severity: 'HIGH',
      enabled: true
    },
    {
      eventType: 'SUBSCRIPTION_BYPASS_ATTEMPT',
      threshold: 1,
      windowMinutes: 1,
      severity: 'CRITICAL',
      enabled: true
    }
  ];

  private constructor() {}

  public static getInstance(): SecurityMonitorService {
    if (!SecurityMonitorService.instance) {
      SecurityMonitorService.instance = new SecurityMonitorService();
    }
    return SecurityMonitorService.instance;
  }

  /**
   * Log a security event with automatic threat detection and alerting
    */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    try {
      // Store event in Firestore
      const docRef = await this.db.collection('security_events').add(securityEvent);
      securityEvent.id = docRef.id;

      // Log to structured logger
      logger.warn('SECURITY_EVENT', {
        eventId: securityEvent.id,
        eventType: securityEvent.eventType,
        severity: securityEvent.severity,
        userId: securityEvent.userId,
        service: securityEvent.service,
        message: securityEvent.message
      });

      // Check for alert conditions
      await this.checkAlertConditions(securityEvent);

      // Send to external monitoring if configured
      if (process.env.NODE_ENV === 'production') {
        await this.sendToExternalMonitoring(securityEvent);
      }

    } catch (error) {
      // Critical: If we can't log security events, something is seriously wrong
      logger.error('CRITICAL: Failed to log security event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: securityEvent.eventType,
        severity: securityEvent.severity
      });
    }
  }

  /**
   * Check if security event triggers any alerts
    */
  private async checkAlertConditions(event: SecurityEvent): Promise<void> {
    try {
      const alertConfig = this.defaultAlertConfigs.find(
        config => config.eventType === event.eventType && config.enabled
      );

      if (!alertConfig) {
        return;
      }

      // Count recent events of the same type
      const windowStart = new Date(Date.now() - (alertConfig.windowMinutes * 60 * 1000));
      
      const recentEventsQuery = this.db.collection('security_events')
        .where('eventType', '==', event.eventType)
        .where('timestamp', '>=', windowStart.toISOString())
        .orderBy('timestamp', 'desc');

      const recentEventsSnapshot = await recentEventsQuery.get();
      const eventCount = recentEventsSnapshot.size;

      // Trigger alert if threshold exceeded
      if (eventCount >= alertConfig.threshold) {
        await this.triggerSecurityAlert({
          eventType: event.eventType,
          severity: alertConfig.severity,
          threshold: alertConfig.threshold,
          actualCount: eventCount,
          windowMinutes: alertConfig.windowMinutes,
          recentEvents: recentEventsSnapshot.docs.slice(0, 5).map(doc => ({
            id: doc.id,
            ...doc.data()
          })),
          triggeringEvent: event
        });
      }

    } catch (error) {
      logger.error('Failed to check alert conditions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: event.eventType
      });
    }
  }

  /**
   * Trigger security alert with multiple notification channels
    */
  private async triggerSecurityAlert(alertData: {
    eventType: SecurityEventType;
    severity: SecurityEventSeverity;
    threshold: number;
    actualCount: number;
    windowMinutes: number;
    recentEvents: any[];
    triggeringEvent: SecurityEvent;
  }): Promise<void> {
    const alert = {
      alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: 'SECURITY_THRESHOLD_EXCEEDED',
      ...alertData
    };

    try {
      // Store alert
      await this.db.collection('security_alerts').add(alert);

      // Log critical alert
      logger.error('SECURITY ALERT TRIGGERED', {
        alertId: alert.alertId,
        eventType: alert.eventType,
        severity: alert.severity,
        count: alert.actualCount,
        threshold: alert.threshold
      });

      // Send immediate notifications based on severity
      if (alert.severity === 'CRITICAL') {
        await this.sendCriticalAlert(alert);
      } else if (alert.severity === 'HIGH') {
        await this.sendHighPriorityAlert(alert);
      }

    } catch (error) {
      logger.error('Failed to trigger security alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertData
      });
    }
  }

  /**
   * Send critical security alerts (immediate notification)
    */
  private async sendCriticalAlert(alert: any): Promise<void> {
    // In production, this would integrate with:
    // - PagerDuty for immediate alerts
    // - Slack for team notifications
    // - Email for stakeholders
    // - SMS for on-call engineers

    adminLogger.error('🚨 CRITICAL SECURITY ALERT 🚨', {
      alertId: alert.alertId,
      eventType: alert.eventType,
      message: `Critical security event: ${alert.eventType} occurred ${alert.actualCount} times in ${alert.windowMinutes} minutes (threshold: ${alert.threshold})`
    });

    // Simulate external alert system
    if (process.env.NODE_ENV === 'production') {
      // await this.sendToPagerDuty(alert);
      // await this.sendToSlack(alert);
      // await this.sendEmail(alert);
    }
  }

  /**
   * Send high priority security alerts
    */
  private async sendHighPriorityAlert(alert: any): Promise<void> {
    adminLogger.warn('⚠️ HIGH PRIORITY SECURITY ALERT', {
      alertId: alert.alertId,
      eventType: alert.eventType,
      message: `Security threshold exceeded: ${alert.eventType}`
    });

    // In production: Slack notification, email to security team
  }

  /**
   * Get security event statistics for monitoring dashboard
    */
  async getSecurityStatistics(hours: number = 24): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    topUsers: Array<{ userId: string; eventCount: number }>;
    recentAlerts: number;
  }> {
    try {
      const windowStart = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      // Get recent security events
      const eventsQuery = this.db.collection('security_events')
        .where('timestamp', '>=', windowStart.toISOString())
        .orderBy('timestamp', 'desc');

      const eventsSnapshot = await eventsQuery.get();
      const events = eventsSnapshot.docs.map(doc => doc.data() as SecurityEvent);

      // Calculate statistics
      const eventsByType: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      const userEventCounts: Record<string, number> = {};

      events.forEach(event => {
        // Count by type
        eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
        
        // Count by severity
        eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
        
        // Count by user
        if (event.userId) {
          userEventCounts[event.userId] = (userEventCounts[event.userId] || 0) + 1;
        }
      });

      // Get top users by event count
      const topUsers = Object.entries(userEventCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId, eventCount]) => ({ userId, eventCount }));

      // Get recent alerts count
      const alertsQuery = this.db.collection('security_alerts')
        .where('timestamp', '>=', windowStart.toISOString());
      
      const alertsSnapshot = await alertsQuery.get();

      return {
        totalEvents: events.length,
        eventsByType,
        eventsBySeverity,
        topUsers,
        recentAlerts: alertsSnapshot.size
      };

    } catch (error) {
      logger.error('Failed to get security statistics', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        topUsers: [],
        recentAlerts: 0
      };
    }
  }

  /**
   * Mark security event as resolved
    */
  async resolveSecurityEvent(eventId: string, resolvedBy: string, notes?: string): Promise<void> {
    try {
      await this.db.collection('security_events').doc(eventId).update({
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy,
        resolutionNotes: notes
      });

      logger.info('Security event resolved', {
        eventId,
        resolvedBy,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to resolve security event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId,
        resolvedBy
      });
    }
  }

  /**
   * Send security events to external monitoring system
    */
  private async sendToExternalMonitoring(event: SecurityEvent): Promise<void> {
    // Integration points for external monitoring systems:
    // - DataDog Security Monitoring
    // - Splunk Security Operations
    // - AWS CloudWatch Security Events
    // - Azure Security Center
    // - Custom SIEM systems

    // For now, ensure structured logging for external collection
    adminLogger.info('EXTERNAL_SECURITY_MONITOR', JSON.stringify(event));
  }

  /**
   * Health check for security monitoring service
    */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: Record<string, any>;
  }> {
    try {
      const testStart = Date.now();
      
      // Test Firestore connectivity
      await this.db.collection('health_check').limit(1).get();
      
      const dbLatency = Date.now() - testStart;
      
      // Check recent event processing
      const recentEventsQuery = this.db.collection('security_events')
        .orderBy('timestamp', 'desc')
        .limit(1);
        
      const recentEventsSnapshot = await recentEventsQuery.get();
      const hasRecentActivity = !recentEventsSnapshot.empty;
      
      const healthy = dbLatency < 2000;
      
      return {
        healthy,
        details: {
          dbLatency,
          hasRecentActivity,
          lastEventTime: hasRecentActivity ? 
            recentEventsSnapshot.docs[0].data().timestamp : null,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Health check failed',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}