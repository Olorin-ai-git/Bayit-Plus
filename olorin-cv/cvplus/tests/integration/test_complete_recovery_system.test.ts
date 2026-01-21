/**
 * Complete Recovery System Integration Tests
 * End-to-end testing of the entire CVPlus Level 2 recovery system
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';

// Import all recovery system components
import { RecoveryService } from '../../src/services/RecoveryService';
import { PhaseExecutor } from '../../src/services/PhaseExecutor';
import { WorkspaceAnalyzer } from '../../src/services/WorkspaceAnalyzer';
import { ValidationOrchestrator } from '../../src/validation/ValidationOrchestrator';
import { HealthMonitor } from '../../src/monitoring/HealthMonitor';
import { AlertManager } from '../../src/monitoring/AlertManager';
import { RecoveryAnalytics } from '../../src/analytics/RecoveryAnalytics';
import { ReportGenerator } from '../../src/analytics/ReportGenerator';

// Import recovery scripts
import { createModuleRecoveryScript } from '../../src/recovery';

// Import types
import { RecoveryContext, RecoveryResult, ModuleState } from '../../src/models';

describe('Complete Recovery System Integration', () => {
  const testWorkspacePath = join(__dirname, '../../test-workspace');
  const testPackagesPath = join(testWorkspacePath, 'packages');

  let recoveryService: RecoveryService;
  let phaseExecutor: PhaseExecutor;
  let workspaceAnalyzer: WorkspaceAnalyzer;
  let validationOrchestrator: ValidationOrchestrator;
  let healthMonitor: HealthMonitor;
  let alertManager: AlertManager;
  let recoveryAnalytics: RecoveryAnalytics;
  let reportGenerator: ReportGenerator;

  // Level 2 modules for testing
  const LEVEL_2_MODULES = [
    'auth', 'i18n', 'cv-processing', 'multimedia',
    'analytics', 'premium', 'public-profiles',
    'recommendations', 'admin', 'workflow', 'payments'
  ];

  beforeAll(async () => {
    // Setup test workspace
    await setupTestWorkspace();

    // Initialize all system components
    recoveryService = new RecoveryService(testWorkspacePath);
    phaseExecutor = new PhaseExecutor(testWorkspacePath);
    workspaceAnalyzer = new WorkspaceAnalyzer(testWorkspacePath);
    validationOrchestrator = new ValidationOrchestrator(testWorkspacePath);
    healthMonitor = new HealthMonitor(testWorkspacePath);
    alertManager = new AlertManager(testWorkspacePath);
    recoveryAnalytics = new RecoveryAnalytics(testWorkspacePath);
    reportGenerator = new ReportGenerator(testWorkspacePath);

    console.log('🧪 Integration test environment initialized');
  });

  afterAll(async () => {
    // Cleanup test workspace
    if (existsSync(testWorkspacePath)) {
      rmSync(testWorkspacePath, { recursive: true, force: true });
    }
    console.log('🧹 Integration test environment cleaned up');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Recovery Workflow', () => {
    it('should execute complete recovery workflow for all modules', async () => {
      const results: Record<string, RecoveryResult> = {};

      // Test each Level 2 module
      for (const moduleId of LEVEL_2_MODULES) {
        console.log(`🧪 Testing recovery workflow for module: ${moduleId}`);

        // 1. Analyze module state
        const moduleState = await workspaceAnalyzer.analyzeModule(moduleId);
        expect(moduleState).toBeDefined();
        expect(moduleState.moduleId).toBe(moduleId);

        // 2. Validate module before recovery
        const initialValidation = await validationOrchestrator.validateSingleModule(moduleId);
        expect(initialValidation).toBeDefined();

        // 3. Execute recovery with repair strategy
        const recoveryContext: RecoveryContext = {
          targetHealthScore: 80,
          maxAttempts: 3,
          timeoutMs: 30000,
          dryRun: false,
          skipBackup: true // Skip backup for test performance
        };

        const recoveryResult = await recoveryService.executeRecovery(
          moduleId,
          'repair',
          recoveryContext
        );

        expect(recoveryResult).toBeDefined();
        expect(recoveryResult.moduleId).toBe(moduleId);
        expect(recoveryResult.strategy).toBe('repair');
        expect(recoveryResult.phases.length).toBeGreaterThan(0);

        results[moduleId] = recoveryResult;

        // 4. Validate module after recovery
        const finalValidation = await validationOrchestrator.validateSingleModule(moduleId);
        expect(finalValidation).toBeDefined();

        // 5. Record analytics
        const operationId = `test-${moduleId}-${Date.now()}`;
        await recoveryAnalytics.recordRecoveryOperation(
          operationId,
          moduleId,
          'repair',
          recoveryResult,
          recoveryContext
        );

        console.log(`✅ Module ${moduleId} recovery workflow completed`);
      }

      // Verify all modules were processed
      expect(Object.keys(results)).toHaveLength(LEVEL_2_MODULES.length);
      console.log(`🎯 All ${LEVEL_2_MODULES.length} modules completed recovery workflow`);

    }, 120000); // 2 minute timeout for full workflow
  });

  describe('Monitoring and Alerting Integration', () => {
    it('should monitor module health and trigger alerts', async () => {
      console.log('🧪 Testing monitoring and alerting integration');

      // Setup alert listeners
      const alertsTriggered: any[] = [];
      alertManager.on('alert-created', (alert) => {
        alertsTriggered.push(alert);
      });

      // Start health monitoring
      await healthMonitor.startMonitoring();

      // Wait for initial health check
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Perform health check
      const healthReport = await healthMonitor.performHealthCheck();

      expect(healthReport).toBeDefined();
      expect(healthReport.moduleStatuses).toBeDefined();
      expect(healthReport.moduleStatuses.length).toBeGreaterThan(0);
      expect(healthReport.overallHealth).toBeGreaterThanOrEqual(0);
      expect(healthReport.overallHealth).toBeLessThanOrEqual(100);

      // Test alert evaluation
      await alertManager.evaluateAlerts(healthReport);

      // Stop monitoring
      await healthMonitor.stopMonitoring();

      console.log(`📊 Health monitoring completed - Overall health: ${healthReport.overallHealth}/100`);
      console.log(`🚨 Alerts triggered: ${alertsTriggered.length}`);

    }, 30000);

    it('should perform comprehensive validation across all modules', async () => {
      console.log('🧪 Testing comprehensive validation system');

      const validationResult = await validationOrchestrator.executeComprehensiveValidation({
        validationDepth: 'full',
        includeHealthMetrics: true,
        includeDependencyChecks: true,
        includeFileSystemChecks: true,
        includeBuildValidation: false, // Skip build for test performance
        includeTestValidation: false,  // Skip tests for test performance
        parallelValidation: true,
        skipValidationIds: [] // Don't skip any validations
      });

      expect(validationResult).toBeDefined();
      expect(validationResult.success).toBe(true);
      expect(validationResult.report).toBeDefined();
      expect(validationResult.report.summary).toBeDefined();
      expect(validationResult.report.moduleResults).toBeDefined();
      expect(validationResult.report.moduleResults.length).toBeGreaterThan(0);

      const report = validationResult.report;
      expect(report.summary.totalRules).toBeGreaterThan(0);
      expect(report.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallScore).toBeLessThanOrEqual(100);

      console.log(`✅ Validation completed - Score: ${report.summary.overallScore}/100`);
      console.log(`📊 Rules: ${report.summary.passedRules}/${report.summary.totalRules} passed`);
      console.log(`🔍 Modules validated: ${report.moduleResults.length}`);

    }, 60000);
  });

  describe('Analytics and Reporting Integration', () => {
    it('should generate comprehensive system report', async () => {
      console.log('🧪 Testing analytics and reporting integration');

      // Generate some test recovery operations first
      const operationPromises = LEVEL_2_MODULES.slice(0, 3).map(async (moduleId) => {
        const context: RecoveryContext = {
          targetHealthScore: 70,
          maxAttempts: 2,
          timeoutMs: 15000,
          dryRun: false,
          skipBackup: true
        };

        const result = await recoveryService.executeRecovery(moduleId, 'repair', context);
        const operationId = `report-test-${moduleId}-${Date.now()}`;

        await recoveryAnalytics.recordRecoveryOperation(
          operationId,
          moduleId,
          'repair',
          result,
          context
        );

        return result;
      });

      await Promise.all(operationPromises);

      // Generate system recovery report
      const timeframe = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date()
      };

      const systemReport = await recoveryAnalytics.generateSystemReport(timeframe);

      expect(systemReport).toBeDefined();
      expect(systemReport.summary).toBeDefined();
      expect(systemReport.moduleProfiles).toBeDefined();
      expect(systemReport.trends).toBeDefined();
      expect(systemReport.insights).toBeDefined();
      expect(systemReport.recommendations).toBeDefined();

      // Test report generation
      const reportPath = await reportGenerator.generateComprehensiveReport(
        'comprehensive',
        {
          recoveryAnalytics: systemReport
        },
        {
          timeframe,
          title: 'Integration Test Recovery Report',
          author: 'Integration Test Suite'
        }
      );

      expect(reportPath).toBeDefined();
      expect(existsSync(reportPath)).toBe(true);

      console.log(`📊 System report generated: ${reportPath}`);
      console.log(`📈 Operations tracked: ${systemReport.summary.totalOperations}`);
      console.log(`🎯 Success rate: ${((systemReport.summary.successfulOperations / systemReport.summary.totalOperations) * 100).toFixed(1)}%`);

    }, 45000);

    it('should provide recovery predictions and recommendations', async () => {
      console.log('🧪 Testing recovery predictions and recommendations');

      // Test predictions for each strategy
      const strategies: Array<'repair' | 'rebuild' | 'reset'> = ['repair', 'rebuild', 'reset'];
      const testModule = 'auth'; // Use auth module for prediction test

      for (const strategy of strategies) {
        const prediction = await recoveryAnalytics.predictRecoveryOutcome(testModule, strategy);

        expect(prediction).toBeDefined();
        expect(prediction.moduleId).toBe(testModule);
        expect(prediction.strategy).toBe(strategy);
        expect(prediction.predictedSuccessRate).toBeGreaterThanOrEqual(0);
        expect(prediction.predictedSuccessRate).toBeLessThanOrEqual(1);
        expect(prediction.predictedDuration).toBeGreaterThan(0);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(prediction.alternatives).toBeDefined();
        expect(prediction.alternatives.length).toBeGreaterThan(0);

        console.log(`🔮 Prediction for ${testModule} ${strategy}: ${(prediction.predictedSuccessRate * 100).toFixed(1)}% success rate`);
      }

      // Test system statistics
      const systemStats = recoveryAnalytics.getSystemStats();
      expect(systemStats).toBeDefined();
      expect(systemStats.totalOperations).toBeGreaterThanOrEqual(0);
      expect(systemStats.overallSuccessRate).toBeGreaterThanOrEqual(0);
      expect(systemStats.overallSuccessRate).toBeLessThanOrEqual(1);
      expect(systemStats.modulesTracked).toBeGreaterThanOrEqual(0);

      console.log(`📊 System stats - Operations: ${systemStats.totalOperations}, Success rate: ${(systemStats.overallSuccessRate * 100).toFixed(1)}%`);

    }, 15000);
  });

  describe('Recovery Script Integration', () => {
    it('should execute recovery scripts for all module types', async () => {
      console.log('🧪 Testing recovery scripts integration');

      const scriptResults: Record<string, any> = {};

      for (const moduleId of LEVEL_2_MODULES) {
        try {
          // Create recovery script instance
          const recoveryScript = createModuleRecoveryScript(moduleId, testWorkspacePath);

          expect(recoveryScript).toBeDefined();
          expect(recoveryScript.moduleId).toBe(moduleId);
          expect(recoveryScript.supportedStrategies).toContain('repair');

          // Test validation
          const validationResult = await recoveryScript.validateModule();
          expect(validationResult).toBeDefined();
          expect(typeof validationResult.isValid).toBe('boolean');
          expect(validationResult.healthScore).toBeGreaterThanOrEqual(0);
          expect(validationResult.healthScore).toBeLessThanOrEqual(100);

          // Test repair strategy execution
          const context: RecoveryContext = {
            targetHealthScore: 70,
            maxAttempts: 2,
            timeoutMs: 10000,
            dryRun: true, // Use dry run for script testing
            skipBackup: true
          };

          const recoveryPhases = await recoveryScript.executeRecovery('repair', context);
          expect(recoveryPhases).toBeDefined();
          expect(Array.isArray(recoveryPhases)).toBe(true);
          expect(recoveryPhases.length).toBeGreaterThan(0);

          // Verify phase structure
          recoveryPhases.forEach(phase => {
            expect(phase.phaseName).toBeDefined();
            expect(phase.status).toBeDefined();
            expect(['pending', 'in_progress', 'completed', 'failed'].includes(phase.status)).toBe(true);
            expect(phase.startTime).toBeDefined();
            expect(phase.endTime).toBeDefined();
          });

          scriptResults[moduleId] = {
            validation: validationResult,
            recovery: recoveryPhases
          };

          console.log(`✅ Recovery script test completed for ${moduleId}`);

        } catch (error) {
          console.error(`❌ Recovery script test failed for ${moduleId}:`, error);
          throw error;
        }
      }

      expect(Object.keys(scriptResults)).toHaveLength(LEVEL_2_MODULES.length);
      console.log(`🎯 All ${LEVEL_2_MODULES.length} recovery scripts tested successfully`);

    }, 90000);
  });

  describe('System Resilience and Error Handling', () => {
    it('should handle recovery failures gracefully', async () => {
      console.log('🧪 Testing system resilience and error handling');

      const testModule = 'auth';

      // Test with invalid context (should fail gracefully)
      const invalidContext: RecoveryContext = {
        targetHealthScore: 150, // Invalid score > 100
        maxAttempts: 0, // Invalid attempts
        timeoutMs: -1000, // Invalid timeout
        dryRun: false,
        skipBackup: true
      };

      try {
        const result = await recoveryService.executeRecovery(testModule, 'repair', invalidContext);

        // Should handle invalid context gracefully
        expect(result).toBeDefined();
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);

        console.log(`✅ Invalid context handled gracefully: ${result.errors.length} errors captured`);
      } catch (error) {
        // Should not throw unhandled errors
        console.error('❌ Unhandled error in recovery service:', error);
        throw error;
      }

      // Test with very short timeout (should timeout gracefully)
      const timeoutContext: RecoveryContext = {
        targetHealthScore: 80,
        maxAttempts: 3,
        timeoutMs: 1, // Very short timeout
        dryRun: false,
        skipBackup: true
      };

      const timeoutResult = await recoveryService.executeRecovery(testModule, 'repair', timeoutContext);
      expect(timeoutResult).toBeDefined();
      // May succeed or fail, but should not crash

      console.log(`✅ Timeout scenario handled: ${timeoutResult.success ? 'succeeded' : 'failed gracefully'}`);

    }, 30000);

    it('should maintain data consistency during concurrent operations', async () => {
      console.log('🧪 Testing concurrent operations and data consistency');

      const testModules = ['auth', 'i18n', 'cv-processing'];
      const concurrentPromises = testModules.map(async (moduleId, index) => {
        const context: RecoveryContext = {
          targetHealthScore: 70,
          maxAttempts: 2,
          timeoutMs: 10000,
          dryRun: true,
          skipBackup: true
        };

        // Stagger starts slightly to test concurrency
        await new Promise(resolve => setTimeout(resolve, index * 100));

        return recoveryService.executeRecovery(moduleId, 'repair', context);
      });

      const results = await Promise.allSettled(concurrentPromises);

      // All operations should complete (successfully or with handled failures)
      expect(results.length).toBe(testModules.length);

      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
          expect(result.value.moduleId).toBe(testModules[index]);
        }
      });

      console.log(`✅ Concurrent operations completed: ${results.length} modules processed simultaneously`);

    }, 30000);
  });

  describe('Performance and Scalability', () => {
    it('should complete full system validation within performance thresholds', async () => {
      console.log('🧪 Testing system performance and scalability');

      const startTime = Date.now();

      // Perform comprehensive validation
      const validationResult = await validationOrchestrator.executeComprehensiveValidation({
        validationDepth: 'basic', // Use basic for performance test
        includeHealthMetrics: true,
        includeDependencyChecks: false, // Skip for performance
        includeFileSystemChecks: true,
        includeBuildValidation: false,
        includeTestValidation: false,
        parallelValidation: true
      });

      const validationTime = Date.now() - startTime;

      expect(validationResult.success).toBe(true);
      expect(validationTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Test quick health check performance
      const healthStartTime = Date.now();
      const quickHealth = await healthMonitor.generateQuickHealthCheck();
      const healthTime = Date.now() - healthStartTime;

      expect(quickHealth).toBeDefined();
      expect(healthTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`⚡ Performance metrics:`);
      console.log(`  - Validation time: ${validationTime}ms`);
      console.log(`  - Quick health check: ${healthTime}ms`);
      console.log(`  - Overall health score: ${quickHealth.overallHealth}/100`);
      console.log(`  - Modules checked: ${Object.keys(quickHealth.moduleHealthScores).length}`);

    }, 45000);

    it('should handle large datasets efficiently', async () => {
      console.log('🧪 Testing large dataset handling efficiency');

      // Generate multiple recovery operations for analytics testing
      const operationPromises = [];
      const operationCount = 10; // Moderate number for test performance

      for (let i = 0; i < operationCount; i++) {
        const moduleId = LEVEL_2_MODULES[i % LEVEL_2_MODULES.length];
        const strategy: 'repair' | 'rebuild' | 'reset' = ['repair', 'rebuild', 'reset'][i % 3] as any;

        operationPromises.push((async () => {
          const context: RecoveryContext = {
            targetHealthScore: 60 + (i % 40), // Vary target scores
            maxAttempts: 1 + (i % 3), // Vary attempts
            timeoutMs: 5000,
            dryRun: true,
            skipBackup: true
          };

          const result = await recoveryService.executeRecovery(moduleId, strategy, context);
          const operationId = `perf-test-${i}-${Date.now()}`;

          await recoveryAnalytics.recordRecoveryOperation(
            operationId,
            moduleId,
            strategy,
            result,
            context
          );

          return result;
        })());
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(operationPromises);
      const processingTime = Date.now() - startTime;

      const successfulResults = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulResults).toBeGreaterThan(operationCount * 0.7); // At least 70% should succeed

      // Test analytics performance with the generated data
      const analyticsStartTime = Date.now();
      const systemStats = recoveryAnalytics.getSystemStats();
      const analyticsTime = Date.now() - analyticsStartTime;

      expect(systemStats.totalOperations).toBeGreaterThanOrEqual(operationCount);
      expect(analyticsTime).toBeLessThan(1000); // Analytics should be fast

      console.log(`⚡ Large dataset performance:`);
      console.log(`  - Operations processed: ${operationCount} in ${processingTime}ms`);
      console.log(`  - Success rate: ${(successfulResults / operationCount * 100).toFixed(1)}%`);
      console.log(`  - Analytics query time: ${analyticsTime}ms`);
      console.log(`  - Total tracked operations: ${systemStats.totalOperations}`);

    }, 60000);
  });

  // Helper function to setup test workspace
  async function setupTestWorkspace(): Promise<void> {
    // Create test workspace structure
    if (existsSync(testWorkspacePath)) {
      rmSync(testWorkspacePath, { recursive: true, force: true });
    }

    mkdirSync(testWorkspacePath, { recursive: true });
    mkdirSync(testPackagesPath, { recursive: true });

    // Create minimal package structure for each Level 2 module
    for (const moduleId of LEVEL_2_MODULES) {
      const modulePath = join(testPackagesPath, moduleId);
      mkdirSync(modulePath, { recursive: true });
      mkdirSync(join(modulePath, 'src'), { recursive: true });

      // Create minimal package.json
      const packageJson = {
        name: `@cvplus/${moduleId}`,
        version: '1.0.0',
        main: 'src/index.ts',
        dependencies: {},
        devDependencies: {}
      };

      require('fs').writeFileSync(
        join(modulePath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create minimal index file
      require('fs').writeFileSync(
        join(modulePath, 'src', 'index.ts'),
        `// ${moduleId} module\nexport default {};\n`
      );
    }

    // Create workspace package.json
    const workspacePackageJson = {
      name: 'cvplus-test-workspace',
      version: '1.0.0',
      workspaces: ['packages/*'],
      dependencies: {},
      devDependencies: {}
    };

    require('fs').writeFileSync(
      join(testWorkspacePath, 'package.json'),
      JSON.stringify(workspacePackageJson, null, 2)
    );

    // Create directories for monitoring, analytics, etc.
    mkdirSync(join(testWorkspacePath, 'monitoring'), { recursive: true });
    mkdirSync(join(testWorkspacePath, 'analytics'), { recursive: true });
    mkdirSync(join(testWorkspacePath, 'reports'), { recursive: true });

    console.log(`🏗️ Test workspace created at: ${testWorkspacePath}`);
  }
});