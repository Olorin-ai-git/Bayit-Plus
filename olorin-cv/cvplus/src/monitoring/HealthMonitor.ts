/**
 * Health Monitor
 * Real-time monitoring system for CVPlus Level 2 modules
 */

import { EventEmitter } from 'events';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { ValidationOrchestrator } from '../validation/ValidationOrchestrator';
import { RecoveryService } from '../services/RecoveryService';

export interface HealthStatus {
  moduleId: string;
  healthScore: number;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  lastCheck: string;
  uptime: number;
  issues: HealthIssue[];
  metrics: HealthMetrics;
  trends: HealthTrend[];
}

export interface HealthIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'availability' | 'security' | 'configuration' | 'dependency';
  message: string;
  firstDetected: string;
  lastSeen: string;
  occurrences: number;
  resolved: boolean;
  autoRecoverable: boolean;
}

export interface HealthMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  networkLatency: number;
  dependencyHealth: number;
}

export interface HealthTrend {
  timestamp: string;
  healthScore: number;
  metrics: Partial<HealthMetrics>;
}

export interface HealthCheckConfig {
  interval: number; // milliseconds
  retryAttempts: number;
  timeout: number;
  enableAutoRecovery: boolean;
  alertThresholds: {
    critical: number; // health score threshold
    degraded: number;
    errorRate: number;
    responseTime: number;
  };
  modules: string[];
}

export interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  cooldownPeriod: number; // minutes
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'console';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  condition: string; // Expression to evaluate
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  channels: string[];
  enabled: boolean;
}

export interface MonitoringReport {
  timestamp: string;
  overallHealth: number;
  moduleStatuses: HealthStatus[];
  activeAlerts: number;
  resolvedIssues: number;
  systemMetrics: SystemMetrics;
  recommendations: string[];
}

export interface SystemMetrics {
  totalModules: number;
  healthyModules: number;
  degradedModules: number;
  criticalModules: number;
  offlineModules: number;
  averageResponseTime: number;
  totalErrors: number;
  uptime: number;
}

export class HealthMonitor extends EventEmitter {
  private monitoringTimer: NodeJS.Timer | null = null;
  private moduleStatuses: Map<string, HealthStatus> = new Map();
  private activeAlerts: Map<string, Date> = new Map();
  private validator: ValidationOrchestrator;
  private recoveryService: RecoveryService;
  private config: HealthCheckConfig;
  private alertConfig: AlertConfig;
  private monitoringDataPath: string;

  // Level 2 modules for CVPlus architecture
  private readonly LEVEL_2_MODULES = [
    'auth', 'i18n', 'cv-processing', 'multimedia',
    'analytics', 'premium', 'public-profiles',
    'recommendations', 'admin', 'workflow', 'payments'
  ];

  constructor(
    private workspacePath: string,
    config?: Partial<HealthCheckConfig>,
    alertConfig?: Partial<AlertConfig>
  ) {
    super();

    this.validator = new ValidationOrchestrator(workspacePath);
    this.recoveryService = new RecoveryService(workspacePath);
    this.monitoringDataPath = join(workspacePath, 'monitoring');

    // Default configuration
    this.config = {
      interval: 30000, // 30 seconds
      retryAttempts: 3,
      timeout: 10000, // 10 seconds
      enableAutoRecovery: true,
      alertThresholds: {
        critical: 30,
        degraded: 60,
        errorRate: 0.05, // 5%
        responseTime: 5000 // 5 seconds
      },
      modules: this.LEVEL_2_MODULES,
      ...config
    };

    this.alertConfig = {
      enabled: true,
      channels: [
        {
          type: 'console',
          config: {},
          enabled: true
        }
      ],
      rules: [
        {
          id: 'critical-health',
          condition: 'healthScore < 30',
          severity: 'critical',
          message: 'Module health critically low',
          channels: ['console'],
          enabled: true
        },
        {
          id: 'module-offline',
          condition: 'status === "offline"',
          severity: 'critical',
          message: 'Module is offline',
          channels: ['console'],
          enabled: true
        },
        {
          id: 'high-error-rate',
          condition: 'metrics.errorRate > 0.05',
          severity: 'high',
          message: 'High error rate detected',
          channels: ['console'],
          enabled: true
        }
      ],
      cooldownPeriod: 15, // 15 minutes
      ...alertConfig
    };

    this.ensureMonitoringDirectory();
    this.initializeModuleStatuses();
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoringTimer) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    console.log('🔍 Starting health monitoring...');
    console.log(`📊 Monitoring ${this.config.modules.length} modules every ${this.config.interval / 1000}s`);

    // Initial health check
    await this.performHealthCheck();

    // Start periodic monitoring
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('❌ Health check failed:', error);
        this.emit('monitoring-error', error);
      }
    }, this.config.interval);

    this.emit('monitoring-started', {
      modules: this.config.modules,
      interval: this.config.interval
    });

    console.log('✅ Health monitoring started successfully');
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;

      console.log('⏹️ Health monitoring stopped');
      this.emit('monitoring-stopped');
    }
  }

  async performHealthCheck(): Promise<MonitoringReport> {
    const startTime = Date.now();
    console.log('🔍 Performing health check...');

    const moduleStatuses: HealthStatus[] = [];
    const promises = this.config.modules.map(moduleId => this.checkModuleHealth(moduleId));

    try {
      const results = await Promise.allSettled(promises);

      for (let i = 0; i < results.length; i++) {
        const moduleId = this.config.modules[i];
        const result = results[i];

        if (result.status === 'fulfilled') {
          moduleStatuses.push(result.value);
          this.moduleStatuses.set(moduleId, result.value);
        } else {
          const offlineStatus = this.createOfflineStatus(moduleId, result.reason);
          moduleStatuses.push(offlineStatus);
          this.moduleStatuses.set(moduleId, offlineStatus);
        }
      }

      // Generate monitoring report
      const report = this.generateMonitoringReport(moduleStatuses);

      // Check for alerts
      await this.evaluateAlerts(moduleStatuses);

      // Trigger auto-recovery if enabled
      if (this.config.enableAutoRecovery) {
        await this.triggerAutoRecovery(moduleStatuses);
      }

      // Save monitoring data
      this.saveMonitoringData(report);

      const executionTime = Date.now() - startTime;
      console.log(`✅ Health check completed in ${executionTime}ms`);
      console.log(`📊 Overall Health: ${report.overallHealth}/100`);
      console.log(`🟢 Healthy: ${report.systemMetrics.healthyModules}, 🟡 Degraded: ${report.systemMetrics.degradedModules}, 🔴 Critical: ${report.systemMetrics.criticalModules}`);

      this.emit('health-check-completed', report);
      return report;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      throw error;
    }
  }

  private async checkModuleHealth(moduleId: string): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Get validation results for the module
      const validationResult = await this.validator.validateSingleModule(moduleId, {
        validationDepth: 'basic',
        includeHealthMetrics: true,
        includeDependencyChecks: true,
        includeFileSystemChecks: true,
        includeBuildValidation: false,
        includeTestValidation: false
      });

      // Calculate health metrics
      const metrics = await this.calculateHealthMetrics(moduleId);

      // Get or create existing status
      const existingStatus = this.moduleStatuses.get(moduleId);
      const uptime = existingStatus ?
        Date.now() - new Date(existingStatus.lastCheck).getTime() + existingStatus.uptime :
        0;

      // Convert validation issues to health issues
      const issues = validationResult.issues.map(issue => this.convertToHealthIssue(issue));

      // Calculate overall health score (combination of validation score and metrics)
      const healthScore = Math.round((validationResult.healthScore * 0.7) + (this.calculateMetricsScore(metrics) * 0.3));

      // Determine status based on health score
      const status = this.getHealthStatus(healthScore, metrics);

      // Create health trend entry
      const trend: HealthTrend = {
        timestamp: new Date().toISOString(),
        healthScore,
        metrics
      };

      // Update trends (keep last 100 entries)
      const existingTrends = existingStatus?.trends || [];
      const trends = [...existingTrends, trend].slice(-100);

      const healthStatus: HealthStatus = {
        moduleId,
        healthScore,
        status,
        lastCheck: new Date().toISOString(),
        uptime,
        issues,
        metrics,
        trends
      };

      return healthStatus;

    } catch (error) {
      throw new Error(`Health check failed for ${moduleId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async calculateHealthMetrics(moduleId: string): Promise<HealthMetrics> {
    // Simulate health metrics calculation
    // In a real implementation, this would gather actual metrics
    const modulePath = join(this.workspacePath, 'packages', moduleId);
    const moduleExists = existsSync(modulePath);

    if (!moduleExists) {
      return {
        responseTime: 0,
        errorRate: 1.0,
        throughput: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        networkLatency: 0,
        dependencyHealth: 0
      };
    }

    // Basic metrics based on file system checks
    const baseMetrics = {
      responseTime: Math.random() * 1000 + 100, // 100-1100ms
      errorRate: Math.random() * 0.02, // 0-2%
      throughput: Math.random() * 100 + 50, // 50-150 requests/min
      memoryUsage: Math.random() * 0.5 + 0.2, // 20-70%
      cpuUsage: Math.random() * 0.3 + 0.1, // 10-40%
      diskUsage: Math.random() * 0.4 + 0.1, // 10-50%
      networkLatency: Math.random() * 50 + 10, // 10-60ms
      dependencyHealth: Math.random() * 0.2 + 0.8 // 80-100%
    };

    return baseMetrics;
  }

  private calculateMetricsScore(metrics: HealthMetrics): number {
    let score = 100;

    // Deduct points based on metrics
    if (metrics.responseTime > this.config.alertThresholds.responseTime) score -= 20;
    if (metrics.errorRate > this.config.alertThresholds.errorRate) score -= 25;
    if (metrics.memoryUsage > 0.8) score -= 15;
    if (metrics.cpuUsage > 0.7) score -= 15;
    if (metrics.dependencyHealth < 0.9) score -= 10;

    return Math.max(0, score);
  }

  private getHealthStatus(healthScore: number, metrics: HealthMetrics): 'healthy' | 'degraded' | 'critical' | 'offline' {
    if (healthScore === 0 || metrics.errorRate === 1.0) return 'offline';
    if (healthScore < this.config.alertThresholds.critical) return 'critical';
    if (healthScore < this.config.alertThresholds.degraded) return 'degraded';
    return 'healthy';
  }

  private convertToHealthIssue(validationIssue: any): HealthIssue {
    return {
      id: validationIssue.id,
      severity: validationIssue.severity,
      category: validationIssue.category,
      message: validationIssue.message,
      firstDetected: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      occurrences: 1,
      resolved: false,
      autoRecoverable: this.isAutoRecoverable(validationIssue)
    };
  }

  private isAutoRecoverable(issue: any): boolean {
    // Define which types of issues can be auto-recovered
    const recoverableCategories = ['filesystem', 'configuration', 'dependencies'];
    const recoverableSeverities = ['low', 'medium'];

    return recoverableCategories.includes(issue.category) &&
           recoverableSeverities.includes(issue.severity);
  }

  private createOfflineStatus(moduleId: string, error: any): HealthStatus {
    return {
      moduleId,
      healthScore: 0,
      status: 'offline',
      lastCheck: new Date().toISOString(),
      uptime: 0,
      issues: [{
        id: `${moduleId}-offline`,
        severity: 'critical',
        category: 'availability',
        message: `Module offline: ${error instanceof Error ? error.message : 'Unknown error'}`,
        firstDetected: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        occurrences: 1,
        resolved: false,
        autoRecoverable: true
      }],
      metrics: {
        responseTime: 0,
        errorRate: 1.0,
        throughput: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        networkLatency: 0,
        dependencyHealth: 0
      },
      trends: []
    };
  }

  private generateMonitoringReport(moduleStatuses: HealthStatus[]): MonitoringReport {
    const systemMetrics = this.calculateSystemMetrics(moduleStatuses);
    const overallHealth = systemMetrics.totalModules > 0 ?
      Math.round(moduleStatuses.reduce((sum, status) => sum + status.healthScore, 0) / systemMetrics.totalModules) :
      0;

    const activeAlerts = Array.from(this.activeAlerts.keys()).length;
    const resolvedIssues = moduleStatuses.reduce((sum, status) =>
      sum + status.issues.filter(issue => issue.resolved).length, 0);

    const recommendations = this.generateHealthRecommendations(moduleStatuses);

    return {
      timestamp: new Date().toISOString(),
      overallHealth,
      moduleStatuses,
      activeAlerts,
      resolvedIssues,
      systemMetrics,
      recommendations
    };
  }

  private calculateSystemMetrics(moduleStatuses: HealthStatus[]): SystemMetrics {
    const totalModules = moduleStatuses.length;
    const healthyModules = moduleStatuses.filter(s => s.status === 'healthy').length;
    const degradedModules = moduleStatuses.filter(s => s.status === 'degraded').length;
    const criticalModules = moduleStatuses.filter(s => s.status === 'critical').length;
    const offlineModules = moduleStatuses.filter(s => s.status === 'offline').length;

    const averageResponseTime = totalModules > 0 ?
      moduleStatuses.reduce((sum, status) => sum + status.metrics.responseTime, 0) / totalModules : 0;

    const totalErrors = moduleStatuses.reduce((sum, status) =>
      sum + status.issues.filter(issue => !issue.resolved).length, 0);

    const uptime = totalModules > 0 ?
      moduleStatuses.reduce((sum, status) => sum + status.uptime, 0) / totalModules : 0;

    return {
      totalModules,
      healthyModules,
      degradedModules,
      criticalModules,
      offlineModules,
      averageResponseTime,
      totalErrors,
      uptime
    };
  }

  private generateHealthRecommendations(moduleStatuses: HealthStatus[]): string[] {
    const recommendations: string[] = [];

    const criticalModules = moduleStatuses.filter(s => s.status === 'critical' || s.status === 'offline');
    if (criticalModules.length > 0) {
      recommendations.push(`Immediate attention required for ${criticalModules.length} critical modules: ${criticalModules.map(m => m.moduleId).join(', ')}`);
    }

    const degradedModules = moduleStatuses.filter(s => s.status === 'degraded');
    if (degradedModules.length > 0) {
      recommendations.push(`Monitor and improve ${degradedModules.length} degraded modules: ${degradedModules.map(m => m.moduleId).join(', ')}`);
    }

    const highErrorRateModules = moduleStatuses.filter(s => s.metrics.errorRate > 0.05);
    if (highErrorRateModules.length > 0) {
      recommendations.push(`Investigate high error rates in modules: ${highErrorRateModules.map(m => m.moduleId).join(', ')}`);
    }

    const slowModules = moduleStatuses.filter(s => s.metrics.responseTime > 5000);
    if (slowModules.length > 0) {
      recommendations.push(`Optimize response times for slow modules: ${slowModules.map(m => m.moduleId).join(', ')}`);
    }

    return recommendations;
  }

  private async evaluateAlerts(moduleStatuses: HealthStatus[]): Promise<void> {
    if (!this.alertConfig.enabled) return;

    for (const status of moduleStatuses) {
      for (const rule of this.alertConfig.rules) {
        if (!rule.enabled) continue;

        if (this.evaluateAlertCondition(rule.condition, status)) {
          const alertKey = `${rule.id}-${status.moduleId}`;

          // Check cooldown period
          const lastAlert = this.activeAlerts.get(alertKey);
          if (lastAlert &&
              (Date.now() - lastAlert.getTime()) < (this.alertConfig.cooldownPeriod * 60 * 1000)) {
            continue;
          }

          // Trigger alert
          await this.triggerAlert(rule, status);
          this.activeAlerts.set(alertKey, new Date());
        }
      }
    }
  }

  private evaluateAlertCondition(condition: string, status: HealthStatus): boolean {
    try {
      // Simple condition evaluation
      // In a real implementation, use a proper expression evaluator
      const context = {
        healthScore: status.healthScore,
        status: status.status,
        metrics: status.metrics,
        issueCount: status.issues.length
      };

      // Basic condition parsing for demo
      if (condition.includes('healthScore <')) {
        const threshold = parseInt(condition.split('<')[1].trim());
        return context.healthScore < threshold;
      }

      if (condition.includes('status ===')) {
        const expectedStatus = condition.split('===')[1].trim().replace(/['"]/g, '');
        return context.status === expectedStatus;
      }

      if (condition.includes('metrics.errorRate >')) {
        const threshold = parseFloat(condition.split('>')[1].trim());
        return context.metrics.errorRate > threshold;
      }

      return false;
    } catch (error) {
      console.error(`Failed to evaluate alert condition: ${condition}`, error);
      return false;
    }
  }

  private async triggerAlert(rule: AlertRule, status: HealthStatus): Promise<void> {
    const alertMessage = `🚨 ALERT [${rule.severity.toUpperCase()}] - ${rule.message} - Module: ${status.moduleId} (Health: ${status.healthScore}/100)`;

    console.log(alertMessage);

    for (const channelType of rule.channels) {
      const channel = this.alertConfig.channels.find(c => c.type === channelType && c.enabled);
      if (channel) {
        await this.sendAlert(channel, alertMessage, rule, status);
      }
    }

    this.emit('alert-triggered', {
      rule,
      status,
      message: alertMessage,
      timestamp: new Date().toISOString()
    });
  }

  private async sendAlert(
    channel: AlertChannel,
    message: string,
    rule: AlertRule,
    status: HealthStatus
  ): Promise<void> {
    try {
      switch (channel.type) {
        case 'console':
          console.log(`📢 ${message}`);
          break;

        case 'email':
          // Email implementation would go here
          console.log(`📧 Email alert: ${message}`);
          break;

        case 'slack':
          // Slack implementation would go here
          console.log(`💬 Slack alert: ${message}`);
          break;

        case 'webhook':
          // Webhook implementation would go here
          console.log(`🔗 Webhook alert: ${message}`);
          break;

        default:
          console.log(`📢 Unknown channel ${channel.type}: ${message}`);
      }
    } catch (error) {
      console.error(`Failed to send alert via ${channel.type}:`, error);
    }
  }

  private async triggerAutoRecovery(moduleStatuses: HealthStatus[]): Promise<void> {
    const modulesNeedingRecovery = moduleStatuses.filter(status =>
      (status.status === 'critical' || status.status === 'offline') &&
      status.issues.some(issue => issue.autoRecoverable)
    );

    for (const status of modulesNeedingRecovery) {
      try {
        console.log(`🔄 Attempting auto-recovery for module: ${status.moduleId}`);

        const recoverableIssues = status.issues.filter(issue => issue.autoRecoverable);

        if (recoverableIssues.length > 0) {
          // Attempt repair strategy first
          const recoveryResults = await this.recoveryService.executeRecovery(status.moduleId, 'repair', {
            targetHealthScore: this.config.alertThresholds.degraded,
            maxAttempts: this.config.retryAttempts,
            timeoutMs: this.config.timeout,
            dryRun: false,
            skipBackup: false
          });

          if (recoveryResults.success && recoveryResults.finalHealthScore >= this.config.alertThresholds.degraded) {
            console.log(`✅ Auto-recovery successful for ${status.moduleId}: ${recoveryResults.finalHealthScore}/100`);

            this.emit('auto-recovery-success', {
              moduleId: status.moduleId,
              recoveryResults,
              timestamp: new Date().toISOString()
            });
          } else {
            console.log(`❌ Auto-recovery failed for ${status.moduleId}`);

            this.emit('auto-recovery-failed', {
              moduleId: status.moduleId,
              recoveryResults,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error(`Auto-recovery error for ${status.moduleId}:`, error);
      }
    }
  }

  private saveMonitoringData(report: MonitoringReport): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = join(this.monitoringDataPath, `health-report-${timestamp}.json`);

    writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
  }

  private initializeModuleStatuses(): void {
    for (const moduleId of this.config.modules) {
      this.moduleStatuses.set(moduleId, {
        moduleId,
        healthScore: 0,
        status: 'offline',
        lastCheck: new Date().toISOString(),
        uptime: 0,
        issues: [],
        metrics: {
          responseTime: 0,
          errorRate: 0,
          throughput: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          diskUsage: 0,
          networkLatency: 0,
          dependencyHealth: 0
        },
        trends: []
      });
    }
  }

  private ensureMonitoringDirectory(): void {
    if (!existsSync(this.monitoringDataPath)) {
      require('fs').mkdirSync(this.monitoringDataPath, { recursive: true });
    }
  }

  // Public API methods
  getModuleStatus(moduleId: string): HealthStatus | null {
    return this.moduleStatuses.get(moduleId) || null;
  }

  getAllStatuses(): HealthStatus[] {
    return Array.from(this.moduleStatuses.values());
  }

  getSystemHealth(): number {
    const statuses = this.getAllStatuses();
    return statuses.length > 0 ?
      Math.round(statuses.reduce((sum, status) => sum + status.healthScore, 0) / statuses.length) :
      0;
  }

  async forceHealthCheck(moduleId?: string): Promise<HealthStatus | HealthStatus[]> {
    if (moduleId) {
      const status = await this.checkModuleHealth(moduleId);
      this.moduleStatuses.set(moduleId, status);
      return status;
    } else {
      const report = await this.performHealthCheck();
      return report.moduleStatuses;
    }
  }

  updateConfig(newConfig: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📊 Health monitor configuration updated');
  }

  updateAlertConfig(newAlertConfig: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...newAlertConfig };
    console.log('🚨 Alert configuration updated');
  }
}