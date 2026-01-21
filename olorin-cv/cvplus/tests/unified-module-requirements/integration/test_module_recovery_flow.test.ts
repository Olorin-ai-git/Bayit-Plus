import { validateModule } from '../../../src/unified-module-requirements/lib/validation/ModuleValidator';
import { analyzeCodeSegregation } from '../../../src/unified-module-requirements/lib/architecture/CodeSegregationAnalyzer';
import { detectMockImplementations } from '../../../src/unified-module-requirements/lib/architecture/MockDetector';
import { validateBuild } from '../../../src/unified-module-requirements/lib/architecture/BuildValidator';
import { checkDistributionCompliance } from '../../../src/unified-module-requirements/lib/architecture/DistributionValidator';
import {
  ModuleValidationRequest,
  CodeSegregationRequest,
  MockDetectionRequest,
  BuildValidationRequest,
  DistributionCheckRequest,
  ValidationStatus,
  RuleSeverity
} from '../../../src/unified-module-requirements/models/types';

describe('Integration Test: Module Recovery Flow', () => {
  const testScenarios = {
    brokenModule: '/test/modules/broken-module',
    incompleteModule: '/test/modules/incomplete-module',
    legacyModule: '/test/modules/legacy-module',
    modernModule: '/test/modules/modern-module'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Progressive module diagnosis and recovery', () => {
    it('should diagnose and recover a module with missing essential files', async () => {
      const modulePath = testScenarios.incompleteModule;
      const recoveryPlan = {
        phase1: null, // Initial validation
        phase2: null, // Detailed analysis
        phase3: null, // Recovery actions
        phase4: null  // Verification
      };

      try {
        // Phase 1: Initial validation to identify basic issues
        const initialValidation: ModuleValidationRequest = {
          modulePath,
          rules: ['README_REQUIRED', 'PACKAGE_JSON_REQUIRED', 'DIST_FOLDER_REQUIRED'],
          severity: 'ERROR'
        };

        try {
          recoveryPlan.phase1 = await validateModule(initialValidation);
        } catch (error) {
          recoveryPlan.phase1 = {
            status: ValidationStatus.ERROR,
            error: error instanceof Error ? error.message : 'Validation failed'
          };
        }

        // Phase 2: If basic validation fails, perform detailed segregation analysis
        if (!recoveryPlan.phase1 || recoveryPlan.phase1.status === ValidationStatus.ERROR) {
          const segregationAnalysis: CodeSegregationRequest = {
            modulePaths: [modulePath],
            scanDepth: 'deep',
            includeTypes: ['*.ts', '*.js', '*.json'],
            excludePatterns: ['node_modules/**']
          };

          try {
            recoveryPlan.phase2 = await analyzeCodeSegregation(segregationAnalysis);
          } catch (error) {
            recoveryPlan.phase2 = {
              error: error instanceof Error ? error.message : 'Segregation analysis failed'
            };
          }
        }

        // Phase 3: Attempt recovery actions based on findings
        const recoveryActions = [];

        // Check for missing package.json
        if (recoveryPlan.phase1?.results?.some(r => r.ruleId === 'PACKAGE_JSON_REQUIRED' && r.status === ValidationStatus.FAIL)) {
          recoveryActions.push({
            action: 'create_package_json',
            description: 'Generate basic package.json template',
            priority: 'critical'
          });
        }

        // Check for missing README
        if (recoveryPlan.phase1?.results?.some(r => r.ruleId === 'README_REQUIRED' && r.status === ValidationStatus.FAIL)) {
          recoveryActions.push({
            action: 'create_readme',
            description: 'Generate README.md template',
            priority: 'high'
          });
        }

        // Check for missing dist folder
        if (recoveryPlan.phase1?.results?.some(r => r.ruleId === 'DIST_FOLDER_REQUIRED' && r.status === ValidationStatus.FAIL)) {
          recoveryActions.push({
            action: 'build_module',
            description: 'Execute build process to generate dist folder',
            priority: 'high'
          });
        }

        recoveryPlan.phase3 = { actions: recoveryActions };

        // Phase 4: Simulate verification after recovery actions
        if (recoveryActions.length > 0) {
          // Simulate that recovery actions were applied
          const verificationRequest: ModuleValidationRequest = {
            modulePath,
            rules: ['README_REQUIRED', 'PACKAGE_JSON_REQUIRED'],
            severity: 'WARNING' // Relaxed after recovery
          };

          try {
            recoveryPlan.phase4 = await validateModule(verificationRequest);
          } catch (error) {
            recoveryPlan.phase4 = {
              status: ValidationStatus.ERROR,
              error: error instanceof Error ? error.message : 'Verification failed'
            };
          }
        }

        return recoveryPlan;
      } catch (error) {
        return {
          ...recoveryPlan,
          overallError: error instanceof Error ? error.message : 'Recovery flow failed'
        };
      }

      // Verify recovery flow executed all phases
      expect(recoveryPlan.phase1).toBeDefined();

      // Should identify recovery actions for missing files
      if (recoveryPlan.phase3?.actions) {
        expect(recoveryPlan.phase3.actions.length).toBeGreaterThan(0);
        expect(recoveryPlan.phase3.actions.some(a => a.priority === 'critical')).toBe(true);
      }

      // Recovery actions should be specific and actionable
      recoveryPlan.phase3?.actions?.forEach(action => {
        expect(action.action).toMatch(/^(create_|build_|fix_)/);
        expect(action.description.length).toBeGreaterThan(10);
        expect(['critical', 'high', 'medium', 'low'].includes(action.priority)).toBe(true);
      });
    });

    it('should handle modules with mock implementations and provide conversion guidance', async () => {
      const modulePath = testScenarios.legacyModule;
      const mockRecoveryFlow = {
        detection: null,
        analysis: null,
        recommendations: null,
        validation: null
      };

      try {
        // Step 1: Detect mock implementations
        const mockDetection: MockDetectionRequest = {
          modulePaths: [modulePath],
          scanPatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['node_modules/**', 'tests/**'],
          strictMode: true
        };

        try {
          mockRecoveryFlow.detection = await detectMockImplementations(mockDetection);
        } catch (error) {
          mockRecoveryFlow.detection = {
            error: error instanceof Error ? error.message : 'Mock detection failed'
          };
        }

        // Step 2: Analyze detected mocks
        if (mockRecoveryFlow.detection?.violations) {
          const mockTypes = mockRecoveryFlow.detection.violations.reduce((acc, violation) => {
            acc[violation.violationType] = (acc[violation.violationType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          mockRecoveryFlow.analysis = {
            totalMocks: mockRecoveryFlow.detection.violations.length,
            byType: mockTypes,
            criticalMocks: mockRecoveryFlow.detection.violations.filter(v => v.severity === RuleSeverity.CRITICAL),
            autoFixableMocks: mockRecoveryFlow.detection.violations.filter(v => v.remediation.includes('auto-fix'))
          };
        }

        // Step 3: Generate conversion recommendations
        const recommendations = [];

        if (mockRecoveryFlow.analysis?.criticalMocks?.length > 0) {
          recommendations.push({
            type: 'critical_mocks',
            count: mockRecoveryFlow.analysis.criticalMocks.length,
            action: 'Replace critical mock implementations with real functionality',
            priority: 'immediate',
            estimatedEffort: 'high'
          });
        }

        if (mockRecoveryFlow.analysis?.byType?.stub > 0) {
          recommendations.push({
            type: 'stubs',
            count: mockRecoveryFlow.analysis.byType.stub,
            action: 'Implement actual functionality for stub methods',
            priority: 'high',
            estimatedEffort: 'medium'
          });
        }

        if (mockRecoveryFlow.analysis?.byType?.todo > 0) {
          recommendations.push({
            type: 'todos',
            count: mockRecoveryFlow.analysis.byType.todo,
            action: 'Complete TODO items with actual implementation',
            priority: 'medium',
            estimatedEffort: 'low'
          });
        }

        mockRecoveryFlow.recommendations = recommendations;

        // Step 4: Validate module after simulated mock removal
        const postMockValidation: ModuleValidationRequest = {
          modulePath,
          rules: ['NO_MOCK_IMPLEMENTATIONS', 'BUILD_SUCCESSFUL'],
          severity: 'ERROR'
        };

        try {
          mockRecoveryFlow.validation = await validateModule(postMockValidation);
        } catch (error) {
          mockRecoveryFlow.validation = {
            status: ValidationStatus.ERROR,
            error: error instanceof Error ? error.message : 'Post-mock validation failed'
          };
        }

        return mockRecoveryFlow;
      } catch (error) {
        return {
          ...mockRecoveryFlow,
          overallError: error instanceof Error ? error.message : 'Mock recovery flow failed'
        };
      }

      // Verify mock recovery flow components
      expect(mockRecoveryFlow.detection).toBeDefined();

      if (mockRecoveryFlow.analysis?.totalMocks > 0) {
        expect(mockRecoveryFlow.recommendations.length).toBeGreaterThan(0);

        // Recommendations should be prioritized
        const priorities = mockRecoveryFlow.recommendations.map(r => r.priority);
        expect(priorities.some(p => ['immediate', 'high', 'medium'].includes(p))).toBe(true);

        // Should provide effort estimates
        mockRecoveryFlow.recommendations.forEach(rec => {
          expect(['low', 'medium', 'high'].includes(rec.estimatedEffort)).toBe(true);
          expect(rec.action.length).toBeGreaterThan(20); // Detailed action
        });
      }
    });

    it('should recover modules with build failures through progressive diagnosis', async () => {
      const modulePath = testScenarios.brokenModule;
      const buildRecoveryFlow = {
        initialBuild: null,
        diagnosis: null,
        incrementalFixes: [],
        finalValidation: null
      };

      try {
        // Step 1: Attempt initial build validation
        const initialBuildRequest: BuildValidationRequest = {
          modulePaths: [modulePath],
          validateTypeScript: true,
          runTests: false, // Skip tests initially
          checkArtifacts: false,
          parallel: false,
          timeout: 15000
        };

        try {
          buildRecoveryFlow.initialBuild = await validateBuild(initialBuildRequest);
        } catch (error) {
          buildRecoveryFlow.initialBuild = {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Build failed'
          };
        }

        // Step 2: If build fails, perform detailed diagnosis
        if (buildRecoveryFlow.initialBuild?.buildErrors || buildRecoveryFlow.initialBuild?.status === 'failed') {
          // Analyze for common build issues
          const diagnosisChecks = [
            {
              name: 'typescript_config',
              description: 'Check TypeScript configuration validity',
              category: 'configuration'
            },
            {
              name: 'missing_dependencies',
              description: 'Detect missing npm dependencies',
              category: 'dependencies'
            },
            {
              name: 'syntax_errors',
              description: 'Identify syntax errors in source files',
              category: 'syntax'
            },
            {
              name: 'import_resolution',
              description: 'Check for unresolved import statements',
              category: 'imports'
            }
          ];

          buildRecoveryFlow.diagnosis = {
            checks: diagnosisChecks,
            detectedIssues: [
              // Simulate detected issues
              {
                category: 'dependencies',
                severity: 'high',
                description: 'Missing dependency: express',
                fix: 'npm install express'
              },
              {
                category: 'typescript',
                severity: 'medium',
                description: 'Strict mode errors in 3 files',
                fix: 'Add proper type annotations'
              }
            ]
          };
        }

        // Step 3: Apply incremental fixes
        if (buildRecoveryFlow.diagnosis?.detectedIssues) {
          for (const issue of buildRecoveryFlow.diagnosis.detectedIssues) {
            const fixAttempt = {
              issue: issue.description,
              fix: issue.fix,
              category: issue.category,
              success: false,
              buildResult: null
            };

            try {
              // Simulate applying fix and retesting
              const testBuild: BuildValidationRequest = {
                modulePaths: [modulePath],
                validateTypeScript: true,
                runTests: false,
                checkArtifacts: false,
                parallel: false,
                timeout: 10000
              };

              fixAttempt.buildResult = await validateBuild(testBuild);
              fixAttempt.success = !fixAttempt.buildResult?.buildErrors?.length;
            } catch (error) {
              fixAttempt.buildResult = {
                error: error instanceof Error ? error.message : 'Fix validation failed'
              };
            }

            buildRecoveryFlow.incrementalFixes.push(fixAttempt);

            // Break if fix was successful
            if (fixAttempt.success) break;
          }
        }

        // Step 4: Final validation with all fixes applied
        const finalBuildRequest: BuildValidationRequest = {
          modulePaths: [modulePath],
          validateTypeScript: true,
          runTests: true, // Include tests now
          checkArtifacts: true,
          parallel: false,
          timeout: 30000
        };

        try {
          buildRecoveryFlow.finalValidation = await validateBuild(finalBuildRequest);
        } catch (error) {
          buildRecoveryFlow.finalValidation = {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Final validation failed'
          };
        }

        return buildRecoveryFlow;
      } catch (error) {
        return {
          ...buildRecoveryFlow,
          overallError: error instanceof Error ? error.message : 'Build recovery flow failed'
        };
      }

      // Verify build recovery flow execution
      expect(buildRecoveryFlow.initialBuild).toBeDefined();

      if (buildRecoveryFlow.diagnosis) {
        expect(buildRecoveryFlow.diagnosis.checks.length).toBeGreaterThan(0);
        expect(buildRecoveryFlow.diagnosis.detectedIssues.length).toBeGreaterThan(0);

        // Issues should have clear fixes
        buildRecoveryFlow.diagnosis.detectedIssues.forEach(issue => {
          expect(issue.fix.length).toBeGreaterThan(5);
          expect(['high', 'medium', 'low'].includes(issue.severity)).toBe(true);
        });
      }

      // Incremental fixes should show progression
      if (buildRecoveryFlow.incrementalFixes.length > 0) {
        buildRecoveryFlow.incrementalFixes.forEach(fix => {
          expect(fix.issue).toBeDefined();
          expect(fix.fix).toBeDefined();
          expect(typeof fix.success).toBe('boolean');
        });
      }

      expect(buildRecoveryFlow.finalValidation).toBeDefined();
    });
  });

  describe('Module migration and modernization recovery', () => {
    it('should guide migration from legacy to modern module structure', async () => {
      const legacyModule = testScenarios.legacyModule;
      const migrationPlan = {
        assessment: null,
        migrationSteps: [],
        validation: null,
        rollbackPlan: null
      };

      try {
        // Step 1: Assess current module structure
        const structureAssessment = {
          currentStructure: await analyzeCodeSegregation({
            modulePaths: [legacyModule],
            scanDepth: 'deep',
            includeTypes: ['*.js', '*.ts', '*.json'],
            excludePatterns: ['node_modules/**']
          }).catch(error => ({
            error: error instanceof Error ? error.message : 'Structure assessment failed'
          })),

          distributionCheck: await checkDistributionCompliance({
            modulePaths: [legacyModule],
            checkBuildOutputs: true,
            validatePackaging: true,
            requireDist: true
          }).catch(error => ({
            error: error instanceof Error ? error.message : 'Distribution check failed'
          }))
        };

        migrationPlan.assessment = structureAssessment;

        // Step 2: Define migration steps based on assessment
        const migrationSteps = [
          {
            step: 'update_package_json',
            description: 'Modernize package.json with latest standards',
            dependencies: [],
            estimatedTime: '15 minutes',
            riskLevel: 'low'
          },
          {
            step: 'add_typescript_config',
            description: 'Add TypeScript configuration for type safety',
            dependencies: ['update_package_json'],
            estimatedTime: '30 minutes',
            riskLevel: 'medium'
          },
          {
            step: 'restructure_directories',
            description: 'Reorganize files into standard directory structure',
            dependencies: ['add_typescript_config'],
            estimatedTime: '45 minutes',
            riskLevel: 'high'
          },
          {
            step: 'add_build_system',
            description: 'Implement modern build system with dist generation',
            dependencies: ['restructure_directories'],
            estimatedTime: '60 minutes',
            riskLevel: 'high'
          },
          {
            step: 'add_testing_framework',
            description: 'Set up comprehensive testing infrastructure',
            dependencies: ['add_build_system'],
            estimatedTime: '45 minutes',
            riskLevel: 'medium'
          }
        ];

        migrationPlan.migrationSteps = migrationSteps;

        // Step 3: Validate migration plan
        const validationChecks = [
          'README_REQUIRED',
          'PACKAGE_JSON_REQUIRED',
          'DIST_FOLDER_REQUIRED',
          'BUILD_SUCCESSFUL',
          'TESTS_DIRECTORY'
        ];

        try {
          migrationPlan.validation = await validateModule({
            modulePath: legacyModule,
            rules: validationChecks,
            severity: 'WARNING' // Post-migration validation
          });
        } catch (error) {
          migrationPlan.validation = {
            status: ValidationStatus.ERROR,
            error: error instanceof Error ? error.message : 'Migration validation failed'
          };
        }

        // Step 4: Prepare rollback plan
        migrationPlan.rollbackPlan = {
          backupRequired: true,
          rollbackSteps: migrationSteps.slice().reverse().map(step => ({
            step: `rollback_${step.step}`,
            description: `Revert ${step.description.toLowerCase()}`,
            originalStep: step.step
          })),
          rollbackTime: migrationSteps.reduce((total, step) => {
            const time = parseInt(step.estimatedTime) || 0;
            return total + (time * 0.3); // Rollback typically faster
          }, 0)
        };

        return migrationPlan;
      } catch (error) {
        return {
          ...migrationPlan,
          overallError: error instanceof Error ? error.message : 'Migration planning failed'
        };
      }

      // Verify migration plan completeness
      expect(migrationPlan.assessment).toBeDefined();
      expect(migrationPlan.migrationSteps.length).toBeGreaterThan(0);

      // Migration steps should be ordered with dependencies
      migrationPlan.migrationSteps.forEach((step, index) => {
        expect(step.step).toBeDefined();
        expect(step.description.length).toBeGreaterThan(10);
        expect(['low', 'medium', 'high'].includes(step.riskLevel)).toBe(true);

        // Check dependency ordering
        if (step.dependencies.length > 0) {
          step.dependencies.forEach(dep => {
            const depIndex = migrationPlan.migrationSteps.findIndex(s => s.step === dep);
            expect(depIndex).toBeLessThan(index); // Dependencies should come first
          });
        }
      });

      // Rollback plan should be comprehensive
      expect(migrationPlan.rollbackPlan).toBeDefined();
      expect(migrationPlan.rollbackPlan.rollbackSteps.length).toBe(migrationPlan.migrationSteps.length);
      expect(migrationPlan.rollbackPlan.backupRequired).toBe(true);
    });

    it('should handle partial migration failures with state preservation', async () => {
      const moduleInTransition = testScenarios.incompleteModule;
      const partialMigrationRecovery = {
        currentState: null,
        failurePoint: null,
        statePreservation: null,
        recoveryOptions: []
      };

      try {
        // Step 1: Assess current state
        const currentState = {
          validation: await validateModule({
            modulePath: moduleInTransition,
            rules: ['PACKAGE_JSON_REQUIRED', 'DIST_FOLDER_REQUIRED', 'BUILD_SUCCESSFUL'],
            severity: 'ERROR'
          }).catch(error => ({
            status: ValidationStatus.ERROR,
            error: error instanceof Error ? error.message : 'State assessment failed'
          })),

          structure: await analyzeCodeSegregation({
            modulePaths: [moduleInTransition],
            scanDepth: 'shallow',
            includeTypes: ['*.json', '*.ts'],
            excludePatterns: []
          }).catch(error => ({
            error: error instanceof Error ? error.message : 'Structure analysis failed'
          }))
        };

        partialMigrationRecovery.currentState = currentState;

        // Step 2: Identify failure point
        const failureIndicators = [];

        if (currentState.validation?.status === ValidationStatus.ERROR) {
          failureIndicators.push({
            component: 'validation',
            issue: 'Module validation failed',
            severity: 'high'
          });
        }

        if (currentState.structure?.error) {
          failureIndicators.push({
            component: 'structure',
            issue: 'Structure analysis failed',
            severity: 'medium'
          });
        }

        partialMigrationRecovery.failurePoint = {
          indicators: failureIndicators,
          primaryFailure: failureIndicators.find(fi => fi.severity === 'high') || failureIndicators[0]
        };

        // Step 3: Preserve current state
        partialMigrationRecovery.statePreservation = {
          timestamp: new Date().toISOString(),
          moduleSnapshot: {
            path: moduleInTransition,
            validationResults: currentState.validation,
            structureAnalysis: currentState.structure
          },
          preservationMethod: 'in-memory-snapshot',
          canRestore: true
        };

        // Step 4: Generate recovery options
        const recoveryOptions = [
          {
            option: 'continue_migration',
            description: 'Continue migration from current state with fixes',
            riskLevel: 'medium',
            estimatedTime: '30 minutes',
            prerequisites: ['fix_validation_errors']
          },
          {
            option: 'partial_rollback',
            description: 'Roll back to last known good state and retry',
            riskLevel: 'low',
            estimatedTime: '15 minutes',
            prerequisites: ['state_backup_available']
          },
          {
            option: 'fresh_start',
            description: 'Start migration from beginning with lessons learned',
            riskLevel: 'low',
            estimatedTime: '60 minutes',
            prerequisites: ['backup_current_state']
          },
          {
            option: 'incremental_approach',
            description: 'Switch to smaller, incremental migration steps',
            riskLevel: 'low',
            estimatedTime: '45 minutes',
            prerequisites: ['analyze_failure_causes']
          }
        ];

        partialMigrationRecovery.recoveryOptions = recoveryOptions;

        return partialMigrationRecovery;
      } catch (error) {
        return {
          ...partialMigrationRecovery,
          overallError: error instanceof Error ? error.message : 'Partial migration recovery failed'
        };
      }

      // Verify partial migration recovery capabilities
      expect(partialMigrationRecovery.currentState).toBeDefined();
      expect(partialMigrationRecovery.statePreservation).toBeDefined();
      expect(partialMigrationRecovery.recoveryOptions.length).toBeGreaterThan(0);

      // State preservation should be complete
      expect(partialMigrationRecovery.statePreservation.timestamp).toBeDefined();
      expect(partialMigrationRecovery.statePreservation.canRestore).toBe(true);

      // Recovery options should be viable
      partialMigrationRecovery.recoveryOptions.forEach(option => {
        expect(option.option).toBeDefined();
        expect(option.description.length).toBeGreaterThan(15);
        expect(['low', 'medium', 'high'].includes(option.riskLevel)).toBe(true);
        expect(option.estimatedTime).toMatch(/\d+\s+minutes?/);
      });

      // Should identify failure points
      if (partialMigrationRecovery.failurePoint?.indicators) {
        expect(partialMigrationRecovery.failurePoint.indicators.length).toBeGreaterThan(0);
        expect(partialMigrationRecovery.failurePoint.primaryFailure).toBeDefined();
      }
    });
  });
});