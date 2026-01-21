/**
 * Jest Global Setup for Load Testing
 * Prepares the environment for high-concurrency load tests
  */

import { execSync } from 'child_process';
import { cpus, totalmem, freemem } from 'os';
import fs from 'fs';
import path from 'path';

async function globalSetup(): Promise<void> {
  console.log('🚀 Setting up CVPlus E2E Flows Load Test Environment');

  // Create reports directory
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
    console.log(`📁 Created reports directory: ${reportsDir}`);
  }

  // System resource check
  console.log('\n💻 System Resources:');
  console.log(`   CPU Cores: ${cpus().length}`);
  console.log(`   Total Memory: ${(totalmem() / (1024 ** 3)).toFixed(2)} GB`);
  console.log(`   Free Memory: ${(freemem() / (1024 ** 3)).toFixed(2)} GB`);
  console.log(`   Memory Usage: ${(((totalmem() - freemem()) / totalmem()) * 100).toFixed(1)}%`);

  // Check file descriptor limits
  try {
    const ulimit = execSync('ulimit -n', { encoding: 'utf8' }).trim();
    console.log(`   File Descriptors: ${ulimit}`);

    if (parseInt(ulimit) < 10000) {
      console.warn('⚠️  File descriptor limit is low for load testing');
      console.warn('   Consider running: ulimit -n 65536');
    }
  } catch (error) {
    console.warn('⚠️  Could not check file descriptor limits');
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
    console.warn('\n⚠️  System Warnings:');
    warnings.forEach(warning => console.warn(`   • ${warning}`));
  }

  console.log('\n✅ Load test environment setup completed');
  console.log('🎯 Ready for concurrent user load testing up to 10K users\n');
}

export default globalSetup;