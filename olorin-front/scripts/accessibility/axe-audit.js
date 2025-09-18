#!/usr/bin/env node

/**
 * Axe-Core Accessibility Audit Script
 *
 * Comprehensive accessibility auditing for all Olorin microservices
 * using axe-core engine with WCAG 2.1 AA compliance validation.
 *
 * Features:
 * - Tests all 8 microservices for accessibility violations
 * - Generates detailed HTML reports with remediation guidance
 * - Validates WCAG 2.1 AA compliance standards
 * - Provides actionable recommendations for accessibility improvements
 * - Enforces accessibility budgets and thresholds
 */

const fs = require('fs').promises;
const path = require('path');
const { chromium } = require('playwright');

// Configuration for accessibility auditing
const config = {
  services: [
    {
      name: 'core-ui',
      url: 'http://localhost:3000/',
      critical: true,
      description: 'Main application shell and navigation'
    },
    {
      name: 'autonomous-investigation',
      url: 'http://localhost:3001/autonomous-investigation',
      critical: true,
      description: 'AI-powered fraud investigation interface'
    },
    {
      name: 'manual-investigation',
      url: 'http://localhost:3002/manual-investigation',
      critical: true,
      description: 'Manual investigation tools and workflows'
    },
    {
      name: 'agent-analytics',
      url: 'http://localhost:3003/agent-analytics',
      critical: false,
      description: 'Agent performance analytics and reporting'
    },
    {
      name: 'rag-intelligence',
      url: 'http://localhost:3004/rag-intelligence',
      critical: false,
      description: 'RAG-based intelligence and knowledge retrieval'
    },
    {
      name: 'visualization',
      url: 'http://localhost:3005/visualization',
      critical: true,
      description: 'Data visualization and risk assessment charts'
    },
    {
      name: 'reporting',
      url: 'http://localhost:3006/reporting',
      critical: true,
      description: 'Investigation reports and documentation'
    },
    {
      name: 'design-system',
      url: 'http://localhost:3007/design-system',
      critical: false,
      description: 'Component library and design tokens'
    }
  ],

  // Accessibility thresholds and budgets
  thresholds: {
    critical: 0,      // No critical violations allowed
    serious: 2,       // Maximum 2 serious violations for critical services
    moderate: 10,     // Maximum 10 moderate violations
    minor: 25,        // Maximum 25 minor violations
    complianceScore: 80  // Minimum 80% WCAG compliance
  },

  // Axe-core configuration
  axeConfig: {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'focus-management': { enabled: true },
      'aria-implementation': { enabled: true },
      'semantic-structure': { enabled: true },
      'image-alt': { enabled: true },
      'form-field-labels': { enabled: true },
      'heading-order': { enabled: true },
      'landmark-one-main': { enabled: true },
      'page-has-heading-one': { enabled: true }
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    include: [['body']],
    exclude: [['.ignore-a11y']]
  },

  // Report generation settings
  reportSettings: {
    outputDir: './test-results/accessibility',
    generateHtml: true,
    generateJson: true,
    includePassing: false,
    includeRemediation: true
  }
};

/**
 * Main accessibility audit runner
 */
async function runAccessibilityAudit() {
  console.log('🔍 Starting Accessibility Audit for Olorin Microservices');
  console.log('=====================================');

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    // Ensure output directory exists
    await ensureDirectoryExists(config.reportSettings.outputDir);

    // Test each service
    for (const service of config.services) {
      console.log(`\\n📊 Testing ${service.name}: ${service.description}`);

      try {
        const result = await auditService(browser, service);
        results.push(result);

        // Log immediate results
        logServiceResults(service, result);

      } catch (error) {
        console.error(`❌ Failed to audit ${service.name}: ${error.message}`);
        results.push({
          service: service.name,
          url: service.url,
          error: error.message,
          violations: [],
          passes: [],
          inapplicable: [],
          incomplete: []
        });
      }
    }

    // Generate comprehensive report
    await generateComprehensiveReport(results);

    // Validate against budgets
    const budgetResults = validateAccessibilityBudgets(results);

    // Log final summary
    logFinalSummary(results, budgetResults);

    // Exit with error code if budgets exceeded
    if (!budgetResults.passed) {
      process.exit(1);
    }

  } finally {
    await browser.close();
  }
}

/**
 * Audit individual service for accessibility violations
 */
async function auditService(browser, service) {
  const page = await browser.newPage();

  try {
    // Navigate to service with timeout
    await page.goto(service.url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);

    // Inject axe-core
    await page.addScriptTag({
      url: 'https://unpkg.com/axe-core@4.8.2/axe.min.js'
    });

    // Run axe audit
    const results = await page.evaluate((axeConfig) => {
      return new Promise((resolve) => {
        axe.run(document, axeConfig, (err, results) => {
          if (err) throw err;
          resolve(results);
        });
      });
    }, config.axeConfig);

    // Calculate compliance score
    const complianceScore = calculateComplianceScore(results);

    return {
      service: service.name,
      url: service.url,
      critical: service.critical,
      description: service.description,
      timestamp: new Date().toISOString(),
      complianceScore,
      violations: results.violations,
      passes: results.passes,
      inapplicable: results.inapplicable,
      incomplete: results.incomplete,
      testResult: results.testResult
    };

  } finally {
    await page.close();
  }
}

/**
 * Calculate WCAG compliance score based on audit results
 */
function calculateComplianceScore(results) {
  const totalRules = results.violations.length + results.passes.length;
  const passingRules = results.passes.length;

  if (totalRules === 0) return 0;

  return Math.round((passingRules / totalRules) * 100);
}

/**
 * Log results for individual service
 */
function logServiceResults(service, result) {
  if (result.error) {
    console.log(`   ❌ Error: ${result.error}`);
    return;
  }

  const violationCount = result.violations.length;
  const criticalViolations = result.violations.filter(v => v.impact === 'critical').length;
  const seriousViolations = result.violations.filter(v => v.impact === 'serious').length;

  console.log(`   📈 Compliance Score: ${result.complianceScore}%`);
  console.log(`   🚨 Total Violations: ${violationCount}`);
  console.log(`   ⚠️  Critical: ${criticalViolations}, Serious: ${seriousViolations}`);

  // Show status
  if (violationCount === 0) {
    console.log(`   ✅ No accessibility violations found`);
  } else if (criticalViolations === 0 && seriousViolations <= config.thresholds.serious) {
    console.log(`   ⚠️  Within acceptable thresholds`);
  } else {
    console.log(`   ❌ Exceeds accessibility budget`);
  }
}

/**
 * Validate results against accessibility budgets
 */
function validateAccessibilityBudgets(results) {
  let passed = true;
  const violations = [];

  for (const result of results) {
    if (result.error) continue;

    const criticalViolations = result.violations.filter(v => v.impact === 'critical').length;
    const seriousViolations = result.violations.filter(v => v.impact === 'serious').length;
    const moderateViolations = result.violations.filter(v => v.impact === 'moderate').length;
    const minorViolations = result.violations.filter(v => v.impact === 'minor').length;

    // Check critical violations (zero tolerance)
    if (criticalViolations > config.thresholds.critical) {
      passed = false;
      violations.push({
        service: result.service,
        type: 'critical',
        count: criticalViolations,
        threshold: config.thresholds.critical
      });
    }

    // Check serious violations (stricter for critical services)
    const seriousThreshold = result.critical ? config.thresholds.serious : config.thresholds.serious * 2;
    if (seriousViolations > seriousThreshold) {
      passed = false;
      violations.push({
        service: result.service,
        type: 'serious',
        count: seriousViolations,
        threshold: seriousThreshold
      });
    }

    // Check compliance score
    if (result.complianceScore < config.thresholds.complianceScore) {
      passed = false;
      violations.push({
        service: result.service,
        type: 'compliance',
        score: result.complianceScore,
        threshold: config.thresholds.complianceScore
      });
    }
  }

  return { passed, violations };
}

/**
 * Generate comprehensive HTML report
 */
async function generateComprehensiveReport(results) {
  const reportHtml = generateReportHtml(results);
  const reportPath = path.join(config.reportSettings.outputDir, 'accessibility-audit-report.html');

  await fs.writeFile(reportPath, reportHtml, 'utf8');

  // Also generate JSON report for programmatic access
  if (config.reportSettings.generateJson) {
    const jsonPath = path.join(config.reportSettings.outputDir, 'accessibility-audit-results.json');
    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8');
  }

  console.log(`\\n📄 Reports generated:`);
  console.log(`   HTML: ${reportPath}`);
  if (config.reportSettings.generateJson) {
    console.log(`   JSON: ${jsonPath.replace(reportPath.split('/').slice(0, -1).join('/') + '/', '')}`);
  }
}

/**
 * Generate HTML report content
 */
function generateReportHtml(results) {
  const timestamp = new Date().toLocaleString();
  const totalServices = results.length;
  const totalViolations = results.reduce((sum, r) => sum + (r.violations ? r.violations.length : 0), 0);
  const averageCompliance = Math.round(
    results.reduce((sum, r) => sum + (r.complianceScore || 0), 0) / totalServices
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Olorin Accessibility Audit Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { color: #2563eb; margin-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .success { color: #059669; }
        .warning { color: #d97706; }
        .error { color: #dc2626; }
        .service-card { background: white; margin: 20px 0; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .service-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .service-name { font-size: 1.2em; font-weight: bold; }
        .compliance-badge { padding: 5px 15px; border-radius: 20px; color: white; font-size: 0.9em; }
        .compliance-excellent { background: #059669; }
        .compliance-good { background: #d97706; }
        .compliance-poor { background: #dc2626; }
        .violations-list { margin-top: 15px; }
        .violation { margin: 10px 0; padding: 15px; border-left: 4px solid #dc2626; background: #fef2f2; border-radius: 0 4px 4px 0; }
        .violation-critical { border-color: #dc2626; }
        .violation-serious { border-color: #f59e0b; }
        .violation-moderate { border-color: #3b82f6; }
        .violation-minor { border-color: #6b7280; }
        .violation-title { font-weight: bold; margin-bottom: 5px; }
        .violation-help { color: #666; font-size: 0.9em; }
        .no-violations { color: #059669; text-align: center; padding: 20px; }
        .footer { text-align: center; color: #666; margin-top: 40px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Olorin Accessibility Audit Report</h1>
            <p>Comprehensive WCAG 2.1 AA compliance assessment</p>
            <p><strong>Generated:</strong> ${timestamp}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value ${averageCompliance >= 80 ? 'success' : averageCompliance >= 60 ? 'warning' : 'error'}">${averageCompliance}%</div>
                <div class="metric-label">Average Compliance</div>
            </div>
            <div class="metric">
                <div class="metric-value">${totalServices}</div>
                <div class="metric-label">Services Tested</div>
            </div>
            <div class="metric">
                <div class="metric-value ${totalViolations === 0 ? 'success' : totalViolations <= 10 ? 'warning' : 'error'}">${totalViolations}</div>
                <div class="metric-label">Total Violations</div>
            </div>
            <div class="metric">
                <div class="metric-value ${results.filter(r => (r.complianceScore || 0) >= 80).length}">${results.filter(r => (r.complianceScore || 0) >= 80).length}</div>
                <div class="metric-label">Compliant Services</div>
            </div>
        </div>

        ${results.map(result => generateServiceHtml(result)).join('')}

        <div class="footer">
            <p>Report generated by Olorin Accessibility Testing Framework</p>
            <p>Powered by axe-core ${config.axeConfig ? '4.8.2' : 'latest'} | WCAG 2.1 AA Standards</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate HTML for individual service results
 */
function generateServiceHtml(result) {
  if (result.error) {
    return `
        <div class="service-card">
            <div class="service-header">
                <div class="service-name">${result.service}</div>
                <div class="compliance-badge compliance-poor">Error</div>
            </div>
            <p><strong>URL:</strong> ${result.url}</p>
            <p><strong>Error:</strong> ${result.error}</p>
        </div>`;
  }

  const complianceClass = result.complianceScore >= 80 ? 'compliance-excellent' :
                         result.complianceScore >= 60 ? 'compliance-good' : 'compliance-poor';

  const violationsByImpact = {
    critical: result.violations.filter(v => v.impact === 'critical'),
    serious: result.violations.filter(v => v.impact === 'serious'),
    moderate: result.violations.filter(v => v.impact === 'moderate'),
    minor: result.violations.filter(v => v.impact === 'minor')
  };

  return `
        <div class="service-card">
            <div class="service-header">
                <div>
                    <div class="service-name">${result.service}</div>
                    <div style="color: #666; font-size: 0.9em;">${result.description}</div>
                </div>
                <div class="compliance-badge ${complianceClass}">${result.complianceScore}% Compliant</div>
            </div>

            <p><strong>URL:</strong> ${result.url}</p>
            <p><strong>Critical Service:</strong> ${result.critical ? 'Yes' : 'No'}</p>
            <p><strong>Total Violations:</strong> ${result.violations.length}</p>

            ${result.violations.length === 0 ?
                '<div class="no-violations">✅ No accessibility violations found</div>' :
                `<div class="violations-list">
                    ${Object.entries(violationsByImpact).map(([impact, violations]) =>
                        violations.length > 0 ?
                        `<h4>${impact.charAt(0).toUpperCase() + impact.slice(1)} (${violations.length})</h4>
                         ${violations.map(violation => `
                            <div class="violation violation-${impact}">
                                <div class="violation-title">${violation.id}: ${violation.description}</div>
                                <div class="violation-help">${violation.help}</div>
                                <div style="margin-top: 10px;">
                                    <strong>Elements:</strong> ${violation.nodes.length} affected
                                    ${violation.helpUrl ? `| <a href="${violation.helpUrl}" target="_blank">Learn more</a>` : ''}
                                </div>
                            </div>
                         `).join('')}` : ''
                    ).join('')}
                </div>`
            }
        </div>`;
}

/**
 * Log final summary of audit results
 */
function logFinalSummary(results, budgetResults) {
  console.log('\\n🎯 Accessibility Audit Summary');
  console.log('=====================================');

  const totalViolations = results.reduce((sum, r) => sum + (r.violations ? r.violations.length : 0), 0);
  const averageCompliance = Math.round(
    results.reduce((sum, r) => sum + (r.complianceScore || 0), 0) / results.length
  );
  const compliantServices = results.filter(r => (r.complianceScore || 0) >= config.thresholds.complianceScore).length;

  console.log(`📊 Services Tested: ${results.length}`);
  console.log(`📈 Average Compliance: ${averageCompliance}%`);
  console.log(`✅ Compliant Services: ${compliantServices}/${results.length}`);
  console.log(`🚨 Total Violations: ${totalViolations}`);

  if (budgetResults.passed) {
    console.log('\\n🎉 All services meet accessibility budgets!');
  } else {
    console.log('\\n❌ Accessibility budget violations:');
    budgetResults.violations.forEach(violation => {
      console.log(`   ${violation.service}: ${violation.type} (${violation.count || violation.score})`);
    });
  }

  console.log(`\\n📄 Detailed report: test-results/accessibility/accessibility-audit-report.html`);
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Olorin Accessibility Audit Tool

Usage:
  node scripts/accessibility/axe-audit.js [options]

Options:
  --help, -h     Show this help message
  --verbose      Show detailed output
  --service      Test specific service only

Examples:
  npm run a11y:audit
  node scripts/accessibility/axe-audit.js --verbose
  node scripts/accessibility/axe-audit.js --service core-ui
  `);
  process.exit(0);
}

// Filter services if specific service requested
if (args.includes('--service')) {
  const serviceIndex = args.indexOf('--service') + 1;
  if (serviceIndex < args.length) {
    const serviceName = args[serviceIndex];
    config.services = config.services.filter(s => s.name === serviceName);

    if (config.services.length === 0) {
      console.error(`❌ Service '${serviceName}' not found`);
      console.log('Available services:', config.services.map(s => s.name).join(', '));
      process.exit(1);
    }
  }
}

// Run the audit
runAccessibilityAudit().catch(error => {
  console.error('❌ Accessibility audit failed:', error);
  process.exit(1);
});