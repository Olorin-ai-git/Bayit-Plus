/**
 * PerformanceCollector - Comprehensive performance metrics collection
 * Collects, analyzes, and reports performance data during E2E test execution
 */

export interface PerformanceMetric {
  timestamp: Date;
  metricType: 'response_time' | 'throughput' | 'error_rate' | 'resource_usage' | 'custom';
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  context?: Record<string, any>;
}

export interface MetricSummary {
  name: string;
  count: number;
  min: number;
  max: number;
  average: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
  unit: string;
  trend: 'improving' | 'degrading' | 'stable';
}

export interface PerformanceReport {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  testContext: {
    scenarioId?: string;
    environment: string;
    buildVersion?: string;
  };
  summaries: MetricSummary[];
  alerts: PerformanceAlert[];
  recommendations: string[];
  rawMetrics: PerformanceMetric[];
}

export interface PerformanceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'threshold' | 'trend' | 'anomaly';
  metric: string;
  message: string;
  value: number;
  threshold?: number;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface ThresholdRule {
  id: string;
  metricName: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  description: string;
  tags?: Record<string, string>;
}

export interface TrendRule {
  id: string;
  metricName: string;
  windowSize: number; // number of data points
  changeThreshold: number; // percentage change
  direction: 'increase' | 'decrease' | 'both';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  description: string;
}

export interface CollectorConfig {
  enabledMetrics: string[];
  samplingInterval: number;
  bufferSize: number;
  autoFlush: boolean;
  flushInterval: number;
  enableAlerts: boolean;
  retentionPeriod: number; // in milliseconds
}

export class PerformanceCollector {
  private config: CollectorConfig;
  private metrics: PerformanceMetric[] = [];
  private thresholdRules: Map<string, ThresholdRule> = new Map();
  private trendRules: Map<string, TrendRule> = new Map();
  private alerts: PerformanceAlert[] = [];
  private isCollecting = false;
  private collectionStartTime?: Date;
  private samplingTimer?: NodeJS.Timeout;
  private flushTimer?: NodeJS.Timeout;

  constructor(config: Partial<CollectorConfig> = {}) {
    this.config = {
      enabledMetrics: config.enabledMetrics || ['response_time', 'throughput', 'error_rate', 'resource_usage'],
      samplingInterval: config.samplingInterval || 1000, // 1 second
      bufferSize: config.bufferSize || 10000,
      autoFlush: config.autoFlush ?? true,
      flushInterval: config.flushInterval || 60000, // 1 minute
      enableAlerts: config.enableAlerts ?? true,
      retentionPeriod: config.retentionPeriod || 24 * 60 * 60 * 1000 // 24 hours
    };

    this.initializeDefaultRules();

    if (this.config.autoFlush) {
      this.startAutoFlush();
    }
  }

  // Collection Control
  public startCollection(context?: Record<string, any>): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    this.collectionStartTime = new Date();
    this.metrics = [];
    this.alerts = [];

    console.log(`Performance collection started at ${this.collectionStartTime.toISOString()}`);

    // Start sampling timer
    this.samplingTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.samplingInterval);
  }

  public stopCollection(): PerformanceReport {
    if (!this.isCollecting) {
      throw new Error('Performance collection is not active');
    }

    this.isCollecting = false;
    const endTime = new Date();

    // Stop timers
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.samplingTimer = undefined;
    }

    console.log(`Performance collection stopped at ${endTime.toISOString()}`);

    // Generate final report
    const report = this.generateReport(this.collectionStartTime!, endTime);

    // Reset state
    this.collectionStartTime = undefined;

    return report;
  }

  public isActive(): boolean {
    return this.isCollecting;
  }

  // Metric Recording
  public recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);

    // Check buffer size
    if (this.metrics.length > this.config.bufferSize) {
      this.metrics = this.metrics.slice(-this.config.bufferSize);
    }

    // Check alerts if enabled
    if (this.config.enableAlerts) {
      this.checkAlertRules(fullMetric);
    }
  }

  public recordResponseTime(name: string, duration: number, tags: Record<string, string> = {}): void {
    this.recordMetric({
      metricType: 'response_time',
      name,
      value: duration,
      unit: 'ms',
      tags: { ...tags, type: 'response_time' }
    });
  }

  public recordThroughput(name: string, requestsPerSecond: number, tags: Record<string, string> = {}): void {
    this.recordMetric({
      metricType: 'throughput',
      name,
      value: requestsPerSecond,
      unit: 'rps',
      tags: { ...tags, type: 'throughput' }
    });
  }

  public recordErrorRate(name: string, errorPercentage: number, tags: Record<string, string> = {}): void {
    this.recordMetric({
      metricType: 'error_rate',
      name,
      value: errorPercentage,
      unit: '%',
      tags: { ...tags, type: 'error_rate' }
    });
  }

  public recordResourceUsage(resource: string, usage: number, unit: string, tags: Record<string, string> = {}): void {
    this.recordMetric({
      metricType: 'resource_usage',
      name: `resource.${resource}`,
      value: usage,
      unit,
      tags: { ...tags, type: 'resource_usage', resource }
    });
  }

  public recordCustomMetric(name: string, value: number, unit: string, tags: Record<string, string> = {}): void {
    this.recordMetric({
      metricType: 'custom',
      name,
      value,
      unit,
      tags: { ...tags, type: 'custom' }
    });
  }

  // Rule Management
  public addThresholdRule(rule: ThresholdRule): void {
    this.thresholdRules.set(rule.id, rule);
  }

  public removeThresholdRule(ruleId: string): boolean {
    return this.thresholdRules.delete(ruleId);
  }

  public addTrendRule(rule: TrendRule): void {
    this.trendRules.set(rule.id, rule);
  }

  public removeTrendRule(ruleId: string): boolean {
    return this.trendRules.delete(ruleId);
  }

  public listRules(): { threshold: ThresholdRule[]; trend: TrendRule[] } {
    return {
      threshold: Array.from(this.thresholdRules.values()),
      trend: Array.from(this.trendRules.values())
    };
  }

  // Analysis
  public generateSummary(metricName: string, timeWindow?: number): MetricSummary | null {
    let filteredMetrics = this.metrics.filter(m => m.name === metricName);

    // Apply time window if specified
    if (timeWindow) {
      const cutoff = new Date(Date.now() - timeWindow);
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= cutoff);
    }

    if (filteredMetrics.length === 0) {
      return null;
    }

    const values = filteredMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / count;

    // Calculate percentiles
    const p95Index = Math.ceil(count * 0.95) - 1;
    const p99Index = Math.ceil(count * 0.99) - 1;
    const medianIndex = Math.floor(count / 2);

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    // Determine trend (simplified)
    const trend = this.calculateTrend(filteredMetrics);

    return {
      name: metricName,
      count,
      min: values[0],
      max: values[count - 1],
      average,
      median: values[medianIndex],
      p95: values[p95Index],
      p99: values[p99Index],
      stdDev,
      unit: filteredMetrics[0].unit,
      trend
    };
  }

  public getAlerts(severity?: 'low' | 'medium' | 'high' | 'critical'): PerformanceAlert[] {
    return severity ? this.alerts.filter(alert => alert.severity === severity) : [...this.alerts];
  }

  public clearAlerts(): void {
    this.alerts = [];
  }

  // Reporting
  public generateReport(startTime: Date, endTime: Date, context: Record<string, any> = {}): PerformanceReport {
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Filter metrics by time range
    const reportMetrics = this.metrics.filter(m =>
      m.timestamp >= startTime && m.timestamp <= endTime
    );

    // Generate summaries for each unique metric name
    const metricNames = [...new Set(reportMetrics.map(m => m.name))];
    const summaries = metricNames
      .map(name => this.generateSummaryForMetrics(reportMetrics.filter(m => m.name === name)))
      .filter(summary => summary !== null) as MetricSummary[];

    // Filter alerts by time range
    const reportAlerts = this.alerts.filter(alert =>
      alert.timestamp >= startTime && alert.timestamp <= endTime
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(summaries, reportAlerts);

    return {
      id: reportId,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      testContext: context,
      summaries,
      alerts: reportAlerts,
      recommendations,
      rawMetrics: reportMetrics
    };
  }

  public exportMetrics(format: 'json' | 'csv' | 'prometheus'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.metrics, null, 2);

      case 'csv':
        return this.toCsv(this.metrics);

      case 'prometheus':
        return this.toPrometheus(this.metrics);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Cleanup
  public cleanup(): void {
    // Clear old metrics based on retention period
    const cutoff = new Date(Date.now() - this.config.retentionPeriod);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  public reset(): void {
    this.metrics = [];
    this.alerts = [];
  }

  // Private Methods
  private initializeDefaultRules(): void {
    // Default threshold rules
    this.addThresholdRule({
      id: 'high-response-time',
      metricName: 'response_time',
      operator: 'gt',
      threshold: 5000, // 5 seconds
      severity: 'high',
      enabled: true,
      description: 'Response time exceeds 5 seconds'
    });

    this.addThresholdRule({
      id: 'high-error-rate',
      metricName: 'error_rate',
      operator: 'gt',
      threshold: 5, // 5%
      severity: 'medium',
      enabled: true,
      description: 'Error rate exceeds 5%'
    });

    this.addThresholdRule({
      id: 'low-throughput',
      metricName: 'throughput',
      operator: 'lt',
      threshold: 1, // 1 rps
      severity: 'medium',
      enabled: true,
      description: 'Throughput below 1 request per second'
    });

    // Default trend rules
    this.addTrendRule({
      id: 'response-time-degradation',
      metricName: 'response_time',
      windowSize: 10,
      changeThreshold: 50, // 50% increase
      direction: 'increase',
      severity: 'medium',
      enabled: true,
      description: 'Response time increasing by more than 50%'
    });
  }

  private collectSystemMetrics(): void {
    if (!this.isCollecting) {
      return;
    }

    // Collect Node.js process metrics
    const memUsage = process.memoryUsage();
    this.recordResourceUsage('memory.heap', memUsage.heapUsed, 'bytes');
    this.recordResourceUsage('memory.external', memUsage.external, 'bytes');

    // CPU usage (approximated using process.hrtime)
    const cpuUsage = process.cpuUsage();
    this.recordResourceUsage('cpu.user', cpuUsage.user, 'microseconds');
    this.recordResourceUsage('cpu.system', cpuUsage.system, 'microseconds');

    // Event loop lag (simplified)
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
      this.recordMetric({
        metricType: 'resource_usage',
        name: 'eventloop.lag',
        value: lag,
        unit: 'ms',
        tags: { type: 'resource_usage', resource: 'eventloop' }
      });
    });
  }

  private checkAlertRules(metric: PerformanceMetric): void {
    // Check threshold rules
    for (const rule of this.thresholdRules.values()) {
      if (!rule.enabled || rule.metricName !== metric.name) {
        continue;
      }

      let triggered = false;
      switch (rule.operator) {
        case 'gt':
          triggered = metric.value > rule.threshold;
          break;
        case 'lt':
          triggered = metric.value < rule.threshold;
          break;
        case 'gte':
          triggered = metric.value >= rule.threshold;
          break;
        case 'lte':
          triggered = metric.value <= rule.threshold;
          break;
        case 'eq':
          triggered = metric.value === rule.threshold;
          break;
        case 'ne':
          triggered = metric.value !== rule.threshold;
          break;
      }

      if (triggered) {
        const alert: PerformanceAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          severity: rule.severity,
          type: 'threshold',
          metric: metric.name,
          message: rule.description,
          value: metric.value,
          threshold: rule.threshold,
          timestamp: new Date(),
          context: { rule: rule.id, metric: metric }
        };

        this.alerts.push(alert);
      }
    }

    // Check trend rules (simplified implementation)
    for (const rule of this.trendRules.values()) {
      if (!rule.enabled || rule.metricName !== metric.name) {
        continue;
      }

      const recentMetrics = this.metrics
        .filter(m => m.name === rule.metricName)
        .slice(-rule.windowSize);

      if (recentMetrics.length >= rule.windowSize) {
        const oldValue = recentMetrics[0].value;
        const newValue = recentMetrics[recentMetrics.length - 1].value;
        const changePercent = ((newValue - oldValue) / oldValue) * 100;

        let triggered = false;
        if (rule.direction === 'increase' && changePercent > rule.changeThreshold) {
          triggered = true;
        } else if (rule.direction === 'decrease' && changePercent < -rule.changeThreshold) {
          triggered = true;
        } else if (rule.direction === 'both' && Math.abs(changePercent) > rule.changeThreshold) {
          triggered = true;
        }

        if (triggered) {
          const alert: PerformanceAlert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            severity: rule.severity,
            type: 'trend',
            metric: metric.name,
            message: `${rule.description} (${changePercent.toFixed(1)}% change)`,
            value: changePercent,
            timestamp: new Date(),
            context: { rule: rule.id, oldValue, newValue, changePercent }
          };

          this.alerts.push(alert);
        }
      }
    }
  }

  private generateSummaryForMetrics(metrics: PerformanceMetric[]): MetricSummary | null {
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / count;

    const p95Index = Math.ceil(count * 0.95) - 1;
    const p99Index = Math.ceil(count * 0.99) - 1;
    const medianIndex = Math.floor(count / 2);

    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    const trend = this.calculateTrend(metrics);

    return {
      name: metrics[0].name,
      count,
      min: values[0],
      max: values[count - 1],
      average,
      median: values[medianIndex],
      p95: values[p95Index],
      p99: values[p99Index],
      stdDev,
      unit: metrics[0].unit,
      trend
    };
  }

  private calculateTrend(metrics: PerformanceMetric[]): 'improving' | 'degrading' | 'stable' {
    if (metrics.length < 2) {
      return 'stable';
    }

    // Simple trend calculation: compare first half vs second half
    const midpoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, midpoint);
    const secondHalf = metrics.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercent > 10) {
      return 'degrading'; // For response times, higher is worse
    } else if (changePercent < -10) {
      return 'improving'; // For response times, lower is better
    } else {
      return 'stable';
    }
  }

  private generateRecommendations(summaries: MetricSummary[], alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];

    // Analyze summaries for recommendations
    for (const summary of summaries) {
      if (summary.name.includes('response_time') && summary.p95 > 3000) {
        recommendations.push(`Consider optimizing response times for ${summary.name}. P95 is ${summary.p95.toFixed(2)}ms`);
      }

      if (summary.name.includes('error_rate') && summary.average > 2) {
        recommendations.push(`Investigate error causes for ${summary.name}. Average error rate is ${summary.average.toFixed(2)}%`);
      }

      if (summary.name.includes('memory') && summary.max > 1073741824) { // 1GB
        recommendations.push(`Monitor memory usage for ${summary.name}. Peak usage was ${(summary.max / 1048576).toFixed(2)}MB`);
      }
    }

    // Analyze alerts for recommendations
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push(`Address ${criticalAlerts.length} critical performance issues immediately`);
    }

    const highAlerts = alerts.filter(a => a.severity === 'high');
    if (highAlerts.length > 0) {
      recommendations.push(`Review ${highAlerts.length} high-severity performance alerts`);
    }

    return recommendations;
  }

  private toCsv(metrics: PerformanceMetric[]): string {
    if (metrics.length === 0) {
      return 'timestamp,metricType,name,value,unit,tags\n';
    }

    const headers = 'timestamp,metricType,name,value,unit,tags\n';
    const rows = metrics.map(m => {
      const tags = Object.entries(m.tags || {})
        .map(([k, v]) => `${k}=${v}`)
        .join(';');

      return `${m.timestamp.toISOString()},${m.metricType},${m.name},${m.value},${m.unit},"${tags}"`;
    });

    return headers + rows.join('\n');
  }

  private toPrometheus(metrics: PerformanceMetric[]): string {
    // Basic Prometheus format export
    const output: string[] = [];
    const metricGroups = new Map<string, PerformanceMetric[]>();

    // Group metrics by name
    for (const metric of metrics) {
      if (!metricGroups.has(metric.name)) {
        metricGroups.set(metric.name, []);
      }
      metricGroups.get(metric.name)!.push(metric);
    }

    // Export each metric group
    for (const [name, groupMetrics] of metricGroups) {
      const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '_');
      output.push(`# HELP ${sanitizedName} Performance metric for ${name}`);
      output.push(`# TYPE ${sanitizedName} gauge`);

      for (const metric of groupMetrics) {
        const labels = Object.entries(metric.tags || {})
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');

        const labelStr = labels ? `{${labels}}` : '';
        const timestamp = metric.timestamp.getTime();

        output.push(`${sanitizedName}${labelStr} ${metric.value} ${timestamp}`);
      }

      output.push('');
    }

    return output.join('\n');
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.cleanup();
    }, this.config.flushInterval);
  }
}

export default PerformanceCollector;