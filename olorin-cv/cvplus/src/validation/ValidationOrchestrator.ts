/**
 * Validation Orchestrator
 * Coordinates and executes comprehensive validation across workspace and modules
 */

import { join } from 'path';
import {
  ValidationReport,
  ValidationSummary,
  ValidationSuiteResult,
  ModuleValidationResult,
  ValidationRecommendation,
  ValidationMetadata,
  ValidationIssue,
  ValidationOptions,
  ValidationContext,
  ValidationSuite,
  DEFAULT_VALIDATION_OPTIONS,
  calculateValidationScore,
  getValidationStatus,
  VALIDATION_SEVERITIES
} from './index';
import { WorkspaceValidator } from './WorkspaceValidator';
import { ModuleValidator } from './ModuleValidator';
import { DependencyValidator, DependencyValidationResult } from './DependencyValidator';
import { ValidationReporter } from './ValidationReporter';

export interface OrchestrationResult {
  report: ValidationReport;
  reportPath?: string;
  executionTime: number;
  success: boolean;
  errors: string[];
}

export class ValidationOrchestrator {
  private workspaceValidator: WorkspaceValidator;
  private moduleValidator: ModuleValidator;
  private dependencyValidator: DependencyValidator;
  private reporter: ValidationReporter;

  // Level 2 modules for CVPlus architecture
  private readonly LEVEL_2_MODULES = [
    'auth', 'i18n', 'cv-processing', 'multimedia',
    'analytics', 'premium', 'public-profiles',
    'recommendations', 'admin', 'workflow', 'payments'
  ];

  constructor(private workspacePath: string) {
    this.workspaceValidator = new WorkspaceValidator(workspacePath);
    this.moduleValidator = new ModuleValidator(workspacePath);
    this.dependencyValidator = new DependencyValidator(workspacePath);
    this.reporter = new ValidationReporter(workspacePath);
  }

  async executeComprehensiveValidation(
    options: Partial<ValidationOptions> = {}
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const validationOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
    const errors: string[] = [];

    try {
      console.log('🔍 Starting comprehensive validation...');

      // Execute validation phases
      const [
        workspaceResults,
        moduleResults,
        dependencyResults
      ] = await Promise.allSettled([
        this.executeWorkspaceValidation(validationOptions),
        this.executeModuleValidation(validationOptions),
        this.executeDependencyValidation(validationOptions)
      ]);

      // Process results and handle errors
      const suiteResults: ValidationSuiteResult[] = [];
      const moduleValidationResults: ModuleValidationResult[] = [];
      let dependencyValidation: DependencyValidationResult | null = null;

      // Workspace validation results
      if (workspaceResults.status === 'fulfilled') {
        suiteResults.push(...workspaceResults.value);
      } else {
        errors.push(`Workspace validation failed: ${workspaceResults.reason}`);
      }

      // Module validation results
      if (moduleResults.status === 'fulfilled') {
        moduleValidationResults.push(...moduleResults.value);
      } else {
        errors.push(`Module validation failed: ${moduleResults.reason}`);
      }

      // Dependency validation results
      if (dependencyResults.status === 'fulfilled') {
        dependencyValidation = dependencyResults.value;
      } else {
        errors.push(`Dependency validation failed: ${dependencyResults.reason}`);
      }

      // Generate comprehensive report
      const report = await this.generateComprehensiveReport(
        suiteResults,
        moduleValidationResults,
        dependencyValidation,
        validationOptions,
        startTime
      );

      // Generate report file
      let reportPath: string | undefined;
      try {
        reportPath = await this.reporter.generateReport(report, {
          format: 'html',
          includeDetails: true,
          includeRecommendations: true,
          includeMetadata: true
        });
        console.log(`📋 Validation report generated: ${reportPath}`);
      } catch (reportError) {
        errors.push(`Report generation failed: ${reportError instanceof Error ? reportError.message : 'Unknown error'}`);
      }

      const executionTime = Date.now() - startTime;
      const success = errors.length === 0 && report.summary.overallStatus !== 'failed';

      console.log(`✅ Comprehensive validation completed in ${executionTime}ms`);
      console.log(`📊 Overall Score: ${report.summary.overallScore}/100 (${report.summary.overallStatus.toUpperCase()})`);
      console.log(`🔍 Rules: ${report.summary.passedRules}/${report.summary.totalRules} passed`);

      if (report.summary.criticalIssues > 0) {
        console.log(`🚨 Critical Issues: ${report.summary.criticalIssues}`);
      }

      return {
        report,
        reportPath,
        executionTime,
        success,
        errors
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Validation orchestration failed: ${errorMessage}`);

      console.error(`❌ Validation failed after ${executionTime}ms: ${errorMessage}`);

      return {
        report: this.createEmptyReport(startTime),
        executionTime,
        success: false,
        errors
      };
    }
  }

  async executeModuleValidation(
    options: ValidationOptions,
    targetModules?: string[]
  ): Promise<ModuleValidationResult[]> {
    const modulesToValidate = targetModules || this.LEVEL_2_MODULES;
    const results: ModuleValidationResult[] = [];

    console.log(`🔍 Validating ${modulesToValidate.length} modules...`);

    for (const moduleId of modulesToValidate) {
      try {
        console.log(`  Validating module: ${moduleId}`);

        const context: ValidationContext = {
          workspacePath: this.workspacePath,
          moduleId,
          validationOptions: options
        };

        const moduleResult = await this.moduleValidator.validateModule(context);
        results.push(moduleResult);

        const statusIcon = moduleResult.status === 'healthy' ? '✅' :
                          moduleResult.status === 'warning' ? '⚠️' :
                          moduleResult.status === 'critical' ? '🔶' : '❌';

        console.log(`  ${statusIcon} ${moduleId}: ${moduleResult.healthScore}/100 (${moduleResult.status})`);

      } catch (error) {
        console.error(`  ❌ Module ${moduleId} validation failed:`, error);

        // Create failed module result
        results.push({
          moduleId,
          status: 'failed',
          healthScore: 0,
          suiteResults: [],
          issues: [{
            id: `${moduleId}-validation-error`,
            severity: 'critical',
            category: 'architecture',
            message: `Module validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error,
            affectedFiles: [],
            recommendations: ['Check module structure and dependencies', 'Review error logs for specific issues']
          }],
          recommendations: ['Fix critical module validation errors before proceeding']
        });
      }
    }

    return results;
  }

  private async executeWorkspaceValidation(options: ValidationOptions): Promise<ValidationSuiteResult[]> {
    console.log('🔍 Executing workspace validation...');

    const context: ValidationContext = {
      workspacePath: this.workspacePath,
      validationOptions: options
    };

    const suites = this.workspaceValidator.getValidationSuites();
    const results: ValidationSuiteResult[] = [];

    for (const suite of suites) {
      try {
        const suiteResult = await this.executeSuite(suite, context);
        results.push(suiteResult);
      } catch (error) {
        console.error(`Workspace suite ${suite.name} failed:`, error);

        results.push({
          suiteId: suite.id,
          suiteName: suite.name,
          status: 'failed',
          ruleResults: [{
            passed: false,
            message: `Suite execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            executionTime: 0
          }],
          summary: {
            totalRules: suite.rules.length,
            passedRules: 0,
            failedRules: suite.rules.length,
            score: 0,
            executionTime: 0
          }
        });
      }
    }

    return results;
  }

  private async executeDependencyValidation(options: ValidationOptions): Promise<DependencyValidationResult> {
    console.log('🔍 Executing dependency validation...');
    return await this.dependencyValidator.analyzeDependencies();
  }

  private async executeSuite(suite: ValidationSuite, context: ValidationContext): Promise<ValidationSuiteResult> {
    const startTime = Date.now();
    const ruleResults = [];

    let passedRules = 0;
    let failedRules = 0;

    // Skip suite if specified in options
    if (context.validationOptions.skipValidationIds?.includes(suite.id)) {
      return {
        suiteId: suite.id,
        suiteName: suite.name,
        status: 'skipped',
        ruleResults: [],
        summary: {
          totalRules: suite.rules.length,
          passedRules: 0,
          failedRules: 0,
          score: 0,
          executionTime: Date.now() - startTime
        }
      };
    }

    for (const rule of suite.rules) {
      try {
        // Skip rule if specified in options
        if (context.validationOptions.skipValidationIds?.includes(rule.id)) {
          continue;
        }

        const ruleResult = await rule.validate(context);
        ruleResults.push(ruleResult);

        if (ruleResult.passed) {
          passedRules++;
        } else {
          failedRules++;
        }

      } catch (error) {
        console.error(`Rule ${rule.id} failed:`, error);

        ruleResults.push({
          passed: false,
          message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          executionTime: 0
        });
        failedRules++;
      }
    }

    const executionTime = Date.now() - startTime;
    const score = calculateValidationScore(passedRules, suite.rules.length);
    const status = failedRules === 0 ? 'passed' :
                  passedRules > failedRules ? 'warning' : 'failed';

    return {
      suiteId: suite.id,
      suiteName: suite.name,
      status,
      ruleResults,
      summary: {
        totalRules: suite.rules.length,
        passedRules,
        failedRules,
        score,
        executionTime
      }
    };
  }

  private async generateComprehensiveReport(
    suiteResults: ValidationSuiteResult[],
    moduleResults: ModuleValidationResult[],
    dependencyResults: DependencyValidationResult | null,
    options: ValidationOptions,
    startTime: number
  ): Promise<ValidationReport> {

    // Calculate overall summary
    const totalRules = suiteResults.reduce((sum, suite) => sum + suite.summary.totalRules, 0) +
                      moduleResults.reduce((sum, module) => sum + module.suiteResults.reduce((s, suite) => s + suite.summary.totalRules, 0), 0);

    const passedRules = suiteResults.reduce((sum, suite) => sum + suite.summary.passedRules, 0) +
                       moduleResults.reduce((sum, module) => sum + module.suiteResults.reduce((s, suite) => s + suite.summary.passedRules, 0), 0);

    const failedRules = totalRules - passedRules;
    const overallScore = calculateValidationScore(passedRules, totalRules);
    const overallStatus = getValidationStatus(overallScore);

    // Count critical issues
    const criticalIssues = moduleResults.reduce((sum, module) =>
      sum + module.issues.filter(issue => issue.severity === 'critical').length, 0);

    const warningIssues = moduleResults.reduce((sum, module) =>
      sum + module.issues.filter(issue => issue.severity === 'high' || issue.severity === 'medium').length, 0);

    const summary: ValidationSummary = {
      totalRules,
      passedRules,
      failedRules,
      skippedRules: 0, // TODO: Implement skipped rules tracking
      overallScore,
      overallStatus,
      criticalIssues,
      warningIssues,
      executionTime: Date.now() - startTime
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(moduleResults, dependencyResults);

    // Create metadata
    const metadata: ValidationMetadata = {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      executionTime: Date.now() - startTime,
      workspacePath: this.workspacePath,
      validationOptions: options,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage()
      },
      validationVersion: '1.0.0' // TODO: Get from package.json
    };

    return {
      summary,
      suiteResults,
      moduleResults,
      recommendations,
      metadata
    };
  }

  private generateRecommendations(
    moduleResults: ModuleValidationResult[],
    dependencyResults: DependencyValidationResult | null
  ): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = [];

    // Module-based recommendations
    const criticalModules = moduleResults.filter(m => m.status === 'failed' || m.status === 'critical');
    if (criticalModules.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'architecture',
        title: 'Fix Critical Module Issues',
        description: `${criticalModules.length} modules have critical issues that need immediate attention.`,
        actionItems: [
          'Review module structure and dependencies',
          'Fix missing required files',
          'Ensure proper configuration',
          'Run module-specific tests'
        ],
        estimatedEffort: 'high',
        affectedModules: criticalModules.map(m => m.moduleId)
      });
    }

    // Dependency-based recommendations
    if (dependencyResults) {
      if (dependencyResults.vulnerabilities.length > 0) {
        const criticalVulns = dependencyResults.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high');
        if (criticalVulns.length > 0) {
          recommendations.push({
            priority: 'high',
            category: 'security',
            title: 'Fix Security Vulnerabilities',
            description: `Found ${criticalVulns.length} critical/high security vulnerabilities in dependencies.`,
            actionItems: [
              'Run npm audit fix',
              'Update vulnerable packages',
              'Review security advisories',
              'Consider alternative packages if fixes unavailable'
            ],
            estimatedEffort: 'medium',
            affectedModules: []
          });
        }
      }

      if (dependencyResults.missingDependencies.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'dependencies',
          title: 'Install Missing Dependencies',
          description: `${dependencyResults.missingDependencies.length} required dependencies are missing.`,
          actionItems: [
            'Run npm install to install missing dependencies',
            'Review package.json for accuracy',
            'Check import statements for typos'
          ],
          estimatedEffort: 'low',
          affectedModules: []
        });
      }
    }

    // Health score recommendations
    const lowHealthModules = moduleResults.filter(m => m.healthScore < 70);
    if (lowHealthModules.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'architecture',
        title: 'Improve Module Health',
        description: `${lowHealthModules.length} modules have health scores below 70.`,
        actionItems: [
          'Review module implementation',
          'Add missing tests',
          'Improve documentation',
          'Fix configuration issues'
        ],
        estimatedEffort: 'medium',
        affectedModules: lowHealthModules.map(m => m.moduleId)
      });
    }

    return recommendations;
  }

  private createEmptyReport(startTime: number): ValidationReport {
    return {
      summary: {
        totalRules: 0,
        passedRules: 0,
        failedRules: 0,
        skippedRules: 0,
        overallScore: 0,
        overallStatus: 'failed',
        criticalIssues: 0,
        warningIssues: 0,
        executionTime: Date.now() - startTime
      },
      suiteResults: [],
      moduleResults: [],
      recommendations: [],
      metadata: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        executionTime: Date.now() - startTime,
        workspacePath: this.workspacePath,
        validationOptions: DEFAULT_VALIDATION_OPTIONS,
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage()
        },
        validationVersion: '1.0.0'
      }
    };
  }

  // Utility methods for external use
  async validateSingleModule(moduleId: string, options?: Partial<ValidationOptions>): Promise<ModuleValidationResult> {
    const validationOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
    const context: ValidationContext = {
      workspacePath: this.workspacePath,
      moduleId,
      validationOptions
    };

    return await this.moduleValidator.validateModule(context);
  }

  async generateQuickHealthCheck(): Promise<{
    overallHealth: number;
    moduleHealthScores: Record<string, number>;
    criticalIssues: number;
    executionTime: number;
  }> {
    const startTime = Date.now();

    const results = await this.executeModuleValidation({
      ...DEFAULT_VALIDATION_OPTIONS,
      validationDepth: 'basic',
      includeBuildValidation: false,
      includeTestValidation: false
    });

    const moduleHealthScores = results.reduce((acc, result) => {
      acc[result.moduleId] = result.healthScore;
      return acc;
    }, {} as Record<string, number>);

    const overallHealth = results.length > 0 ?
      Math.round(results.reduce((sum, result) => sum + result.healthScore, 0) / results.length) : 0;

    const criticalIssues = results.reduce((sum, result) =>
      sum + result.issues.filter(issue => issue.severity === 'critical').length, 0);

    return {
      overallHealth,
      moduleHealthScores,
      criticalIssues,
      executionTime: Date.now() - startTime
    };
  }
}