/**
 * Jest Global Setup for Load Testing
 * Prepares the environment for high-concurrency load tests
  */

import { execSync } from 'child_process';
import { cpus, totalmem, freemem } from 'os';
import fs from 'fs';
import path from 'path';

async function globalSetup(): Promise<void> {
  logger.info('🚀 Setting up CVPlus E2E Flows Load Test Environment');

  // Create reports directory
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
    logger.info(`📁 Created reports directory: ${reportsDir}`);
  }

  // System resource check
  logger.info('\n💻 System Resources:');
  logger.info(`   CPU Cores: ${cpus().length}`);
  logger.info(`   Total Memory: ${(totalmem() / (1024 ** 3)).toFixed(2)} GB`);
  logger.info(`   Free Memory: ${(freemem() / (1024 ** 3)).toFixed(2)} GB`);
  logger.info(`   Memory Usage: ${(((totalmem() - freemem()) / totalmem()) * 100).toFixed(1)}%`);

  // Check file descriptor limits
  try {
    const ulimit = execSync('ulimit -n', { encoding: 'utf8' }).trim();
    logger.info(`   File Descriptors: ${ulimit}`);

    if (parseInt(ulimit) < 10000) {
      logger.warn('⚠️  File descriptor limit is low for load testing');
      logger.warn('   Consider running: ulimit -n 65536');
    }
  } catch (error) {
    logger.warn('⚠️  Could not check file descriptor limits');
  }

  // Environment variables for load testing
  process.env.NODE_ENV = 'test';
  process.env.LOAD_TEST_MODE = 'true';
  process.env.LOAD_TEST_START_TIME = Date.now().toString();

  // Optimize garbage collection for load testing
  if (!process.env.NODE_OPTIONS) {
    process.env.NODE_OPTIONS = '--max-old-space-size=8192 --gc-interval=100';
  }

  // Warning checks
  const warnings: string[] = [];

  // Memory warning
  const freeMemoryGB = freemem() / (1024 ** 3);
  if (freeMemoryGB < 4) {
    warnings.push('Low available memory. Consider closing other applications.');
  }

  // CPU warning
  if (cpus().length < 4) {
    warnings.push('Limited CPU cores available. Load tests may take longer.');
  }

  if (warnings.length > 0) {
    logger.warn('\n⚠️  System Warnings:');
    warnings.forEach(warning => logger.warn(`   • ${warning}`));
  }

  logger.info('\n✅ Load test environment setup completed');
  logger.info('🎯 Ready for concurrent user load testing up to 10K users\n');
}

export default globalSetup;