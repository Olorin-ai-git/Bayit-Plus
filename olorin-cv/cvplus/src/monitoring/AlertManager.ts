/**
 * Alert Manager
 * Advanced alerting system with multiple channels and escalation policies
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface Alert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'health' | 'performance' | 'availability' | 'security' | 'dependency';
  moduleId: string;
  title: string;
  message: string;
  details: Record<string, any>;
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  createdAt: string;
  updatedAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  escalationLevel: number;
  suppressedUntil?: string;
  tags: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'health' | 'performance' | 'availability' | 'security' | 'dependency';
  enabled: boolean;
  channels: string[];
  cooldownMinutes: number;
  escalationPolicy?: string;
  tags: string[];
  filters: AlertFilter[];
}

export interface AlertCondition {
  type: 'threshold' | 'anomaly' | 'change' | 'composite';
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'not_contains';
  value: any;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  timeWindow?: number; // minutes
  composite?: {
    operator: 'AND' | 'OR';
    conditions: AlertCondition[];
  };
}

export interface AlertFilter {
  field: string;
  operator: '==' | '!=' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'console' | 'file';
  config: NotificationChannelConfig;
  enabled: boolean;
  rateLimitPerMinute?: number;
  retryPolicy: RetryPolicy;
}

export interface NotificationChannelConfig {
  // Email configuration
  smtpHost?: string;
  smtpPort?: number;
  username?: string;
  password?: string;
  from?: string;
  to?: string[];

  // Slack configuration
  webhookUrl?: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;

  // Webhook configuration
  url?: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  auth?: {
    type: 'basic' | 'bearer' | 'api_key';
    credentials: Record<string, string>;
  };

  // SMS configuration
  provider?: 'twilio' | 'aws_sns';
  apiKey?: string;
  apiSecret?: string;
  from?: string;
  to?: string[];

  // File configuration
  filePath?: string;
  format?: 'json' | 'text' | 'csv';

  // Console configuration (no additional config needed)
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  levels: EscalationLevel[];
  enabled: boolean;
}

export interface EscalationLevel {
  level: number;
  delayMinutes: number;
  channels: string[];
  stopOnAcknowledge: boolean;
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  suppressed: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byModule: Record<string, number>;
  recentAlerts: number; // last 24 hours
  averageResolutionTime: number; // minutes
}

export class AlertManager extends EventEmitter {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private alertHistory: Alert[] = [];
  private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private alertDataPath: string;

  constructor(private workspacePath: string) {
    super();
    this.alertDataPath = join(workspacePath, 'monitoring', 'alerts');
    this.ensureAlertDirectory();
    this.loadPersistedData();
    this.setupDefaultChannels();
    this.setupDefaultRules();
    this.setupDefaultEscalationPolicies();
  }

  async evaluateAlerts(data: any): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        const shouldTrigger = await this.evaluateRule(rule, data);
        if (shouldTrigger) {
          const alert = await this.createAlert(rule, data);
          if (alert) {
            triggeredAlerts.push(alert);
          }
        }
      } catch (error) {
        console.error(`Failed to evaluate rule ${rule.id}:`, error);
      }
    }

    return triggeredAlerts;
  }

  private async evaluateRule(rule: AlertRule, data: any): Promise<boolean> {
    // Check filters first
    if (!this.passesFilters(rule.filters, data)) {
      return false;
    }

    // Check cooldown
    if (!this.checkCooldown(rule)) {
      return false;
    }

    // Evaluate condition
    return this.evaluateCondition(rule.condition, data);
  }

  private passesFilters(filters: AlertFilter[], data: any): boolean {
    return filters.every(filter => this.evaluateFilter(filter, data));
  }

  private evaluateFilter(filter: AlertFilter, data: any): boolean {
    const fieldValue = this.getNestedValue(data, filter.field);

    switch (filter.operator) {
      case '==':
        return fieldValue == filter.value;
      case '!=':
        return fieldValue != filter.value;
      case 'contains':
        return String(fieldValue).includes(String(filter.value));
      case 'not_contains':
        return !String(fieldValue).includes(String(filter.value));
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(fieldValue);
      case 'not_in':
        return !Array.isArray(filter.value) || !filter.value.includes(fieldValue);
      default:
        return true;
    }
  }

  private evaluateCondition(condition: AlertCondition, data: any): boolean {
    switch (condition.type) {
      case 'threshold':
        return this.evaluateThresholdCondition(condition, data);
      case 'composite':
        return this.evaluateCompositeCondition(condition, data);
      case 'anomaly':
        return this.evaluateAnomalyCondition(condition, data);
      case 'change':
        return this.evaluateChangeCondition(condition, data);
      default:
        return false;
    }
  }

  private evaluateThresholdCondition(condition: AlertCondition, data: any): boolean {
    const metricValue = this.getNestedValue(data, condition.metric);
    if (metricValue === undefined || metricValue === null) return false;

    switch (condition.operator) {
      case '>':
        return Number(metricValue) > Number(condition.value);
      case '<':
        return Number(metricValue) < Number(condition.value);
      case '>=':
        return Number(metricValue) >= Number(condition.value);
      case '<=':
        return Number(metricValue) <= Number(condition.value);
      case '==':
        return metricValue == condition.value;
      case '!=':
        return metricValue != condition.value;
      case 'contains':
        return String(metricValue).includes(String(condition.value));
      case 'not_contains':
        return !String(metricValue).includes(String(condition.value));
      default:
        return false;
    }
  }

  private evaluateCompositeCondition(condition: AlertCondition, data: any): boolean {
    if (!condition.composite) return false;

    const results = condition.composite.conditions.map(cond =>
      this.evaluateCondition(cond, data)
    );

    return condition.composite.operator === 'AND' ?
      results.every(r => r) :
      results.some(r => r);
  }

  private evaluateAnomalyCondition(condition: AlertCondition, data: any): boolean {
    // Simplified anomaly detection - in real implementation, use statistical methods
    const currentValue = Number(this.getNestedValue(data, condition.metric));
    const threshold = Number(condition.value);

    // Basic anomaly: value significantly different from threshold
    const deviation = Math.abs(currentValue - threshold) / threshold;
    return deviation > 0.5; // 50% deviation threshold
  }

  private evaluateChangeCondition(condition: AlertCondition, data: any): boolean {
    // Simplified change detection - in real implementation, compare with historical data
    const currentValue = this.getNestedValue(data, condition.metric);
    const changeThreshold = condition.value;

    // For demo, randomly trigger change detection
    return Math.random() > 0.9;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private checkCooldown(rule: AlertRule): boolean {
    const cooldownKey = `rule-${rule.id}`;
    const lastTriggered = this.rateLimitCounters.get(cooldownKey);

    if (!lastTriggered) return true;

    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    return Date.now() - lastTriggered.resetTime > cooldownMs;
  }

  private async createAlert(rule: AlertRule, data: any): Promise<Alert | null> {
    // Check if similar alert already exists and is active
    const existingAlert = Array.from(this.alerts.values()).find(alert =>
      alert.ruleId === rule.id &&
      alert.moduleId === data.moduleId &&
      alert.status === 'active'
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.updatedAt = new Date().toISOString();
      existingAlert.details = { ...existingAlert.details, ...data };
      this.persistAlert(existingAlert);
      return null; // Don't create duplicate
    }

    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      severity: rule.severity,
      category: rule.category,
      moduleId: data.moduleId || 'unknown',
      title: rule.name,
      message: this.formatAlertMessage(rule, data),
      details: data,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      escalationLevel: 0,
      tags: [...rule.tags, `module:${data.moduleId}`]
    };

    // Store alert
    this.alerts.set(alertId, alert);
    this.alertHistory.push(alert);
    this.persistAlert(alert);

    // Send notifications
    await this.sendNotifications(alert, rule);

    // Setup escalation if policy exists
    if (rule.escalationPolicy) {
      this.setupEscalation(alert, rule.escalationPolicy);
    }

    // Update rate limit counter
    const cooldownKey = `rule-${rule.id}`;
    this.rateLimitCounters.set(cooldownKey, {
      count: 1,
      resetTime: Date.now()
    });

    this.emit('alert-created', alert);
    console.log(`🚨 Alert created: [${alert.severity.toUpperCase()}] ${alert.title} - ${alert.moduleId}`);

    return alert;
  }

  private formatAlertMessage(rule: AlertRule, data: any): string {
    let message = rule.description;

    // Simple template replacement
    Object.keys(data).forEach(key => {
      const placeholder = `{${key}}`;
      if (message.includes(placeholder)) {
        message = message.replace(new RegExp(placeholder, 'g'), String(data[key]));
      }
    });

    return message;
  }

  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    const notifications = [];

    for (const channelId of rule.channels) {
      const channel = this.channels.get(channelId);
      if (!channel || !channel.enabled) continue;

      // Check rate limiting
      if (!this.checkChannelRateLimit(channel)) {
        console.log(`⚠️ Rate limit exceeded for channel ${channel.name}`);
        continue;
      }

      notifications.push(this.sendChannelNotification(channel, alert));
    }

    await Promise.allSettled(notifications);
  }

  private checkChannelRateLimit(channel: NotificationChannel): boolean {
    if (!channel.rateLimitPerMinute) return true;

    const rateLimitKey = `channel-${channel.id}`;
    const counter = this.rateLimitCounters.get(rateLimitKey);
    const now = Date.now();
    const oneMinute = 60 * 1000;

    if (!counter || now - counter.resetTime > oneMinute) {
      this.rateLimitCounters.set(rateLimitKey, { count: 1, resetTime: now });
      return true;
    }

    if (counter.count < channel.rateLimitPerMinute) {
      counter.count++;
      return true;
    }

    return false;
  }

  private async sendChannelNotification(
    channel: NotificationChannel,
    alert: Alert
  ): Promise<void> {
    const maxAttempts = channel.retryPolicy.maxAttempts;
    let attempt = 0;
    let delay = channel.retryPolicy.initialDelayMs;

    while (attempt < maxAttempts) {
      try {
        await this.deliverNotification(channel, alert);
        console.log(`✅ Notification sent via ${channel.type}: ${alert.title}`);
        this.emit('notification-sent', { alert, channel });
        return;
      } catch (error) {
        attempt++;
        console.error(`❌ Notification attempt ${attempt}/${maxAttempts} failed for ${channel.type}:`, error);

        if (attempt < maxAttempts) {
          await this.sleep(delay);
          delay = Math.min(
            delay * channel.retryPolicy.backoffMultiplier,
            channel.retryPolicy.maxDelayMs
          );
        }
      }
    }

    console.error(`❌ All notification attempts failed for ${channel.type}`);
    this.emit('notification-failed', { alert, channel });
  }

  private async deliverNotification(
    channel: NotificationChannel,
    alert: Alert
  ): Promise<void> {
    const message = this.formatNotificationMessage(channel, alert);

    switch (channel.type) {
      case 'console':
        console.log(`🚨 [${alert.severity.toUpperCase()}] ${message}`);
        break;

      case 'file':
        this.writeToFile(channel, alert, message);
        break;

      case 'email':
        await this.sendEmailNotification(channel, alert, message);
        break;

      case 'slack':
        await this.sendSlackNotification(channel, alert, message);
        break;

      case 'webhook':
        await this.sendWebhookNotification(channel, alert, message);
        break;

      case 'sms':
        await this.sendSmsNotification(channel, alert, message);
        break;

      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  private formatNotificationMessage(channel: NotificationChannel, alert: Alert): string {
    const timestamp = new Date(alert.createdAt).toLocaleString();
    const emoji = this.getSeverityEmoji(alert.severity);

    return `${emoji} ALERT [${alert.severity.toUpperCase()}]
Module: ${alert.moduleId}
Title: ${alert.title}
Message: ${alert.message}
Time: ${timestamp}
Details: ${JSON.stringify(alert.details, null, 2)}`;
  }

  private getSeverityEmoji(severity: string): string {
    const emojiMap: Record<string, string> = {
      'low': '🔵',
      'medium': '🟡',
      'high': '🟠',
      'critical': '🔴'
    };
    return emojiMap[severity] || '⚪';
  }

  private writeToFile(channel: NotificationChannel, alert: Alert, message: string): void {
    const filePath = channel.config.filePath || join(this.alertDataPath, 'notifications.log');
    const format = channel.config.format || 'text';

    let content: string;
    switch (format) {
      case 'json':
        content = JSON.stringify({ alert, message, timestamp: new Date().toISOString() }) + '\n';
        break;
      case 'csv':
        content = `"${alert.id}","${alert.severity}","${alert.moduleId}","${alert.title}","${alert.createdAt}"\n`;
        break;
      default:
        content = `[${alert.createdAt}] ${message}\n`;
    }

    try {
      require('fs').appendFileSync(filePath, content);
    } catch (error) {
      console.error('Failed to write notification to file:', error);
    }
  }

  private async sendEmailNotification(
    channel: NotificationChannel,
    alert: Alert,
    message: string
  ): Promise<void> {
    // Email implementation would go here using nodemailer or similar
    console.log(`📧 Email notification would be sent to: ${channel.config.to?.join(', ')}`);
    console.log(`Subject: Alert: ${alert.title}`);
    console.log(`Body: ${message}`);
  }

  private async sendSlackNotification(
    channel: NotificationChannel,
    alert: Alert,
    message: string
  ): Promise<void> {
    if (!channel.config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const slackPayload = {
      channel: channel.config.channel,
      username: channel.config.username || 'AlertBot',
      icon_emoji: channel.config.iconEmoji || ':warning:',
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        title: alert.title,
        text: alert.message,
        fields: [
          { title: 'Module', value: alert.moduleId, short: true },
          { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          { title: 'Time', value: alert.createdAt, short: true }
        ]
      }]
    };

    // HTTP request implementation would go here
    console.log(`💬 Slack notification would be sent:`, slackPayload);
  }

  private async sendWebhookNotification(
    channel: NotificationChannel,
    alert: Alert,
    message: string
  ): Promise<void> {
    if (!channel.config.url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alert,
      message,
      timestamp: new Date().toISOString()
    };

    // HTTP request implementation would go here
    console.log(`🔗 Webhook notification would be sent to: ${channel.config.url}`, payload);
  }

  private async sendSmsNotification(
    channel: NotificationChannel,
    alert: Alert,
    message: string
  ): Promise<void> {
    // SMS implementation would go here using Twilio or AWS SNS
    console.log(`📱 SMS notification would be sent to: ${channel.config.to?.join(', ')}`);
    console.log(`Message: ${message.substring(0, 160)}`); // SMS character limit
  }

  private getSeverityColor(severity: string): string {
    const colorMap: Record<string, string> = {
      'low': '#36a64f',     // green
      'medium': '#ffcc00',  // yellow
      'high': '#ff9900',    // orange
      'critical': '#ff0000' // red
    };
    return colorMap[severity] || '#808080';
  }

  private setupEscalation(alert: Alert, policyId: string): void {
    const policy = this.escalationPolicies.get(policyId);
    if (!policy || !policy.enabled) return;

    this.scheduleEscalation(alert, policy, 0);
  }

  private scheduleEscalation(alert: Alert, policy: EscalationPolicy, levelIndex: number): void {
    if (levelIndex >= policy.levels.length) return;

    const level = policy.levels[levelIndex];
    const delay = level.delayMinutes * 60 * 1000;

    const timer = setTimeout(async () => {
      // Check if alert is still active
      const currentAlert = this.alerts.get(alert.id);
      if (!currentAlert || currentAlert.status !== 'active') return;

      // Check if we should stop escalation on acknowledge
      if (level.stopOnAcknowledge && currentAlert.status === 'acknowledged') return;

      // Send notifications to escalation channels
      for (const channelId of level.channels) {
        const channel = this.channels.get(channelId);
        if (channel && channel.enabled) {
          await this.sendChannelNotification(channel, currentAlert);
        }
      }

      // Update escalation level
      currentAlert.escalationLevel = level.level;
      currentAlert.updatedAt = new Date().toISOString();
      this.persistAlert(currentAlert);

      console.log(`📈 Alert escalated to level ${level.level}: ${alert.title}`);
      this.emit('alert-escalated', { alert: currentAlert, level: level.level });

      // Schedule next escalation level
      this.scheduleEscalation(currentAlert, policy, levelIndex + 1);
    }, delay);

    this.escalationTimers.set(`${alert.id}-${levelIndex}`, timer);
  }

  // Public API methods
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') return false;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();
    alert.updatedAt = new Date().toISOString();

    this.persistAlert(alert);
    this.emit('alert-acknowledged', alert);

    console.log(`✅ Alert acknowledged: ${alert.title} by ${acknowledgedBy}`);
    return true;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status === 'resolved') return false;

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    alert.updatedAt = new Date().toISOString();

    this.persistAlert(alert);
    this.clearEscalationTimers(alertId);
    this.emit('alert-resolved', alert);

    console.log(`✅ Alert resolved: ${alert.title}`);
    return true;
  }

  suppressAlert(alertId: string, suppressUntil: Date): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = 'suppressed';
    alert.suppressedUntil = suppressUntil.toISOString();
    alert.updatedAt = new Date().toISOString();

    this.persistAlert(alert);
    this.clearEscalationTimers(alertId);
    this.emit('alert-suppressed', alert);

    console.log(`🔇 Alert suppressed until ${suppressUntil}: ${alert.title}`);
    return true;
  }

  getAlerts(filters?: {
    status?: string[];
    severity?: string[];
    moduleId?: string[];
    limit?: number;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.status) {
        alerts = alerts.filter(alert => filters.status!.includes(alert.status));
      }
      if (filters.severity) {
        alerts = alerts.filter(alert => filters.severity!.includes(alert.severity));
      }
      if (filters.moduleId) {
        alerts = alerts.filter(alert => filters.moduleId!.includes(alert.moduleId));
      }
      if (filters.limit) {
        alerts = alerts.slice(0, filters.limit);
      }
    }

    return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAlertStats(): AlertStats {
    const alerts = Array.from(this.alerts.values());
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    const stats: AlertStats = {
      total: alerts.length,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      suppressed: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byCategory: {},
      byModule: {},
      recentAlerts: 0,
      averageResolutionTime: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const alert of alerts) {
      // Count by status
      stats[alert.status as keyof typeof stats]++;

      // Count by severity
      stats.bySeverity[alert.severity]++;

      // Count by category
      stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;

      // Count by module
      stats.byModule[alert.moduleId] = (stats.byModule[alert.moduleId] || 0) + 1;

      // Count recent alerts
      if (new Date(alert.createdAt).getTime() > oneDayAgo) {
        stats.recentAlerts++;
      }

      // Calculate resolution time
      if (alert.status === 'resolved' && alert.resolvedAt) {
        const resolutionTime = new Date(alert.resolvedAt).getTime() - new Date(alert.createdAt).getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    }

    // Calculate average resolution time in minutes
    if (resolvedCount > 0) {
      stats.averageResolutionTime = Math.round(totalResolutionTime / resolvedCount / (60 * 1000));
    }

    return stats;
  }

  private clearEscalationTimers(alertId: string): void {
    const timersToRemove: string[] = [];
    for (const [key, timer] of this.escalationTimers.entries()) {
      if (key.startsWith(alertId)) {
        clearTimeout(timer);
        timersToRemove.push(key);
      }
    }
    timersToRemove.forEach(key => this.escalationTimers.delete(key));
  }

  private persistAlert(alert: Alert): void {
    const filePath = join(this.alertDataPath, `alert-${alert.id}.json`);
    writeFileSync(filePath, JSON.stringify(alert, null, 2));
  }

  private loadPersistedData(): void {
    // Load alerts, rules, channels, and escalation policies from files
    // Implementation would scan alert data directory and load JSON files
  }

  private ensureAlertDirectory(): void {
    if (!existsSync(this.alertDataPath)) {
      require('fs').mkdirSync(this.alertDataPath, { recursive: true });
    }
  }

  private setupDefaultChannels(): void {
    // Console channel
    this.channels.set('console', {
      id: 'console',
      name: 'Console Output',
      type: 'console',
      config: {},
      enabled: true,
      retryPolicy: {
        maxAttempts: 1,
        backoffMultiplier: 1,
        initialDelayMs: 0,
        maxDelayMs: 0
      }
    });

    // File channel
    this.channels.set('file', {
      id: 'file',
      name: 'Log File',
      type: 'file',
      config: {
        filePath: join(this.alertDataPath, 'alerts.log'),
        format: 'text'
      },
      enabled: true,
      retryPolicy: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
        maxDelayMs: 10000
      }
    });
  }

  private setupDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'critical-health',
        name: 'Critical Health Score',
        description: 'Module health score is critically low (< 30)',
        condition: {
          type: 'threshold',
          metric: 'healthScore',
          operator: '<',
          value: 30
        },
        severity: 'critical',
        category: 'health',
        enabled: true,
        channels: ['console', 'file'],
        cooldownMinutes: 15,
        tags: ['health', 'critical'],
        filters: []
      },
      {
        id: 'module-offline',
        name: 'Module Offline',
        description: 'Module status is offline',
        condition: {
          type: 'threshold',
          metric: 'status',
          operator: '==',
          value: 'offline'
        },
        severity: 'critical',
        category: 'availability',
        enabled: true,
        channels: ['console', 'file'],
        cooldownMinutes: 5,
        escalationPolicy: 'default',
        tags: ['availability', 'offline'],
        filters: []
      }
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  private setupDefaultEscalationPolicies(): void {
    const defaultPolicy: EscalationPolicy = {
      id: 'default',
      name: 'Default Escalation Policy',
      description: 'Standard escalation for critical alerts',
      enabled: true,
      levels: [
        {
          level: 1,
          delayMinutes: 15,
          channels: ['console'],
          stopOnAcknowledge: true
        },
        {
          level: 2,
          delayMinutes: 30,
          channels: ['console', 'file'],
          stopOnAcknowledge: true
        }
      ]
    };

    this.escalationPolicies.set('default', defaultPolicy);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}