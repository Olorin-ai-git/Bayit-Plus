/**
 * System Validation Integration Tests
 * Comprehensive validation testing for the recovery system components
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';

// Import validation components
import { ValidationOrchestrator } from '../../src/validation/ValidationOrchestrator';
import { WorkspaceValidator } from '../../src/validation/WorkspaceValidator';
import { ModuleValidator } from '../../src/validation/ModuleValidator';
import { DependencyValidator } from '../../src/validation/DependencyValidator';
import { ValidationReporter } from '../../src/validation/ValidationReporter';

// Import types
import { ValidationOptions, ValidationContext } from '../../src/validation/index';

describe('System Validation Integration', () => {
  const testWorkspacePath = join(__dirname, '../../test-validation-workspace');
  const testPackagesPath = join(testWorkspacePath, 'packages');

  let validationOrchestrator: ValidationOrchestrator;
  let workspaceValidator: WorkspaceValidator;
  let moduleValidator: ModuleValidator;
  let dependencyValidator: DependencyValidator;
  let validationReporter: ValidationReporter;

  const LEVEL_2_MODULES = [
    'auth', 'i18n', 'cv-processing', 'multimedia',
    'analytics', 'premium', 'public-profiles',
    'recommendations', 'admin', 'workflow', 'payments'
  ];

  beforeAll(async () => {
    await setupValidationTestWorkspace();

    validationOrchestrator = new ValidationOrchestrator(testWorkspacePath);
    workspaceValidator = new WorkspaceValidator(testWorkspacePath);
    moduleValidator = new ModuleValidator(testWorkspacePath);
    dependencyValidator = new DependencyValidator(testWorkspacePath);
    validationReporter = new ValidationReporter(testWorkspacePath);

    console.log('🧪 Validation test environment initialized');
  });

  afterAll(async () => {
    if (existsSync(testWorkspacePath)) {
      rmSync(testWorkspacePath, { recursive: true, force: true });
    }
    console.log('🧹 Validation test environment cleaned up');
  });

  describe('Workspace Validation', () => {
    it('should validate workspace structure and configuration', async () => {
      console.log('🧪 Testing workspace validation');

      const context: ValidationContext = {
        workspacePath: testWorkspacePath,
        validationOptions: {
          validationDepth: 'full',
          includeHealthMetrics: true,
          includeDependencyChecks: true,
          includeFileSystemChecks: true,
          includeBuildValidation: false,
          includeTestValidation: false,
          parallelValidation: false
        }
      };

      const validationSuites = workspaceValidator.getValidationSuites();
      expect(validationSuites).toBeDefined();
      expect(validationSuites.length).toBeGreaterThan(0);

      // Test each validation suite
      for (const suite of validationSuites) {
        expect(suite.id).toBeDefined();
        expect(suite.name).toBeDefined();
        expect(suite.rules.length).toBeGreaterThan(0);

        console.log(`  Testing suite: ${suite.name} (${suite.rules.length} rules)`);

        // Test each rule in the suite
        for (const rule of suite.rules) {
          expect(rule.id).toBeDefined();
          expect(rule.name).toBeDefined();
          expect(rule.validate).toBeDefined();

          try {
            const ruleResult = await rule.validate(context);
            expect(ruleResult).toBeDefined();
            expect(typeof ruleResult.passed).toBe('boolean');
            expect(ruleResult.message).toBeDefined();
            expect(typeof ruleResult.executionTime).toBe('number');

            if (!ruleResult.passed) {
              console.log(`    ⚠️ Rule failed: ${rule.name} - ${ruleResult.message}`);
            }
          } catch (error) {
            console.error(`    ❌ Rule error: ${rule.name}`, error);
            throw error;
          }
        }
      }

      console.log(`✅ Workspace validation completed - ${validationSuites.length} suites tested`);
    }, 30000);

    it('should generate workspace validation report', async () => {
      console.log('🧪 Testing workspace validation reporting');

      const validationResult = await validationOrchestrator.executeComprehensiveValidation({
        validationDepth: 'basic',
        includeHealthMetrics: true,
        includeDependencyChecks: false,
        includeFileSystemChecks: true,
        includeBuildValidation: false,
        includeTestValidation: false,
        parallelValidation: true
      });

      expect(validationResult.success).toBe(true);
      expect(validationResult.report).toBeDefined();

      const report = validationResult.report;
      expect(report.summary).toBeDefined();
      expect(report.summary.totalRules).toBeGreaterThan(0);
      expect(report.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallScore).toBeLessThanOrEqual(100);

      // Test report generation
      const reportPath = await validationReporter.generateReport(report, {
        format: 'html',
        includeDetails: true,
        includeRecommendations: true,
        includeMetadata: true
      });

      expect(reportPath).toBeDefined();
      expect(existsSync(reportPath)).toBe(true);

      console.log(`📊 Validation report generated: ${reportPath}`);
      console.log(`📈 Overall score: ${report.summary.overallScore}/100`);
      console.log(`🔍 Rules executed: ${report.summary.totalRules}`);
    }, 20000);
  });

  describe('Module Validation', () => {
    it('should validate all Level 2 modules individually', async () => {
      console.log('🧪 Testing individual module validation');

      const moduleResults: Record<string, any> = {};

      for (const moduleId of LEVEL_2_MODULES) {
        console.log(`  Validating module: ${moduleId}`);

        const context: ValidationContext = {
          workspacePath: testWorkspacePath,
          moduleId,
          validationOptions: {
            validationDepth: 'basic',
            includeHealthMetrics: true,
            includeDependencyChecks: false,
            includeFileSystemChecks: true,
            includeBuildValidation: false,
            includeTestValidation: false,
            parallelValidation: false
          }
        };

        try {
          const moduleResult = await moduleValidator.validateModule(context);

          expect(moduleResult).toBeDefined();
          expect(moduleResult.moduleId).toBe(moduleId);
          expect(moduleResult.status).toBeDefined();
          expect(['healthy', 'warning', 'critical', 'failed'].includes(moduleResult.status)).toBe(true);
          expect(moduleResult.healthScore).toBeGreaterThanOrEqual(0);
          expect(moduleResult.healthScore).toBeLessThanOrEqual(100);
          expect(Array.isArray(moduleResult.suiteResults)).toBe(true);
          expect(Array.isArray(moduleResult.issues)).toBe(true);
          expect(Array.isArray(moduleResult.recommendations)).toBe(true);

          moduleResults[moduleId] = moduleResult;

          console.log(`    ✅ ${moduleId}: ${moduleResult.healthScore}/100 (${moduleResult.status})`);

        } catch (error) {
          console.error(`    ❌ Module validation failed for ${moduleId}:`, error);
          throw error;
        }
      }

      expect(Object.keys(moduleResults)).toHaveLength(LEVEL_2_MODULES.length);

      // Analyze results
      const healthyModules = Object.values(moduleResults).filter((r: any) => r.status === 'healthy').length;
      const averageScore = Object.values(moduleResults).reduce((sum: number, r: any) => sum + r.healthScore, 0) / LEVEL_2_MODULES.length;

      console.log(`📊 Module validation summary:`);
      console.log(`  - Healthy modules: ${healthyModules}/${LEVEL_2_MODULES.length}`);
      console.log(`  - Average health score: ${averageScore.toFixed(1)}/100`);
    }, 45000);

    it('should validate module-specific validation suites', async () => {
      console.log('🧪 Testing module-specific validation suites');

      const testModule = 'auth'; // Test with auth module
      const context: ValidationContext = {
        workspacePath: testWorkspacePath,
        moduleId: testModule,
        validationOptions: {
          validationDepth: 'full',
          includeHealthMetrics: true,
          includeDependencyChecks: true,
          includeFileSystemChecks: true,
          includeBuildValidation: false,
          includeTestValidation: false,
          parallelValidation: false
        }
      };

      const moduleSuites = moduleValidator.getModuleValidationSuites(testModule);
      expect(moduleSuites).toBeDefined();
      expect(moduleSuites.length).toBeGreaterThan(0);

      for (const suite of moduleSuites) {
        expect(suite.id).toBeDefined();
        expect(suite.name).toBeDefined();
        expect(suite.rules.length).toBeGreaterThan(0);

        console.log(`  Testing module suite: ${suite.name} (${suite.rules.length} rules)`);

        let passedRules = 0;
        let failedRules = 0;

        for (const rule of suite.rules) {
          try {
            const ruleResult = await rule.validate(context);
            expect(ruleResult).toBeDefined();
            expect(typeof ruleResult.passed).toBe('boolean');

            if (ruleResult.passed) {
              passedRules++;
            } else {
              failedRules++;
              console.log(`    ⚠️ Rule failed: ${rule.name}`);
            }
          } catch (error) {
            failedRules++;
            console.error(`    ❌ Rule error: ${rule.name}`, error);
          }
        }

        const suiteScore = suite.rules.length > 0 ? (passedRules / suite.rules.length) * 100 : 0;
        console.log(`    📊 Suite score: ${suiteScore.toFixed(1)}% (${passedRules}/${suite.rules.length} passed)`);
      }

      console.log(`✅ Module validation suites completed for ${testModule}`);
    }, 25000);
  });

  describe('Dependency Validation', () => {
    it('should analyze workspace dependencies', async () => {
      console.log('🧪 Testing dependency validation');

      const dependencyAnalysis = await dependencyValidator.analyzeDependencies();

      expect(dependencyAnalysis).toBeDefined();
      expect(typeof dependencyAnalysis.hasCircularDependencies).toBe('boolean');
      expect(Array.isArray(dependencyAnalysis.missingDependencies)).toBe(true);
      expect(Array.isArray(dependencyAnalysis.outdatedDependencies)).toBe(true);
      expect(Array.isArray(dependencyAnalysis.vulnerabilities)).toBe(true);
      expect(Array.isArray(dependencyAnalysis.duplicatedDependencies)).toBe(true);
      expect(Array.isArray(dependencyAnalysis.dependencyTree)).toBe(true);
      expect(dependencyAnalysis.healthScore).toBeGreaterThanOrEqual(0);
      expect(dependencyAnalysis.healthScore).toBeLessThanOrEqual(100);

      console.log(`📊 Dependency analysis results:`);
      console.log(`  - Health score: ${dependencyAnalysis.healthScore}/100`);
      console.log(`  - Circular dependencies: ${dependencyAnalysis.hasCircularDependencies ? 'Yes' : 'No'}`);
      console.log(`  - Missing dependencies: ${dependencyAnalysis.missingDependencies.length}`);
      console.log(`  - Outdated dependencies: ${dependencyAnalysis.outdatedDependencies.length}`);
      console.log(`  - Security vulnerabilities: ${dependencyAnalysis.vulnerabilities.length}`);
      console.log(`  - Duplicated dependencies: ${dependencyAnalysis.duplicatedDependencies.length}`);

      // Test dependency validation rules
      const dependencyRules = dependencyValidator.getDependencyValidationRules();
      expect(dependencyRules).toBeDefined();
      expect(dependencyRules.length).toBeGreaterThan(0);

      const context: ValidationContext = {
        workspacePath: testWorkspacePath,
        validationOptions: {
          validationDepth: 'basic',
          includeHealthMetrics: false,
          includeDependencyChecks: true,
          includeFileSystemChecks: false,
          includeBuildValidation: false,
          includeTestValidation: false,
          parallelValidation: false
        }
      };

      for (const rule of dependencyRules) {
        try {
          const ruleResult = await rule.validate(context);
          expect(ruleResult).toBeDefined();
          expect(typeof ruleResult.passed).toBe('boolean');

          if (!ruleResult.passed) {
            console.log(`  ⚠️ Dependency rule failed: ${rule.name} - ${ruleResult.message}`);
          }
        } catch (error) {
          console.error(`  ❌ Dependency rule error: ${rule.name}`, error);
        }
      }

      console.log(`✅ Dependency validation completed - ${dependencyRules.length} rules tested`);
    }, 20000);

    it('should validate module-specific dependencies', async () => {
      console.log('🧪 Testing module-specific dependency validation');

      const testModules = ['auth', 'cv-processing', 'multimedia'];

      for (const moduleId of testModules) {
        console.log(`  Analyzing dependencies for: ${moduleId}`);

        const moduleAnalysis = await dependencyValidator.analyzeDependencies(moduleId);

        expect(moduleAnalysis).toBeDefined();
        expect(moduleAnalysis.healthScore).toBeGreaterThanOrEqual(0);
        expect(moduleAnalysis.healthScore).toBeLessThanOrEqual(100);

        console.log(`    📊 ${moduleId} dependency health: ${moduleAnalysis.healthScore}/100`);

        if (moduleAnalysis.missingDependencies.length > 0) {
          console.log(`    ⚠️ Missing dependencies: ${moduleAnalysis.missingDependencies.join(', ')}`);
        }

        if (moduleAnalysis.vulnerabilities.length > 0) {
          const criticalVulns = moduleAnalysis.vulnerabilities.filter(v => v.severity === 'critical').length;
          console.log(`    🚨 Security vulnerabilities: ${moduleAnalysis.vulnerabilities.length} (${criticalVulns} critical)`);
        }
      }

      console.log(`✅ Module dependency validation completed for ${testModules.length} modules`);
    }, 15000);
  });

  describe('Validation Reporting', () => {
    it('should generate reports in multiple formats', async () => {
      console.log('🧪 Testing validation report generation in multiple formats');

      // Generate comprehensive validation data
      const validationResult = await validationOrchestrator.executeComprehensiveValidation({
        validationDepth: 'basic',
        includeHealthMetrics: true,
        includeDependencyChecks: true,
        includeFileSystemChecks: true,
        includeBuildValidation: false,
        includeTestValidation: false,
        parallelValidation: true
      });

      expect(validationResult.success).toBe(true);
      const report = validationResult.report;

      const formats: Array<'html' | 'json' | 'markdown' | 'csv'> = ['html', 'json', 'markdown', 'csv'];
      const reportPaths: Record<string, string> = {};

      for (const format of formats) {
        console.log(`  Generating ${format.toUpperCase()} report...`);

        try {
          const reportPath = await validationReporter.generateReport(report, {
            format,
            includeDetails: true,
            includeRecommendations: true,
            includeMetadata: true
          });

          expect(reportPath).toBeDefined();
          expect(existsSync(reportPath)).toBe(true);

          reportPaths[format] = reportPath;
          console.log(`    ✅ ${format.toUpperCase()} report generated: ${reportPath}`);

        } catch (error) {
          console.error(`    ❌ Failed to generate ${format.toUpperCase()} report:`, error);
          throw error;
        }
      }

      expect(Object.keys(reportPaths)).toHaveLength(formats.length);
      console.log(`📊 All ${formats.length} report formats generated successfully`);

      // Verify report content structure
      const jsonReportPath = reportPaths['json'];
      const jsonContent = JSON.parse(require('fs').readFileSync(jsonReportPath, 'utf8'));

      expect(jsonContent.summary).toBeDefined();
      expect(jsonContent.suiteResults).toBeDefined();
      expect(jsonContent.metadata).toBeDefined();

      console.log(`🔍 Report validation: JSON structure verified`);
    }, 30000);

    it('should generate dashboard data for monitoring integration', async () => {
      console.log('🧪 Testing dashboard data generation');

      // Generate multiple validation reports over time (simulated)
      const reports = [];

      for (let i = 0; i < 3; i++) {
        const validationResult = await validationOrchestrator.executeComprehensiveValidation({
          validationDepth: 'basic',
          includeHealthMetrics: false,
          includeDependencyChecks: false,
          includeFileSystemChecks: true,
          includeBuildValidation: false,
          includeTestValidation: false,
          parallelValidation: true
        });

        expect(validationResult.success).toBe(true);
        reports.push(validationResult.report);

        // Small delay to simulate time progression
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Generate dashboard data
      const dashboardData = await validationReporter.generateDashboard(reports);

      expect(dashboardData).toBeDefined();
      expect(dashboardData.summary).toBeDefined();
      expect(Array.isArray(dashboardData.trends)).toBe(true);
      expect(Array.isArray(dashboardData.topIssues)).toBe(true);
      expect(Array.isArray(dashboardData.moduleHealth)).toBe(true);
      expect(Array.isArray(dashboardData.recommendations)).toBe(true);

      console.log(`📊 Dashboard data generated:`);
      console.log(`  - Trends: ${dashboardData.trends.length} data points`);
      console.log(`  - Top issues: ${dashboardData.topIssues.length} issues`);
      console.log(`  - Module health: ${dashboardData.moduleHealth.length} modules`);
      console.log(`  - Recommendations: ${dashboardData.recommendations.length} recommendations`);
      console.log(`  - Overall score: ${dashboardData.summary.overallScore}/100`);

      // Verify trend data structure
      if (dashboardData.trends.length > 0) {
        const trend = dashboardData.trends[0];
        expect(trend.timestamp).toBeDefined();
        expect(typeof trend.overallScore).toBe('number');
        expect(typeof trend.moduleScores).toBe('object');
        expect(typeof trend.criticalIssues).toBe('number');
      }

      console.log(`✅ Dashboard data generation completed successfully`);
    }, 15000);
  });

  describe('Validation Performance and Scalability', () => {
    it('should handle parallel validation efficiently', async () => {
      console.log('🧪 Testing parallel validation performance');

      const startTime = Date.now();

      // Test parallel validation vs sequential
      const parallelResult = await validationOrchestrator.executeComprehensiveValidation({
        validationDepth: 'basic',
        includeHealthMetrics: true,
        includeDependencyChecks: false,
        includeFileSystemChecks: true,
        includeBuildValidation: false,
        includeTestValidation: false,
        parallelValidation: true
      });

      const parallelTime = Date.now() - startTime;

      expect(parallelResult.success).toBe(true);
      expect(parallelTime).toBeLessThan(20000); // Should complete within 20 seconds

      console.log(`⚡ Parallel validation performance:`);
      console.log(`  - Execution time: ${parallelTime}ms`);
      console.log(`  - Overall score: ${parallelResult.report.summary.overallScore}/100`);
      console.log(`  - Total rules: ${parallelResult.report.summary.totalRules}`);
      console.log(`  - Module results: ${parallelResult.report.moduleResults.length}`);

      // Test that parallel validation maintains accuracy
      expect(parallelResult.report.summary.totalRules).toBeGreaterThan(0);
      expect(parallelResult.report.moduleResults.length).toBeGreaterThan(0);

      console.log(`✅ Parallel validation completed efficiently`);
    }, 25000);

    it('should validate large number of modules efficiently', async () => {
      console.log('🧪 Testing large-scale module validation');

      const moduleValidationPromises = LEVEL_2_MODULES.map(async (moduleId) => {
        const startTime = Date.now();

        const result = await validationOrchestrator.validateSingleModule(moduleId, {
          validationDepth: 'basic',
          includeHealthMetrics: true,
          includeDependencyChecks: false,
          includeFileSystemChecks: true,
          includeBuildValidation: false,
          includeTestValidation: false
        });

        const executionTime = Date.now() - startTime;

        return {
          moduleId,
          result,
          executionTime
        };
      });

      const startTime = Date.now();
      const results = await Promise.allSettled(moduleValidationPromises);
      const totalTime = Date.now() - startTime;

      const successfulValidations = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulValidations).toBe(LEVEL_2_MODULES.length);

      // Calculate performance metrics
      const validationTimes = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value.executionTime);

      const avgTime = validationTimes.reduce((sum, time) => sum + time, 0) / validationTimes.length;
      const maxTime = Math.max(...validationTimes);
      const minTime = Math.min(...validationTimes);

      console.log(`⚡ Large-scale validation performance:`);
      console.log(`  - Total modules: ${LEVEL_2_MODULES.length}`);
      console.log(`  - Total time: ${totalTime}ms`);
      console.log(`  - Average time per module: ${avgTime.toFixed(1)}ms`);
      console.log(`  - Fastest module: ${minTime}ms`);
      console.log(`  - Slowest module: ${maxTime}ms`);
      console.log(`  - Success rate: ${(successfulValidations / LEVEL_2_MODULES.length * 100).toFixed(1)}%`);

      // Performance assertions
      expect(avgTime).toBeLessThan(5000); // Average should be under 5 seconds
      expect(maxTime).toBeLessThan(10000); // No module should take more than 10 seconds

      console.log(`✅ Large-scale module validation completed efficiently`);
    }, 60000);
  });

  // Helper function to setup validation test workspace
  async function setupValidationTestWorkspace(): Promise<void> {
    // Create test workspace structure
    if (existsSync(testWorkspacePath)) {
      rmSync(testWorkspacePath, { recursive: true, force: true });
    }

    mkdirSync(testWorkspacePath, { recursive: true });
    mkdirSync(testPackagesPath, { recursive: true });

    // Create more comprehensive package structure for validation testing
    for (const moduleId of LEVEL_2_MODULES) {
      const modulePath = join(testPackagesPath, moduleId);
      mkdirSync(modulePath, { recursive: true });
      mkdirSync(join(modulePath, 'src'), { recursive: true });
      mkdirSync(join(modulePath, 'tests'), { recursive: true });
      mkdirSync(join(modulePath, 'docs'), { recursive: true });

      // Create package.json with proper dependencies
      const packageJson = {
        name: `@cvplus/${moduleId}`,
        version: '1.0.0',
        description: `CVPlus ${moduleId} module`,
        main: 'src/index.ts',
        scripts: {
          build: 'tsc',
          test: 'jest',
          lint: 'eslint src/**/*.ts'
        },
        dependencies: {
          typescript: '^5.0.0'
        },
        devDependencies: {
          '@types/node': '^20.0.0',
          jest: '^29.0.0',
          eslint: '^8.0.0'
        },
        peerDependencies: {}
      };

      writeFileSync(
        join(modulePath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create TypeScript config
      const tsConfig = {
        compilerOptions: {
          target: 'es2020',
          module: 'commonjs',
          lib: ['es2020'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', 'tests']
      };

      writeFileSync(
        join(modulePath, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2)
      );

      // Create main index file
      const indexContent = `/**
 * ${moduleId} module - CVPlus Level 2 Module
 * Generated for validation testing
 */

export interface ${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Config {
  enabled: boolean;
  version: string;
  options: Record<string, any>;
}

export class ${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Service {
  private config: ${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Config;

  constructor(config: ${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Config) {
    this.config = config;
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public getVersion(): string {
    return this.config.version;
  }
}

export default {
  ${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Service,
  version: '1.0.0'
};
`;

      writeFileSync(join(modulePath, 'src', 'index.ts'), indexContent);

      // Create README
      const readmeContent = `# @cvplus/${moduleId}

${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)} module for CVPlus platform.

## Installation

\`\`\`bash
npm install @cvplus/${moduleId}
\`\`\`

## Usage

\`\`\`typescript
import { ${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Service } from '@cvplus/${moduleId}';

const service = new ${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Service({
  enabled: true,
  version: '1.0.0',
  options: {}
});
\`\`\`

## API Documentation

Generated for validation testing.
`;

      writeFileSync(join(modulePath, 'README.md'), readmeContent);

      // Create test file
      const testContent = `/**
 * ${moduleId} module tests
 */

import { ${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Service } from '../src/index';

describe('${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Service', () => {
  it('should create service instance', () => {
    const service = new ${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)}Service({
      enabled: true,
      version: '1.0.0',
      options: {}
    });

    expect(service).toBeDefined();
    expect(service.isEnabled()).toBe(true);
    expect(service.getVersion()).toBe('1.0.0');
  });
});
`;

      writeFileSync(join(modulePath, 'tests', `${moduleId}.test.ts`), testContent);
    }

    // Create workspace package.json
    const workspacePackageJson = {
      name: 'cvplus-validation-test-workspace',
      version: '1.0.0',
      description: 'Test workspace for validation system testing',
      workspaces: ['packages/*'],
      scripts: {
        build: 'npm run build --workspaces',
        test: 'npm run test --workspaces',
        lint: 'npm run lint --workspaces'
      },
      dependencies: {},
      devDependencies: {
        typescript: '^5.0.0',
        '@types/node': '^20.0.0'
      }
    };

    writeFileSync(
      join(testWorkspacePath, 'package.json'),
      JSON.stringify(workspacePackageJson, null, 2)
    );

    // Create workspace TypeScript config
    const workspaceTsConfig = {
      compilerOptions: {
        target: 'es2020',
        module: 'commonjs',
        lib: ['es2020'],
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      },
      include: ['packages/*/src/**/*'],
      exclude: ['node_modules', '**/dist', '**/tests'],
      references: LEVEL_2_MODULES.map(moduleId => ({
        path: `./packages/${moduleId}`
      }))
    };

    writeFileSync(
      join(testWorkspacePath, 'tsconfig.json'),
      JSON.stringify(workspaceTsConfig, null, 2)
    );

    // Create necessary directories
    mkdirSync(join(testWorkspacePath, 'reports'), { recursive: true });
    mkdirSync(join(testWorkspacePath, 'reports', 'validation'), { recursive: true });

    console.log(`🏗️ Validation test workspace created at: ${testWorkspacePath}`);
  }
});