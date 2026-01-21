/**
 * Monitoring and Analytics Integration Tests
 * Comprehensive testing of health monitoring and analytics systems
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';

// Import monitoring and analytics components
import { HealthMonitor } from '../../src/monitoring/HealthMonitor';
import { AlertManager } from '../../src/monitoring/AlertManager';
import { RecoveryAnalytics } from '../../src/analytics/RecoveryAnalytics';
import { ReportGenerator } from '../../src/analytics/ReportGenerator';

// Import supporting services
import { RecoveryService } from '../../src/services/RecoveryService';
import { ValidationOrchestrator } from '../../src/validation/ValidationOrchestrator';

// Import types
import {
  HealthStatus,
  MonitoringReport,
  HealthCheckConfig,
  AlertConfig
} from '../../src/monitoring/HealthMonitor';
import { Alert, AlertRule } from '../../src/monitoring/AlertManager';
import { RecoveryContext, RecoveryResult } from '../../src/models';

describe('Monitoring and Analytics Integration', () => {
  const testWorkspacePath = join(__dirname, '../../test-monitoring-workspace');

  let healthMonitor: HealthMonitor;
  let alertManager: AlertManager;
  let recoveryAnalytics: RecoveryAnalytics;
  let reportGenerator: ReportGenerator;
  let recoveryService: RecoveryService;
  let validationOrchestrator: ValidationOrchestrator;

  const LEVEL_2_MODULES = [
    'auth', 'i18n', 'cv-processing', 'multimedia',
    'analytics', 'premium', 'public-profiles',
    'recommendations', 'admin', 'workflow', 'payments'
  ];

  beforeAll(async () => {
    await setupMonitoringTestWorkspace();

    // Initialize monitoring and analytics components
    const healthConfig: Partial<HealthCheckConfig> = {
      interval: 10000, // 10 seconds for testing
      retryAttempts: 2,
      timeout: 5000,
      enableAutoRecovery: false, // Disable for testing
      alertThresholds: {
        critical: 30,
        degraded: 60,
        errorRate: 0.05,
        responseTime: 3000
      },
      modules: LEVEL_2_MODULES
    };

    const alertConfig: Partial<AlertConfig> = {
      enabled: true,
      cooldownPeriod: 1, // 1 minute for testing
      channels: [
        {
          type: 'console',
          config: {},
          enabled: true
        }
      ]
    };

    healthMonitor = new HealthMonitor(testWorkspacePath, healthConfig, alertConfig);
    alertManager = new AlertManager(testWorkspacePath);
    recoveryAnalytics = new RecoveryAnalytics(testWorkspacePath);
    reportGenerator = new ReportGenerator(testWorkspacePath);
    recoveryService = new RecoveryService(testWorkspacePath);
    validationOrchestrator = new ValidationOrchestrator(testWorkspacePath);

    console.log('🧪 Monitoring and analytics test environment initialized');
  });

  afterAll(async () => {
    // Stop monitoring if running
    await healthMonitor.stopMonitoring();

    // Cleanup test workspace
    if (existsSync(testWorkspacePath)) {
      rmSync(testWorkspacePath, { recursive: true, force: true });
    }

    console.log('🧹 Monitoring and analytics test environment cleaned up');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Monitoring System', () => {
    it('should start and stop health monitoring', async () => {
      console.log('🧪 Testing health monitoring start/stop');

      // Test starting monitoring
      await healthMonitor.startMonitoring();

      // Wait for initial health check
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify monitoring is running by checking system health
      const systemHealth = healthMonitor.getSystemHealth();
      expect(typeof systemHealth).toBe('number');
      expect(systemHealth).toBeGreaterThanOrEqual(0);
      expect(systemHealth).toBeLessThanOrEqual(100);

      // Get all statuses
      const allStatuses = healthMonitor.getAllStatuses();
      expect(Array.isArray(allStatuses)).toBe(true);
      expect(allStatuses.length).toBe(LEVEL_2_MODULES.length);

      // Stop monitoring
      await healthMonitor.stopMonitoring();

      console.log(`✅ Health monitoring test completed - System health: ${systemHealth}/100`);
      console.log(`📊 Modules monitored: ${allStatuses.length}`);
    }, 15000);

    it('should perform comprehensive health checks', async () => {
      console.log('🧪 Testing comprehensive health checks');

      const healthReport = await healthMonitor.performHealthCheck();

      expect(healthReport).toBeDefined();
      expect(healthReport.timestamp).toBeDefined();
      expect(typeof healthReport.overallHealth).toBe('number');
      expect(healthReport.overallHealth).toBeGreaterThanOrEqual(0);
      expect(healthReport.overallHealth).toBeLessThanOrEqual(100);
      expect(Array.isArray(healthReport.moduleStatuses)).toBe(true);
      expect(healthReport.moduleStatuses.length).toBe(LEVEL_2_MODULES.length);
      expect(typeof healthReport.activeAlerts).toBe('number');
      expect(typeof healthReport.resolvedIssues).toBe('number');
      expect(healthReport.systemMetrics).toBeDefined();
      expect(Array.isArray(healthReport.recommendations)).toBe(true);

      // Verify module statuses structure
      for (const status of healthReport.moduleStatuses) {
        expect(status.moduleId).toBeDefined();
        expect(LEVEL_2_MODULES.includes(status.moduleId)).toBe(true);
        expect(typeof status.healthScore).toBe('number');
        expect(status.healthScore).toBeGreaterThanOrEqual(0);
        expect(status.healthScore).toBeLessThanOrEqual(100);
        expect(['healthy', 'degraded', 'critical', 'offline'].includes(status.status)).toBe(true);
        expect(status.lastCheck).toBeDefined();
        expect(typeof status.uptime).toBe('number');
        expect(Array.isArray(status.issues)).toBe(true);
        expect(status.metrics).toBeDefined();
        expect(Array.isArray(status.trends)).toBe(true);
      }

      // Verify system metrics structure
      const metrics = healthReport.systemMetrics;
      expect(typeof metrics.totalModules).toBe('number');
      expect(typeof metrics.healthyModules).toBe('number');
      expect(typeof metrics.degradedModules).toBe('number');
      expect(typeof metrics.criticalModules).toBe('number');
      expect(typeof metrics.offlineModules).toBe('number');
      expect(typeof metrics.averageResponseTime).toBe('number');
      expect(typeof metrics.totalErrors).toBe('number');
      expect(typeof metrics.uptime).toBe('number');

      console.log(`📊 Health check results:`);
      console.log(`  - Overall health: ${healthReport.overallHealth}/100`);
      console.log(`  - Healthy modules: ${metrics.healthyModules}/${metrics.totalModules}`);
      console.log(`  - Active alerts: ${healthReport.activeAlerts}`);
      console.log(`  - Total errors: ${metrics.totalErrors}`);
      console.log(`  - Recommendations: ${healthReport.recommendations.length}`);
    }, 20000);

    it('should track module health trends', async () => {
      console.log('🧪 Testing health trend tracking');

      // Perform multiple health checks to build trend data
      const healthChecks = [];

      for (let i = 0; i < 3; i++) {
        const report = await healthMonitor.performHealthCheck();
        healthChecks.push(report);

        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      expect(healthChecks.length).toBe(3);

      // Force a health check on a specific module to verify trends
      const testModule = 'auth';
      const moduleStatus = await healthMonitor.forceHealthCheck(testModule) as HealthStatus;

      expect(moduleStatus).toBeDefined();
      expect(moduleStatus.moduleId).toBe(testModule);
      expect(Array.isArray(moduleStatus.trends)).toBe(true);

      // Verify trend data structure if trends exist
      if (moduleStatus.trends.length > 0) {
        const latestTrend = moduleStatus.trends[moduleStatus.trends.length - 1];
        expect(latestTrend.timestamp).toBeDefined();
        expect(typeof latestTrend.healthScore).toBe('number');
        expect(latestTrend.metrics).toBeDefined();
      }

      console.log(`📈 Trend tracking verified for ${testModule}`);
      console.log(`  - Health score: ${moduleStatus.healthScore}/100`);
      console.log(`  - Status: ${moduleStatus.status}`);
      console.log(`  - Trends recorded: ${moduleStatus.trends.length}`);
      console.log(`  - Issues: ${moduleStatus.issues.length}`);
    }, 10000);

    it('should generate quick health check efficiently', async () => {
      console.log('🧪 Testing quick health check performance');

      const startTime = Date.now();
      const quickHealth = await healthMonitor.generateQuickHealthCheck();
      const executionTime = Date.now() - startTime;

      expect(quickHealth).toBeDefined();
      expect(typeof quickHealth.overallHealth).toBe('number');
      expect(quickHealth.overallHealth).toBeGreaterThanOrEqual(0);
      expect(quickHealth.overallHealth).toBeLessThanOrEqual(100);
      expect(typeof quickHealth.moduleHealthScores).toBe('object');
      expect(typeof quickHealth.criticalIssues).toBe('number');
      expect(typeof quickHealth.executionTime).toBe('number');
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify module health scores
      const moduleIds = Object.keys(quickHealth.moduleHealthScores);
      expect(moduleIds.length).toBeGreaterThan(0);

      moduleIds.forEach(moduleId => {
        expect(LEVEL_2_MODULES.includes(moduleId)).toBe(true);
        const score = quickHealth.moduleHealthScores[moduleId];
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });

      console.log(`⚡ Quick health check performance:`);
      console.log(`  - Execution time: ${executionTime}ms`);
      console.log(`  - Overall health: ${quickHealth.overallHealth}/100`);
      console.log(`  - Modules checked: ${moduleIds.length}`);
      console.log(`  - Critical issues: ${quickHealth.criticalIssues}`);
    }, 10000);
  });

  describe('Alert Management System', () => {
    it('should evaluate and trigger alerts based on health data', async () => {
      console.log('🧪 Testing alert evaluation and triggering');

      const alertsTriggered: Alert[] = [];
      alertManager.on('alert-created', (alert) => {
        alertsTriggered.push(alert);
      });

      // Generate health data that should trigger alerts
      const healthReport = await healthMonitor.performHealthCheck();

      // Evaluate alerts based on health data
      const triggeredAlerts = await alertManager.evaluateAlerts(healthReport);

      expect(Array.isArray(triggeredAlerts)).toBe(true);

      // Verify alert structure if alerts were triggered
      if (triggeredAlerts.length > 0) {
        for (const alert of triggeredAlerts) {
          expect(alert.id).toBeDefined();
          expect(alert.ruleId).toBeDefined();
          expect(['low', 'medium', 'high', 'critical'].includes(alert.severity)).toBe(true);
          expect(['health', 'performance', 'availability', 'security', 'dependency'].includes(alert.category)).toBe(true);
          expect(alert.moduleId).toBeDefined();
          expect(alert.title).toBeDefined();
          expect(alert.message).toBeDefined();
          expect(['active', 'acknowledged', 'resolved', 'suppressed'].includes(alert.status)).toBe(true);
          expect(alert.createdAt).toBeDefined();
          expect(alert.updatedAt).toBeDefined();
          expect(typeof alert.escalationLevel).toBe('number');
          expect(Array.isArray(alert.tags)).toBe(true);
        }
      }

      console.log(`🚨 Alert evaluation completed:`);
      console.log(`  - Alerts triggered: ${triggeredAlerts.length}`);
      console.log(`  - Event listener alerts: ${alertsTriggered.length}`);

      // Test alert management operations
      if (triggeredAlerts.length > 0) {
        const testAlert = triggeredAlerts[0];

        // Test acknowledge alert
        const acknowledged = alertManager.acknowledgeAlert(testAlert.id, 'test-user');
        expect(acknowledged).toBe(true);

        // Test resolve alert
        const resolved = alertManager.resolveAlert(testAlert.id);
        expect(resolved).toBe(true);

        console.log(`✅ Alert management operations tested`);
      }
    }, 15000);

    it('should manage alert statistics and reporting', async () => {
      console.log('🧪 Testing alert statistics and reporting');

      // Get current alert statistics
      const alertStats = alertManager.getAlertStats();

      expect(alertStats).toBeDefined();
      expect(typeof alertStats.total).toBe('number');
      expect(typeof alertStats.active).toBe('number');
      expect(typeof alertStats.acknowledged).toBe('number');
      expect(typeof alertStats.resolved).toBe('number');
      expect(typeof alertStats.suppressed).toBe('number');
      expect(typeof alertStats.bySeverity).toBe('object');
      expect(typeof alertStats.byCategory).toBe('object');
      expect(typeof alertStats.byModule).toBe('object');
      expect(typeof alertStats.recentAlerts).toBe('number');
      expect(typeof alertStats.averageResolutionTime).toBe('number');

      // Test alert filtering
      const allAlerts = alertManager.getAlerts();
      expect(Array.isArray(allAlerts)).toBe(true);

      // Test filtered alerts
      const activeAlerts = alertManager.getAlerts({ status: ['active'] });
      expect(Array.isArray(activeAlerts)).toBe(true);

      const criticalAlerts = alertManager.getAlerts({ severity: ['critical'] });
      expect(Array.isArray(criticalAlerts)).toBe(true);

      const moduleAlerts = alertManager.getAlerts({ moduleId: ['auth'] });
      expect(Array.isArray(moduleAlerts)).toBe(true);

      const limitedAlerts = alertManager.getAlerts({ limit: 5 });
      expect(Array.isArray(limitedAlerts)).toBe(true);
      expect(limitedAlerts.length).toBeLessThanOrEqual(5);

      console.log(`📊 Alert statistics:`);
      console.log(`  - Total alerts: ${alertStats.total}`);
      console.log(`  - Active alerts: ${alertStats.active}`);
      console.log(`  - Recent alerts (24h): ${alertStats.recentAlerts}`);
      console.log(`  - Average resolution time: ${alertStats.averageResolutionTime} minutes`);
      console.log(`  - Critical alerts: ${alertStats.bySeverity.critical || 0}`);
    }, 10000);

    it('should handle alert suppression and escalation', async () => {
      console.log('🧪 Testing alert suppression and escalation');

      // Generate test health data that might trigger alerts
      const healthReport = await healthMonitor.performHealthCheck();
      const triggeredAlerts = await alertManager.evaluateAlerts(healthReport);

      if (triggeredAlerts.length > 0) {
        const testAlert = triggeredAlerts[0];

        // Test alert suppression
        const suppressUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        const suppressed = alertManager.suppressAlert(testAlert.id, suppressUntil);
        expect(suppressed).toBe(true);

        // Verify alert status changed to suppressed
        const suppressedAlert = alertManager.getAlerts({ status: ['suppressed'] })
          .find(alert => alert.id === testAlert.id);

        if (suppressedAlert) {
          expect(suppressedAlert.status).toBe('suppressed');
          expect(suppressedAlert.suppressedUntil).toBeDefined();
        }

        console.log(`🔇 Alert suppression tested successfully`);
      }

      // Test escalation by checking if escalation policies exist
      const alertsWithEscalation = alertManager.getAlerts().filter(alert =>
        alert.escalationLevel > 0
      );

      console.log(`📈 Escalation status:`);
      console.log(`  - Alerts with escalation: ${alertsWithEscalation.length}`);
      console.log(`  - Suppressed alerts tested: ${triggeredAlerts.length > 0 ? 'Yes' : 'No'}`);
    }, 10000);
  });

  describe('Recovery Analytics System', () => {
    it('should record and analyze recovery operations', async () => {
      console.log('🧪 Testing recovery analytics recording and analysis');

      // Generate test recovery operations
      const testOperations = [];
      const strategies: Array<'repair' | 'rebuild' | 'reset'> = ['repair', 'rebuild', 'reset'];

      for (let i = 0; i < 6; i++) {
        const moduleId = LEVEL_2_MODULES[i % LEVEL_2_MODULES.length];
        const strategy = strategies[i % strategies.length];

        const context: RecoveryContext = {
          targetHealthScore: 70 + (i % 30),
          maxAttempts: 2,
          timeoutMs: 10000,
          dryRun: true,
          skipBackup: true
        };

        // Execute recovery operation
        const recoveryResult = await recoveryService.executeRecovery(moduleId, strategy, context);

        // Record in analytics
        const operationId = `analytics-test-${i}-${Date.now()}`;
        await recoveryAnalytics.recordRecoveryOperation(
          operationId,
          moduleId,
          strategy,
          recoveryResult,
          context
        );

        testOperations.push({
          operationId,
          moduleId,
          strategy,
          result: recoveryResult
        });

        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(testOperations.length).toBe(6);

      // Test system statistics
      const systemStats = recoveryAnalytics.getSystemStats();
      expect(systemStats).toBeDefined();
      expect(systemStats.totalOperations).toBeGreaterThanOrEqual(6);
      expect(typeof systemStats.overallSuccessRate).toBe('number');
      expect(systemStats.overallSuccessRate).toBeGreaterThanOrEqual(0);
      expect(systemStats.overallSuccessRate).toBeLessThanOrEqual(1);
      expect(typeof systemStats.averageDuration).toBe('number');
      expect(typeof systemStats.modulesTracked).toBe('number');

      console.log(`📊 Recovery analytics results:`);
      console.log(`  - Operations recorded: ${testOperations.length}`);
      console.log(`  - Total operations in system: ${systemStats.totalOperations}`);
      console.log(`  - Overall success rate: ${(systemStats.overallSuccessRate * 100).toFixed(1)}%`);
      console.log(`  - Average duration: ${systemStats.averageDuration.toFixed(1)}ms`);
      console.log(`  - Modules tracked: ${systemStats.modulesTracked}`);

      // Test module profiles
      const testModule = testOperations[0].moduleId;
      const moduleProfile = recoveryAnalytics.getModuleProfile(testModule);

      if (moduleProfile) {
        expect(moduleProfile.moduleId).toBe(testModule);
        expect(typeof moduleProfile.totalOperations).toBe('number');
        expect(typeof moduleProfile.successRate).toBe('number');
        expect(typeof moduleProfile.averageDuration).toBe('number');
        expect(typeof moduleProfile.averageHealthImprovement).toBe('number');
        expect(['repair', 'rebuild', 'reset'].includes(moduleProfile.mostEffectiveStrategy)).toBe(true);
        expect(Array.isArray(moduleProfile.commonFailureModes)).toBe(true);
        expect(Array.isArray(moduleProfile.riskFactors)).toBe(true);

        console.log(`🔍 Module profile for ${testModule}:`);
        console.log(`  - Operations: ${moduleProfile.totalOperations}`);
        console.log(`  - Success rate: ${(moduleProfile.successRate * 100).toFixed(1)}%`);
        console.log(`  - Most effective strategy: ${moduleProfile.mostEffectiveStrategy}`);
        console.log(`  - Risk factors: ${moduleProfile.riskFactors.length}`);
      }
    }, 30000);

    it('should generate system recovery reports', async () => {
      console.log('🧪 Testing system recovery report generation');

      const timeframe = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date()
      };

      const systemReport = await recoveryAnalytics.generateSystemReport(timeframe);

      expect(systemReport).toBeDefined();
      expect(systemReport.reportId).toBeDefined();
      expect(systemReport.generatedAt).toBeDefined();
      expect(systemReport.timeframe).toBeDefined();
      expect(systemReport.timeframe.start).toBeDefined();
      expect(systemReport.timeframe.end).toBeDefined();
      expect(systemReport.summary).toBeDefined();
      expect(Array.isArray(systemReport.moduleProfiles)).toBe(true);
      expect(Array.isArray(systemReport.trends)).toBe(true);
      expect(Array.isArray(systemReport.insights)).toBe(true);
      expect(Array.isArray(systemReport.recommendations)).toBe(true);
      expect(systemReport.performanceMetrics).toBeDefined();

      // Verify summary structure
      const summary = systemReport.summary;
      expect(typeof summary.totalOperations).toBe('number');
      expect(typeof summary.successfulOperations).toBe('number');
      expect(typeof summary.failedOperations).toBe('number');
      expect(typeof summary.averageDuration).toBe('number');
      expect(typeof summary.totalHealthImprovement).toBe('number');
      expect(typeof summary.modulesRecovered).toBe('number');

      // Verify performance metrics structure
      const metrics = systemReport.performanceMetrics;
      expect(metrics.fastestRecovery).toBeDefined();
      expect(metrics.slowestRecovery).toBeDefined();
      expect(metrics.mostImproved).toBeDefined();
      expect(metrics.leastReliable).toBeDefined();
      expect(metrics.mostReliable).toBeDefined();

      console.log(`📊 System recovery report generated:`);
      console.log(`  - Report ID: ${systemReport.reportId}`);
      console.log(`  - Total operations: ${summary.totalOperations}`);
      console.log(`  - Success rate: ${summary.totalOperations > 0 ? ((summary.successfulOperations / summary.totalOperations) * 100).toFixed(1) : 0}%`);
      console.log(`  - Module profiles: ${systemReport.moduleProfiles.length}`);
      console.log(`  - Insights generated: ${systemReport.insights.length}`);
      console.log(`  - Recommendations: ${systemReport.recommendations.length}`);
    }, 15000);

    it('should provide recovery predictions', async () => {
      console.log('🧪 Testing recovery prediction capabilities');

      const testModule = 'auth';
      const strategies: Array<'repair' | 'rebuild' | 'reset'> = ['repair', 'rebuild', 'reset'];

      for (const strategy of strategies) {
        const prediction = await recoveryAnalytics.predictRecoveryOutcome(testModule, strategy);

        expect(prediction).toBeDefined();
        expect(prediction.moduleId).toBe(testModule);
        expect(prediction.strategy).toBe(strategy);
        expect(typeof prediction.predictedSuccessRate).toBe('number');
        expect(prediction.predictedSuccessRate).toBeGreaterThanOrEqual(0);
        expect(prediction.predictedSuccessRate).toBeLessThanOrEqual(1);
        expect(typeof prediction.predictedDuration).toBe('number');
        expect(prediction.predictedDuration).toBeGreaterThan(0);
        expect(typeof prediction.predictedHealthImprovement).toBe('number');
        expect(typeof prediction.confidence).toBe('number');
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(prediction.riskFactors)).toBe(true);
        expect(Array.isArray(prediction.alternatives)).toBe(true);

        // Verify alternatives structure
        for (const alternative of prediction.alternatives) {
          expect(alternative.strategy).toBeDefined();
          expect(typeof alternative.successRate).toBe('number');
          expect(typeof alternative.duration).toBe('number');
          expect(Array.isArray(alternative.pros)).toBe(true);
          expect(Array.isArray(alternative.cons)).toBe(true);
        }

        console.log(`🔮 Prediction for ${testModule} ${strategy}:`);
        console.log(`  - Success rate: ${(prediction.predictedSuccessRate * 100).toFixed(1)}%`);
        console.log(`  - Duration: ${(prediction.predictedDuration / 1000).toFixed(1)}s`);
        console.log(`  - Health improvement: ${prediction.predictedHealthImprovement.toFixed(1)}%`);
        console.log(`  - Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
        console.log(`  - Alternatives: ${prediction.alternatives.length}`);
      }
    }, 10000);
  });

  describe('Report Generation System', () => {
    it('should generate comprehensive reports with multiple data sources', async () => {
      console.log('🧪 Testing comprehensive report generation');

      // Generate data from multiple sources
      const healthReport = await healthMonitor.performHealthCheck();
      const validationReport = await validationOrchestrator.executeComprehensiveValidation({
        validationDepth: 'basic',
        includeHealthMetrics: true,
        includeDependencyChecks: false,
        includeFileSystemChecks: true,
        includeBuildValidation: false,
        includeTestValidation: false,
        parallelValidation: true
      });

      const recoveryReport = await recoveryAnalytics.generateSystemReport({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      });

      // Generate comprehensive report
      const reportPath = await reportGenerator.generateComprehensiveReport(
        'comprehensive',
        {
          healthStatus: healthReport,
          validationReport: validationReport.report,
          recoveryAnalytics: recoveryReport
        },
        {
          timeframe: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000),
            end: new Date()
          },
          title: 'Integration Test Comprehensive Report',
          subtitle: 'Generated by monitoring and analytics integration tests',
          author: 'Integration Test Suite'
        }
      );

      expect(reportPath).toBeDefined();
      expect(existsSync(reportPath)).toBe(true);

      console.log(`📊 Comprehensive report generated: ${reportPath}`);

      // Verify report content by reading the file
      const reportContent = require('fs').readFileSync(reportPath, 'utf8');
      expect(reportContent).toContain('Integration Test Comprehensive Report');
      expect(reportContent).toContain('Executive Summary');
      expect(reportContent.length).toBeGreaterThan(1000); // Should be substantial content

      console.log(`✅ Report validation: Content length ${reportContent.length} characters`);
    }, 20000);

    it('should generate reports in multiple formats', async () => {
      console.log('🧪 Testing multi-format report generation');

      const healthReport = await healthMonitor.performHealthCheck();
      const timeframe = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const formats: Array<'html' | 'json' | 'markdown'> = ['html', 'json', 'markdown'];
      const reportPaths: Record<string, string> = {};

      for (const format of formats) {
        console.log(`  Generating ${format.toUpperCase()} report...`);

        const reportPath = await reportGenerator.generateComprehensiveReport(
          'executive', // Use executive template for faster generation
          {
            healthStatus: healthReport
          },
          {
            timeframe,
            title: `${format.toUpperCase()} Test Report`,
            author: 'Integration Test'
          }
        );

        expect(reportPath).toBeDefined();
        expect(existsSync(reportPath)).toBe(true);
        expect(reportPath.endsWith(`.${format}`)).toBe(true);

        reportPaths[format] = reportPath;
        console.log(`    ✅ ${format.toUpperCase()} report: ${reportPath}`);
      }

      expect(Object.keys(reportPaths)).toHaveLength(formats.length);

      // Verify JSON report structure
      const jsonContent = JSON.parse(require('fs').readFileSync(reportPaths['json'], 'utf8'));
      expect(jsonContent.title).toContain('JSON Test Report');
      expect(jsonContent.summary).toBeDefined();
      expect(jsonContent.sections).toBeDefined();
      expect(jsonContent.metadata).toBeDefined();

      console.log(`📊 Multi-format report generation completed: ${formats.length} formats`);
    }, 25000);

    it('should handle report generation performance efficiently', async () => {
      console.log('🧪 Testing report generation performance');

      const healthReport = await healthMonitor.performHealthCheck();
      const timeframe = {
        start: new Date(Date.now() - 1 * 60 * 60 * 1000), // Last hour for faster generation
        end: new Date()
      };

      const startTime = Date.now();

      const reportPath = await reportGenerator.generateComprehensiveReport(
        'executive',
        {
          healthStatus: healthReport
        },
        {
          timeframe,
          title: 'Performance Test Report',
          author: 'Performance Test'
        }
      );

      const generationTime = Date.now() - startTime;

      expect(reportPath).toBeDefined();
      expect(existsSync(reportPath)).toBe(true);
      expect(generationTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify report quality
      const reportContent = require('fs').readFileSync(reportPath, 'utf8');
      expect(reportContent.length).toBeGreaterThan(500); // Should have substantial content
      expect(reportContent).toContain('Performance Test Report');

      console.log(`⚡ Report generation performance:`);
      console.log(`  - Generation time: ${generationTime}ms`);
      console.log(`  - Report size: ${reportContent.length} characters`);
      console.log(`  - Report path: ${reportPath}`);
    }, 15000);
  });

  describe('Integration and Data Flow', () => {
    it('should demonstrate complete monitoring-to-analytics workflow', async () => {
      console.log('🧪 Testing complete monitoring-to-analytics workflow');

      // Step 1: Start monitoring
      await healthMonitor.startMonitoring();

      // Step 2: Perform health check
      const healthReport = await healthMonitor.performHealthCheck();

      // Step 3: Evaluate alerts
      const alertsTriggered = await alertManager.evaluateAlerts(healthReport);

      // Step 4: Simulate recovery operations based on health issues
      const recoveryOperations = [];

      for (const status of healthReport.moduleStatuses.slice(0, 3)) { // Test first 3 modules
        if (status.healthScore < 80) { // Recover modules with low health
          const context: RecoveryContext = {
            targetHealthScore: 85,
            maxAttempts: 2,
            timeoutMs: 8000,
            dryRun: true,
            skipBackup: true
          };

          const recoveryResult = await recoveryService.executeRecovery(status.moduleId, 'repair', context);

          // Record recovery operation
          const operationId = `workflow-test-${status.moduleId}-${Date.now()}`;
          await recoveryAnalytics.recordRecoveryOperation(
            operationId,
            status.moduleId,
            'repair',
            recoveryResult,
            context
          );

          recoveryOperations.push({
            moduleId: status.moduleId,
            operationId,
            result: recoveryResult
          });
        }
      }

      // Step 5: Generate system report
      const systemReport = await recoveryAnalytics.generateSystemReport({
        start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        end: new Date()
      });

      // Step 6: Generate comprehensive report
      const finalReportPath = await reportGenerator.generateComprehensiveReport(
        'comprehensive',
        {
          healthStatus: healthReport,
          recoveryAnalytics: systemReport
        },
        {
          timeframe: {
            start: new Date(Date.now() - 60 * 60 * 1000),
            end: new Date()
          },
          title: 'Complete Workflow Integration Report',
          author: 'Integration Test Workflow'
        }
      );

      // Step 7: Stop monitoring
      await healthMonitor.stopMonitoring();

      // Verify workflow results
      expect(healthReport).toBeDefined();
      expect(Array.isArray(alertsTriggered)).toBe(true);
      expect(recoveryOperations.length).toBeGreaterThanOrEqual(0);
      expect(systemReport).toBeDefined();
      expect(finalReportPath).toBeDefined();
      expect(existsSync(finalReportPath)).toBe(true);

      console.log(`🎯 Complete workflow results:`);
      console.log(`  - Health report generated: ✅`);
      console.log(`  - Alerts triggered: ${alertsTriggered.length}`);
      console.log(`  - Recovery operations: ${recoveryOperations.length}`);
      console.log(`  - System report generated: ✅`);
      console.log(`  - Final report generated: ✅`);
      console.log(`  - Overall health: ${healthReport.overallHealth}/100`);
      console.log(`  - Monitoring duration: workflow completed`);
    }, 45000);

    it('should maintain data consistency across all systems', async () => {
      console.log('🧪 Testing data consistency across monitoring and analytics systems');

      // Generate controlled test data
      const testModule = 'auth';
      const healthStatus = await healthMonitor.forceHealthCheck(testModule) as HealthStatus;

      // Execute recovery operation
      const context: RecoveryContext = {
        targetHealthScore: 90,
        maxAttempts: 1,
        timeoutMs: 5000,
        dryRun: true,
        skipBackup: true
      };

      const recoveryResult = await recoveryService.executeRecovery(testModule, 'repair', context);

      // Record in analytics
      const operationId = `consistency-test-${Date.now()}`;
      await recoveryAnalytics.recordRecoveryOperation(
        operationId,
        testModule,
        'repair',
        recoveryResult,
        context
      );

      // Verify data consistency
      const moduleProfile = recoveryAnalytics.getModuleProfile(testModule);
      const systemStats = recoveryAnalytics.getSystemStats();
      const alertStats = alertManager.getAlertStats();

      // Check that all systems have consistent data
      expect(healthStatus.moduleId).toBe(testModule);
      expect(recoveryResult.moduleId).toBe(testModule);

      if (moduleProfile) {
        expect(moduleProfile.moduleId).toBe(testModule);
        expect(moduleProfile.totalOperations).toBeGreaterThan(0);
      }

      expect(systemStats.totalOperations).toBeGreaterThan(0);
      expect(systemStats.modulesTracked).toBeGreaterThan(0);
      expect(typeof alertStats.total).toBe('number');

      console.log(`🔗 Data consistency verification:`);
      console.log(`  - Health status module: ${healthStatus.moduleId}`);
      console.log(`  - Recovery result module: ${recoveryResult.moduleId}`);
      console.log(`  - Analytics profile module: ${moduleProfile?.moduleId || 'N/A'}`);
      console.log(`  - System stats operations: ${systemStats.totalOperations}`);
      console.log(`  - Alert stats total: ${alertStats.total}`);
      console.log(`  - Data consistency: ✅ Verified`);
    }, 15000);
  });

  // Helper function to setup monitoring test workspace
  async function setupMonitoringTestWorkspace(): Promise<void> {
    if (existsSync(testWorkspacePath)) {
      rmSync(testWorkspacePath, { recursive: true, force: true });
    }

    mkdirSync(testWorkspacePath, { recursive: true });
    mkdirSync(join(testWorkspacePath, 'packages'), { recursive: true });

    // Create basic package structure for each module
    for (const moduleId of LEVEL_2_MODULES) {
      const modulePath = join(testWorkspacePath, 'packages', moduleId);
      mkdirSync(modulePath, { recursive: true });
      mkdirSync(join(modulePath, 'src'), { recursive: true });

      // Create package.json
      const packageJson = {
        name: `@cvplus/${moduleId}`,
        version: '1.0.0',
        main: 'src/index.ts'
      };

      require('fs').writeFileSync(
        join(modulePath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create index file
      require('fs').writeFileSync(
        join(modulePath, 'src', 'index.ts'),
        `// ${moduleId} module for monitoring test\nexport default {};\n`
      );
    }

    // Create necessary directories
    mkdirSync(join(testWorkspacePath, 'monitoring'), { recursive: true });
    mkdirSync(join(testWorkspacePath, 'analytics'), { recursive: true });
    mkdirSync(join(testWorkspacePath, 'reports'), { recursive: true });

    console.log(`🏗️ Monitoring test workspace created at: ${testWorkspacePath}`);
  }
});