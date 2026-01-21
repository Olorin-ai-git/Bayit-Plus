#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { getUnifiedModuleRequirementsService } from '../lib/index';
import { RuleSeverity } from '../models/types';

const program = new Command();

interface ValidateOptions {
  rules?: string;
  strict?: boolean;
  format?: 'table' | 'json' | 'csv';
  output?: string;
  silent?: boolean;
  exitCode?: boolean;
  config?: string;
}

program
  .name('validate-module')
  .description('Validate a module against CVPlus architectural requirements')
  .version('1.0.0')
  .argument('<module-path>', 'Path to the module to validate')
  .option('-r, --rules <rules>', 'Comma-separated list of rule IDs to run (default: all)')
  .option('-s, --strict', 'Enable strict mode validation', false)
  .option('-f, --format <format>', 'Output format: table, json, csv', 'table')
  .option('-o, --output <file>', 'Output file path (default: stdout)')
  .option('--silent', 'Suppress all output except errors', false)
  .option('--exit-code', 'Exit with non-zero code if violations found', true)
  .option('-c, --config <file>', 'Load configuration from file')
  .action(async (modulePath: string, options: ValidateOptions) => {
    try {
      await validateModule(modulePath, options);
    } catch (error) {
      console.error('❌ Validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

async function validateModule(modulePath: string, options: ValidateOptions): Promise<void> {
  // Resolve and validate module path
  const resolvedPath = path.resolve(modulePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Module path does not exist: ${resolvedPath}`);
  }

  if (!options.silent) {
    console.log(`🔍 Validating module: ${resolvedPath}`);
  }

  // Load configuration if specified
  let config: any = {};
  if (options.config) {
    config = await loadConfig(options.config);
  }

  // Parse rule IDs
  const ruleIds = options.rules
    ? options.rules.split(',').map(r => r.trim())
    : config.rules || [];

  // Get service and perform validation
  const service = getUnifiedModuleRequirementsService();
  const startTime = Date.now();

  const validationResult = await service.moduleValidator.validateModule({
    modulePath: resolvedPath,
    ruleIds,
    strictMode: options.strict || config.strictMode || false
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Format and output results
  const output = formatOutput(validationResult, options, duration);

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
    printSummary(validationResult, duration);
  }

  // Exit with appropriate code
  if (options.exitCode && validationResult.violations.length > 0) {
    const criticalCount = validationResult.violations.filter(v => v.severity === RuleSeverity.CRITICAL).length;
    const errorCount = validationResult.violations.filter(v => v.severity === RuleSeverity.ERROR).length;

    if (criticalCount > 0) {
      process.exit(2); // Critical violations
    } else if (errorCount > 0) {
      process.exit(1); // Error violations
    }
  }
}

function formatOutput(validationResult: any, options: ValidateOptions, duration: number): string {
  switch (options.format) {
    case 'json':
      return JSON.stringify({
        ...validationResult,
        metadata: {
          validationDuration: duration,
          timestamp: new Date().toISOString()
        }
      }, null, 2);

    case 'csv':
      return formatCsvOutput(validationResult);

    case 'table':
    default:
      return formatTableOutput(validationResult);
  }
}

function formatTableOutput(validationResult: any): string {
  if (validationResult.violations.length === 0) {
    return '✅ No violations found! Module is compliant.\n';
  }

  let output = '\n📋 VALIDATION VIOLATIONS:\n';
  output += '═'.repeat(80) + '\n';

  const groupedViolations = groupViolationsBySeverity(validationResult.violations);

  for (const [severity, violations] of Object.entries(groupedViolations)) {
    if ((violations as any[]).length === 0) continue;

    const icon = getSeverityIcon(severity as RuleSeverity);
    output += `\n${icon} ${severity.toUpperCase()} (${(violations as any[]).length})\n`;
    output += '─'.repeat(40) + '\n';

    for (const violation of violations as any[]) {
      output += `\n📁 File: ${violation.filePath}\n`;
      output += `🔧 Rule: ${violation.ruleId}\n`;
      output += `💬 Message: ${violation.message}\n`;
      if (violation.line) {
        output += `📍 Line: ${violation.line}\n`;
      }
      output += `💡 Remediation: ${violation.remediation}\n`;
      output += '─'.repeat(40) + '\n';
    }
  }

  return output;
}

function formatCsvOutput(validationResult: any): string {
  let csv = 'Severity,File,Rule,Line,Message,Remediation\n';

  for (const violation of validationResult.violations) {
    const fields = [
      violation.severity,
      violation.filePath,
      violation.ruleId,
      violation.line?.toString() || '',
      violation.message,
      violation.remediation
    ];

    csv += fields.map(field => `"${field.replace(/"/g, '""')}"`).join(',') + '\n';
  }

  return csv;
}

function groupViolationsBySeverity(violations: any[]): Record<RuleSeverity, any[]> {
  const grouped: Record<RuleSeverity, any[]> = {
    [RuleSeverity.CRITICAL]: [],
    [RuleSeverity.ERROR]: [],
    [RuleSeverity.WARNING]: [],
    [RuleSeverity.AUTO_FIX]: []
  };

  for (const violation of violations) {
    grouped[violation.severity].push(violation);
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

function printSummary(validationResult: any, duration: number): void {
  console.log('\n📊 VALIDATION SUMMARY:');
  console.log('═'.repeat(50));

  const totalViolations = validationResult.violations.length;
  const severityBreakdown = groupViolationsBySeverity(validationResult.violations);

  if (totalViolations === 0) {
    console.log('✅ Status: PASSED');
    console.log('🎉 No violations found!');
  } else {
    console.log('❌ Status: FAILED');
    console.log(`📋 Total Violations: ${totalViolations}`);

    for (const [severity, violations] of Object.entries(severityBreakdown)) {
      if ((violations as any[]).length > 0) {
        const icon = getSeverityIcon(severity as RuleSeverity);
        console.log(`${icon} ${severity}: ${(violations as any[]).length}`);
      }
    }
  }

  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📅 Completed: ${new Date().toLocaleString()}`);
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
      // Dynamic import for JS/TS config files
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