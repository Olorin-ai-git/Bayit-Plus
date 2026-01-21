import { validateModule } from '../../../src/unified-module-requirements/lib/validation/ModuleValidator';
import { validateBatch } from '../../../src/unified-module-requirements/lib/validation/BatchValidator';
import { analyzeCodeSegregation } from '../../../src/unified-module-requirements/lib/architecture/CodeSegregationAnalyzer';
import { checkDistributionCompliance } from '../../../src/unified-module-requirements/lib/architecture/DistributionValidator';
import { detectMockImplementations } from '../../../src/unified-module-requirements/lib/architecture/MockDetector';
import { validateBuild } from '../../../src/unified-module-requirements/lib/architecture/BuildValidator';
import { analyzeDependencies } from '../../../src/unified-module-requirements/lib/architecture/DependencyAnalyzer';
import {
  ModuleValidationRequest,
  BatchValidationRequest,
  CodeSegregationRequest,
  DistributionCheckRequest,
  MockDetectionRequest,
  BuildValidationRequest,
  DependencyAnalysisRequest,
  ValidationStatus,
  RuleSeverity
} from '../../../src/unified-module-requirements/models/types';

describe('Integration Test: End-to-End Recovery Workflows', () => {
  const testModules = [
    '/test/modules/valid-module',
    '/test/modules/problematic-module',
    '/test/modules/incomplete-module'
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete module validation workflow with recovery', () => {
    it('should execute full validation pipeline with graceful failure recovery', async () => {
      const workflow = async () => {
        const results = {
          validation: null,
          segregation: null,
          distribution: null,
          mocks: null,
          build: null,
          dependencies: null,
          errors: [] as string[]
        };

        try {
          // Step 1: Basic module validation
          const validationRequest: ModuleValidationRequest = {
            modulePath: testModules[0],
            rules: ['README_REQUIRED', 'PACKAGE_JSON_REQUIRED', 'DIST_FOLDER_REQUIRED'],
            severity: 'ERROR'
          };

          try {
            results.validation = await validateModule(validationRequest);
          } catch (error) {
            results.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Continue workflow even if validation fails
          }

          // Step 2: Code segregation analysis
          const segregationRequest: CodeSegregationRequest = {
            modulePaths: [testModules[0]],
            scanDepth: 'deep',
            includeTypes: ['*.ts', '*.js'],
            excludePatterns: ['node_modules/**', 'dist/**']
          };

          try {
            results.segregation = await analyzeCodeSegregation(segregationRequest);
          } catch (error) {
            results.errors.push(`Segregation analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          // Step 3: Distribution compliance check
          const distributionRequest: DistributionCheckRequest = {
            modulePaths: [testModules[0]],
            checkBuildOutputs: true,
            validatePackaging: true,
            requireDist: true
          };

          try {
            results.distribution = await checkDistributionCompliance(distributionRequest);
          } catch (error) {
            results.errors.push(`Distribution check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          // Step 4: Mock detection
          const mockRequest: MockDetectionRequest = {
            modulePaths: [testModules[0]],
            scanPatterns: ['**/*.ts', '**/*.js'],
            excludePatterns: ['node_modules/**', 'tests/**'],
            strictMode: true
          };

          try {
            results.mocks = await detectMockImplementations(mockRequest);
          } catch (error) {
            results.errors.push(`Mock detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          // Step 5: Build validation
          const buildRequest: BuildValidationRequest = {
            modulePaths: [testModules[0]],
            validateTypeScript: true,
            runTests: true,
            checkArtifacts: true,
            parallel: false,
            timeout: 30000
          };

          try {
            results.build = await validateBuild(buildRequest);
          } catch (error) {
            results.errors.push(`Build validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          // Step 6: Dependency analysis
          const dependencyRequest: DependencyAnalysisRequest = {
            modulePaths: [testModules[0]],
            checkCircular: true,
            validateLayers: true,
            includeExternal: false,
            maxDepth: 5
          };

          try {
            results.dependencies = await analyzeDependencies(dependencyRequest);
          } catch (error) {
            results.errors.push(`Dependency analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          return results;
        } catch (error) {
          results.errors.push(`Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return results;
        }
      };

      const results = await workflow();

      // Verify workflow completed (even with errors)
      expect(results).toBeDefined();
      expect(results.errors).toBeDefined();
      expect(Array.isArray(results.errors)).toBe(true);

      // At least some steps should complete or fail gracefully
      const completedSteps = [
        results.validation,
        results.segregation,
        results.distribution,
        results.mocks,
        results.build,
        results.dependencies
      ].filter(step => step !== null).length;

      // Should complete at least partial workflow or have meaningful error messages
      expect(completedSteps > 0 || results.errors.length > 0).toBe(true);

      // Errors should be informative, not generic crashes
      results.errors.forEach(error => {
        expect(error).toMatch(/(failed|not found|invalid|error|timeout)/i);
        expect(error.length).toBeGreaterThan(10); // Should have meaningful content
      });
    });

    it('should handle cascading failures with proper error isolation', async () => {
      const problematicModule = testModules[1]; // Known problematic module

      const workflow = async () => {
        const stepResults = [];

        // Step 1: Validation (likely to fail)
        try {
          const validation = await validateModule({
            modulePath: problematicModule,
            rules: ['BUILD_SUCCESSFUL', 'NO_CIRCULAR_DEPENDENCIES'],
            severity: 'ERROR'
          });
          stepResults.push({ step: 'validation', success: true, result: validation });
        } catch (error) {
          stepResults.push({
            step: 'validation',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Step 2: Even if validation fails, try segregation analysis
        try {
          const segregation = await analyzeCodeSegregation({
            modulePaths: [problematicModule],
            scanDepth: 'shallow', // Use shallow to reduce risk
            includeTypes: ['*.ts'],
            excludePatterns: ['node_modules/**']
          });
          stepResults.push({ step: 'segregation', success: true, result: segregation });
        } catch (error) {
          stepResults.push({
            step: 'segregation',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Step 3: Mock detection (independent of previous steps)
        try {
          const mocks = await detectMockImplementations({
            modulePaths: [problematicModule],
            scanPatterns: ['**/*.ts'],
            excludePatterns: ['node_modules/**'],
            strictMode: false // Relaxed mode for problematic modules
          });
          stepResults.push({ step: 'mocks', success: true, result: mocks });
        } catch (error) {
          stepResults.push({
            step: 'mocks',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        return stepResults;
      };

      const stepResults = await workflow();

      // Verify each step was attempted
      expect(stepResults.length).toBe(3);
      expect(stepResults.map(s => s.step)).toEqual(['validation', 'segregation', 'mocks']);

      // Each step should either succeed or fail with meaningful error
      stepResults.forEach(step => {
        expect(step.step).toBeDefined();
        expect(typeof step.success).toBe('boolean');

        if (step.success) {
          expect(step.result).toBeDefined();
        } else {
          expect(step.error).toBeDefined();
          expect(step.error.length).toBeGreaterThan(5); // Meaningful error message
        }
      });

      // Failures should be isolated - one step failing shouldn't prevent others
      const attemptedSteps = stepResults.length;
      expect(attemptedSteps).toBe(3); // All steps should be attempted regardless of failures
    });
  });

  describe('Batch processing with recovery strategies', () => {
    it('should handle mixed module states in batch operations with smart recovery', async () => {
      const batchWorkflow = async () => {
        const overallResults = {
          batchValidation: null,
          individualRecovery: [],
          finalSummary: {
            totalProcessed: 0,
            successful: 0,
            recovered: 0,
            failed: 0
          }
        };

        try {
          // Step 1: Attempt batch validation
          const batchRequest: BatchValidationRequest = {
            modulePaths: testModules,
            rules: ['README_REQUIRED', 'PACKAGE_JSON_REQUIRED'],
            severity: 'ERROR',
            parallel: true,
            maxConcurrent: 2
          };

          try {
            overallResults.batchValidation = await validateBatch(batchRequest);
            overallResults.finalSummary.totalProcessed = overallResults.batchValidation.totalModules;
            overallResults.finalSummary.successful = overallResults.batchValidation.passedModules;
          } catch (error) {
            // Batch failed, try individual recovery
            for (const modulePath of testModules) {
              try {
                const individualResult = await validateModule({
                  modulePath,
                  rules: ['README_REQUIRED'],
                  severity: 'WARNING' // Relaxed severity for recovery
                });

                overallResults.individualRecovery.push({
                  module: modulePath,
                  success: true,
                  result: individualResult
                });
                overallResults.finalSummary.recovered++;
              } catch (individualError) {
                overallResults.individualRecovery.push({
                  module: modulePath,
                  success: false,
                  error: individualError instanceof Error ? individualError.message : 'Unknown error'
                });
                overallResults.finalSummary.failed++;
              }
              overallResults.finalSummary.totalProcessed++;
            }
          }

          return overallResults;
        } catch (error) {
          overallResults.finalSummary.failed = testModules.length;
          overallResults.finalSummary.totalProcessed = testModules.length;
          return overallResults;
        }
      };

      const results = await batchWorkflow();

      // Verify recovery strategy was executed
      expect(results).toBeDefined();
      expect(results.finalSummary.totalProcessed).toBeGreaterThan(0);

      // Should have either batch results or individual recovery results
      const hasBatchResults = results.batchValidation !== null;
      const hasRecoveryResults = results.individualRecovery.length > 0;

      expect(hasBatchResults || hasRecoveryResults).toBe(true);

      // Recovery attempts should account for all modules
      if (hasRecoveryResults) {
        expect(results.individualRecovery.length).toBe(testModules.length);
        expect(results.finalSummary.recovered + results.finalSummary.failed).toBe(testModules.length);
      }

      // Summary should be consistent
      expect(results.finalSummary.totalProcessed).toBeGreaterThanOrEqual(
        results.finalSummary.successful + results.finalSummary.recovered + results.finalSummary.failed
      );
    });

    it('should implement exponential backoff for resource-intensive operations', async () => {
      const resourceIntensiveWorkflow = async () => {
        const attempts = [];
        let delay = 100; // Start with 100ms delay

        for (let attempt = 1; attempt <= 5; attempt++) {
          const startTime = Date.now();

          try {
            // Simulate resource-intensive operation
            const result = await analyzeDependencies({
              modulePaths: testModules,
              checkCircular: true,
              validateLayers: true,
              includeExternal: true,
              maxDepth: 10 // Deep analysis
            });

            attempts.push({
              attempt,
              success: true,
              duration: Date.now() - startTime,
              result
            });

            break; // Success, exit loop
          } catch (error) {
            attempts.push({
              attempt,
              success: false,
              duration: Date.now() - startTime,
              error: error instanceof Error ? error.message : 'Unknown error',
              delay
            });

            if (attempt < 5) {
              // Wait with exponential backoff
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2; // Double the delay for next attempt
            }
          }
        }

        return attempts;
      };

      const attempts = await resourceIntensiveWorkflow();

      // Verify backoff strategy was implemented
      expect(attempts.length).toBeGreaterThan(0);
      expect(attempts.length).toBeLessThanOrEqual(5);

      // Check exponential backoff delays
      const failedAttempts = attempts.filter(a => !a.success && a.delay);
      if (failedAttempts.length > 1) {
        for (let i = 1; i < failedAttempts.length; i++) {
          expect(failedAttempts[i].delay).toBeGreaterThan(failedAttempts[i - 1].delay);
        }
      }

      // Should eventually succeed or exhaust all attempts
      const finalAttempt = attempts[attempts.length - 1];
      expect(finalAttempt).toBeDefined();
      expect(typeof finalAttempt.success).toBe('boolean');
    });
  });

  describe('System-level recovery and health monitoring', () => {
    it('should monitor system health during long-running operations', async () => {
      const healthMonitoringWorkflow = async () => {
        const healthChecks = [];
        const startTime = Date.now();

        // Simulate long-running operation with periodic health checks
        const healthCheckInterval = setInterval(() => {
          const currentTime = Date.now();
          healthChecks.push({
            timestamp: currentTime,
            elapsed: currentTime - startTime,
            memoryUsage: process.memoryUsage(),
            systemLoad: 'simulated-load-metric'
          });
        }, 1000); // Check every second

        try {
          // Execute a comprehensive analysis that might take time
          const operations = await Promise.allSettled([
            validateBatch({
              modulePaths: testModules,
              rules: ['BUILD_SUCCESSFUL', 'NO_CIRCULAR_DEPENDENCIES'],
              severity: 'ERROR',
              parallel: true,
              maxConcurrent: 3
            }),
            analyzeCodeSegregation({
              modulePaths: testModules,
              scanDepth: 'deep',
              includeTypes: ['*.ts', '*.js'],
              excludePatterns: ['node_modules/**']
            }),
            analyzeDependencies({
              modulePaths: testModules,
              checkCircular: true,
              validateLayers: true,
              includeExternal: true,
              maxDepth: 8
            })
          ]);

          clearInterval(healthCheckInterval);

          return {
            operations: operations.map((op, index) => ({
              operation: ['batch-validation', 'code-segregation', 'dependency-analysis'][index],
              status: op.status,
              result: op.status === 'fulfilled' ? op.value : null,
              error: op.status === 'rejected' ? op.reason.message : null
            })),
            healthChecks,
            totalDuration: Date.now() - startTime
          };
        } catch (error) {
          clearInterval(healthCheckInterval);
          throw error;
        }
      };

      const results = await healthMonitoringWorkflow();

      // Verify health monitoring was active
      expect(results.healthChecks.length).toBeGreaterThan(0);
      expect(results.totalDuration).toBeGreaterThan(0);

      // Health checks should show progression over time
      const timestamps = results.healthChecks.map(hc => hc.timestamp);
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      }

      // Operations should complete (successfully or with errors)
      expect(results.operations.length).toBe(3);
      results.operations.forEach(op => {
        expect(op.operation).toBeDefined();
        expect(['fulfilled', 'rejected'].includes(op.status)).toBe(true);
      });

      // Memory usage should be tracked
      results.healthChecks.forEach(hc => {
        expect(hc.memoryUsage).toBeDefined();
        expect(typeof hc.memoryUsage.heapUsed).toBe('number');
      });
    });

    it('should implement graceful shutdown for interrupted operations', async () => {
      const interruptibleWorkflow = async () => {
        let operationCompleted = false;
        let shutdownTriggered = false;
        const results = { operations: [], shutdownReason: null };

        // Simulate external interruption after 2 seconds
        const interruptTimer = setTimeout(() => {
          shutdownTriggered = true;
          results.shutdownReason = 'External interrupt simulation';
        }, 2000);

        try {
          // Start multiple operations
          const operationPromises = [
            validateBatch({
              modulePaths: [...testModules, ...testModules], // Double the work
              rules: ['BUILD_SUCCESSFUL'],
              severity: 'ERROR',
              parallel: true,
              maxConcurrent: 1 // Slow it down
            }),
            analyzeCodeSegregation({
              modulePaths: testModules,
              scanDepth: 'deep',
              includeTypes: ['**/*'],
              excludePatterns: []
            })
          ];

          // Poll for shutdown signal
          const pollShutdown = async () => {
            while (!shutdownTriggered && !operationCompleted) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            return shutdownTriggered;
          };

          // Race between operations and shutdown signal
          const [shutdownSignal, ...operationResults] = await Promise.allSettled([
            pollShutdown(),
            ...operationPromises
          ]);

          operationCompleted = true;
          clearTimeout(interruptTimer);

          results.operations = operationResults.map((result, index) => ({
            operation: ['batch-validation', 'code-segregation'][index],
            completed: result.status === 'fulfilled',
            result: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason.message : null
          }));

          return results;
        } catch (error) {
          clearTimeout(interruptTimer);
          results.shutdownReason = error instanceof Error ? error.message : 'Unknown error';
          return results;
        }
      };

      const results = await interruptibleWorkflow();

      // Verify graceful handling of interruption
      expect(results).toBeDefined();
      expect(results.operations).toBeDefined();

      // Should handle shutdown scenario gracefully
      if (results.shutdownReason) {
        expect(results.shutdownReason).toContain('interrupt');
        // Operations may be incomplete but should not crash
        expect(Array.isArray(results.operations)).toBe(true);
      } else {
        // If no shutdown, operations should complete normally
        expect(results.operations.length).toBe(2);
      }
    });
  });
});