#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();

program
  .name('cvplus-modules')
  .description('CVPlus Module Requirements Management CLI')
  .version('1.0.0');

// Add validate-module command
program
  .command('validate <module-path>')
  .description('Validate a module against CVPlus requirements')
  .option('-r, --rules <rules>', 'Comma-separated list of rule IDs')
  .option('-s, --strict', 'Enable strict mode validation')
  .option('-f, --format <format>', 'Output format: table, json, csv', 'table')
  .option('-o, --output <file>', 'Output file path')
  .option('--silent', 'Suppress output except errors')
  .option('--exit-code', 'Exit with non-zero code if violations found', true)
  .option('-c, --config <file>', 'Load configuration from file')
  .action(async (modulePath: string, options: any) => {
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);

      const cliPath = path.join(__dirname, 'validate-module.ts');
      const args = [cliPath, modulePath];

      // Add options to args
      if (options.rules) args.push('--rules', options.rules);
      if (options.strict) args.push('--strict');
      if (options.format) args.push('--format', options.format);
      if (options.output) args.push('--output', options.output);
      if (options.silent) args.push('--silent');
      if (!options.exitCode) args.push('--no-exit-code');
      if (options.config) args.push('--config', options.config);

      const { stdout, stderr } = await execFileAsync('npx', ['ts-node', ...args], {
        stdio: 'inherit'
      });

      if (stderr) {
        console.error(stderr);
        process.exit(1);
      }

      if (stdout) {
        console.log(stdout);
      }

    } catch (error) {
      console.error('❌ Validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Add generate command
program
  .command('generate <module-name>')
  .description('Generate a new CVPlus module from templates')
  .option('-t, --template <name>', 'Template name to use')
  .option('-o, --output <path>', 'Output directory')
  .option('-i, --interactive', 'Enable interactive mode')
  .option('--overwrite', 'Overwrite existing files')
  .option('--validate', 'Validate generated module', true)
  .option('-c, --config <file>', 'Load configuration from file')
  .option('--dry-run', 'Show what would be generated')
  .option('--silent', 'Suppress output except errors')
  .action(async (moduleName: string, options: any) => {
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);

      const cliPath = path.join(__dirname, 'generate-module.ts');
      const args = [cliPath, moduleName];

      // Add options to args
      if (options.template) args.push('--template', options.template);
      if (options.output) args.push('--output', options.output);
      if (options.interactive) args.push('--interactive');
      if (options.overwrite) args.push('--overwrite');
      if (!options.validate) args.push('--no-validate');
      if (options.config) args.push('--config', options.config);
      if (options.dryRun) args.push('--dry-run');
      if (options.silent) args.push('--silent');

      const { stdout, stderr } = await execFileAsync('npx', ['ts-node', ...args], {
        stdio: 'inherit'
      });

      if (stderr) {
        console.error(stderr);
        process.exit(1);
      }

      if (stdout) {
        console.log(stdout);
      }

    } catch (error) {
      console.error('❌ Generation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Add batch-validate command
program
  .command('batch-validate <pattern>')
  .description('Validate multiple modules in batch')
  .option('-r, --rules <rules>', 'Comma-separated list of rule IDs')
  .option('-s, --strict', 'Enable strict mode validation')
  .option('-f, --format <format>', 'Output format: table, json, csv, summary', 'table')
  .option('-o, --output <file>', 'Output file path')
  .option('--silent', 'Suppress output except errors')
  .option('--exit-code', 'Exit with non-zero code if violations found', true)
  .option('-c, --config <file>', 'Load configuration from file')
  .option('--parallel', 'Run validations in parallel', true)
  .option('--max-concurrency <num>', 'Maximum concurrent validations', '4')
  .option('--filter <pattern>', 'Filter modules by name pattern')
  .option('--exclude <pattern>', 'Exclude modules by name pattern')
  .option('--continue-on-error', 'Continue on validation errors', true)
  .action(async (pattern: string, options: any) => {
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);

      const cliPath = path.join(__dirname, 'batch-validate.ts');
      const args = [cliPath, pattern];

      // Add options to args
      if (options.rules) args.push('--rules', options.rules);
      if (options.strict) args.push('--strict');
      if (options.format) args.push('--format', options.format);
      if (options.output) args.push('--output', options.output);
      if (options.silent) args.push('--silent');
      if (!options.exitCode) args.push('--no-exit-code');
      if (options.config) args.push('--config', options.config);
      if (!options.parallel) args.push('--no-parallel');
      if (options.maxConcurrency) args.push('--max-concurrency', options.maxConcurrency);
      if (options.filter) args.push('--filter', options.filter);
      if (options.exclude) args.push('--exclude', options.exclude);
      if (!options.continueOnError) args.push('--no-continue-on-error');

      const { stdout, stderr } = await execFileAsync('npx', ['ts-node', ...args], {
        stdio: 'inherit'
      });

      if (stderr) {
        console.error(stderr);
        process.exit(1);
      }

      if (stdout) {
        console.log(stdout);
      }

    } catch (error) {
      console.error('❌ Batch validation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Add check-architecture command
program
  .command('check-architecture <module-paths...>')
  .description('Comprehensive architectural validation')
  .option('-c, --checks <checks>', 'Checks to run: segregation,distribution,mocks,build,dependencies')
  .option('-s, --strict', 'Enable strict mode')
  .option('-f, --format <format>', 'Output format: table, json, html, summary', 'table')
  .option('-o, --output <file>', 'Output file path')
  .option('--silent', 'Suppress output except errors')
  .option('--exit-code', 'Exit with non-zero code if violations found', true)
  .option('--config <file>', 'Load configuration from file')
  .option('--generate-report', 'Generate comprehensive HTML report')
  .option('--visualize', 'Generate dependency visualization')
  .action(async (modulePaths: string[], options: any) => {
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);

      const cliPath = path.join(__dirname, 'check-architecture.ts');
      const args = [cliPath, ...modulePaths];

      // Add options to args
      if (options.checks) args.push('--checks', options.checks);
      if (options.strict) args.push('--strict');
      if (options.format) args.push('--format', options.format);
      if (options.output) args.push('--output', options.output);
      if (options.silent) args.push('--silent');
      if (!options.exitCode) args.push('--no-exit-code');
      if (options.config) args.push('--config', options.config);
      if (options.generateReport) args.push('--generate-report');
      if (options.visualize) args.push('--visualize');

      const { stdout, stderr } = await execFileAsync('npx', ['ts-node', ...args], {
        stdio: 'inherit'
      });

      if (stderr) {
        console.error(stderr);
        process.exit(1);
      }

      if (stdout) {
        console.log(stdout);
      }

    } catch (error) {
      console.error('❌ Architecture check failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Add list-templates command
program
  .command('list-templates')
  .description('List available module templates')
  .option('-f, --format <format>', 'Output format: table, json', 'table')
  .action(async (options: any) => {
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);

      const cliPath = path.join(__dirname, 'generate-module.ts');
      const args = [cliPath, 'list-templates'];

      if (options.format) args.push('--format', options.format);

      const { stdout, stderr } = await execFileAsync('npx', ['ts-node', ...args], {
        stdio: 'inherit'
      });

      if (stderr) {
        console.error(stderr);
        process.exit(1);
      }

      if (stdout) {
        console.log(stdout);
      }

    } catch (error) {
      console.error('❌ Failed to list templates:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Add info command to show system status
program
  .command('info')
  .description('Show system information and status')
  .action(async () => {
    try {
      console.log('🏗️  CVPlus Module Requirements System');
      console.log('═'.repeat(50));
      console.log(`Version: 1.0.0`);
      console.log(`Node.js: ${process.version}`);
      console.log(`Platform: ${process.platform}`);
      console.log(`Working Directory: ${process.cwd()}`);

      // Check if we're in a CVPlus project
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log(`Project: ${packageJson.name || 'Unknown'}`);
        console.log(`Project Version: ${packageJson.version || 'Unknown'}`);
      }

      // Show available commands
      console.log('\n🔧 Available Commands:');
      console.log('─'.repeat(30));
      console.log('• validate <module>     - Validate a module');
      console.log('• generate <name>       - Generate a new module');
      console.log('• batch-validate <glob> - Validate multiple modules');
      console.log('• check-architecture    - Full architectural check');
      console.log('• list-templates        - Show available templates');
      console.log('• info                  - Show this information');

      console.log('\n💡 Quick Start:');
      console.log('─'.repeat(20));
      console.log('cvplus-modules validate ./packages/my-module');
      console.log('cvplus-modules generate my-new-module --interactive');
      console.log('cvplus-modules batch-validate "packages/*"');
      console.log('cvplus-modules check-architecture packages/core packages/auth');

    } catch (error) {
      console.error('❌ Failed to show info:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Handle unknown commands
program
  .command('*', '', { noHelp: true })
  .action((cmd) => {
    console.error(`❌ Unknown command: ${cmd}`);
    console.log('\n💡 Available commands:');
    console.log('• validate      - Validate a module');
    console.log('• generate      - Generate a new module');
    console.log('• batch-validate - Validate multiple modules');
    console.log('• check-architecture - Full architectural check');
    console.log('• list-templates - Show available templates');
    console.log('• info          - Show system information');
    console.log('\nRun "cvplus-modules --help" for more details.');
    process.exit(1);
  });

// Show help when no command is provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
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

// Parse command line arguments
program.parse();

// Export for programmatic use
export { program };
export default program;