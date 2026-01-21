#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { getUnifiedModuleRequirementsService } from '../lib/index';
import { RuleSeverity } from '../models/types';

const program = new Command();

interface ArchitectureCheckOptions {
  checks?: string;
  strict?: boolean;
  format?: 'table' | 'json' | 'html' | 'summary';
  output?: string;
  silent?: boolean;
  exitCode?: boolean;
  config?: string;
  generateReport?: boolean;
  visualize?: boolean;
}

program
  .name('check-architecture')
  .description('Comprehensive architectural validation for CVPlus modules')
  .version('1.0.0')
  .argument('<module-paths...>', 'Paths to modules to check')
  .option('-c, --checks <checks>', 'Comma-separated list of checks: segregation,distribution,mocks,build,dependencies (default: all)')
  .option('-s, --strict', 'Enable strict mode for all checks', false)
  .option('-f, --format <format>', 'Output format: table, json, html, summary', 'table')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .option('--silent', 'Suppress all output except errors', false)
  .option('--exit-code', 'Exit with non-zero code if violations found', true)
  .option('--config <file>', 'Load configuration from file')
  .option('--generate-report', 'Generate comprehensive HTML report', false)
  .option('--visualize', 'Generate dependency visualization diagrams', false)
  .action(async (modulePaths: string[], options: ArchitectureCheckOptions) => {
    try {
      await checkArchitecture(modulePaths, options);
    } catch (error) {
      console.error('❌ Architecture check failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

async function checkArchitecture(modulePaths: string[], options: ArchitectureCheckOptions): Promise<void> {
  // Resolve and validate module paths
  const resolvedPaths = modulePaths.map(p => path.resolve(p));
  for (const modulePath of resolvedPaths) {
    if (!fs.existsSync(modulePath)) {
      throw new Error(`Module path does not exist: ${modulePath}`);
    }
  }

  if (!options.silent) {
    console.log(`🏗️  Checking architecture for ${resolvedPaths.length} module(s)`);
  }

  // Load configuration if specified
  let config: any = {};
  if (options.config) {
    config = await loadConfig(options.config);
  }

  // Parse check types
  const enabledChecks = options.checks
    ? options.checks.split(',').map(c => c.trim())
    : config.checks || ['segregation', 'distribution', 'mocks', 'build', 'dependencies'];

  const strictMode = options.strict || config.strictMode || false;

  if (!options.silent) {
    console.log(`🔍 Running checks: ${enabledChecks.join(', ')}`);
    console.log(`⚙️  Strict mode: ${strictMode ? 'enabled' : 'disabled'}`);
  }

  // Run architectural checks
  const service = getUnifiedModuleRequirementsService();
  const startTime = Date.now();
  const results: any = {};

  try {
    // Code Segregation Analysis
    if (enabledChecks.includes('segregation')) {
      if (!options.silent) console.log('🔍 Analyzing code segregation...');
      results.segregation = await service.codeSegregationAnalyzer.analyzeCodeSegregation({
        modulePaths: resolvedPaths,
        strictMode,
        excludePatterns: ['node_modules', 'dist', 'build', '.git']
      });
    }

    // Distribution Validation
    if (enabledChecks.includes('distribution')) {
      if (!options.silent) console.log('📦 Validating distribution structure...');
      results.distribution = await Promise.all(
        resolvedPaths.map(modulePath =>
          service.distributionValidator.validateDistribution({
            modulePath,
            strictMode,
            checkPackageJson: true,
            validateArtifacts: true
          })
        )
      );
    }

    // Mock Implementation Detection
    if (enabledChecks.includes('mocks')) {
      if (!options.silent) console.log('🔍 Detecting mock implementations...');
      results.mocks = await service.mockDetector.detectMockImplementations({
        modulePaths: resolvedPaths,
        strictMode,
        scanPatterns: ['*.ts', '*.tsx', '*.js', '*.jsx'],
        excludePatterns: ['node_modules', '*.test.*', '*.spec.*', 'dist']
      });
    }

    // Build Validation
    if (enabledChecks.includes('build')) {
      if (!options.silent) console.log('🔨 Validating build configuration...');
      results.build = await service.buildValidator.validateBuild({
        modulePaths: resolvedPaths,
        enableTypeCheck: true,
        enableBuild: true,
        enableTests: strictMode,
        parallel: true
      });
    }

    // Dependency Analysis
    if (enabledChecks.includes('dependencies')) {
      if (!options.silent) console.log('🔗 Analyzing dependencies...');
      results.dependencies = await service.dependencyAnalyzer.analyzeDependencies({
        modulePaths: resolvedPaths,
        includeFileTypes: ['ts', 'tsx', 'js', 'jsx'],
        includeTestDependencies: false,
        excludePatterns: ['node_modules', 'dist'],
        maxDependencyDepth: 10
      });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Generate comprehensive report if requested
    if (options.generateReport) {
      if (!options.silent) console.log('📋 Generating comprehensive report...');

      const reportPath = options.output || 'architecture-report.html';
      results.report = await service.reportingService.generateReport({
        title: 'CVPlus Architecture Validation Report',
        format: 'html',
        outputPath: reportPath,
        validationReport: undefined, // We don't have basic validation here
        structureReport: undefined,
        distributionReport: results.distribution?.[0],
        mockDetectionReport: results.mocks,
        buildReport: results.build,
        dependencyReport: results.dependencies
      });

      if (!options.silent) {
        console.log(`📄 Report generated: ${reportPath}`);
      }
    }

    // Generate dependency visualization if requested
    if (options.visualize && results.dependencies) {
      if (!options.silent) console.log('📊 Generating dependency visualization...');

      const visualization = await service.dependencyAnalyzer.generateDependencyVisualization(
        results.dependencies,
        'mermaid'
      );

      const vizPath = options.output
        ? options.output.replace(/\.[^.]+$/, '.mmd')
        : 'dependency-graph.mmd';

      fs.writeFileSync(vizPath, visualization, 'utf8');

      if (!options.silent) {
        console.log(`📊 Dependency diagram: ${vizPath}`);
      }
    }

    // Format and output results
    const output = formatOutput(results, options, duration);

    if (options.output && !options.generateReport) {
      fs.writeFileSync(options.output, output, 'utf8');
      if (!options.silent) {
        console.log(`📄 Results written to: ${options.output}`);
      }
    } else if (!options.silent && !options.generateReport) {
      console.log(output);
    }

    // Print summary if not silent
    if (!options.silent) {
      printArchitectureSummary(results, duration);
    }

    // Exit with appropriate code
    if (options.exitCode) {
      const exitCode = calculateArchitectureExitCode(results);
      if (exitCode > 0) {
        process.exit(exitCode);
      }
    }

  } catch (error) {
    throw new Error(`Architecture check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function formatOutput(results: any, options: ArchitectureCheckOptions, duration: number): string {
  switch (options.format) {
    case 'json':
      return JSON.stringify({
        ...results,
        metadata: {
          checkDuration: duration,
          timestamp: new Date().toISOString()
        }
      }, null, 2);

    case 'summary':
      return formatSummaryOutput(results, duration);

    case 'table':
    default:
      return formatTableOutput(results);
  }
}

function formatTableOutput(results: any): string {
  let output = '\n🏗️  ARCHITECTURAL VALIDATION RESULTS:\n';
  output += '═'.repeat(120) + '\n';

  // Code Segregation Results
  if (results.segregation) {
    output += '\n🔍 CODE SEGREGATION ANALYSIS:\n';
    output += '─'.repeat(80) + '\n';

    if (results.segregation.violations.length === 0) {
      output += '✅ No code segregation violations found!\n';
    } else {
      output += `❌ Found ${results.segregation.violations.length} segregation issues:\n\n`;

      for (const violation of results.segregation.violations.slice(0, 5)) {
        const icon = getSeverityIcon(violation.severity);
        output += `${icon} ${violation.violationType} in ${violation.filePath}\n`;
        output += `   Content: ${violation.content}\n`;
        output += `   Suggestion: ${violation.suggestion}\n\n`;
      }

      if (results.segregation.violations.length > 5) {
        output += `... and ${results.segregation.violations.length - 5} more issues\n`;
      }
    }
  }

  // Distribution Results
  if (results.distribution) {
    output += '\n📦 DISTRIBUTION VALIDATION:\n';
    output += '─'.repeat(80) + '\n';

    for (const distResult of results.distribution) {
      const moduleName = path.basename(distResult.modulePath);
      output += `📦 ${moduleName}: ${distResult.hasValidDistribution ? '✅ Valid' : '❌ Invalid'}\n`;

      if (distResult.violations.length > 0) {
        for (const violation of distResult.violations.slice(0, 3)) {
          output += `   • ${violation.violationType}: ${violation.message}\n`;
        }
      }
    }
  }

  // Mock Detection Results
  if (results.mocks) {
    output += '\n🔍 MOCK IMPLEMENTATION DETECTION:\n';
    output += '─'.repeat(80) + '\n';

    if (results.mocks.violations.length === 0) {
      output += '✅ No mock implementations found!\n';
    } else {
      output += `❌ Found ${results.mocks.violations.length} mock implementations:\n\n`;

      const groupedMocks = groupMocksByType(results.mocks.violations);
      for (const [type, violations] of Object.entries(groupedMocks)) {
        if ((violations as any[]).length > 0) {
          output += `🔧 ${type}: ${(violations as any[]).length} instances\n`;
        }
      }
    }
  }

  // Build Results
  if (results.build) {
    output += '\n🔨 BUILD VALIDATION:\n';
    output += '─'.repeat(80) + '\n';

    output += `Overall Build Status: ${results.build.overallSuccess ? '✅ Success' : '❌ Failed'}\n\n`;

    for (const buildResult of results.build.results) {
      const moduleName = path.basename(buildResult.modulePath);
      output += `📦 ${moduleName}:\n`;
      output += `   TypeCheck: ${buildResult.typeCheckSuccess ? '✅' : '❌'}\n`;
      output += `   Build: ${buildResult.buildSuccess ? '✅' : '❌'}\n`;
      output += `   Tests: ${buildResult.testSuccess ? '✅' : '❌'}\n`;

      if (buildResult.errors.length > 0) {
        output += `   Errors: ${buildResult.errors.length}\n`;
      }
    }
  }

  // Dependency Results
  if (results.dependencies) {
    output += '\n🔗 DEPENDENCY ANALYSIS:\n';
    output += '─'.repeat(80) + '\n';

    output += `Modules analyzed: ${results.dependencies.scannedModules}/${results.dependencies.totalModules}\n`;
    output += `Circular dependencies: ${results.dependencies.circularDependencies.length}\n`;
    output += `External dependencies: ${results.dependencies.externalDependencies.size}\n`;
    output += `Dependency violations: ${results.dependencies.violations.length}\n`;

    if (results.dependencies.circularDependencies.length > 0) {
      output += '\n🔄 Circular Dependencies:\n';
      for (const circular of results.dependencies.circularDependencies.slice(0, 3)) {
        output += `   • ${circular.modules.join(' → ')}\n`;
      }
    }
  }

  return output;
}

function formatSummaryOutput(results: any, duration: number): string {
  let output = '\n🏗️  ARCHITECTURE VALIDATION SUMMARY\n';
  output += '═'.repeat(60) + '\n';

  const checks = Object.keys(results).filter(key => key !== 'report');
  output += `🔍 Checks performed: ${checks.length}\n`;

  let totalViolations = 0;
  let totalCritical = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  // Count violations from all checks
  for (const [checkName, checkResult] of Object.entries(results)) {
    if (checkName === 'report') continue;

    if (checkResult && typeof checkResult === 'object') {
      if (Array.isArray(checkResult)) {
        // Handle array results (like distribution)
        for (const item of checkResult) {
          if (item.violations) {
            totalViolations += item.violations.length;
            totalCritical += item.violations.filter((v: any) => v.severity === RuleSeverity.CRITICAL).length;
            totalErrors += item.violations.filter((v: any) => v.severity === RuleSeverity.ERROR).length;
            totalWarnings += item.violations.filter((v: any) => v.severity === RuleSeverity.WARNING).length;
          }
        }
      } else if ((checkResult as any).violations) {
        // Handle single result objects
        totalViolations += (checkResult as any).violations.length;
        totalCritical += (checkResult as any).violations.filter((v: any) => v.severity === RuleSeverity.CRITICAL).length;
        totalErrors += (checkResult as any).violations.filter((v: any) => v.severity === RuleSeverity.ERROR).length;
        totalWarnings += (checkResult as any).violations.filter((v: any) => v.severity === RuleSeverity.WARNING).length;
      }
    }
  }

  if (totalViolations === 0) {
    output += '✅ Status: ALL CHECKS PASSED\n';
    output += '🎉 Architecture is compliant!\n';
  } else {
    output += '❌ Status: VIOLATIONS FOUND\n';
    output += `📋 Total Violations: ${totalViolations}\n`;
    output += `🔴 Critical: ${totalCritical}\n`;
    output += `🟠 Errors: ${totalErrors}\n`;
    output += `🟡 Warnings: ${totalWarnings}\n`;
  }

  output += `⏱️  Duration: ${duration}ms\n`;
  output += `📅 Completed: ${new Date().toLocaleString()}\n`;

  // Recommendations
  if (totalViolations > 0) {
    output += '\n🔧 PRIORITY RECOMMENDATIONS:\n';
    output += '─'.repeat(40) + '\n';

    if (totalCritical > 0) {
      output += '🔴 Address critical violations immediately\n';
    }
    if (results.dependencies?.circularDependencies?.length > 0) {
      output += '🔄 Break circular dependencies\n';
    }
    if (results.mocks?.violations?.length > 0) {
      output += '🔍 Replace mock implementations with real code\n';
    }
    if (results.build && !results.build.overallSuccess) {
      output += '🔨 Fix build configuration issues\n';
    }
  }

  return output;
}

function printArchitectureSummary(results: any, duration: number): void {
  console.log('\n🏗️  ARCHITECTURE CHECK COMPLETE:');
  console.log('═'.repeat(60));

  const checks = Object.keys(results).filter(key => key !== 'report');
  const totalViolations = getTotalViolations(results);

  if (totalViolations === 0) {
    console.log('✅ Status: ARCHITECTURE COMPLIANT');
    console.log('🎉 All architectural requirements met!');
  } else {
    console.log('❌ Status: VIOLATIONS FOUND');
    console.log(`📋 Total Violations: ${totalViolations}`);

    // Show check-specific summaries
    for (const checkName of checks) {
      const checkResult = results[checkName];
      const violations = getCheckViolations(checkResult);
      const status = violations === 0 ? '✅' : '❌';
      console.log(`${status} ${checkName}: ${violations} violations`);
    }
  }

  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📅 Completed: ${new Date().toLocaleString()}`);
}

function getTotalViolations(results: any): number {
  let total = 0;

  for (const [key, result] of Object.entries(results)) {
    if (key === 'report') continue;
    total += getCheckViolations(result);
  }

  return total;
}

function getCheckViolations(checkResult: any): number {
  if (!checkResult) return 0;

  if (Array.isArray(checkResult)) {
    return checkResult.reduce((sum, item) => sum + (item.violations?.length || 0), 0);
  }

  return checkResult.violations?.length || 0;
}

function calculateArchitectureExitCode(results: any): number {
  const totalViolations = getTotalViolations(results);

  if (totalViolations === 0) return 0; // All passed

  // Check for critical violations
  let hasCritical = false;
  for (const [key, result] of Object.entries(results)) {
    if (key === 'report') continue;

    if (Array.isArray(result)) {
      hasCritical = result.some(item =>
        item.violations?.some((v: any) => v.severity === RuleSeverity.CRITICAL)
      );
    } else if ((result as any)?.violations) {
      hasCritical = (result as any).violations.some((v: any) => v.severity === RuleSeverity.CRITICAL);
    }

    if (hasCritical) break;
  }

  return hasCritical ? 2 : 1; // Critical violations or general violations
}

function groupMocksByType(violations: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};

  for (const violation of violations) {
    const type = violation.violationType || 'unknown';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(violation);
  }

  return grouped;
}

function getSeverityIcon(severity: RuleSeverity): string {
  const icons = {
    [RuleSeverity.CRITICAL]: '🔴',
    [RuleSeverity.ERROR]: '🟠',
    [RuleSeverity.WARNING]: '🟡',
    [RuleSeverity.AUTO_FIX]: '🟢'
  };
  return icons[severity] || '⚪';
}

async function loadConfig(configPath: string): Promise<any> {
  const resolvedPath = path.resolve(configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }

  const ext = path.extname(resolvedPath).toLowerCase();

  try {
    if (ext === '.json') {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      return JSON.parse(content);
    } else if (ext === '.js' || ext === '.ts') {
      const configModule = await import(resolvedPath);
      return configModule.default || configModule;
    } else {
      throw new Error(`Unsupported configuration file format: ${ext}`);
    }
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Run the CLI if this file is executed directly
if (require.main === module) {
  program.parse();
}