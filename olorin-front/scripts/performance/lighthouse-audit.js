#!/usr/bin/env node

/**
 * Lighthouse Performance Audit Script
 * Automated Lighthouse audits for all microservices
 * Generates comprehensive performance reports with recommendations
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  services: [
    { name: 'core-ui', url: 'http://localhost:3000/', critical: true },
    { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation', critical: true },
    { name: 'manual-investigation', url: 'http://localhost:3002/manual-investigation', critical: true },
    { name: 'agent-analytics', url: 'http://localhost:3003/agent-analytics', critical: false },
    { name: 'rag-intelligence', url: 'http://localhost:3004/rag-intelligence', critical: false },
    { name: 'visualization', url: 'http://localhost:3005/visualization', critical: false },
    { name: 'reporting', url: 'http://localhost:3006/reporting', critical: false },
    { name: 'design-system', url: 'http://localhost:3008/design-system', critical: false }
  ],
  outputDir: './test-results/lighthouse',
  thresholds: {
    performance: 80,
    accessibility: 90,
    bestPractices: 85,
    seo: 80,
    pwa: 70
  },
  devices: ['desktop', 'mobile'],
  chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
};

/**
 * Launch Chrome instance
 */
async function launchChrome() {
  return await chromeLauncher.launch({
    chromeFlags: config.chromeFlags
  });
}

/**
 * Run Lighthouse audit for a service
 */
async function runLighthouseAudit(service, device, chrome) {
  console.log(`🔍 Auditing ${service.name} (${device})...`);

  const lighthouseConfig = {
    extends: 'lighthouse:default',
    settings: {
      formFactor: device,
      throttling: device === 'mobile' ? {
        rttMs: 150,
        throughputKbps: 1638.4,
        cpuSlowdownMultiplier: 4
      } : {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1
      },
      screenEmulation: device === 'mobile' ? {
        mobile: true,
        width: 375,
        height: 667,
        deviceScaleFactor: 2
      } : {
        mobile: false,
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
      },
      emulatedUserAgent: device === 'mobile' ?
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1' :
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  };

  try {
    const result = await lighthouse(service.url, {
      port: chrome.port,
      output: 'json'
    }, lighthouseConfig);

    if (!result) {
      throw new Error('Lighthouse returned null result');
    }

    return {
      serviceName: service.name,
      url: service.url,
      device,
      critical: service.critical,
      timestamp: new Date().toISOString(),
      scores: {
        performance: Math.round(result.lhr.categories.performance.score * 100),
        accessibility: Math.round(result.lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(result.lhr.categories['best-practices'].score * 100),
        seo: Math.round(result.lhr.categories.seo.score * 100),
        pwa: result.lhr.categories.pwa ? Math.round(result.lhr.categories.pwa.score * 100) : 0
      },
      metrics: {
        firstContentfulPaint: result.lhr.audits['first-contentful-paint'].numericValue,
        largestContentfulPaint: result.lhr.audits['largest-contentful-paint'].numericValue,
        firstInputDelay: result.lhr.audits['max-potential-fid'].numericValue,
        cumulativeLayoutShift: result.lhr.audits['cumulative-layout-shift'].numericValue,
        speedIndex: result.lhr.audits['speed-index'].numericValue,
        timeToInteractive: result.lhr.audits['interactive'].numericValue,
        totalBlockingTime: result.lhr.audits['total-blocking-time'].numericValue
      },
      opportunities: result.lhr.audits ? Object.keys(result.lhr.audits)
        .filter(key => result.lhr.audits[key].details && result.lhr.audits[key].details.type === 'opportunity')
        .map(key => ({
          id: key,
          title: result.lhr.audits[key].title,
          description: result.lhr.audits[key].description,
          savings: result.lhr.audits[key].details.overallSavingsMs || 0,
          impact: result.lhr.audits[key].score < 0.9 ? 'high' : 'medium'
        }))
        .filter(opp => opp.savings > 0)
        .sort((a, b) => b.savings - a.savings) : [],
      diagnostics: result.lhr.audits ? Object.keys(result.lhr.audits)
        .filter(key => result.lhr.audits[key].details && result.lhr.audits[key].details.type === 'diagnostic')
        .map(key => ({
          id: key,
          title: result.lhr.audits[key].title,
          description: result.lhr.audits[key].description,
          score: result.lhr.audits[key].score
        }))
        .filter(diag => diag.score < 1) : [],
      rawResult: result.lhr
    };

  } catch (error) {
    console.error(`❌ Failed to audit ${service.name} (${device}):`, error.message);
    return {
      serviceName: service.name,
      url: service.url,
      device,
      critical: service.critical,
      timestamp: new Date().toISOString(),
      error: error.message,
      scores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0, pwa: 0 },
      metrics: {},
      opportunities: [],
      diagnostics: []
    };
  }
}

/**
 * Check if services are running
 */
async function checkServices() {
  console.log('🔍 Checking if services are running...');

  for (const service of config.services) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(service.url, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`✅ ${service.name} is running`);
      } else {
        console.log(`❌ ${service.name} is not responding (${response.status})`);
        return false;
      }
    } catch (error) {
      console.log(`❌ ${service.name} is not accessible: ${error.message}`);
      return false;
    }
  }

  return true;
}

/**
 * Run audits for all services
 */
async function runAllAudits() {
  const chrome = await launchChrome();
  const results = [];

  try {
    for (const service of config.services) {
      for (const device of config.devices) {
        const result = await runLighthouseAudit(service, device, chrome);
        results.push(result);

        // Brief pause between audits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } finally {
    await chrome.kill();
  }

  return results;
}

/**
 * Analyze results and generate recommendations
 */
function analyzeResults(results) {
  const analysis = {
    summary: {
      totalServices: config.services.length,
      totalAudits: results.length,
      criticalServices: results.filter(r => r.critical).length,
      passedThresholds: 0,
      failedThresholds: 0,
      averageScores: {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        pwa: 0
      }
    },
    failedServices: [],
    topOpportunities: [],
    criticalIssues: [],
    recommendations: []
  };

  // Calculate averages and identify failures
  const validResults = results.filter(r => !r.error);

  if (validResults.length > 0) {
    analysis.summary.averageScores = {
      performance: Math.round(validResults.reduce((sum, r) => sum + r.scores.performance, 0) / validResults.length),
      accessibility: Math.round(validResults.reduce((sum, r) => sum + r.scores.accessibility, 0) / validResults.length),
      bestPractices: Math.round(validResults.reduce((sum, r) => sum + r.scores.bestPractices, 0) / validResults.length),
      seo: Math.round(validResults.reduce((sum, r) => sum + r.scores.seo, 0) / validResults.length),
      pwa: Math.round(validResults.reduce((sum, r) => sum + r.scores.pwa, 0) / validResults.length)
    };
  }

  // Check threshold compliance
  validResults.forEach(result => {
    const failed = [];

    if (result.scores.performance < config.thresholds.performance) failed.push('performance');
    if (result.scores.accessibility < config.thresholds.accessibility) failed.push('accessibility');
    if (result.scores.bestPractices < config.thresholds.bestPractices) failed.push('best-practices');
    if (result.scores.seo < config.thresholds.seo) failed.push('seo');
    if (result.scores.pwa < config.thresholds.pwa) failed.push('pwa');

    if (failed.length > 0) {
      analysis.summary.failedThresholds++;
      analysis.failedServices.push({
        name: result.serviceName,
        device: result.device,
        failedCategories: failed,
        scores: result.scores
      });
    } else {
      analysis.summary.passedThresholds++;
    }
  });

  // Collect top optimization opportunities
  const allOpportunities = validResults.flatMap(r =>
    r.opportunities.map(opp => ({
      ...opp,
      serviceName: r.serviceName,
      device: r.device
    }))
  );

  analysis.topOpportunities = allOpportunities
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 10);

  // Identify critical issues
  analysis.criticalIssues = validResults
    .filter(r => r.critical && (r.scores.performance < 70 || r.scores.accessibility < 80))
    .map(r => ({
      service: r.serviceName,
      device: r.device,
      issues: [
        r.scores.performance < 70 && `Poor performance score: ${r.scores.performance}`,
        r.scores.accessibility < 80 && `Poor accessibility score: ${r.scores.accessibility}`
      ].filter(Boolean)
    }));

  // Generate recommendations
  if (analysis.summary.averageScores.performance < 80) {
    analysis.recommendations.push('Focus on performance optimization: implement code splitting, optimize images, and reduce bundle sizes');
  }
  if (analysis.summary.averageScores.accessibility < 90) {
    analysis.recommendations.push('Improve accessibility: add proper ARIA labels, ensure color contrast, and implement keyboard navigation');
  }
  if (analysis.topOpportunities.length > 0) {
    analysis.recommendations.push(`Address top optimization opportunity: ${analysis.topOpportunities[0].title}`);
  }
  if (analysis.criticalIssues.length > 0) {
    analysis.recommendations.push(`Critical: Fix performance/accessibility issues in ${analysis.criticalIssues.length} critical service(s)`);
  }

  return analysis;
}

/**
 * Generate HTML report
 */
function generateReport(results, analysis) {
  const reportHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lighthouse Performance Audit Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
        .score { font-size: 2em; font-weight: bold; }
        .score.good { color: #059669; }
        .score.warning { color: #d97706; }
        .score.poor { color: #dc2626; }
        .service-results { margin: 30px 0; }
        .service-card { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
        .scores { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 15px 0; }
        .score-item { background: white; padding: 10px; border-radius: 4px; text-align: center; }
        .opportunities { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .critical { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .chart { width: 100%; height: 400px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Lighthouse Performance Audit Report</h1>
          <p>Generated: ${new Date().toISOString()}</p>
          <p>Services Audited: ${analysis.summary.totalServices} | Total Audits: ${analysis.summary.totalAudits}</p>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div class="score ${analysis.summary.averageScores.performance >= 90 ? 'good' : analysis.summary.averageScores.performance >= 70 ? 'warning' : 'poor'}">${analysis.summary.averageScores.performance}</div>
            <div>Avg Performance</div>
          </div>
          <div class="summary-card">
            <div class="score ${analysis.summary.averageScores.accessibility >= 90 ? 'good' : analysis.summary.averageScores.accessibility >= 80 ? 'warning' : 'poor'}">${analysis.summary.averageScores.accessibility}</div>
            <div>Avg Accessibility</div>
          </div>
          <div class="summary-card">
            <div class="score ${analysis.summary.averageScores.bestPractices >= 90 ? 'good' : analysis.summary.averageScores.bestPractices >= 80 ? 'warning' : 'poor'}">${analysis.summary.averageScores.bestPractices}</div>
            <div>Avg Best Practices</div>
          </div>
          <div class="summary-card">
            <div class="score ${analysis.summary.averageScores.seo >= 90 ? 'good' : analysis.summary.averageScores.seo >= 80 ? 'warning' : 'poor'}">${analysis.summary.averageScores.seo}</div>
            <div>Avg SEO</div>
          </div>
          <div class="summary-card">
            <div class="score ${analysis.summary.passedThresholds >= analysis.summary.failedThresholds ? 'good' : 'poor'}">${analysis.summary.passedThresholds}/${analysis.summary.totalAudits}</div>
            <div>Passed Thresholds</div>
          </div>
        </div>

        ${analysis.criticalIssues.length > 0 ? `
        <div class="critical">
          <h3>🚨 Critical Issues</h3>
          <ul>
            ${analysis.criticalIssues.map(issue => `
              <li><strong>${issue.service} (${issue.device})</strong>: ${issue.issues.join(', ')}</li>
            `).join('')}
          </ul>
        </div>
        ` : ''}

        ${analysis.recommendations.length > 0 ? `
        <div class="opportunities">
          <h3>💡 Recommendations</h3>
          <ul>
            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="service-results">
          <h2>Service Audit Results</h2>
          ${results.filter(r => !r.error).map(result => `
            <div class="service-card">
              <h3>${result.serviceName} - ${result.device}</h3>

              <div class="scores">
                <div class="score-item">
                  <div class="score ${result.scores.performance >= 90 ? 'good' : result.scores.performance >= 70 ? 'warning' : 'poor'}">${result.scores.performance}</div>
                  <div>Performance</div>
                </div>
                <div class="score-item">
                  <div class="score ${result.scores.accessibility >= 90 ? 'good' : result.scores.accessibility >= 80 ? 'warning' : 'poor'}">${result.scores.accessibility}</div>
                  <div>Accessibility</div>
                </div>
                <div class="score-item">
                  <div class="score ${result.scores.bestPractices >= 90 ? 'good' : result.scores.bestPractices >= 80 ? 'warning' : 'poor'}">${result.scores.bestPractices}</div>
                  <div>Best Practices</div>
                </div>
                <div class="score-item">
                  <div class="score ${result.scores.seo >= 90 ? 'good' : result.scores.seo >= 80 ? 'warning' : 'poor'}">${result.scores.seo}</div>
                  <div>SEO</div>
                </div>
                <div class="score-item">
                  <div class="score ${result.scores.pwa >= 70 ? 'good' : result.scores.pwa >= 50 ? 'warning' : 'poor'}">${result.scores.pwa}</div>
                  <div>PWA</div>
                </div>
              </div>

              ${result.metrics && Object.keys(result.metrics).length > 0 ? `
              <h4>Core Web Vitals</h4>
              <table>
                <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
                <tr><td>First Contentful Paint</td><td>${Math.round(result.metrics.firstContentfulPaint)}ms</td><td>${result.metrics.firstContentfulPaint <= 1800 ? '✅' : result.metrics.firstContentfulPaint <= 3000 ? '⚠️' : '❌'}</td></tr>
                <tr><td>Largest Contentful Paint</td><td>${Math.round(result.metrics.largestContentfulPaint)}ms</td><td>${result.metrics.largestContentfulPaint <= 2500 ? '✅' : result.metrics.largestContentfulPaint <= 4000 ? '⚠️' : '❌'}</td></tr>
                <tr><td>Cumulative Layout Shift</td><td>${result.metrics.cumulativeLayoutShift.toFixed(3)}</td><td>${result.metrics.cumulativeLayoutShift <= 0.1 ? '✅' : result.metrics.cumulativeLayoutShift <= 0.25 ? '⚠️' : '❌'}</td></tr>
                <tr><td>Speed Index</td><td>${Math.round(result.metrics.speedIndex)}ms</td><td>${result.metrics.speedIndex <= 3400 ? '✅' : result.metrics.speedIndex <= 5800 ? '⚠️' : '❌'}</td></tr>
              </table>
              ` : ''}

              ${result.opportunities.length > 0 ? `
              <h4>Top Optimization Opportunities</h4>
              <ul>
                ${result.opportunities.slice(0, 5).map(opp => `
                  <li><strong>${opp.title}</strong> - Potential savings: ${Math.round(opp.savings)}ms</li>
                `).join('')}
              </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div class="chart">
          <canvas id="scoresChart"></canvas>
        </div>
      </div>

      <script>
        const validResults = ${JSON.stringify(results.filter(r => !r.error))};

        const ctx = document.getElementById('scoresChart').getContext('2d');
        new Chart(ctx, {
          type: 'radar',
          data: {
            labels: ['Performance', 'Accessibility', 'Best Practices', 'SEO', 'PWA'],
            datasets: validResults.map((result, index) => ({
              label: result.serviceName + ' (' + result.device + ')',
              data: [
                result.scores.performance,
                result.scores.accessibility,
                result.scores.bestPractices,
                result.scores.seo,
                result.scores.pwa
              ],
              borderColor: \`hsl(\${index * 137.5 % 360}, 70%, 50%)\`,
              backgroundColor: \`hsla(\${index * 137.5 % 360}, 70%, 50%, 0.1)\`,
              pointBackgroundColor: \`hsl(\${index * 137.5 % 360}, 70%, 50%)\`
            }))
          },
          options: {
            responsive: true,
            scales: {
              r: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  stepSize: 20
                }
              }
            },
            plugins: {
              title: {
                display: true,
                text: 'Lighthouse Scores by Service'
              }
            }
          }
        });
      </script>
    </body>
    </html>
  `;

  return reportHtml;
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Starting Lighthouse performance audits...');

    // Check if services are running
    const servicesRunning = await checkServices();
    if (!servicesRunning) {
      console.error('❌ Not all services are running. Please start services first.');
      process.exit(1);
    }

    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Run all audits
    const results = await runAllAudits();

    // Analyze results
    const analysis = analyzeResults(results);

    // Generate reports
    const reportHtml = generateReport(results, analysis);
    const reportPath = path.join(config.outputDir, 'lighthouse-report.html');
    fs.writeFileSync(reportPath, reportHtml);

    // Save raw data
    const dataPath = path.join(config.outputDir, 'lighthouse-data.json');
    fs.writeFileSync(dataPath, JSON.stringify({ results, analysis }, null, 2));

    // Generate summary
    console.log('\n📊 Lighthouse Audit Summary:');
    console.log(`✅ Audits completed: ${analysis.summary.totalAudits}`);
    console.log(`📈 Average Performance: ${analysis.summary.averageScores.performance}/100`);
    console.log(`♿ Average Accessibility: ${analysis.summary.averageScores.accessibility}/100`);
    console.log(`🎯 Passed Thresholds: ${analysis.summary.passedThresholds}/${analysis.summary.totalAudits}`);

    if (analysis.criticalIssues.length > 0) {
      console.log(`🚨 Critical Issues: ${analysis.criticalIssues.length}`);
    }

    console.log(`📄 Report saved: ${reportPath}`);

    // Exit with error code if critical issues found
    if (analysis.summary.failedThresholds > 0 && analysis.criticalIssues.length > 0) {
      console.log('\n❌ Critical performance issues detected!');
      process.exit(1);
    }

    console.log('\n✅ Lighthouse audits completed successfully!');

  } catch (error) {
    console.error('💥 Lighthouse audit failed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted by user');
  process.exit(0);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  runLighthouseAudit,
  checkServices,
  runAllAudits,
  analyzeResults,
  generateReport
};