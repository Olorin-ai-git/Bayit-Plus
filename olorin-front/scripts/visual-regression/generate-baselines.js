#!/usr/bin/env node

/**
 * Visual Regression Baseline Generation Script
 * Generates baseline screenshots for visual regression testing
 * Usage: npm run visual:baseline
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
  outputDir: './test-results/visual-regression',
  servicesStartTimeout: 30000, // 30 seconds
  screenshotDelay: 2000 // 2 seconds
};

/**
 * Check if services are running
 */
async function checkServices() {
  const services = [
    { name: 'core-ui', port: 3000 },
<<<<<<< HEAD
    { name: 'autonomous-investigation', port: 3001 },
=======
    { name: 'structured-investigation', port: 3001 },
>>>>>>> 001-modify-analyzer-method
    { name: 'manual-investigation', port: 3002 },
    { name: 'agent-analytics', port: 3003 }
  ];

  console.log('🔍 Checking if services are running...');

  for (const service of services) {
    try {
      const response = await fetch(`http://localhost:${service.port}`, {
        method: 'HEAD',
        timeout: 5000
      });

      if (response.ok) {
        console.log(`✅ ${service.name} is running on port ${service.port}`);
      } else {
        console.log(`❌ ${service.name} is not responding on port ${service.port}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ${service.name} is not running on port ${service.port}`);
      return false;
    }
  }

  return true;
}

/**
 * Start services if not running
 */
async function startServices() {
  console.log('🚀 Starting Olorin services...');

  return new Promise((resolve, reject) => {
    const startProcess = exec('npm run olorin', (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to start services:', error);
        reject(error);
        return;
      }
    });

    // Wait for services to be ready
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds with 1-second intervals

    const checkInterval = setInterval(async () => {
      attempts++;

      if (await checkServices()) {
        clearInterval(checkInterval);
        console.log('✅ All services are ready');
        resolve(startProcess);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        startProcess.kill();
        reject(new Error('Services failed to start within timeout'));
      } else {
        console.log(`⏳ Waiting for services... (${attempts}/${maxAttempts})`);
      }
    }, 1000);
  });
}

/**
 * Run baseline generation
 */
async function generateBaselines() {
  console.log('📸 Generating visual regression baselines...');

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    console.log(`✅ Created output directory: ${config.outputDir}`);
  }

  // Run TypeScript baseline generator
  return new Promise((resolve, reject) => {
    const command = 'npx ts-node src/shared/testing/visual-regression/baseline-generator.ts';

    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Baseline generation failed:', error);
        console.error('stderr:', stderr);
        reject(error);
        return;
      }

      console.log('stdout:', stdout);
      if (stderr) {
        console.warn('stderr:', stderr);
      }

      console.log('✅ Baseline generation completed');
      resolve();
    });
  });
}

/**
 * Generate report
 */
function generateReport() {
  const reportData = {
    timestamp: new Date().toISOString(),
    outputDir: config.outputDir,
    status: 'completed'
  };

  const reportPath = path.join(config.outputDir, 'generation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

  console.log(`📊 Generation report saved: ${reportPath}`);
}

/**
 * Cleanup function
 */
function cleanup(servicesProcess) {
  if (servicesProcess) {
    console.log('🛑 Stopping services...');
    servicesProcess.kill();
  }
}

/**
 * Main execution function
 */
async function main() {
  let servicesProcess = null;

  try {
    console.log('🎬 Starting visual regression baseline generation...');

    // Check if services are already running
    const servicesRunning = await checkServices();

    if (!servicesRunning) {
      servicesProcess = await startServices();
      // Give services additional time to fully initialize
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Generate baselines
    await generateBaselines();

    // Generate report
    generateReport();

    console.log('🎉 Visual regression baseline generation completed successfully!');
    console.log(`📁 Baselines saved to: ${config.outputDir}`);

  } catch (error) {
    console.error('💥 Baseline generation failed:', error);
    process.exit(1);
  } finally {
    cleanup(servicesProcess);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Process terminated');
  process.exit(0);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  checkServices,
  startServices,
  generateBaselines,
  generateReport
};