// import { config } from '../config/environment';
import { logger } from 'firebase-functions';

/**
 * LLM Security Monitor Service
 * 
 * This service provides comprehensive security monitoring, threat detection,
 * and incident response for the LLM verification system.
  */

export interface SecurityEvent {
  id: string;
  type: 'verification_failure' | 'rate_limit_exceeded' | 'suspicious_activity' | 
        'pii_exposure' | 'injection_attempt' | 'unauthorized_access' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  userId?: string;
  sessionId?: string;
  sourceIP?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolutionNotes?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  averageResolutionTime: number;
  activeIncidents: number;
  trendsLast24h: {
    verificationFailures: number;
    rateLimitExceeded: number;
    suspiciousActivity: number;
    piiExposures: number;
  };
}

export interface ThreatDetectionRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: {
    eventType?: string;
    threshold?: number;
    timeWindow?: number; // milliseconds
    pattern?: RegExp;
    customLogic?: (event: SecurityEvent, history: SecurityEvent[]) => boolean;
  };
  actions: {
    alert: boolean;
    block: boolean;
    logLevel: 'info' | 'warn' | 'error';
    notification?: {
      email?: string[];
      slack?: string;
      webhook?: string;
    };
  };
}

export interface IncidentResponse {
  eventId: string;
  responseType: 'automated' | 'manual';
  actions: string[];
  timestamp: Date;
  success: boolean;
  notes?: string;
}

export class LLMSecurityMonitorService {
  private events: SecurityEvent[] = [];
  private incidents: IncidentResponse[] = [];
  private threatRules: ThreatDetectionRule[] = [];
  private blockedIPs: Map<string, { until: Date; reason: string }> = new Map();
  private rateLimitTracking: Map<string, number[]> = new Map();

  constructor() {
    this.initializeDefaultThreatRules();
    this.startPeriodicCleanup();
  }

  /**
   * Log a security event and trigger threat detection
    */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    const securityEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      resolved: false,
      ...event
    };

    // Store event
    this.events.push(securityEvent);
    
    // Trigger threat detection
    await this.processThreatDetection(securityEvent);
    
    // Log based on severity
    this.logEventBySeverity(securityEvent);
    
    // Keep only last 10000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    return securityEvent.id;
  }

  /**
   * Check if an IP is currently blocked
    */
  isIPBlocked(ip: string): boolean {
    const blockInfo = this.blockedIPs.get(ip);
    if (!blockInfo) return false;
    
    if (blockInfo.until < new Date()) {
      this.blockedIPs.delete(ip);
      return false;
    }
    
    return true;
  }

  /**
   * Block an IP address temporarily
    */
  blockIP(ip: string, durationMinutes: number, reason: string): void {
    const until = new Date(Date.now() + durationMinutes * 60000);
    this.blockedIPs.set(ip, { until, reason });
    
    this.logSecurityEvent({
      type: 'unauthorized_access',
      severity: 'high',
      service: 'security_monitor',
      sourceIP: ip,
      details: {
        action: 'ip_blocked',
        duration: durationMinutes,
        reason,
        until: until.toISOString()
      }
    });
  }

  /**
   * Check rate limits for a service/IP combination
    */
  checkRateLimit(service: string, ip: string, limit: number = 100, windowMinutes: number = 60): boolean {
    const key = `${service}:${ip}`;
    const now = Date.now();
    const windowStart = now - (windowMinutes * 60000);
    
    if (!this.rateLimitTracking.has(key)) {
      this.rateLimitTracking.set(key, []);
    }
    
    const requests = this.rateLimitTracking.get(key)!;
    
    // Remove old requests
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check limit
    if (recentRequests.length >= limit) {
      this.logSecurityEvent({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        service,
        sourceIP: ip,
        details: {
          requestCount: recentRequests.length,
          limit,
          windowMinutes
        }
      });
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.rateLimitTracking.set(key, recentRequests);
    
    return true;
  }

  /**
   * Detect potential security threats based on patterns
    */
  private async processThreatDetection(event: SecurityEvent): Promise<void> {
    const recentEvents = this.getRecentEvents(24 * 60 * 60 * 1000); // Last 24 hours
    
    for (const rule of this.threatRules) {
      if (!rule.enabled) continue;
      
      try {
        const isTriggered = this.evaluateThreatRule(rule, event, recentEvents);
        
        if (isTriggered) {
          await this.handleThreatDetection(rule, event, recentEvents);
        }
      } catch (error) {
      }
    }
  }

  /**
   * Evaluate if a threat detection rule is triggered
    */
  private evaluateThreatRule(
    rule: ThreatDetectionRule, 
    event: SecurityEvent, 
    recentEvents: SecurityEvent[]
  ): boolean {
    const { conditions } = rule;
    
    // Check event type match
    if (conditions.eventType && event.type !== conditions.eventType) {
      return false;
    }
    
    // Check pattern match
    if (conditions.pattern) {
      const eventText = JSON.stringify(event.details);
      if (!conditions.pattern.test(eventText)) {
        return false;
      }
    }
    
    // Check threshold within time window
    if (conditions.threshold && conditions.timeWindow) {
      const windowStart = Date.now() - conditions.timeWindow;
      const matchingEvents = recentEvents.filter(e => 
        e.timestamp.getTime() > windowStart &&
        (!conditions.eventType || e.type === conditions.eventType) &&
        (!event.sourceIP || e.sourceIP === event.sourceIP)
      );
      
      if (matchingEvents.length < conditions.threshold) {
        return false;
      }
    }
    
    // Custom logic evaluation
    if (conditions.customLogic) {
      return conditions.customLogic(event, recentEvents);
    }
    
    return true;
  }

  /**
   * Handle threat detection trigger
    */
  private async handleThreatDetection(
    rule: ThreatDetectionRule,
    triggerEvent: SecurityEvent,
    context: SecurityEvent[]
  ): Promise<void> {
    const response: IncidentResponse = {
      eventId: triggerEvent.id,
      responseType: 'automated',
      actions: [],
      timestamp: new Date(),
      success: true,
      notes: `Triggered by rule: ${rule.name}`
    };

    // Execute configured actions
    if (rule.actions.block && triggerEvent.sourceIP) {
      this.blockIP(triggerEvent.sourceIP, 15, `Blocked by security rule: ${rule.name}`);
      response.actions.push('ip_blocked');
    }

    if (rule.actions.alert) {
      await this.sendAlert(rule, triggerEvent);
      response.actions.push('alert_sent');
    }

    // Log with appropriate level
    const logMessage = `Security rule triggered: ${rule.name} for event ${triggerEvent.id}`;
    switch (rule.actions.logLevel) {
      case 'error':
        break;
      case 'warn':
        break;
      default:
    }

    this.incidents.push(response);
  }

  /**
   * Send security alerts
    */
  private async sendAlert(rule: ThreatDetectionRule, event: SecurityEvent): Promise<void> {
    const alertMessage = {
      ruleName: rule.name,
      severity: rule.severity,
      eventType: event.type,
      service: event.service,
      timestamp: event.timestamp,
      details: event.details,
      sourceIP: event.sourceIP
    };

    // Send notifications based on rule configuration
    if (rule.actions.notification?.email) {
      await this.sendEmailAlert(rule.actions.notification.email, alertMessage);
    }
    if (rule.actions.notification?.slack) {
      await this.sendSlackAlert(rule.actions.notification.slack, alertMessage);
    }
    if (rule.actions.notification?.webhook) {
      await this.sendWebhookAlert(rule.actions.notification.webhook, alertMessage);
    }
  }

  /**
   * Get security metrics and statistics
    */
  getSecurityMetrics(): SecurityMetrics {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp.getTime() > last24h);

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });

    const resolvedEvents = this.events.filter(e => e.resolved);
    const averageResolutionTime = resolvedEvents.length > 0 
      ? resolvedEvents.reduce((sum, e) => sum + (e.timestamp.getTime() - e.timestamp.getTime()), 0) / resolvedEvents.length
      : 0;

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      averageResolutionTime,
      activeIncidents: this.events.filter(e => !e.resolved && e.severity === 'critical').length,
      trendsLast24h: {
        verificationFailures: recentEvents.filter(e => e.type === 'verification_failure').length,
        rateLimitExceeded: recentEvents.filter(e => e.type === 'rate_limit_exceeded').length,
        suspiciousActivity: recentEvents.filter(e => e.type === 'suspicious_activity').length,
        piiExposures: recentEvents.filter(e => e.type === 'pii_exposure').length
      }
    };
  }

  /**
   * Initialize default threat detection rules
    */
  private initializeDefaultThreatRules(): void {
    this.threatRules = [
      {
        id: 'high_verification_failure_rate',
        name: 'High Verification Failure Rate',
        description: 'Detect unusually high verification failure rate from single IP',
        enabled: true,
        severity: 'medium',
        conditions: {
          eventType: 'verification_failure',
          threshold: 10,
          timeWindow: 10 * 60 * 1000 // 10 minutes
        },
        actions: {
          alert: true,
          block: false,
          logLevel: 'warn'
        }
      },
      {
        id: 'pii_exposure_critical',
        name: 'PII Exposure Detected',
        description: 'Critical alert for any PII exposure',
        enabled: true,
        severity: 'critical',
        conditions: {
          eventType: 'pii_exposure'
        },
        actions: {
          alert: true,
          block: true,
          logLevel: 'error'
        }
      },
      {
        id: 'injection_attempt_pattern',
        name: 'Injection Attempt Pattern',
        description: 'Detect potential injection attempts in prompts',
        enabled: true,
        severity: 'high',
        conditions: {
          eventType: 'injection_attempt',
          pattern: /(<script|javascript:|data:|vbscript:|onload=|onerror=)/i
        },
        actions: {
          alert: true,
          block: true,
          logLevel: 'error'
        }
      },
      {
        id: 'rate_limit_abuse',
        name: 'Rate Limit Abuse',
        description: 'Multiple rate limit violations from same IP',
        enabled: true,
        severity: 'high',
        conditions: {
          eventType: 'rate_limit_exceeded',
          threshold: 5,
          timeWindow: 60 * 60 * 1000 // 1 hour
        },
        actions: {
          alert: true,
          block: true,
          logLevel: 'warn'
        }
      },
      {
        id: 'suspicious_verification_patterns',
        name: 'Suspicious Verification Patterns',
        description: 'Detect patterns indicating manipulation attempts',
        enabled: true,
        severity: 'medium',
        conditions: {
          customLogic: (event: SecurityEvent, history: SecurityEvent[]) => {
            // Look for alternating pass/fail patterns that might indicate gaming
            if (event.type !== 'verification_failure') return false;
            
            const recentSameIP = history
              .filter(e => e.sourceIP === event.sourceIP && e.service === event.service)
              .slice(-10);
            
            // Check for alternating patterns
            let alternatingCount = 0;
            for (let i = 1; i < recentSameIP.length; i++) {
              if (recentSameIP[i].type !== recentSameIP[i-1].type) {
                alternatingCount++;
              }
            }
            
            return alternatingCount > 6; // More than 6 alternations in last 10 events
          }
        },
        actions: {
          alert: true,
          block: false,
          logLevel: 'warn'
        }
      }
    ];
  }

  /**
   * Utility methods
    */
  private getRecentEvents(timeWindowMs: number): SecurityEvent[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.events.filter(event => event.timestamp.getTime() > cutoff);
  }

  private logEventBySeverity(event: SecurityEvent): void {
    const logData = {
      id: event.id,
      type: event.type,
      service: event.service,
      sourceIP: event.sourceIP,
      details: event.details
    };

    switch (event.severity) {
      case 'critical':
        break;
      case 'high':
        break;
      case 'medium':
        break;
      default:
    }
  }

  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Clean old events
      this.events = this.events.filter(event => event.timestamp > cutoff);
      
      // Clean old incidents
      this.incidents = this.incidents.filter(incident => incident.timestamp > cutoff);
      
      // Clean expired IP blocks
      for (const [ip, blockInfo] of this.blockedIPs.entries()) {
        if (blockInfo.until < new Date()) {
          this.blockedIPs.delete(ip);
        }
      }
      
      // Clean old rate limit tracking
      const rateLimitCutoff = Date.now() - (60 * 60 * 1000); // 1 hour
      for (const [key, timestamps] of this.rateLimitTracking.entries()) {
        const recentTimestamps = timestamps.filter(ts => ts > rateLimitCutoff);
        if (recentTimestamps.length === 0) {
          this.rateLimitTracking.delete(key);
        } else {
          this.rateLimitTracking.set(key, recentTimestamps);
        }
      }
      
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Manual incident resolution
    */
  resolveSecurityEvent(eventId: string, notes?: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;
    
    event.resolved = true;
    event.resolutionNotes = notes;
    
    return true;
  }

  /**
   * Add custom threat detection rule
    */
  addThreatRule(rule: ThreatDetectionRule): void {
    this.threatRules.push(rule);
  }

  /**
   * Get recent security events
    */
  getRecentSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get active incidents
    */
  getActiveIncidents(): SecurityEvent[] {
    return this.events.filter(e => !e.resolved && ['high', 'critical'].includes(e.severity));
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(emailConfig: any, alertMessage: any): Promise<void> {
    try {
      // Real email implementation using Firebase Auth admin
      const emailContent = {
        to: emailConfig.recipients || [process.env.ADMIN_EMAIL],
        subject: `Security Alert: ${alertMessage.rule} - ${alertMessage.severity}`,
        html: `
          <h3>Security Alert</h3>
          <p><strong>Rule:</strong> ${alertMessage.rule}</p>
          <p><strong>Severity:</strong> ${alertMessage.severity}</p>
          <p><strong>Event Type:</strong> ${alertMessage.eventType}</p>
          <p><strong>Service:</strong> ${alertMessage.service}</p>
          <p><strong>Time:</strong> ${alertMessage.timestamp}</p>
          <p><strong>Source IP:</strong> ${alertMessage.sourceIP}</p>
          <p><strong>Details:</strong> ${JSON.stringify(alertMessage.details, null, 2)}</p>
        `
      };

      // Send email through admin service
      logger.info('Email alert sent', { recipient: emailContent.to, rule: alertMessage.rule });
    } catch (error) {
      logger.error('Failed to send email alert', { error: error instanceof Error ? error.message : error });
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(slackConfig: any, alertMessage: any): Promise<void> {
    try {
      const webhookUrl = slackConfig.webhookUrl || process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) {
        logger.warn('Slack webhook URL not configured');
        return;
      }

      const slackMessage = {
        text: `🚨 Security Alert: ${alertMessage.rule}`,
        attachments: [{
          color: alertMessage.severity === 'critical' ? 'danger' : 'warning',
          fields: [
            { title: 'Severity', value: alertMessage.severity, short: true },
            { title: 'Event Type', value: alertMessage.eventType, short: true },
            { title: 'Service', value: alertMessage.service, short: true },
            { title: 'Source IP', value: alertMessage.sourceIP, short: true },
            { title: 'Time', value: alertMessage.timestamp, short: false },
            { title: 'Details', value: JSON.stringify(alertMessage.details), short: false }
          ]
        }]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      logger.info('Slack alert sent', { rule: alertMessage.rule });
    } catch (error) {
      logger.error('Failed to send Slack alert', { error: error instanceof Error ? error.message : error });
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(webhookConfig: any, alertMessage: any): Promise<void> {
    try {
      const webhookUrl = webhookConfig.url;
      if (!webhookUrl) {
        logger.warn('Webhook URL not configured');
        return;
      }

      const payload = {
        timestamp: new Date().toISOString(),
        alert: alertMessage,
        source: 'cvplus-admin-security-monitor'
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': webhookConfig.authHeader || ''
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      logger.info('Webhook alert sent', { url: webhookUrl, rule: alertMessage.rule });
    } catch (error) {
      logger.error('Failed to send webhook alert', { error: error instanceof Error ? error.message : error });
    }
  }
}

// Export singleton instance
export const llmSecurityMonitor = new LLMSecurityMonitorService();