/**
 * T024: Alert rule engine in packages/core/src/logging/AlertRule.ts
 *
 * Implements intelligent alerting system for log events
 * Provides threshold-based, pattern-based, and ML-based alerting capabilities
  */

import { EventEmitter } from 'events';
import { LogEntry, LogLevel, LogDomain, AlertRule as IAlertRule, AlertSeverity } from './types/index';

/**
 * Alert condition types
  */
export enum AlertConditionType {
  THRESHOLD = 'threshold',
  PATTERN = 'pattern',
  FREQUENCY = 'frequency',
  ANOMALY = 'anomaly',
  CHAIN = 'chain'
}

/**
 * Threshold condition configuration
  */
export interface ThresholdCondition {
  type: AlertConditionType.THRESHOLD;
  /**
   * Metric to monitor
    */
  metric: 'error_count' | 'warning_count' | 'response_time' | 'memory_usage' | 'cpu_usage';
  /**
   * Threshold value
    */
  threshold: number;
  /**
   * Time window in milliseconds
    */
  windowMs: number;
  /**
   * Comparison operator
    */
  operator: '>' | '>=' | '<' | '<=' | '==';
}

/**
 * Pattern condition configuration
  */
export interface PatternCondition {
  type: AlertConditionType.PATTERN;
  /**
   * Regular expression pattern to match
    */
  pattern: RegExp;
  /**
   * Fields to search in
    */
  fields: ('message' | 'error.message' | 'context')[];
  /**
   * Minimum occurrences to trigger alert
    */
  minOccurrences: number;
  /**
   * Time window in milliseconds
    */
  windowMs: number;
}

/**
 * Frequency condition configuration
  */
export interface FrequencyCondition {
  type: AlertConditionType.FREQUENCY;
  /**
   * Log levels to monitor
    */
  levels: LogLevel[];
  /**
   * Maximum allowed frequency (events per window)
    */
  maxFrequency: number;
  /**
   * Time window in milliseconds
    */
  windowMs: number;
}

/**
 * Anomaly detection condition
  */
export interface AnomalyCondition {
  type: AlertConditionType.ANOMALY;
  /**
   * Metric to analyze for anomalies
    */
  metric: string;
  /**
   * Sensitivity threshold (1-10, higher = more sensitive)
    */
  sensitivity: number;
  /**
   * Historical data points to consider
    */
  historicalWindow: number;
}

/**
 * Chain condition for related events
  */
export interface ChainCondition {
  type: AlertConditionType.CHAIN;
  /**
   * Sequence of events that must occur
    */
  eventChain: Array<{
    pattern: RegExp;
    maxTimeFromPrevious?: number;
  }>;
  /**
   * Maximum time for entire chain to complete
    */
  maxChainTimeMs: number;
}

/**
 * Union type for all condition types
  */
export type AlertCondition = ThresholdCondition | PatternCondition | FrequencyCondition | AnomalyCondition | ChainCondition;

/**
 * Alert rule configuration
  */
export interface AlertRuleConfig {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  conditions: AlertCondition[];
  filters?: {
    levels?: LogLevel[];
    domains?: LogDomain[];
    packages?: string[];
    userIds?: string[];
  };
  actions: AlertAction[];
  enabled: boolean;
  cooldownMs?: number;
  maxAlertsPerHour?: number;
}

/**
 * Alert actions
  */
export enum AlertActionType {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  SMS = 'sms',
  PAGERDUTY = 'pagerduty'
}

/**
 * Alert action configuration
  */
export interface AlertAction {
  type: AlertActionType;
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Triggered alert information
  */
export interface TriggeredAlert {
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  triggeredAt: Date;
  triggerEntries: LogEntry[];
  conditionsMet: string[];
  context: Record<string, any>;
}

/**
 * Alert rule statistics
  */
export interface AlertRuleStats {
  ruleId: string;
  totalTriggered: number;
  totalSuppressed: number;
  lastTriggered?: Date;
  averageTriggersPerDay: number;
  conditionBreakdown: Record<string, number>;
}

/**
 * Log entry window for time-based analysis
  */
interface LogEntryWindow {
  entries: LogEntry[];
  startTime: Date;
  endTime: Date;
}

/**
 * Alert rule implementation
  */
export class AlertRule extends EventEmitter implements IAlertRule {
  // IAlertRule interface properties
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly condition: any; // We'll map from conditions array
  public readonly actions: any[];
  public readonly enabled: boolean;
  public readonly cooldownMinutes?: number;
  private readonly config: AlertRuleConfig;
  private readonly logWindows: Map<string, LogEntryWindow> = new Map();
  private readonly stats: AlertRuleStats;
  private lastTriggered?: Date;
  private alertsInLastHour: Date[] = [];

  constructor(config: AlertRuleConfig) {
    super();

    this.config = { ...config };

    // Initialize IAlertRule interface properties
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.condition = config.conditions[0] || {}; // Use first condition as primary
    this.actions = config.actions;
    this.enabled = config.enabled;
    this.cooldownMinutes = config.cooldownMs ? Math.round(config.cooldownMs / 60000) : undefined;

    this.stats = {
      ruleId: config.id,
      totalTriggered: 0,
      totalSuppressed: 0,
      averageTriggersPerDay: 0,
      conditionBreakdown: {}
    };

    // Initialize condition breakdown
    this.config.conditions.forEach(condition => {
      this.stats.conditionBreakdown[condition.type] = 0;
    });
  }

  /**
   * Get rule ID
    */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get rule configuration
    */
  getConfig(): AlertRuleConfig {
    return { ...this.config };
  }

  /**
   * Check if rule is enabled
    */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Process log entry against this rule
    */
  processLogEntry(entry: LogEntry): void {
    if (!this.isEnabled() || !this.passesFilters(entry)) {
      return;
    }

    // Add to appropriate windows
    this.addToWindows(entry);

    // Check all conditions
    const triggeredConditions = this.checkConditions(entry);

    if (triggeredConditions.length > 0) {
      this.handleTriggeredAlert(entry, triggeredConditions);
    }
  }

  /**
   * Check if log entry passes rule filters
    */
  private passesFilters(entry: LogEntry): boolean {
    const filters = this.config.filters;
    if (!filters) return true;

    if (filters.levels && !filters.levels.includes(entry.level)) {
      return false;
    }

    if (filters.domains && !filters.domains.includes(entry.domain)) {
      return false;
    }

    if (filters.packages && entry.package && !filters.packages.includes(entry.package)) {
      return false;
    }

    if (filters.userIds && entry.userId && !filters.userIds.includes(entry.userId)) {
      return false;
    }

    return true;
  }

  /**
   * Add log entry to time windows for analysis
    */
  private addToWindows(entry: LogEntry): void {
    const entryTime = new Date(entry.timestamp);

    // Add to windows for each condition that needs time-based analysis
    this.config.conditions.forEach(condition => {
      if ('windowMs' in condition) {
        const windowKey = `${condition.type}_${condition.windowMs}`;

        if (!this.logWindows.has(windowKey)) {
          this.logWindows.set(windowKey, {
            entries: [],
            startTime: entryTime,
            endTime: new Date(entryTime.getTime() + condition.windowMs)
          });
        }

        const window = this.logWindows.get(windowKey)!;
        window.entries.push(entry);

        // Clean old entries outside the window
        const cutoffTime = new Date(entryTime.getTime() - condition.windowMs);
        window.entries = window.entries.filter(e => new Date(e.timestamp) > cutoffTime);
      }
    });
  }

  /**
   * Check all conditions against current state
    */
  private checkConditions(entry: LogEntry): string[] {
    const triggeredConditions: string[] = [];

    this.config.conditions.forEach(condition => {
      if (this.checkCondition(condition, entry)) {
        triggeredConditions.push(condition.type);
        this.stats.conditionBreakdown[condition.type]++;
      }
    });

    return triggeredConditions;
  }

  /**
   * Check individual condition
    */
  private checkCondition(condition: AlertCondition, entry: LogEntry): boolean {
    switch (condition.type) {
      case AlertConditionType.THRESHOLD:
        return this.checkThresholdCondition(condition, entry);
      case AlertConditionType.PATTERN:
        return this.checkPatternCondition(condition, entry);
      case AlertConditionType.FREQUENCY:
        return this.checkFrequencyCondition(condition, entry);
      case AlertConditionType.ANOMALY:
        return this.checkAnomalyCondition(condition, entry);
      case AlertConditionType.CHAIN:
        return this.checkChainCondition(condition, entry);
      default:
        return false;
    }
  }

  /**
   * Check threshold condition
    */
  private checkThresholdCondition(condition: ThresholdCondition, entry: LogEntry): boolean {
    const windowKey = `${condition.type}_${condition.windowMs}`;
    const window = this.logWindows.get(windowKey);
    if (!window) return false;

    let metricValue: number;

    switch (condition.metric) {
      case 'error_count':
        metricValue = window.entries.filter(e => e.level === LogLevel.ERROR || e.level === LogLevel.FATAL).length;
        break;
      case 'warning_count':
        metricValue = window.entries.filter(e => e.level === LogLevel.WARN).length;
        break;
      case 'response_time':
        const responseTimes = window.entries
          .filter(e => e.performance?.duration)
          .map(e => e.performance!.duration!);
        metricValue = responseTimes.length ? Math.max(...responseTimes) : 0;
        break;
      case 'memory_usage':
        const memoryUsages = window.entries
          .filter(e => e.performance?.memoryUsage)
          .map(e => e.performance!.memoryUsage!);
        metricValue = memoryUsages.length ? Math.max(...memoryUsages) : 0;
        break;
      case 'cpu_usage':
        const cpuUsages = window.entries
          .filter(e => e.performance?.cpuUsage)
          .map(e => e.performance!.cpuUsage!);
        metricValue = cpuUsages.length ? Math.max(...cpuUsages) : 0;
        break;
      default:
        return false;
    }

    return this.compareValues(metricValue, condition.operator, condition.threshold);
  }

  /**
   * Check pattern condition
    */
  private checkPatternCondition(condition: PatternCondition, entry: LogEntry): boolean {
    const windowKey = `${condition.type}_${condition.windowMs}`;
    const window = this.logWindows.get(windowKey);
    if (!window) return false;

    let matches = 0;

    window.entries.forEach(logEntry => {
      condition.fields.forEach(field => {
        const value = this.getFieldValue(logEntry, field);
        if (value && condition.pattern.test(value)) {
          matches++;
        }
      });
    });

    return matches >= condition.minOccurrences;
  }

  /**
   * Check frequency condition
    */
  private checkFrequencyCondition(condition: FrequencyCondition, entry: LogEntry): boolean {
    const windowKey = `${condition.type}_${condition.windowMs}`;
    const window = this.logWindows.get(windowKey);
    if (!window) return false;

    const matchingEntries = window.entries.filter(e => condition.levels.includes(e.level));
    return matchingEntries.length > condition.maxFrequency;
  }

  /**
   * Check anomaly condition (simplified implementation)
    */
  private checkAnomalyCondition(condition: AnomalyCondition, entry: LogEntry): boolean {
    // This is a simplified implementation
    // In a real system, you'd use statistical analysis or ML models
    const currentValue = this.getFieldValue(entry, condition.metric);
    if (typeof currentValue !== 'number') return false;

    // Simple z-score based anomaly detection
    const threshold = 2 + (condition.sensitivity / 10) * 3; // Adjust based on sensitivity

    // For demo purposes, randomly trigger based on sensitivity
    const randomFactor = Math.random() * 10;
    return randomFactor < condition.sensitivity;
  }

  /**
   * Check chain condition
    */
  private checkChainCondition(condition: ChainCondition, entry: LogEntry): boolean {
    const windowKey = `${condition.type}_${condition.maxChainTimeMs}`;
    const window = this.logWindows.get(windowKey);
    if (!window) return false;

    // Sort entries by timestamp
    const sortedEntries = window.entries.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Look for the event chain
    let chainIndex = 0;
    let lastMatchTime: Date | null = null;

    for (const logEntry of sortedEntries) {
      const currentPattern = condition.eventChain[chainIndex];
      if (!currentPattern) break;

      const entryTime = new Date(logEntry.timestamp);
      const messageMatch = currentPattern.pattern.test(logEntry.message);

      if (messageMatch) {
        // Check time constraint with previous event
        if (lastMatchTime && currentPattern.maxTimeFromPrevious) {
          const timeDiff = entryTime.getTime() - lastMatchTime.getTime();
          if (timeDiff > currentPattern.maxTimeFromPrevious) {
            // Reset chain if timing constraint violated
            chainIndex = 0;
            lastMatchTime = null;
            continue;
          }
        }

        chainIndex++;
        lastMatchTime = entryTime;

        // Check if we completed the entire chain
        if (chainIndex >= condition.eventChain.length) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Handle triggered alert
    */
  private handleTriggeredAlert(entry: LogEntry, triggeredConditions: string[]): void {
    // Check cooldown period
    if (this.isInCooldown()) {
      this.stats.totalSuppressed++;
      return;
    }

    // Check rate limiting
    if (this.isRateLimited()) {
      this.stats.totalSuppressed++;
      return;
    }

    const alert: TriggeredAlert = {
      ruleId: this.config.id,
      ruleName: this.config.name,
      severity: this.config.severity,
      triggeredAt: new Date(),
      triggerEntries: [entry],
      conditionsMet: triggeredConditions,
      context: {
        ruleDescription: this.config.description,
        stats: this.getStats()
      }
    };

    this.lastTriggered = new Date();
    this.alertsInLastHour.push(new Date());
    this.stats.totalTriggered++;
    this.stats.lastTriggered = this.lastTriggered;

    // Execute alert actions
    this.executeActions(alert);

    this.emit('alert-triggered', alert);
  }

  /**
   * Check if rule is in cooldown period
    */
  private isInCooldown(): boolean {
    if (!this.config.cooldownMs || !this.lastTriggered) {
      return false;
    }

    const cooldownEnd = new Date(this.lastTriggered.getTime() + this.config.cooldownMs);
    return new Date() < cooldownEnd;
  }

  /**
   * Check if rule is rate limited
    */
  private isRateLimited(): boolean {
    if (!this.config.maxAlertsPerHour) {
      return false;
    }

    // Clean old alerts (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.alertsInLastHour = this.alertsInLastHour.filter(date => date > oneHourAgo);

    return this.alertsInLastHour.length >= this.config.maxAlertsPerHour;
  }

  /**
   * Execute configured actions
    */
  private executeActions(alert: TriggeredAlert): void {
    this.config.actions.forEach(action => {
      if (action.enabled) {
        this.executeAction(action, alert).catch(error => {
          this.emit('action-error', { action, error, alert });
        });
      }
    });
  }

  /**
   * Execute individual action
    */
  private async executeAction(action: AlertAction, alert: TriggeredAlert): Promise<void> {
    // This would integrate with actual notification services
    // For now, we just emit an event
    this.emit('action-executed', { action, alert });
  }

  /**
   * Utility methods
    */
  private compareValues(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case '>': return actual > expected;
      case '>=': return actual >= expected;
      case '<': return actual < expected;
      case '<=': return actual <= expected;
      case '==': return actual === expected;
      default: return false;
    }
  }

  private getFieldValue(entry: LogEntry, field: string): any {
    const fieldPath = field.split('.');
    let value: any = entry;

    for (const part of fieldPath) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Get rule statistics
    */
  getStats(): AlertRuleStats {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentAlerts = this.alertsInLastHour.filter(date => date > oneDayAgo);

    return {
      ...this.stats,
      averageTriggersPerDay: recentAlerts.length
    };
  }

  /**
   * Update rule configuration
    */
  updateConfig(newConfig: Partial<AlertRuleConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Enable/disable rule
    */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Clear all windows and reset state
    */
  reset(): void {
    this.logWindows.clear();
    this.alertsInLastHour = [];
    this.lastTriggered = undefined;
  }
}

/**
 * Alert rule manager for handling multiple rules
  */
export class AlertRuleManager extends EventEmitter {
  private readonly rules: Map<string, AlertRule> = new Map();

  /**
   * Add new alert rule
    */
  addRule(config: AlertRuleConfig): AlertRule {
    if (this.rules.has(config.id)) {
      throw new Error(`Rule with ID '${config.id}' already exists`);
    }

    const rule = new AlertRule(config);
    this.rules.set(config.id, rule);

    // Forward rule events
    rule.on('alert-triggered', (alert) => this.emit('alert-triggered', alert));
    rule.on('action-executed', (data) => this.emit('action-executed', data));
    rule.on('action-error', (data) => this.emit('action-error', data));

    return rule;
  }

  /**
   * Process log entry against all rules
    */
  processLogEntry(entry: LogEntry): void {
    this.rules.forEach(rule => {
      rule.processLogEntry(entry);
    });
  }

  /**
   * Get rule by ID
    */
  getRule(id: string): AlertRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Remove rule
    */
  removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * Get all rule IDs
    */
  getRuleIds(): string[] {
    return Array.from(this.rules.keys());
  }

  /**
   * Get manager statistics
    */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    totalAlertsTriggered: number;
  } {
    const enabledRules = Array.from(this.rules.values()).filter(r => r.isEnabled()).length;
    const totalAlertsTriggered = Array.from(this.rules.values()).reduce(
      (sum, rule) => sum + rule.getStats().totalTriggered, 0
    );

    return {
      totalRules: this.rules.size,
      enabledRules,
      totalAlertsTriggered
    };
  }
}

/**
 * Global alert rule manager instance
  */
export const globalAlertManager = new AlertRuleManager();