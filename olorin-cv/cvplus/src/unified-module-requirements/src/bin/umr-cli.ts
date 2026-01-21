#!/usr/bin/env node

/**
 * CVPlus Unified Module Requirements CLI
 * Command-line interface for the module requirements validation system
 */

import { Command } from 'commander';
import { CVPlusIntegration } from '../integration/CVPlusIntegration';
import { getUnifiedModuleRequirementsService } from '../lib/index';
import { config } from '../config/environment';
import { VERSION, SYSTEM_NAME } from '../index';

const program = new Command();
const integration = new CVPlusIntegration();
const service = getUnifiedModuleRequirementsService();

program
  .name('umr')
  .description('CVPlus Unified Module Requirements validation tool')
  .version(VERSION);

// Discover command
program
  .command('discover')
  .description('Discover all CVPlus modules')
  .option('-v, --verbose', 'Show detailed module information')
  .action(async (options) => {
    try {
      console.log('🔍 Discovering CVPlus modules...');
      const modules = await integration.discoverModules();

      console.log(`\n📦 Found ${modules.length} modules:`);
      modules.forEach(module => {
        console.log(`  ${module.name} (${module.version})`);
        if (options.verbose) {
          console.log(`    Path: ${module.path}`);
          console.log(`    TypeScript: ${module.hasTypeScript ? '✅' : '❌'}`);
          console.log(`    Build Script: ${module.hasBuildScript ? '✅' : '❌'}`);
          console.log(`    Test Script: ${module.hasTestScript ? '✅' : '❌'}`);
          console.log(`    Dist Folder: ${module.hasDistFolder ? '✅' : '❌'}`);
          console.log(`    Dependencies: ${module.dependencies.length}`);
          console.log('');
        }
      });
    } catch (error) {
      console.error('❌ Discovery failed:', error);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate CVPlus modules')
  .option('-m, --modules <modules...>', 'Specific modules to validate (default: all)')
  .option('-q, --quick', 'Perform quick validation only')
  .option('-s, --strict', 'Enable strict mode validation')
  .option('-f, --format <format>', 'Output format (json, table)', 'table')
  .action(async (options) => {
    try {
      console.log('🔍 Starting module validation...');

      if (options.quick && options.modules) {
        // Quick validation for specific modules
        const result = await integration.quickValidateModules(options.modules);
        console.log('\n📊 Quick Validation Results:');
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Full validation
        const result = await integration.validateAllModules();

        console.log('\n📊 Validation Summary:');
        console.log(`  Total Modules: ${result.summary.totalModules}`);
        console.log(`  Valid Modules: ${result.summary.validModules} ✅`);
        console.log(`  Invalid Modules: ${result.summary.invalidModules} ❌`);
        console.log(`  Critical Violations: ${result.summary.criticalViolations} 🔴`);
        console.log(`  Warnings: ${result.summary.warnings} 🟡`);

        if (options.format === 'json') {
          console.log('\n📄 Full Results:');
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log('\n📋 Module Details:');
          result.validationResults.forEach((validation, index) => {
            const module = result.modules[index];
            console.log(`\n  ${module.name}:`);
            console.log(`    Valid: ${validation.isValid ? '✅' : '❌'}`);
            console.log(`    Violations: ${validation.violations.length}`);
            if (validation.violations.length > 0) {
              validation.violations.forEach(violation => {
                const icon = violation.severity === 'CRITICAL' ? '🔴' : '🟡';
                console.log(`      ${icon} ${violation.ruleId}: ${violation.message}`);
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

// Compliance command
program
  .command('compliance')
  .description('Check architectural compliance')
  .option('-r, --requirements <requirements...>', 'Specific requirements to check')
  .option('-f, --format <format>', 'Output format (json, table)', 'table')
  .action(async (options) => {
    try {
      console.log('🏗️  Checking architectural compliance...');

      const result = await integration.checkArchitecturalCompliance(options.requirements);

      console.log('\n📊 Compliance Summary:');
      console.log(`  Overall Compliance: ${result.overallCompliance ? '✅' : '❌'} (${result.compliancePercentage}%)`);

      console.log('\n📋 Requirement Results:');
      result.requirementResults.forEach(req => {
        const icon = req.compliant ? '✅' : '❌';
        console.log(`  ${icon} ${req.requirement}: ${req.violations} violations (${req.criticalViolations} critical)`);
      });

      if (result.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        result.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
      }

      if (options.format === 'json') {
        console.log('\n📄 Full Results:');
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('❌ Compliance check failed:', error);
      process.exit(1);
    }
  });

// Architecture command
program
  .command('architecture')
  .description('Generate architectural analysis')
  .option('-f, --format <format>', 'Report format (html, json, markdown)', 'html')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    try {
      console.log('🏗️  Generating architectural analysis...');

      const result = await integration.generateArchitecturalAnalysis();

      if (options.output) {
        const fs = require('fs').promises;
        await fs.writeFile(options.output, result.report.content);
        console.log(`✅ Analysis saved to: ${options.output}`);
      } else {
        console.log('\n📊 Architectural Analysis:');
        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.report.content);
        }
      }
    } catch (error) {
      console.error('❌ Architecture analysis failed:', error);
      process.exit(1);
    }
  });

// Health command
program
  .command('health')
  .description('Check system health')
  .action(async () => {
    try {
      console.log('🏥 Checking system health...');

      const health = service.getServiceStatus();

      console.log('\n📊 Service Status:');
      Object.entries(health).forEach(([serviceName, status]) => {
        const icon = status ? '✅' : '❌';
        console.log(`  ${icon} ${serviceName}`);
      });

      console.log('\n⚙️  Configuration:');
      console.log(`  Environment: ${config.environment}`);
      console.log(`  Max Concurrent Validations: ${config.maxConcurrentValidations}`);
      console.log(`  Strict Mode: ${config.enableStrictMode ? 'Enabled' : 'Disabled'}`);
      console.log(`  Cache: ${config.enableCache ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      console.error('❌ Health check failed:', error);
      process.exit(1);
    }
  });

// Server command
program
  .command('server')
  .description('Start the API server')
  .option('-p, --port <port>', 'Server port', '3001')
  .option('-h, --host <host>', 'Server host', '0.0.0.0')
  .action(async (options) => {
    try {
      // Update configuration
      config.port = parseInt(options.port);
      config.host = options.host;

      // Import and start server
      const { ModuleRequirementsServer } = require('../api/server');
      const server = new ModuleRequirementsServer();

      console.log('🚀 Starting API server...');
      await server.start();

      console.log(`✅ Server running at: http://${config.host}:${config.port}`);
      console.log(`📖 API Documentation: http://${config.host}:${config.port}/api/v1/docs`);

      // Handle graceful shutdown
      process.on('SIGTERM', async () => {
        console.log('\n📡 Shutting down server...');
        await server.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ Server failed to start:', error);
      process.exit(1);
    }
  });

// Global error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Parse arguments
program.parse();