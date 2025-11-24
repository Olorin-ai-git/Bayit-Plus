#!/usr/bin/env node

/**
 * Visual Regression Test Runner Script
 * Runs visual regression tests and compares against baselines
 * Usage: npm run visual:test
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const config = {
  testDir: './src/shared/testing/visual-regression',
  outputDir: './test-results/visual-regression',
  playwrightConfig: './playwright.config.ts',
  servicesStartTimeout: 30000,
  testTimeout: 300000 // 5 minutes
};

/**
 * Check if baseline screenshots exist
 */
function checkBaselines() {
  const baselineDir = path.join(config.outputDir, 'baselines');

  if (!fs.existsSync(baselineDir)) {
    console.log('❌ No baseline screenshots found');
    console.log('💡 Run "npm run visual:baseline" first to generate baselines');
    return false;
  }

  const baselineFiles = fs.readdirSync(baselineDir, { recursive: true })
    .filter(file => file.endsWith('.png'));

  if (baselineFiles.length === 0) {
    console.log('❌ No baseline PNG files found');
    console.log('💡 Run "npm run visual:baseline" first to generate baselines');
    return false;
  }

  console.log(`✅ Found ${baselineFiles.length} baseline screenshots`);
  return true;
}

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://localhost:${service.port}`, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

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
    const startProcess = spawn('npm', ['run', 'olorin'], {
      stdio: 'pipe',
      shell: true
    });

    startProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    startProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    // Wait for services to be ready
    let attempts = 0;
    const maxAttempts = 30;

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
 * Run visual regression tests
 */
async function runVisualTests() {
  console.log('🧪 Running visual regression tests...');

  return new Promise((resolve, reject) => {
    const playwrightCommand = [
      'npx',
      'playwright',
      'test',
      '--project=visual-regression',
      '--config=' + config.playwrightConfig,
      config.testDir + '/*.visual.e2e.test.ts',
      '--reporter=html,json',
      '--output-dir=' + config.outputDir
    ];

    console.log(`🔧 Running command: ${playwrightCommand.join(' ')}`);

    const testProcess = spawn(playwrightCommand[0], playwrightCommand.slice(1), {
      stdio: 'inherit',
      shell: true,
      timeout: config.testTimeout
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Visual regression tests completed successfully');
        resolve();
      } else {
        console.log(`❌ Visual regression tests failed with exit code ${code}`);
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    testProcess.on('error', (error) => {
      console.error('❌ Failed to run visual regression tests:', error);
      reject(error);
    });
  });
}

/**
 * Generate comparison report
 */
function generateComparisonReport() {
  const reportData = {
    timestamp: new Date().toISOString(),
    testSuite: 'Visual Regression Tests',
    outputDir: config.outputDir,
    status: 'completed',
    resultsAvailable: true
  };

  // Check for Playwright HTML report
  const htmlReportPath = path.join(config.outputDir, 'playwright-report', 'index.html');
  const jsonReportPath = path.join(config.outputDir, 'results.json');

  if (fs.existsSync(htmlReportPath)) {
    reportData.htmlReport = htmlReportPath;
  }

  if (fs.existsSync(jsonReportPath)) {
    reportData.jsonReport = jsonReportPath;
    try {
      const jsonResults = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));
      reportData.testResults = {
        total: jsonResults.suites?.reduce((acc, suite) => acc + (suite.specs?.length || 0), 0) || 0,
        passed: jsonResults.suites?.reduce((acc, suite) =>
          acc + (suite.specs?.filter(spec => spec.tests?.some(test => test.status === 'passed'))?.length || 0), 0) || 0,
        failed: jsonResults.suites?.reduce((acc, suite) =>
          acc + (suite.specs?.filter(spec => spec.tests?.some(test => test.status === 'failed'))?.length || 0), 0) || 0
      };
    } catch (error) {
      console.warn('⚠️ Could not parse JSON test results:', error.message);
    }
  }

  const customReportHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Visual Regression Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .status { padding: 10px 20px; border-radius: 4px; margin: 10px 0; text-align: center; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #2563eb; }
        .links { margin: 20px 0; }
        .link-button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 5px; }
        .link-button:hover { background: #1d4ed8; }
        .section { margin: 30px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧪 Visual Regression Test Report</h1>
          <p>Generated: ${reportData.timestamp}</p>
          <div class="status ${reportData.status === 'completed' ? 'success' : 'error'}">
            Status: ${reportData.status === 'completed' ? 'COMPLETED' : 'FAILED'}
          </div>
        </div>

        ${reportData.testResults ? `
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number">${reportData.testResults.total}</div>
            <div>Total Tests</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: #059669;">${reportData.testResults.passed}</div>
            <div>Passed</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: #dc2626;">${reportData.testResults.failed}</div>
            <div>Failed</div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <h2>Test Reports</h2>
          <div class="links">
            ${reportData.htmlReport ? `<a href="${reportData.htmlReport}" class="link-button">📊 Playwright HTML Report</a>` : ''}
            ${reportData.jsonReport ? `<a href="${reportData.jsonReport}" class="link-button">📋 JSON Results</a>` : ''}
            <a href="${config.outputDir}" class="link-button">📁 Test Output Directory</a>
          </div>
        </div>

        <div class="section">
          <h2>Visual Differences</h2>
          <p>If tests failed due to visual differences, screenshots showing the differences are available in:</p>
          <ul>
            <li><strong>Actual:</strong> ${config.outputDir}/test-results/</li>
            <li><strong>Expected:</strong> ${config.outputDir}/baselines/</li>
            <li><strong>Differences:</strong> ${config.outputDir}/test-results/</li>
          </ul>
        </div>

        <div class="section">
          <h2>Next Steps</h2>
          <ol>
            <li>Review failed tests in the Playwright HTML report</li>
            <li>Examine visual differences in screenshot comparisons</li>
            <li>Update baselines if changes are intentional</li>
            <li>Fix UI issues if differences are unintentional</li>
          </ol>
        </div>
      </div>
    </body>
    </html>
  `;

  const customReportPath = path.join(config.outputDir, 'visual-regression-report.html');
  fs.writeFileSync(customReportPath, customReportHtml);

  const jsonReportPath = path.join(config.outputDir, 'visual-regression-summary.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));

  console.log(`📊 Visual regression report generated: ${customReportPath}`);
  return reportData;
}

/**
 * Cleanup function
 */
function cleanup(servicesProcess) {
  if (servicesProcess) {
    console.log('🛑 Stopping services...');
    servicesProcess.kill('SIGTERM');

    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (!servicesProcess.killed) {
        servicesProcess.kill('SIGKILL');
      }
    }, 5000);
  }
}

/**
 * Main execution function
 */
async function main() {
  let servicesProcess = null;

  try {
    console.log('🎬 Starting visual regression testing...');

    // Check if baselines exist
    if (!checkBaselines()) {
      process.exit(1);
    }

    // Check if services are running
    const servicesRunning = await checkServices();

    if (!servicesRunning) {
      servicesProcess = await startServices();
      // Give services additional time to fully initialize
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Run visual regression tests
    await runVisualTests();

    // Generate comparison report
    const report = generateComparisonReport();

    console.log('🎉 Visual regression testing completed!');
    console.log(`📊 Report: ${path.join(config.outputDir, 'visual-regression-report.html')}`);

    if (report.testResults && report.testResults.failed > 0) {
      console.log(`⚠️ ${report.testResults.failed} test(s) failed - review the report for details`);
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Visual regression testing failed:', error);
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
  checkBaselines,
  checkServices,
  startServices,
  runVisualTests,
  generateComparisonReport
};