#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';
import { getUnifiedModuleRequirementsService } from '../lib/index';
import { RuleSeverity } from '../models/types';

const program = new Command();

interface BatchValidateOptions {
  rules?: string;
  strict?: boolean;
  format?: 'table' | 'json' | 'csv' | 'summary';
  output?: string;
  silent?: boolean;
  exitCode?: boolean;
  config?: string;
  parallel?: boolean;
  maxConcurrency?: string;
  filter?: string;
  exclude?: string;
  continueOnError?: boolean;
}

program
  .name('batch-validate')
  .description('Validate multiple CVPlus modules in batch')
  .version('1.0.0')
  .argument('<pattern>', 'Glob pattern for module paths (e.g., "packages/*")')
  .option('-r, --rules <rules>', 'Comma-separated list of rule IDs to run (default: all)')
  .option('-s, --strict', 'Enable strict mode validation', false)
  .option('-f, --format <format>', 'Output format: table, json, csv, summary', 'table')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .option('--silent', 'Suppress all output except errors', false)
  .option('--exit-code', 'Exit with non-zero code if violations found', true)
  .option('-c, --config <file>', 'Load configuration from file')
  .option('--parallel', 'Run validations in parallel', true)
  .option('--max-concurrency <num>', 'Maximum concurrent validations', '4')
  .option('--filter <pattern>', 'Filter modules by name pattern')
  .option('--exclude <pattern>', 'Exclude modules by name pattern')
  .option('--continue-on-error', 'Continue validation even if some modules fail', true)
  .action(async (pattern: string, options: BatchValidateOptions) => {
    try {
      await batchValidate(pattern, options);
    } catch (error) {
      console.error('❌ Batch validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

async function batchValidate(pattern: string, options: BatchValidateOptions): Promise<void> {
  if (!options.silent) {
    console.log(`🔍 Batch validating modules: ${pattern}`);
  }

  // Load configuration if specified
  let config: any = {};
  if (options.config) {
    config = await loadConfig(options.config);
  }

  // Find module paths
  const modulePaths = await findModulePaths(pattern, options);

  if (modulePaths.length === 0) {
    console.log('⚠️  No modules found matching pattern.');
    return;
  }

  if (!options.silent) {
    console.log(`📁 Found ${modulePaths.length} modules to validate`);
  }

  // Parse rule IDs
  const ruleIds = options.rules
    ? options.rules.split(',').map(r => r.trim())
    : config.rules || [];

  // Prepare validation requests
  const validationRequests = modulePaths.map(modulePath => ({
    modulePath,
    ruleIds,
    strictMode: options.strict || config.strictMode || false
  }));

  // Get service and perform batch validation
  const service = getUnifiedModuleRequirementsService();
  const startTime = Date.now();

  const batchResult = await service.batchValidator.validateBatch({
    validationRequests,
    parallel: options.parallel !== false,
    maxConcurrency: parseInt(options.maxConcurrency || '4'),
    continueOnError: options.continueOnError !== false
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Format and output results
  const output = formatOutput(batchResult, options, duration);

  if (options.output) {
    fs.writeFileSync(options.output, output, 'utf8');
    if (!options.silent) {
      console.log(`📄 Results written to: ${options.output}`);
    }
  } else if (!options.silent) {
    console.log(output);
  }

  // Print summary if not silent
  if (!options.silent) {
    printBatchSummary(batchResult, duration);
  }

  // Exit with appropriate code
  if (options.exitCode) {
    const exitCode = calculateExitCode(batchResult);
    if (exitCode > 0) {
      process.exit(exitCode);
    }
  }
}

async function findModulePaths(pattern: string, options: BatchValidateOptions): Promise<string[]> {
  // Use glob to find matching directories
  const matches = await glob(pattern, {
    absolute: true
  });

  let modulePaths = matches.filter(match => {
    // Only include directories that exist and contain package.json
    if (!fs.existsSync(match)) return false;
    const stat = fs.statSync(match);
    if (!stat.isDirectory()) return false;

    const packageJsonPath = path.join(match, 'package.json');
    return fs.existsSync(packageJsonPath);
  });

  // Apply filters
  if (options.filter) {
    const filterRegex = new RegExp(options.filter, 'i');
    modulePaths = modulePaths.filter(modulePath =>
      filterRegex.test(path.basename(modulePath))
    );
  }

  if (options.exclude) {
    const excludeRegex = new RegExp(options.exclude, 'i');
    modulePaths = modulePaths.filter(modulePath =>
      !excludeRegex.test(path.basename(modulePath))
    );
  }

  return modulePaths.sort();
}

function formatOutput(batchResult: any, options: BatchValidateOptions, duration: number): string {
  switch (options.format) {
    case 'json':
      return JSON.stringify({
        ...batchResult,
        metadata: {
          validationDuration: duration,
          timestamp: new Date().toISOString()
        }
      }, null, 2);

    case 'csv':
      return formatCsvOutput(batchResult);

    case 'summary':
      return formatSummaryOutput(batchResult, duration);

    case 'table':
    default:
      return formatTableOutput(batchResult);
  }
}

function formatTableOutput(batchResult: any): string {
  let output = '\n📋 BATCH VALIDATION RESULTS:\n';
  output += '═'.repeat(120) + '\n';

  if (batchResult.results.length === 0) {
    return '⚠️  No validation results to display.\n';
  }

  // Group results by status
  const passed = batchResult.results.filter((r: any) => r.violations.length === 0);
  const failed = batchResult.results.filter((r: any) => r.violations.length > 0);
  const errors = batchResult.results.filter((r: any) => r.error);

  // Summary header
  output += `📊 SUMMARY: ${batchResult.results.length} modules | `;
  output += `✅ ${passed.length} passed | ❌ ${failed.length} failed | 🔥 ${errors.length} errors\n\n`;

  // Show failed modules first
  if (failed.length > 0) {
    output += '❌ FAILED MODULES:\n';
    output += '─'.repeat(80) + '\n';

    for (const result of failed) {
      const moduleName = path.basename(result.modulePath);
      const criticalCount = result.violations.filter((v: any) => v.severity === RuleSeverity.CRITICAL).length;
      const errorCount = result.violations.filter((v: any) => v.severity === RuleSeverity.ERROR).length;
      const warningCount = result.violations.filter((v: any) => v.severity === RuleSeverity.WARNING).length;

      output += `\n📦 ${moduleName}\n`;
      output += `📁 ${result.modulePath}\n`;
      output += `🔴 Critical: ${criticalCount} | 🟠 Errors: ${errorCount} | 🟡 Warnings: ${warningCount}\n`;

      // Show top violations
      const topViolations = result.violations.slice(0, 3);
      for (const violation of topViolations) {
        const icon = getSeverityIcon(violation.severity);
        output += `   ${icon} ${violation.ruleId}: ${violation.message}\n`;
      }

      if (result.violations.length > 3) {
        output += `   ... and ${result.violations.length - 3} more violations\n`;
      }

      output += '─'.repeat(80) + '\n';
    }
  }

  // Show error modules
  if (errors.length > 0) {
    output += '\n🔥 ERROR MODULES:\n';
    output += '─'.repeat(80) + '\n';

    for (const result of errors) {
      const moduleName = path.basename(result.modulePath);
      output += `📦 ${moduleName}: ${result.error}\n`;
    }
  }

  // Show passed modules (summary only)
  if (passed.length > 0) {
    output += '\n✅ PASSED MODULES:\n';
    output += '─'.repeat(80) + '\n';

    const passedNames = passed.map((r: any) => path.basename(r.modulePath));
    const chunkedNames = chunkArray(passedNames, 4);

    for (const chunk of chunkedNames) {
      output += `   ${chunk.join(', ')}\n`;
    }
  }

  return output;
}

function formatCsvOutput(batchResult: any): string {
  let csv = 'Module,Status,Critical,Errors,Warnings,TotalViolations,ErrorMessage\n';

  for (const result of batchResult.results) {
    const moduleName = path.basename(result.modulePath);
    const status = result.error ? 'ERROR' : (result.violations.length === 0 ? 'PASSED' : 'FAILED');

    const criticalCount = result.violations.filter((v: any) => v.severity === RuleSeverity.CRITICAL).length;
    const errorCount = result.violations.filter((v: any) => v.severity === RuleSeverity.ERROR).length;
    const warningCount = result.violations.filter((v: any) => v.severity === RuleSeverity.WARNING).length;

    const fields = [
      moduleName,
      status,
      criticalCount.toString(),
      errorCount.toString(),
      warningCount.toString(),
      result.violations.length.toString(),
      result.error || ''
    ];

    csv += fields.map(field => `"${field.replace(/"/g, '""')}"`).join(',') + '\n';
  }

  return csv;
}

function formatSummaryOutput(batchResult: any, duration: number): string {
  let output = '\n📊 BATCH VALIDATION SUMMARY\n';
  output += '═'.repeat(50) + '\n';

  const total = batchResult.results.length;
  const passed = batchResult.results.filter((r: any) => !r.error && r.violations.length === 0).length;
  const failed = batchResult.results.filter((r: any) => !r.error && r.violations.length > 0).length;
  const errors = batchResult.results.filter((r: any) => r.error).length;

  const totalViolations = batchResult.results.reduce((sum: number, r: any) => sum + r.violations.length, 0);

  output += `📦 Total Modules: ${total}\n`;
  output += `✅ Passed: ${passed} (${Math.round(passed / total * 100)}%)\n`;
  output += `❌ Failed: ${failed} (${Math.round(failed / total * 100)}%)\n`;
  output += `🔥 Errors: ${errors} (${Math.round(errors / total * 100)}%)\n`;
  output += `📋 Total Violations: ${totalViolations}\n`;
  output += `⏱️  Duration: ${duration}ms\n`;
  output += `📅 Completed: ${new Date().toLocaleString()}\n`;

  if (failed > 0) {
    output += '\n🔧 REMEDIATION PRIORITY:\n';
    output += '─'.repeat(30) + '\n';

    const failedModules = batchResult.results.filter((r: any) => r.violations.length > 0);
    const sortedByPriority = failedModules.sort((a: any, b: any) => {
      const aCritical = a.violations.filter((v: any) => v.severity === RuleSeverity.CRITICAL).length;
      const bCritical = b.violations.filter((v: any) => v.severity === RuleSeverity.CRITICAL).length;
      return bCritical - aCritical;
    });

    for (const result of sortedByPriority.slice(0, 5)) {
      const moduleName = path.basename(result.modulePath);
      const criticalCount = result.violations.filter((v: any) => v.severity === RuleSeverity.CRITICAL).length;
      const priority = criticalCount > 0 ? '🔴 HIGH' : '🟠 MEDIUM';
      output += `${priority} ${moduleName} (${result.violations.length} issues)\n`;
    }

    if (failedModules.length > 5) {
      output += `... and ${failedModules.length - 5} more modules\n`;
    }
  }

  return output;
}

function printBatchSummary(batchResult: any, duration: number): void {
  console.log('\n📊 BATCH VALIDATION COMPLETE:');
  console.log('═'.repeat(50));

  const total = batchResult.results.length;
  const passed = batchResult.results.filter((r: any) => !r.error && r.violations.length === 0).length;
  const failed = batchResult.results.filter((r: any) => !r.error && r.violations.length > 0).length;
  const errors = batchResult.results.filter((r: any) => r.error).length;

  if (passed === total) {
    console.log('✅ Status: ALL PASSED');
    console.log('🎉 All modules are compliant!');
  } else {
    console.log('❌ Status: ISSUES FOUND');
    console.log(`📦 Modules: ${total} total`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🔥 Errors: ${errors}`);
  }

  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📅 Completed: ${new Date().toLocaleString()}`);
}

function calculateExitCode(batchResult: any): number {
  const hasErrors = batchResult.results.some((r: any) => r.error);
  const hasCritical = batchResult.results.some((r: any) =>
    r.violations.some((v: any) => v.severity === RuleSeverity.CRITICAL)
  );
  const hasViolations = batchResult.results.some((r: any) => r.violations.length > 0);

  if (hasErrors) return 3; // System errors
  if (hasCritical) return 2; // Critical violations
  if (hasViolations) return 1; // Any violations
  return 0; // All passed
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

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
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