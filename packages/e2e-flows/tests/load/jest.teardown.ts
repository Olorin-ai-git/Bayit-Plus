/**
 * Jest Global Teardown for Load Testing
 * Cleanup after high-concurrency load tests
  */

import fs from 'fs';
import path from 'path';

async function globalTeardown(): Promise<void> {
  console.log('\n🧹 Cleaning up CVPlus E2E Flows Load Test Environment');

  // Calculate test duration
  const startTime = parseInt(process.env.LOAD_TEST_START_TIME || '0');
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log(`⏱️  Total test duration: ${duration.toFixed(1)} seconds`);

  // Generate final test summary
  const reportsDir = path.join(__dirname, 'reports');
  const summaryPath = path.join(reportsDir, 'test-session-summary.json');

  const summary = {
    startTime,
    endTime,
    duration,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsage: process.memoryUsage(),
    resourceUsage: process.resourceUsage ? process.resourceUsage() : null,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      loadTestMode: process.env.LOAD_TEST_MODE
    }
  };

  try {
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Test session summary saved to: ${summaryPath}`);
  } catch (error) {
    console.warn(`⚠️  Could not save test session summary: ${error.message}`);
  }

  // Force garbage collection if possible
  if (global.gc) {
    global.gc();
    console.log('🗑️  Forced garbage collection');
  }

  // Display final memory usage
  const memUsage = process.memoryUsage();
  console.log('\n💾 Final Memory Usage:');
  console.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);

  // Cleanup environment variables
  delete process.env.LOAD_TEST_MODE;
  delete process.env.LOAD_TEST_START_TIME;

  console.log('\n✅ Load test environment cleanup completed');

  // Force exit to ensure all resources are released
  setTimeout(() => {
    console.log('🔚 Forcing process exit to release all resources');
    process.exit(0);
  }, 1000);
}

export default globalTeardown;