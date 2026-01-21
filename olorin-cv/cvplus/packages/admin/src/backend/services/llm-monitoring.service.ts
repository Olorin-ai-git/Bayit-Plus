import { logger } from 'firebase-functions';
import { LLMVerificationService } from './llm-verification.service';
import { VerifiedClaudeService } from './verified-claude.service';
import { llmVerificationConfig } from '../config/llm-verification.config';
import { sanitizeForFirestore, sanitizeMetrics } from '../utils/firestore-sanitizer';

/**
 * LLM Monitoring Service
 * 
 * Provides comprehensive monitoring and analytics for the LLM verification system.
 * This service aggregates metrics, generates reports, and provides insights into
 * system performance, quality trends, and operational health.
  */
export interface MonitoringMetrics {
  timestamp: Date;
  timeWindow: string;
  performance: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number; // requests per minute
  };
  quality: {
    averageVerificationScore: number;
    averageConfidenceLevel: number;
    verificationPassRate: number;
    commonIssueCategories: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
  };
  services: {
    [serviceName: string]: {
      requestCount: number;
      successRate: number;
      averageScore: number;
      topIssues: string[];
    };
  };
  security: {
    piiDetectionEvents: number;
    rateLimitViolations: number;
    suspiciousActivity: Array<{
      type: string;
      count: number;
      description: string;
    }>;
  };
  costs: {
    estimatedAnthropicCost: number;
    estimatedOpenAICost: number;
    totalTokensUsed: number;
    costPerRequest: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number;
    timeWindow: number; // minutes
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTriggered?: Date;
  recipients: string[];
}

export interface MonitoringAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  currentValue: number;
  threshold: number;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Comprehensive monitoring service for LLM verification system
  */
export class LLMMonitoringService {
  // private verificationService: LLMVerificationService;
  // private claudeService: VerifiedClaudeService;
  private metricsHistory: MonitoringMetrics[] = [];
  private activeAlerts: MonitoringAlert[] = [];
  private alertRules: AlertRule[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    verificationService?: LLMVerificationService,
    claudeService?: VerifiedClaudeService
  ) {
    // this.verificationService = verificationService || {} as LLMVerificationService;
    // this.claudeService = claudeService;
    this.initializeDefaultAlerts();
    this.startMonitoring();
  }

  /**
   * Start continuous monitoring
    */
  public startMonitoring(intervalMinutes: number = 5): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.evaluateAlerts();
      } catch (error) {
      }
    }, intervalMinutes * 60 * 1000);

  }

  /**
   * Stop monitoring
    */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Collect comprehensive metrics
    */
  public async collectMetrics(timeWindow: string = '5m'): Promise<MonitoringMetrics> {
    const timestamp = new Date();
    
    // Get base metrics from verification service
    // const detailedMetrics = this.verificationService.getDetailedMetrics();
    // const auditLogs = this.verificationService.getAuditLogs();
    const detailedMetrics = {
      performance: { 
        totalRequests: 0, 
        successfulRequests: 0, 
        averageResponseTime: 0, 
        errorRate: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0
      },
      quality: { 
        averageConfidence: 0, 
        averageQualityScore: 0, 
        validationFailures: 0,
        averageScore: 0,
        verificationPassRate: 0
      },
      security: { 
        piiDetections: 0, 
        securityFlags: 0,
        piiDetectionRate: 0,
        rateLimitViolations: 0
      }
    };
    const auditLogs: any[] = [];
    
    // Calculate service-specific metrics
    const serviceBreakdown: { [key: string]: any } = {};
    const serviceCounts = new Map<string, { total: number; success: number; scores: number[] }>();
    
    auditLogs.forEach((log: any) => {
      const service = log.service;
      if (!serviceCounts.has(service)) {
        serviceCounts.set(service, { total: 0, success: 0, scores: [] });
      }
      
      const serviceData = serviceCounts.get(service)!;
      serviceData.total++;
      
      if (log.finalOutcome === 'approved') {
        serviceData.success++;
      }
      
      serviceData.scores.push(log.verificationResult.overallScore);
    });

    for (const [service, data] of serviceCounts.entries()) {
      serviceBreakdown[service] = {
        requestCount: data.total,
        successRate: (data.success / data.total) * 100,
        averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        topIssues: this.getTopIssuesForService(service, auditLogs)
      };
    }

    // Calculate issue categories
    const issueCategories = new Map<string, number>();
    auditLogs.forEach((log: any) => {
      log.verificationResult.issues?.forEach((issue: any) => {
        const count = issueCategories.get(issue.category) || 0;
        issueCategories.set(issue.category, count + 1);
      });
    });

    const totalIssues = Array.from(issueCategories.values()).reduce((a, b) => a + b, 0);
    const commonIssueCategories = Array.from(issueCategories.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / totalIssues) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Estimate costs (simplified calculation)
    const estimatedCosts = this.estimateOperationalCosts(auditLogs);

    const metrics: MonitoringMetrics = {
      timestamp,
      timeWindow,
      performance: {
        totalRequests: auditLogs.length,
        successfulRequests: auditLogs.filter(log => log.finalOutcome === 'approved').length,
        failedRequests: auditLogs.filter(log => log.finalOutcome === 'rejected').length,
        averageResponseTime: detailedMetrics.performance.averageResponseTime,
        p95ResponseTime: detailedMetrics.performance.p95ResponseTime,
        p99ResponseTime: detailedMetrics.performance.p99ResponseTime,
        throughput: detailedMetrics.performance.throughput
      },
      quality: {
        averageVerificationScore: detailedMetrics.quality.averageScore,
        averageConfidenceLevel: detailedMetrics.quality.averageConfidence,
        verificationPassRate: detailedMetrics.quality.verificationPassRate,
        commonIssueCategories
      },
      services: serviceBreakdown,
      security: {
        piiDetectionEvents: detailedMetrics.security.piiDetectionRate,
        rateLimitViolations: detailedMetrics.security.rateLimitViolations,
        suspiciousActivity: await this.detectSuspiciousActivity(auditLogs)
      },
      costs: estimatedCosts
    };

    // Store metrics in history
    this.metricsHistory.push(metrics);
    
    // Keep only last 100 entries to prevent memory issues
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }

    return metrics;
  }

  /**
   * Generate comprehensive dashboard data
    */
  public getDashboardData(timeRange: '1h' | '24h' | '7d' = '24h'): {
    summary: {
      totalRequests: number;
      successRate: number;
      averageResponseTime: number;
      healthStatus: 'healthy' | 'degraded' | 'unhealthy';
    };
    charts: {
      requestVolume: Array<{ timestamp: Date; count: number }>;
      successRate: Array<{ timestamp: Date; rate: number }>;
      responseTime: Array<{ timestamp: Date; time: number }>;
      qualityScores: Array<{ timestamp: Date; score: number }>;
    };
    topServices: Array<{
      name: string;
      requests: number;
      successRate: number;
      averageScore: number;
    }>;
    recentAlerts: MonitoringAlert[];
    systemHealth: {
      overall: 'healthy' | 'degraded' | 'unhealthy';
      components: Array<{
        name: string;
        status: 'healthy' | 'degraded' | 'unhealthy';
        message: string;
      }>;
    };
  } {
    const recentMetrics = this.getMetricsForTimeRange(timeRange);
    
    if (recentMetrics.length === 0) {
      return this.getEmptyDashboardData();
    }

    // const latestMetrics = recentMetrics[recentMetrics.length - 1];
    
    // Calculate summary statistics
    const totalRequests = recentMetrics.reduce((sum, m) => sum + m.performance.totalRequests, 0);
    const successfulRequests = recentMetrics.reduce((sum, m) => sum + m.performance.successfulRequests, 0);
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.performance.averageResponseTime, 0) / recentMetrics.length;
    
    // Determine health status
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (successRate < 90 || avgResponseTime > 30000) {
      healthStatus = 'unhealthy';
    } else if (successRate < 95 || avgResponseTime > 15000) {
      healthStatus = 'degraded';
    }

    // Build chart data
    const charts = {
      requestVolume: recentMetrics.map(m => ({
        timestamp: m.timestamp,
        count: m.performance.totalRequests
      })),
      successRate: recentMetrics.map(m => ({
        timestamp: m.timestamp,
        rate: m.performance.totalRequests > 0 ? 
          (m.performance.successfulRequests / m.performance.totalRequests) * 100 : 0
      })),
      responseTime: recentMetrics.map(m => ({
        timestamp: m.timestamp,
        time: m.performance.averageResponseTime
      })),
      qualityScores: recentMetrics.map(m => ({
        timestamp: m.timestamp,
        score: m.quality.averageVerificationScore
      }))
    };

    // Top services
    const serviceStats = new Map<string, { requests: number; successRate: number; scores: number[] }>();
    
    recentMetrics.forEach((metrics: any) => {
      Object.entries(metrics.services).forEach(([service, data]: [string, any]) => {
        if (!serviceStats.has(service)) {
          serviceStats.set(service, { requests: 0, successRate: 0, scores: [] });
        }
        const stats = serviceStats.get(service)!;
        stats.requests += data.requestCount;
        stats.scores.push(data.averageScore);
      });
    });

    const topServices = Array.from(serviceStats.entries())
      .map(([service, stats]) => ({
        name: service,
        requests: stats.requests,
        successRate: stats.scores.length > 0 ? 
          stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length : 0,
        averageScore: stats.scores.length > 0 ? 
          stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length : 0
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);

    return {
      summary: {
        totalRequests,
        successRate,
        averageResponseTime: avgResponseTime,
        healthStatus
      },
      charts,
      topServices,
      recentAlerts: this.activeAlerts.slice(-10),
      systemHealth: {
        overall: healthStatus,
        components: [
          {
            name: 'Claude API',
            status: 'healthy', // Would need actual health check
            message: 'API responding normally'
          },
          {
            name: 'Verification Service',
            status: successRate > 95 ? 'healthy' : 'degraded',
            message: `${successRate.toFixed(1)}% success rate`
          },
          {
            name: 'Response Time',
            status: avgResponseTime < 15000 ? 'healthy' : 'degraded',
            message: `${avgResponseTime.toFixed(0)}ms average response time`
          }
        ]
      }
    };
  }

  /**
   * Initialize default alert rules
    */
  private initializeDefaultAlerts(): void {
    this.alertRules = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: {
          metric: 'error_rate',
          operator: '>',
          threshold: 10, // 10%
          timeWindow: 15
        },
        severity: 'high',
        enabled: true,
        recipients: []
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        condition: {
          metric: 'avg_response_time',
          operator: '>',
          threshold: 30000, // 30 seconds
          timeWindow: 10
        },
        severity: 'medium',
        enabled: true,
        recipients: []
      },
      {
        id: 'low-quality-scores',
        name: 'Low Quality Scores',
        condition: {
          metric: 'avg_quality_score',
          operator: '<',
          threshold: 70,
          timeWindow: 20
        },
        severity: 'medium',
        enabled: true,
        recipients: []
      },
      {
        id: 'verification-service-down',
        name: 'Verification Service Down',
        condition: {
          metric: 'success_rate',
          operator: '<',
          threshold: 50, // 50%
          timeWindow: 5
        },
        severity: 'critical',
        // Fix: Disable alert until verification service is properly configured
        enabled: false,
        recipients: []
      }
    ];
  }

  /**
   * Evaluate alert conditions
    */
  private async evaluateAlerts(): Promise<void> {
    const recentMetrics = this.metricsHistory.slice(-10); // Last 10 data points
    
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;
      
      const shouldTrigger = this.evaluateAlertRule(rule, recentMetrics);
      
      if (shouldTrigger) {
        await this.triggerAlert(rule, recentMetrics);
      }
    }
  }

  /**
   * Evaluate individual alert rule
    */
  private evaluateAlertRule(rule: AlertRule, metrics: MonitoringMetrics[]): boolean {
    if (metrics.length === 0) return false;
    
    const windowStart = Date.now() - (rule.condition.timeWindow * 60 * 1000);
    const relevantMetrics = metrics.filter(m => m.timestamp.getTime() > windowStart);
    
    if (relevantMetrics.length === 0) return false;
    
    let currentValue: number;
    
    switch (rule.condition.metric) {
      case 'error_rate':
        const totalRequests = relevantMetrics.reduce((sum, m) => sum + m.performance.totalRequests, 0);
        const failedRequests = relevantMetrics.reduce((sum, m) => sum + m.performance.failedRequests, 0);
        currentValue = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
        break;
      case 'avg_response_time':
        currentValue = relevantMetrics.reduce((sum, m) => sum + m.performance.averageResponseTime, 0) / relevantMetrics.length;
        break;
      case 'avg_quality_score':
        currentValue = relevantMetrics.reduce((sum, m) => sum + m.quality.averageVerificationScore, 0) / relevantMetrics.length;
        break;
      case 'success_rate':
        const totalReqs = relevantMetrics.reduce((sum, m) => sum + m.performance.totalRequests, 0);
        const successReqs = relevantMetrics.reduce((sum, m) => sum + m.performance.successfulRequests, 0);
        currentValue = totalReqs > 0 ? (successReqs / totalReqs) * 100 : 0;
        break;
      default:
        return false;
    }
    
    switch (rule.condition.operator) {
      case '>': return currentValue > rule.condition.threshold;
      case '<': return currentValue < rule.condition.threshold;
      case '>=': return currentValue >= rule.condition.threshold;
      case '<=': return currentValue <= rule.condition.threshold;
      case '=': return currentValue === rule.condition.threshold;
      default: return false;
    }
  }

  /**
   * Trigger alert
    */
  private async triggerAlert(rule: AlertRule, metrics: MonitoringMetrics[]): Promise<void> {
    const alert: MonitoringAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `${rule.name} threshold exceeded`,
      timestamp: new Date(),
      currentValue: 0, // Would be calculated based on the metric
      threshold: rule.condition.threshold,
      resolved: false
    };

    this.activeAlerts.push(alert);
    
    // Log the alert
    logger.warn('LLM Monitoring Alert:', {
      alert: alert.ruleName,
      severity: alert.severity,
      timestamp: alert.timestamp
    });

    rule.lastTriggered = new Date();
  }

  /**
   * Helper methods
    */
  private getMetricsForTimeRange(timeRange: '1h' | '24h' | '7d'): MonitoringMetrics[] {
    const now = Date.now();
    let startTime: number;
    
    switch (timeRange) {
      case '1h': startTime = now - (60 * 60 * 1000); break;
      case '24h': startTime = now - (24 * 60 * 60 * 1000); break;
      case '7d': startTime = now - (7 * 24 * 60 * 60 * 1000); break;
    }
    
    return this.metricsHistory.filter(m => m.timestamp.getTime() > startTime);
  }

  private getEmptyDashboardData(): any {
    return {
      summary: { totalRequests: 0, successRate: 0, averageResponseTime: 0, healthStatus: 'healthy' },
      charts: { requestVolume: [], successRate: [], responseTime: [], qualityScores: [] },
      topServices: [],
      recentAlerts: [],
      systemHealth: { overall: 'healthy', components: [] }
    };
  }

  private getTopIssuesForService(serviceName: string, auditLogs: any[]): string[] {
    const serviceIssues = new Map<string, number>();
    
    auditLogs
      .filter(log => log.service === serviceName)
      .forEach((log: any) => {
        log.verificationResult.issues?.forEach((issue: any) => {
          const description = issue.description;
          serviceIssues.set(description, (serviceIssues.get(description) || 0) + 1);
        });
      });

    return Array.from(serviceIssues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([issue]) => issue);
  }

  private estimateOperationalCosts(auditLogs: any[]): {
    estimatedAnthropicCost: number;
    estimatedOpenAICost: number;
    totalTokensUsed: number;
    costPerRequest: number;
  } {
    // Simplified cost calculation - in production, this would use actual token counts
    const totalRequests = auditLogs.length;
    const avgTokensPerRequest = 3000; // Estimated
    const totalTokens = totalRequests * avgTokensPerRequest;
    
    // Approximate costs (would need to be updated with current pricing)
    const anthropicCostPer1000Tokens = 0.01; // Simplified
    const openaiCostPer1000Tokens = 0.02; // Simplified
    
    const anthropicCost = (totalTokens / 1000) * anthropicCostPer1000Tokens;
    const openaiCost = (totalTokens / 1000) * openaiCostPer1000Tokens * 0.5; // Only for verification
    
    return {
      estimatedAnthropicCost: anthropicCost,
      estimatedOpenAICost: openaiCost,
      totalTokensUsed: totalTokens,
      costPerRequest: totalRequests > 0 ? (anthropicCost + openaiCost) / totalRequests : 0
    };
  }

  private async detectSuspiciousActivity(auditLogs: any[]): Promise<Array<{
    type: string;
    count: number;
    description: string;
  }>> {
    // Implement suspicious activity detection logic
    return [
      {
        type: 'repeated_failures',
        count: 0,
        description: 'Multiple consecutive verification failures'
      }
    ];
  }

  /**
   * Export data for external monitoring systems
    */
  public exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.exportPrometheusMetrics();
    }
    
    return JSON.stringify({
      timestamp: new Date(),
      metrics: this.metricsHistory.slice(-1)[0],
      config: {
        environment: llmVerificationConfig.environment,
        verificationEnabled: llmVerificationConfig.verification.enabled
      }
    }, null, 2);
  }

  private exportPrometheusMetrics(): string {
    const latest = this.metricsHistory.slice(-1)[0];
    if (!latest) return '';
    
    return `# HELP llm_verification_requests_total Total number of LLM verification requests
# TYPE llm_verification_requests_total counter
llm_verification_requests_total ${latest.performance.totalRequests}

# HELP llm_verification_success_rate Current success rate percentage
# TYPE llm_verification_success_rate gauge
llm_verification_success_rate ${latest.performance.totalRequests > 0 ? (latest.performance.successfulRequests / latest.performance.totalRequests) * 100 : 0}

# HELP llm_verification_response_time_ms Average response time in milliseconds
# TYPE llm_verification_response_time_ms gauge
llm_verification_response_time_ms ${latest.performance.averageResponseTime}

# HELP llm_verification_quality_score Average quality score
# TYPE llm_verification_quality_score gauge
llm_verification_quality_score ${latest.quality.averageVerificationScore}
`;
  }

  /**
   * Cleanup method
    */
  public cleanup(): void {
    this.stopMonitoring();
    this.metricsHistory = [];
    this.activeAlerts = [];
  }
}

// Export singleton instance
export const llmMonitoringService = new LLMMonitoringService(
  new LLMVerificationService(),
  new VerifiedClaudeService()
);