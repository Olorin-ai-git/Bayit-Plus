import { analyzeCodeSegregation } from '../../../src/unified-module-requirements/lib/architecture/CodeSegregationAnalyzer';
import { checkDistributionCompliance } from '../../../src/unified-module-requirements/lib/architecture/DistributionValidator';
import { detectMockImplementations } from '../../../src/unified-module-requirements/lib/architecture/MockDetector';
import { validateBuild } from '../../../src/unified-module-requirements/lib/architecture/BuildValidator';
import { analyzeDependencies } from '../../../src/unified-module-requirements/lib/architecture/DependencyAnalyzer';
import {
  CodeSegregationRequest,
  DistributionCheckRequest,
  MockDetectionRequest,
  BuildValidationRequest,
  DependencyAnalysisRequest,
  RuleSeverity
} from '../../../src/unified-module-requirements/models/types';

describe('Integration Test: Architectural Validation Workflow', () => {
  const testModules = [
    '/test/modules/compliant-module',
    '/test/modules/legacy-module',
    '/test/modules/problematic-module'
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Comprehensive architectural analysis workflow', () => {
    it('should perform complete architectural validation with integrated analysis', async () => {
      const architecturalWorkflow = async () => {
        const analysis = {
          codeSegregation: null,
          distributionCompliance: null,
          mockDetection: null,
          buildValidation: null,
          dependencyAnalysis: null,
          consolidatedFindings: {
            criticalIssues: [],
            architecturalViolations: [],
            recommendations: [],
            overallScore: 0
          },
          errors: []
        };

        try {
          // Phase 1: Code Segregation Analysis
          const segregationRequest: CodeSegregationRequest = {
            modulePaths: testModules,
            scanDepth: 'deep',
            includeTypes: ['*.ts', '*.js', '*.json'],
            excludePatterns: ['node_modules/**', 'dist/**', 'coverage/**']
          };

          try {
            analysis.codeSegregation = await analyzeCodeSegregation(segregationRequest);
          } catch (error) {
            analysis.errors.push(`Code segregation analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          // Phase 2: Distribution Compliance Check
          const distributionRequest: DistributionCheckRequest = {
            modulePaths: testModules,
            checkBuildOutputs: true,
            validatePackaging: true,
            requireDist: true
          };

          try {
            analysis.distributionCompliance = await checkDistributionCompliance(distributionRequest);
          } catch (error) {
            analysis.errors.push(`Distribution compliance check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          // Phase 3: Mock Implementation Detection
          const mockRequest: MockDetectionRequest = {
            modulePaths: testModules,
            scanPatterns: ['**/*.ts', '**/*.js'],
            excludePatterns: ['node_modules/**', 'tests/**', '**/*.test.*', '**/*.spec.*'],
            strictMode: true
          };

          try {
            analysis.mockDetection = await detectMockImplementations(mockRequest);
          } catch (error) {
            analysis.errors.push(`Mock detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          // Phase 4: Build Validation
          const buildRequest: BuildValidationRequest = {
            modulePaths: testModules,
            validateTypeScript: true,
            runTests: false, // Skip tests for architectural analysis
            checkArtifacts: true,
            parallel: true,
            timeout: 60000
          };

          try {
            analysis.buildValidation = await validateBuild(buildRequest);
          } catch (error) {
            analysis.errors.push(`Build validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          // Phase 5: Dependency Analysis
          const dependencyRequest: DependencyAnalysisRequest = {
            modulePaths: testModules,
            checkCircular: true,
            validateLayers: true,
            includeExternal: true,
            maxDepth: 8
          };

          try {
            analysis.dependencyAnalysis = await analyzeDependencies(dependencyRequest);
          } catch (error) {
            analysis.errors.push(`Dependency analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          // Phase 6: Consolidate Findings
          const findings = analysis.consolidatedFindings;

          // Collect critical issues from all analyses
          if (analysis.codeSegregation?.violations) {
            const criticalSegregationIssues = analysis.codeSegregation.violations.filter(v =>
              v.severity === RuleSeverity.CRITICAL
            );
            findings.criticalIssues.push(...criticalSegregationIssues.map(v => ({
              type: 'code_segregation',
              severity: v.severity,
              description: v.reason,
              file: v.filePath,
              recommendation: `Move ${v.filePath} to ${v.suggestedModule}`
            })));
          }

          if (analysis.distributionCompliance?.violations) {
            const criticalDistributionIssues = analysis.distributionCompliance.violations.filter(v =>
              v.severity === RuleSeverity.CRITICAL
            );
            findings.criticalIssues.push(...criticalDistributionIssues.map(v => ({
              type: 'distribution',
              severity: v.severity,
              description: v.description,
              module: v.modulePath,
              recommendation: v.remediation
            })));
          }

          if (analysis.mockDetection?.violations) {
            const criticalMockIssues = analysis.mockDetection.violations.filter(v =>
              v.severity === RuleSeverity.CRITICAL
            );
            findings.criticalIssues.push(...criticalMockIssues.map(v => ({
              type: 'mock_implementation',
              severity: v.severity,
              description: `${v.violationType} found: ${v.content}`,
              file: v.filePath,
              line: v.lineNumber,
              recommendation: v.remediation
            })));
          }

          if (analysis.buildValidation?.buildErrors) {
            const criticalBuildErrors = analysis.buildValidation.buildErrors.filter(e =>
              e.errorType === 'typescript' || e.errorType === 'syntax'
            );
            findings.criticalIssues.push(...criticalBuildErrors.map(e => ({
              type: 'build_error',
              severity: RuleSeverity.CRITICAL,
              description: e.message,
              file: e.file,
              line: e.line,
              recommendation: 'Fix compilation errors before deployment'
            })));
          }

          if (analysis.dependencyAnalysis?.circularDependencies) {
            const criticalCircularDeps = analysis.dependencyAnalysis.circularDependencies.filter(cd =>
              cd.severity === RuleSeverity.CRITICAL || cd.impact === 'high'
            );
            findings.criticalIssues.push(...criticalCircularDeps.map(cd => ({
              type: 'circular_dependency',
              severity: cd.severity,
              description: `Circular dependency: ${cd.cycle.map(c => c.modulePath).join(' -> ')}`,
              recommendation: cd.suggestions[0] || 'Break circular dependency through interface extraction'
            })));
          }

          // Generate architectural recommendations
          const recommendations = [];

          if (findings.criticalIssues.length > 0) {
            recommendations.push({
              priority: 'immediate',
              category: 'critical_fixes',
              description: `Address ${findings.criticalIssues.length} critical architectural issues before deployment`,
              actions: findings.criticalIssues.map(issue => issue.recommendation)
            });
          }

          if (analysis.codeSegregation?.misplacedFiles && analysis.codeSegregation.misplacedFiles.length > 0) {
            recommendations.push({
              priority: 'high',
              category: 'code_organization',
              description: 'Improve code organization by moving misplaced files',
              actions: [`Reorganize ${analysis.codeSegregation.misplacedFiles.length} misplaced files`]
            });
          }

          if (analysis.mockDetection?.violations && analysis.mockDetection.violations.length > 0) {
            const mockCount = analysis.mockDetection.violations.length;
            recommendations.push({
              priority: 'high',
              category: 'implementation_completeness',
              description: 'Replace mock implementations with real functionality',
              actions: [`Implement ${mockCount} mock/stub functions with real code`]
            });
          }

          if (analysis.dependencyAnalysis?.layerViolations && analysis.dependencyAnalysis.layerViolations.length > 0) {
            recommendations.push({
              priority: 'medium',
              category: 'architectural_layering',
              description: 'Fix architectural layering violations',
              actions: analysis.dependencyAnalysis.layerViolations.map(lv => lv.remediation)
            });
          }

          findings.recommendations = recommendations;

          // Calculate overall architectural score
          let score = 100;

          // Deduct points for critical issues
          score -= findings.criticalIssues.length * 15;

          // Deduct points for various violations
          if (analysis.codeSegregation?.violations) {
            score -= Math.min(analysis.codeSegregation.violations.length * 2, 20);
          }

          if (analysis.distributionCompliance?.violations) {
            score -= Math.min(analysis.distributionCompliance.violations.length * 5, 25);
          }

          if (analysis.mockDetection?.violations) {
            score -= Math.min(analysis.mockDetection.violations.length * 3, 20);
          }

          if (analysis.buildValidation?.buildErrors) {
            score -= Math.min(analysis.buildValidation.buildErrors.length * 10, 30);
          }

          if (analysis.dependencyAnalysis?.circularDependencies) {
            score -= Math.min(analysis.dependencyAnalysis.circularDependencies.length * 8, 25);
          }

          findings.overallScore = Math.max(score, 0);

          return analysis;
        } catch (error) {
          analysis.errors.push(error instanceof Error ? error.message : 'Architectural workflow failed');
          return analysis;
        }
      };

      const result = await architecturalWorkflow();

      // Verify comprehensive analysis execution
      expect(result).toBeDefined();
      expect(result.consolidatedFindings).toBeDefined();

      // At least some analysis phases should complete
      const completedPhases = [
        result.codeSegregation,
        result.distributionCompliance,
        result.mockDetection,
        result.buildValidation,
        result.dependencyAnalysis
      ].filter(phase => phase !== null).length;

      expect(completedPhases).toBeGreaterThan(0);

      // Verify consolidated findings structure
      expect(Array.isArray(result.consolidatedFindings.criticalIssues)).toBe(true);
      expect(Array.isArray(result.consolidatedFindings.recommendations)).toBe(true);
      expect(typeof result.consolidatedFindings.overallScore).toBe('number');

      // Critical issues should have required fields
      result.consolidatedFindings.criticalIssues.forEach(issue => {
        expect(issue.type).toBeDefined();
        expect(issue.severity).toBeDefined();
        expect(issue.description).toBeDefined();
        expect(issue.recommendation).toBeDefined();
      });

      // Recommendations should be actionable
      result.consolidatedFindings.recommendations.forEach(rec => {
        expect(rec.priority).toBeDefined();
        expect(rec.category).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(Array.isArray(rec.actions)).toBe(true);
        expect(['immediate', 'high', 'medium', 'low'].includes(rec.priority)).toBe(true);
      });

      // Overall score should be valid
      expect(result.consolidatedFindings.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.consolidatedFindings.overallScore).toBeLessThanOrEqual(100);

      // Should handle errors gracefully
      expect(Array.isArray(result.errors)).toBe(true);
      result.errors.forEach(error => {
        expect(error.length).toBeGreaterThan(10);
      });
    });

    it('should provide incremental validation with progressive disclosure', async () => {
      const incrementalWorkflow = async () => {
        const workflow = {
          phases: [],
          progressiveResults: {},
          earlyTermination: false,
          errors: []
        };

        const analysisPhases = [
          {
            name: 'quick_health_check',
            description: 'Quick module health assessment',
            execute: async () => {
              return await checkDistributionCompliance({
                modulePaths: [testModules[0]], // Single module for quick check
                checkBuildOutputs: false,
                validatePackaging: true,
                requireDist: false
              });
            }
          },
          {
            name: 'mock_scan',
            description: 'Scan for mock implementations',
            execute: async () => {
              return await detectMockImplementations({
                modulePaths: [testModules[0]],
                scanPatterns: ['**/*.ts'],
                excludePatterns: ['node_modules/**', 'tests/**'],
                strictMode: false // Quick scan
              });
            }
          },
          {
            name: 'basic_build_check',
            description: 'Basic build validation',
            execute: async () => {
              return await validateBuild({
                modulePaths: [testModules[0]],
                validateTypeScript: true,
                runTests: false,
                checkArtifacts: false,
                parallel: false,
                timeout: 15000 // Quick timeout
              });
            }
          },
          {
            name: 'dependency_overview',
            description: 'Dependency structure overview',
            execute: async () => {
              return await analyzeDependencies({
                modulePaths: [testModules[0]],
                checkCircular: true,
                validateLayers: false,
                includeExternal: false,
                maxDepth: 3 // Shallow analysis
              });
            }
          },
          {
            name: 'comprehensive_analysis',
            description: 'Full architectural analysis',
            execute: async () => {
              return await analyzeCodeSegregation({
                modulePaths: testModules,
                scanDepth: 'deep',
                includeTypes: ['*.ts', '*.js'],
                excludePatterns: ['node_modules/**']
              });
            }
          }
        ];

        for (const phase of analysisPhases) {
          const phaseResult = {
            name: phase.name,
            description: phase.description,
            startTime: Date.now(),
            endTime: 0,
            success: false,
            result: null,
            shouldContinue: true,
            criticalIssuesFound: 0,
            error: null
          };

          try {
            phaseResult.result = await phase.execute();
            phaseResult.success = true;
            phaseResult.endTime = Date.now();

            // Analyze results to determine if we should continue
            if (phase.name === 'quick_health_check' && phaseResult.result?.violations) {
              const criticalViolations = phaseResult.result.violations.filter((v: any) =>
                v.severity === RuleSeverity.CRITICAL
              );
              phaseResult.criticalIssuesFound = criticalViolations.length;

              if (criticalViolations.length > 5) {
                phaseResult.shouldContinue = false;
                workflow.earlyTermination = true;
              }
            }

            if (phase.name === 'mock_scan' && phaseResult.result?.violations) {
              const criticalMocks = phaseResult.result.violations.filter((v: any) =>
                v.severity === RuleSeverity.CRITICAL
              );
              phaseResult.criticalIssuesFound = criticalMocks.length;

              if (criticalMocks.length > 10) {
                phaseResult.shouldContinue = false;
                workflow.earlyTermination = true;
              }
            }

            if (phase.name === 'basic_build_check' && phaseResult.result?.buildErrors) {
              phaseResult.criticalIssuesFound = phaseResult.result.buildErrors.length;

              if (phaseResult.result.buildErrors.length > 0) {
                phaseResult.shouldContinue = false;
                workflow.earlyTermination = true;
              }
            }

          } catch (error) {
            phaseResult.error = error instanceof Error ? error.message : 'Phase execution failed';
            phaseResult.endTime = Date.now();
            phaseResult.shouldContinue = false;
          }

          workflow.phases.push(phaseResult);
          workflow.progressiveResults[phase.name] = phaseResult;

          // Early termination if critical issues found
          if (!phaseResult.shouldContinue || workflow.earlyTermination) {
            break;
          }
        }

        return workflow;
      };

      const result = await incrementalWorkflow();

      // Verify incremental workflow execution
      expect(result.phases.length).toBeGreaterThan(0);
      expect(Object.keys(result.progressiveResults).length).toBe(result.phases.length);

      // Verify phase execution order and timing
      result.phases.forEach((phase, index) => {
        expect(phase.name).toBeDefined();
        expect(phase.description).toBeDefined();
        expect(phase.startTime).toBeGreaterThan(0);
        expect(phase.endTime).toBeGreaterThanOrEqual(phase.startTime);

        if (index > 0) {
          expect(phase.startTime).toBeGreaterThanOrEqual(result.phases[index - 1].endTime);
        }
      });

      // Verify early termination logic
      if (result.earlyTermination) {
        const lastPhase = result.phases[result.phases.length - 1];
        expect(lastPhase.shouldContinue).toBe(false);
        expect(lastPhase.criticalIssuesFound).toBeGreaterThan(0);
      }

      // All executed phases should have valid results or errors
      result.phases.forEach(phase => {
        if (phase.success) {
          expect(phase.result).toBeDefined();
          expect(phase.error).toBeNull();
        } else {
          expect(phase.error).toBeDefined();
          expect(phase.error.length).toBeGreaterThan(5);
        }
      });

      // Progressive results should match phases
      result.phases.forEach(phase => {
        expect(result.progressiveResults[phase.name]).toBe(phase);
      });
    });
  });

  describe('Cross-module architectural consistency validation', () => {
    it('should validate architectural consistency across multiple modules', async () => {
      const consistencyWorkflow = async () => {
        const consistency = {
          moduleAnalyses: [],
          crossModuleFindings: {
            inconsistentPatterns: [],
            sharedViolations: [],
            architecturalDrift: [],
            recommendations: []
          },
          consistencyScore: 0,
          errors: []
        };

        try {
          // Analyze each module individually
          for (const modulePath of testModules) {
            const moduleAnalysis = {
              modulePath,
              codeSegregation: null,
              distribution: null,
              mocks: null,
              dependencies: null,
              patterns: {
                directoryStructure: [],
                namingConventions: [],
                dependencyPatterns: [],
                buildConfigurations: []
              },
              errors: []
            };

            try {
              // Code segregation for this module
              moduleAnalysis.codeSegregation = await analyzeCodeSegregation({
                modulePaths: [modulePath],
                scanDepth: 'shallow',
                includeTypes: ['*.ts', '*.js'],
                excludePatterns: ['node_modules/**']
              });

              // Extract patterns from analysis
              if (moduleAnalysis.codeSegregation?.violations) {
                moduleAnalysis.patterns.directoryStructure = moduleAnalysis.codeSegregation.violations
                  .map(v => ({
                    pattern: v.currentModule,
                    frequency: 1
                  }));
              }

            } catch (error) {
              moduleAnalysis.errors.push(`Code segregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            try {
              // Distribution analysis
              moduleAnalysis.distribution = await checkDistributionCompliance({
                modulePaths: [modulePath],
                checkBuildOutputs: true,
                validatePackaging: true,
                requireDist: true
              });

              // Extract build configuration patterns
              if (moduleAnalysis.distribution?.distributionSummary) {
                moduleAnalysis.patterns.buildConfigurations = moduleAnalysis.distribution.distributionSummary
                  .map((summary: any) => ({
                    hasMainField: summary.packageInfo?.hasMainField,
                    hasTypesField: summary.packageInfo?.hasTypesField,
                    buildScripts: summary.packageInfo?.buildScripts
                  }));
              }

            } catch (error) {
              moduleAnalysis.errors.push(`Distribution analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            try {
              // Mock detection
              moduleAnalysis.mocks = await detectMockImplementations({
                modulePaths: [modulePath],
                scanPatterns: ['**/*.ts'],
                excludePatterns: ['node_modules/**', 'tests/**'],
                strictMode: true
              });

            } catch (error) {
              moduleAnalysis.errors.push(`Mock detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            try {
              // Dependency analysis
              moduleAnalysis.dependencies = await analyzeDependencies({
                modulePaths: [modulePath],
                checkCircular: false,
                validateLayers: true,
                includeExternal: true,
                maxDepth: 5
              });

              // Extract dependency patterns
              if (moduleAnalysis.dependencies?.externalDependencies) {
                moduleAnalysis.patterns.dependencyPatterns = Object.keys(moduleAnalysis.dependencies.externalDependencies)
                  .map(depType => ({
                    type: depType,
                    count: (moduleAnalysis.dependencies?.externalDependencies as any)[depType]?.length || 0
                  }));
              }

            } catch (error) {
              moduleAnalysis.errors.push(`Dependency analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            consistency.moduleAnalyses.push(moduleAnalysis);
          }

          // Cross-module consistency analysis
          const findings = consistency.crossModuleFindings;

          // Check for inconsistent directory structures
          const directoryPatterns = consistency.moduleAnalyses
            .flatMap(ma => ma.patterns.directoryStructure)
            .reduce((acc, pattern) => {
              acc[pattern.pattern] = (acc[pattern.pattern] || 0) + pattern.frequency;
              return acc;
            }, {} as Record<string, number>);

          if (Object.keys(directoryPatterns).length > 1) {
            findings.inconsistentPatterns.push({
              type: 'directory_structure',
              description: 'Modules use different directory structures',
              patterns: Object.keys(directoryPatterns),
              recommendation: 'Standardize directory structure across modules'
            });
          }

          // Check for shared violations
          const violationTypes = new Map<string, string[]>();

          consistency.moduleAnalyses.forEach(analysis => {
            const violations = [
              ...(analysis.codeSegregation?.violations || []),
              ...(analysis.distribution?.violations || []),
              ...(analysis.mocks?.violations || [])
            ];

            violations.forEach((violation: any) => {
              const type = violation.violationType || violation.type || 'unknown';
              if (!violationTypes.has(type)) {
                violationTypes.set(type, []);
              }
              violationTypes.get(type)!.push(analysis.modulePath);
            });
          });

          violationTypes.forEach((modules, violationType) => {
            if (modules.length > 1) {
              findings.sharedViolations.push({
                violationType,
                affectedModules: modules,
                count: modules.length,
                recommendation: `Address ${violationType} violations consistently across all modules`
              });
            }
          });

          // Check for architectural drift
          const buildConfigs = consistency.moduleAnalyses
            .flatMap(ma => ma.patterns.buildConfigurations)
            .filter(config => config);

          if (buildConfigs.length > 1) {
            const hasMainField = buildConfigs.filter(c => c.hasMainField).length;
            const hasTypesField = buildConfigs.filter(c => c.hasTypesField).length;

            if (hasMainField !== buildConfigs.length || hasTypesField !== buildConfigs.length) {
              findings.architecturalDrift.push({
                type: 'build_configuration',
                description: 'Inconsistent build configurations across modules',
                details: {
                  modulesWithMain: hasMainField,
                  modulesWithTypes: hasTypesField,
                  totalModules: buildConfigs.length
                },
                recommendation: 'Standardize package.json structure and build configuration'
              });
            }
          }

          // Generate cross-module recommendations
          if (findings.inconsistentPatterns.length > 0) {
            findings.recommendations.push({
              priority: 'high',
              category: 'standardization',
              description: 'Standardize architectural patterns across modules',
              actions: findings.inconsistentPatterns.map(p => p.recommendation)
            });
          }

          if (findings.sharedViolations.length > 0) {
            findings.recommendations.push({
              priority: 'medium',
              category: 'systematic_issues',
              description: 'Address systematic violations across multiple modules',
              actions: findings.sharedViolations.map(sv => sv.recommendation)
            });
          }

          if (findings.architecturalDrift.length > 0) {
            findings.recommendations.push({
              priority: 'medium',
              category: 'configuration_drift',
              description: 'Align configuration and build processes',
              actions: findings.architecturalDrift.map(ad => ad.recommendation)
            });
          }

          // Calculate consistency score
          let score = 100;
          score -= findings.inconsistentPatterns.length * 15;
          score -= findings.sharedViolations.length * 10;
          score -= findings.architecturalDrift.length * 12;

          consistency.consistencyScore = Math.max(score, 0);

          return consistency;
        } catch (error) {
          consistency.errors.push(error instanceof Error ? error.message : 'Consistency workflow failed');
          return consistency;
        }
      };

      const result = await consistencyWorkflow();

      // Verify cross-module consistency analysis
      expect(result.moduleAnalyses.length).toBeGreaterThan(0);
      expect(result.moduleAnalyses.length).toBeLessThanOrEqual(testModules.length);

      // Verify module analyses structure
      result.moduleAnalyses.forEach(analysis => {
        expect(analysis.modulePath).toBeDefined();
        expect(analysis.patterns).toBeDefined();
        expect(Array.isArray(analysis.errors)).toBe(true);
      });

      // Verify cross-module findings
      expect(result.crossModuleFindings).toBeDefined();
      expect(Array.isArray(result.crossModuleFindings.inconsistentPatterns)).toBe(true);
      expect(Array.isArray(result.crossModuleFindings.sharedViolations)).toBe(true);
      expect(Array.isArray(result.crossModuleFindings.architecturalDrift)).toBe(true);
      expect(Array.isArray(result.crossModuleFindings.recommendations)).toBe(true);

      // Verify consistency score
      expect(typeof result.consistencyScore).toBe('number');
      expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(result.consistencyScore).toBeLessThanOrEqual(100);

      // Verify findings structure
      result.crossModuleFindings.inconsistentPatterns.forEach((pattern: any) => {
        expect(pattern.type).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(Array.isArray(pattern.patterns)).toBe(true);
        expect(pattern.recommendation).toBeDefined();
      });

      result.crossModuleFindings.sharedViolations.forEach((violation: any) => {
        expect(violation.violationType).toBeDefined();
        expect(Array.isArray(violation.affectedModules)).toBe(true);
        expect(violation.count).toBeGreaterThan(1);
        expect(violation.recommendation).toBeDefined();
      });

      // Should handle errors gracefully
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});