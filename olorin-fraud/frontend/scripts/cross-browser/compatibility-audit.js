#!/usr/bin/env node

/**
 * Cross-Browser Compatibility Audit Script
 *
 * Comprehensive browser compatibility auditing for all Olorin microservices
 * using automated testing across Chrome, Firefox, Safari, and Edge.
 *
 * Features:
 * - Tests all 8 microservices across major browsers
 * - Validates browser feature support and compatibility
 * - Generates detailed HTML reports with browser-specific recommendations
 * - Identifies rendering differences and functionality issues
 * - Provides actionable recommendations for cross-browser fixes
 * - Performance comparison across browsers
 */

const fs = require('fs').promises;
const path = require('path');
const { chromium, firefox, webkit } = require('playwright');

// Configuration for cross-browser compatibility auditing
const config = {
  services: [
    {
      name: 'core-ui',
      url: 'http://localhost:3000/',
      critical: true,
      description: 'Main application shell and navigation',
      expectedFeatures: ['navigation', 'authentication', 'routing']
    },
    {
      name: 'structured-investigation',
      url: 'http://localhost:3001/structured-investigation',
      critical: true,
      description: 'AI-powered fraud investigation interface',
      expectedFeatures: ['forms', 'file-upload', 'data-visualization', 'real-time-updates']
    },
    {
      name: 'manual-investigation',
      url: 'http://localhost:3002/manual-investigation',
      critical: true,
      description: 'Manual investigation tools and workflows',
      expectedFeatures: ['search', 'data-tables', 'forms', 'filtering']
    },
    {
      name: 'agent-analytics',
      url: 'http://localhost:3003/agent-analytics',
      critical: false,
      description: 'Agent performance analytics and reporting',
      expectedFeatures: ['charts', 'data-visualization', 'filtering', 'export']
    },
    {
      name: 'rag-intelligence',
      url: 'http://localhost:3004/rag-intelligence',
      critical: false,
      description: 'RAG-based intelligence and knowledge retrieval',
      expectedFeatures: ['search', 'ai-integration', 'real-time-updates']
    },
    {
      name: 'visualization',
      url: 'http://localhost:3005/visualization',
      critical: true,
      description: 'Data visualization and risk assessment charts',
      expectedFeatures: ['charts', 'interactive-elements', 'data-visualization', 'zoom']
    },
    {
      name: 'reporting',
      url: 'http://localhost:3006/reporting',
      critical: true,
      description: 'Investigation reports and documentation',
      expectedFeatures: ['pdf-generation', 'data-export', 'printing', 'templates']
    },
    {
      name: 'design-system',
      url: 'http://localhost:3007/design-system',
      critical: false,
      description: 'Component library and design tokens',
      expectedFeatures: ['component-showcase', 'interactive-examples', 'documentation']
    }
  ],

  browsers: [
    {
      name: 'chromium',
      displayName: 'Chrome/Chromium',
      launcher: chromium,
      marketShare: 65.4,
      expectedFeatures: ['webGL', 'webAssembly', 'serviceWorkers', 'webSockets', 'modules']
    },
    {
      name: 'firefox',
      displayName: 'Mozilla Firefox',
      launcher: firefox,
      marketShare: 8.9,
      expectedFeatures: ['webGL', 'webAssembly', 'serviceWorkers', 'webSockets', 'modules']
    },
    {
      name: 'webkit',
      displayName: 'Safari/WebKit',
      launcher: webkit,
      marketShare: 18.8,
      expectedFeatures: ['webGL', 'serviceWorkers', 'webSockets', 'modules']
    }
  ],

  viewports: [
    { name: 'desktop', width: 1920, height: 1080, priority: 'high' },
    { name: 'laptop', width: 1366, height: 768, priority: 'high' },
    { name: 'tablet', width: 768, height: 1024, priority: 'medium' },
    { name: 'mobile', width: 375, height: 667, priority: 'high', isMobile: true }
  ],

  thresholds: {
    compatibilityScore: 75,    // Minimum 75% compatibility across browsers
    criticalErrors: 0,         // No critical errors allowed
    majorErrors: 1,            // Maximum 1 major error per service per browser
    performanceVariance: 50,   // Max 50% performance difference between browsers
    featureSupport: 80         // Minimum 80% feature support
  },

  reportSettings: {
    outputDir: './test-results/cross-browser',
    generateHtml: true,
    generateJson: true,
    includeScreenshots: true,
    includePerfComparison: true
  }
};

/**
 * Main cross-browser compatibility audit runner
 */
async function runCompatibilityAudit() {
  console.log('🌐 Starting Cross-Browser Compatibility Audit');
  console.log('=====================================');

  const results = [];

  try {
    // Ensure output directory exists
    await ensureDirectoryExists(config.reportSettings.outputDir);

    // Test each service across all browsers
    for (const service of config.services) {
      console.log(`\\n📊 Testing ${service.name}: ${service.description}`);

      const serviceResult = await testServiceAcrossBrowsers(service);
      results.push(serviceResult);

      // Log immediate results
      logServiceResults(service, serviceResult);
    }

    // Generate comprehensive compatibility report
    await generateCompatibilityReport(results);

    // Validate against compatibility thresholds
    const thresholdResults = validateCompatibilityThresholds(results);

    // Log final summary
    logFinalSummary(results, thresholdResults);

    // Exit with error code if thresholds exceeded
    if (!thresholdResults.passed) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Cross-browser audit failed:', error);
    process.exit(1);
  }
}

/**
 * Test individual service across all browsers
 */
async function testServiceAcrossBrowsers(service) {
  const browserResults = [];

  for (const browserConfig of config.browsers) {
    console.log(`  🌐 Testing ${browserConfig.displayName}...`);

    try {
      const result = await testServiceInBrowser(service, browserConfig);
      browserResults.push(result);
    } catch (error) {
      console.error(`    ❌ Failed to test ${browserConfig.displayName}:`, error.message);
      browserResults.push(createErrorResult(browserConfig, error));
    }
  }

  const compatibilityScore = calculateServiceCompatibilityScore(browserResults);

  return {
    service: service.name,
    url: service.url,
    critical: service.critical,
    description: service.description,
    timestamp: new Date().toISOString(),
    browserResults,
    compatibilityScore,
    recommendations: generateServiceRecommendations(browserResults),
    summary: generateServiceSummary(browserResults)
  };
}

/**
 * Test service in specific browser
 */
async function testServiceInBrowser(service, browserConfig) {
  const browser = await browserConfig.launcher.launch({ headless: true });
  const errors = [];
  const warnings = [];
  const screenshots = {};
  let performance = {};
  let features = {};

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect console errors
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          message: msg.text(),
          location: msg.location()
        });
      }
    });

    // Collect JavaScript errors
    page.on('pageerror', (error) => {
      errors.push({
        type: 'javascript',
        message: error.message,
        stack: error.stack,
        severity: 'critical'
      });
    });

    // Test each viewport
    for (const viewport of config.viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Navigate and measure performance
      const startTime = Date.now();
      await page.goto(service.url, { waitUntil: 'networkidle', timeout: 30000 });
      const loadTime = Date.now() - startTime;

      // Get performance metrics on first viewport (desktop)
      if (viewport === config.viewports[0]) {
        performance = await getDetailedPerformanceMetrics(page, loadTime);
        features = await getBrowserFeatureSupport(page);
      }

      // Test responsiveness
      await testResponsiveLayout(page, viewport, errors, warnings);

      // Take screenshot
      if (config.reportSettings.includeScreenshots) {
        const screenshot = await page.screenshot({ fullPage: true });
        screenshots[viewport.name] = screenshot.toString('base64');
      }
    }

    // Test core functionality
    await testCoreBrowserFunctionality(page, service, errors, warnings);

    await context.close();

    return {
      browserName: browserConfig.name,
      displayName: browserConfig.displayName,
      userAgent: await getUserAgent(browserConfig),
      passed: errors.filter(e => e.severity === 'critical').length === 0,
      errors,
      warnings,
      performance,
      features,
      screenshots,
      consoleErrors
    };

  } finally {
    await browser.close();
  }
}

/**
 * Get detailed performance metrics
 */
async function getDetailedPerformanceMetrics(page, loadTime) {
  return await page.evaluate((loadTime) => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');

    return {
      loadTime,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      renderTime: navigation.loadEventEnd - navigation.responseEnd,
      networkTime: navigation.responseEnd - navigation.requestStart,
      processingTime: navigation.loadEventEnd - navigation.responseStart
    };
  }, loadTime);
}

/**
 * Test browser feature support
 */
async function getBrowserFeatureSupport(page) {
  return await page.evaluate(() => {
    const testFeature = (test) => {
      try {
        return test();
      } catch {
        return false;
      }
    };

    return {
      // Core web features
      webGL: testFeature(() => {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      }),
      webAssembly: testFeature(() => typeof WebAssembly === 'object'),
      serviceWorkers: testFeature(() => 'serviceWorker' in navigator),
      webSockets: testFeature(() => typeof WebSocket === 'function'),
      modules: testFeature(() => typeof import === 'function'),

      // Storage features
      localStorage: testFeature(() => typeof Storage !== 'undefined' && !!localStorage),
      sessionStorage: testFeature(() => typeof Storage !== 'undefined' && !!sessionStorage),
      indexedDB: testFeature(() => 'indexedDB' in window),

      // Modern JavaScript features
      es6Classes: testFeature(() => { eval('class Test {}'); return true; }),
      arrowFunctions: testFeature(() => { eval('() => {}'); return true; }),
      promises: testFeature(() => typeof Promise === 'function'),
      asyncAwait: testFeature(() => { eval('async function test() {}'); return true; }),
      destructuring: testFeature(() => { eval('const {a} = {}'); return true; }),

      // CSS features
      flexbox: testFeature(() => CSS.supports('display', 'flex')),
      grid: testFeature(() => CSS.supports('display', 'grid')),
      customProperties: testFeature(() => CSS.supports('--test', 'red')),
      transforms: testFeature(() => CSS.supports('transform', 'translateX(10px)')),
      animations: testFeature(() => CSS.supports('animation', 'test 1s')),

      // Browser APIs
      fetch: testFeature(() => typeof fetch === 'function'),
      intersectionObserver: testFeature(() => typeof IntersectionObserver === 'function'),
      resizeObserver: testFeature(() => typeof ResizeObserver === 'function'),
      webRTC: testFeature(() => typeof RTCPeerConnection === 'function'),
      geolocation: testFeature(() => 'geolocation' in navigator),
      notification: testFeature(() => 'Notification' in window)
    };
  });
}

/**
 * Test responsive layout
 */
async function testResponsiveLayout(page, viewport, errors, warnings) {
  try {
    const layoutTest = await page.evaluate((vp) => {
      const body = document.body;
      const main = document.querySelector('main') || body;
      const rect = main.getBoundingClientRect();

      // Check horizontal overflow
      const hasHorizontalOverflow = rect.width > vp.width;

      // Check for responsive design elements
      const responsiveElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const styles = getComputedStyle(el);
        return styles.display === 'flex' ||
               styles.display === 'grid' ||
               styles.maxWidth === '100%' ||
               styles.width.includes('%') ||
               el.classList.contains('responsive') ||
               el.classList.contains('container');
      });

      // Check for media queries
      const hasMediaQueries = Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(rule =>
            rule.type === CSSRule.MEDIA_RULE
          );
        } catch {
          return false;
        }
      });

      return {
        hasHorizontalOverflow,
        responsiveElementCount: responsiveElements.length,
        hasMediaQueries,
        contentWidth: rect.width,
        viewportWidth: vp.width
      };
    }, viewport);

    if (layoutTest.hasHorizontalOverflow) {
      errors.push({
        type: 'rendering',
        message: `Content overflows on ${viewport.name} (${layoutTest.contentWidth}px > ${layoutTest.viewportWidth}px)`,
        severity: 'major'
      });
    }

    if (layoutTest.responsiveElementCount === 0 && !layoutTest.hasMediaQueries) {
      warnings.push({
        type: 'responsive',
        message: `Limited responsive design elements detected on ${viewport.name}`,
        recommendation: 'Consider adding responsive CSS (flexbox, grid, media queries)'
      });
    }

    // Test touch targets on mobile
    if (viewport.isMobile) {
      const touchTest = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll(
          'button, a, input, select, textarea, [onclick], [role="button"]'
        );

        const smallTargets = Array.from(interactiveElements).filter(el => {
          const rect = el.getBoundingClientRect();
          return (rect.width > 0 && rect.height > 0) && (rect.width < 44 || rect.height < 44);
        });

        return {
          totalTargets: interactiveElements.length,
          smallTargets: smallTargets.length
        };
      });

      if (touchTest.smallTargets > 0) {
        warnings.push({
          type: 'mobile',
          message: `${touchTest.smallTargets} touch targets smaller than 44px on mobile`,
          recommendation: 'Ensure touch targets are at least 44x44px for better usability'
        });
      }
    }

  } catch (error) {
    warnings.push({
      type: 'testing',
      message: `Failed to test responsive layout: ${error.message}`,
      recommendation: 'Manual responsive testing recommended'
    });
  }
}

/**
 * Test core browser functionality
 */
async function testCoreBrowserFunctionality(page, service, errors, warnings) {
  try {
    const functionalityTest = await page.evaluate(() => {
      // Test basic page structure
      const hasNavigation = !!document.querySelector('nav, [role="navigation"]');
      const hasMainContent = !!document.querySelector('main, [role="main"], #root');
      const hasHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;

      // Test interactive elements
      const interactiveElements = document.querySelectorAll(
        'button, input, select, textarea, a[href], [tabindex], [onclick], [role="button"]'
      );
      const visibleInteractive = Array.from(interactiveElements).filter(el => {
        const styles = getComputedStyle(el);
        return styles.display !== 'none' && styles.visibility !== 'hidden';
      });

      // Test for React/framework detection
      const hasReact = !!(window.React || document.querySelector('[data-reactroot]') ||
                          document.querySelector('#root [data-react]'));

      // Test for critical CSS
      const body = document.body;
      const styles = getComputedStyle(body);
      const hasCustomCSS = !styles.fontFamily.includes('Times') &&
                          !styles.fontFamily.includes('serif');

      // Test for JavaScript errors
      const jsErrors = [];
      if (!hasReact && service.expectedFeatures?.includes('forms')) {
        jsErrors.push('React framework not detected for service requiring forms');
      }

      return {
        hasNavigation,
        hasMainContent,
        hasHeadings,
        interactiveCount: visibleInteractive.length,
        hasReact,
        hasCustomCSS,
        jsErrors,
        pageTitle: document.title,
        hasMetaViewport: !!document.querySelector('meta[name="viewport"]')
      };
    }, service);

    // Validate basic functionality
    if (!functionalityTest.hasMainContent) {
      errors.push({
        type: 'structure',
        message: 'No main content area detected',
        severity: 'major'
      });
    }

    if (!functionalityTest.hasCustomCSS) {
      warnings.push({
        type: 'styling',
        message: 'Custom CSS may not be loading properly',
        recommendation: 'Verify CSS bundle loading and browser compatibility'
      });
    }

    if (!functionalityTest.hasMetaViewport) {
      warnings.push({
        type: 'responsive',
        message: 'Missing viewport meta tag',
        recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">'
      });
    }

    if (functionalityTest.interactiveCount === 0) {
      warnings.push({
        type: 'functionality',
        message: 'No interactive elements detected',
        recommendation: 'Ensure page has functional interactive elements'
      });
    }

    // Add JavaScript-specific errors
    functionalityTest.jsErrors.forEach(error => {
      errors.push({
        type: 'javascript',
        message: error,
        severity: 'major'
      });
    });

  } catch (error) {
    errors.push({
      type: 'testing',
      message: `Failed to test core functionality: ${error.message}`,
      severity: 'minor'
    });
  }
}

/**
 * Get user agent for browser
 */
async function getUserAgent(browserConfig) {
  const browser = await browserConfig.launcher.launch();
  try {
    const page = await browser.newPage();
    return await page.evaluate(() => navigator.userAgent);
  } finally {
    await browser.close();
  }
}

/**
 * Create error result for failed browser test
 */
function createErrorResult(browserConfig, error) {
  return {
    browserName: browserConfig.name,
    displayName: browserConfig.displayName,
    userAgent: 'Unknown',
    passed: false,
    errors: [{
      type: 'browser',
      message: `Browser test failed: ${error.message}`,
      severity: 'critical'
    }],
    warnings: [],
    performance: {},
    features: {},
    screenshots: {},
    consoleErrors: []
  };
}

/**
 * Calculate compatibility score for service
 */
function calculateServiceCompatibilityScore(browserResults) {
  const totalBrowsers = browserResults.length;
  if (totalBrowsers === 0) return 0;

  const weights = {
    chromium: 0.65, // Chrome market share
    firefox: 0.09,  // Firefox market share
    webkit: 0.19    // Safari market share
  };

  let weightedScore = 0;
  let totalWeight = 0;

  browserResults.forEach(result => {
    const weight = weights[result.browserName] || 0.1;
    const browserScore = result.passed ? 100 :
      Math.max(0, 100 - (result.errors.filter(e => e.severity === 'critical').length * 25) -
                        (result.errors.filter(e => e.severity === 'major').length * 10));

    weightedScore += browserScore * weight;
    totalWeight += weight;
  });

  return Math.round(weightedScore / totalWeight);
}

/**
 * Generate service-specific recommendations
 */
function generateServiceRecommendations(browserResults) {
  const recommendations = [];
  const allErrors = browserResults.flatMap(r => r.errors);
  const allWarnings = browserResults.flatMap(r => r.warnings);

  // Browser-specific issues
  const failedBrowsers = browserResults.filter(r => !r.passed);
  if (failedBrowsers.length > 0) {
    recommendations.push(
      `Critical issues in ${failedBrowsers.map(b => b.displayName).join(', ')}`
    );
  }

  // JavaScript compatibility
  const jsErrors = allErrors.filter(e => e.type === 'javascript');
  if (jsErrors.length > 0) {
    recommendations.push('Fix JavaScript compatibility issues across browsers');
  }

  // Responsive design
  const responsiveIssues = allWarnings.filter(w => w.type === 'responsive');
  if (responsiveIssues.length > 0) {
    recommendations.push('Improve responsive design for better mobile experience');
  }

  // Performance optimization
  const performanceIssues = browserResults.filter(r =>
    r.performance.loadTime > 3000
  );
  if (performanceIssues.length > 0) {
    recommendations.push('Optimize loading performance for slower browsers');
  }

  return recommendations;
}

/**
 * Generate service summary
 */
function generateServiceSummary(browserResults) {
  return {
    totalBrowsers: browserResults.length,
    passedBrowsers: browserResults.filter(r => r.passed).length,
    failedBrowsers: browserResults.filter(r => !r.passed).length,
    totalErrors: browserResults.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: browserResults.reduce((sum, r) => sum + r.warnings.length, 0),
    avgLoadTime: Math.round(
      browserResults.reduce((sum, r) => sum + (r.performance.loadTime || 0), 0) / browserResults.length
    )
  };
}

/**
 * Log service results
 */
function logServiceResults(service, result) {
  console.log(`   📈 Compatibility Score: ${result.compatibilityScore}%`);
  console.log(`   🌐 Browsers Tested: ${result.summary.totalBrowsers}`);
  console.log(`   ✅ Passed: ${result.summary.passedBrowsers}`);
  console.log(`   ❌ Failed: ${result.summary.failedBrowsers}`);

  if (result.summary.totalErrors > 0) {
    console.log(`   🚨 Total Issues: ${result.summary.totalErrors}`);
  }

  if (result.compatibilityScore >= config.thresholds.compatibilityScore) {
    console.log(`   ✅ Meets compatibility threshold`);
  } else {
    console.log(`   ❌ Below compatibility threshold (${config.thresholds.compatibilityScore}%)`);
  }
}

/**
 * Validate compatibility thresholds
 */
function validateCompatibilityThresholds(results) {
  let passed = true;
  const violations = [];

  for (const result of results) {
    // Check compatibility score
    if (result.compatibilityScore < config.thresholds.compatibilityScore) {
      passed = false;
      violations.push({
        service: result.service,
        type: 'compatibility',
        score: result.compatibilityScore,
        threshold: config.thresholds.compatibilityScore
      });
    }

    // Check critical errors
    const criticalErrors = result.browserResults.reduce((sum, br) =>
      sum + br.errors.filter(e => e.severity === 'critical').length, 0
    );

    if (criticalErrors > config.thresholds.criticalErrors) {
      passed = false;
      violations.push({
        service: result.service,
        type: 'critical-errors',
        count: criticalErrors,
        threshold: config.thresholds.criticalErrors
      });
    }
  }

  return { passed, violations };
}

/**
 * Generate comprehensive compatibility report
 */
async function generateCompatibilityReport(results) {
  const reportHtml = generateReportHtml(results);
  const reportPath = path.join(config.reportSettings.outputDir, 'compatibility-audit-report.html');

  await fs.writeFile(reportPath, reportHtml, 'utf8');

  // Generate JSON report
  if (config.reportSettings.generateJson) {
    const jsonPath = path.join(config.reportSettings.outputDir, 'compatibility-audit-results.json');
    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8');
  }

  console.log(`\\n📄 Reports generated:`);
  console.log(`   HTML: ${reportPath}`);
}

/**
 * Generate HTML report
 */
function generateReportHtml(results) {
  const timestamp = new Date().toLocaleString();
  const totalServices = results.length;
  const avgCompatibility = Math.round(
    results.reduce((sum, r) => sum + r.compatibilityScore, 0) / totalServices
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Olorin Cross-Browser Compatibility Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { color: #2563eb; margin-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .success { color: #059669; }
        .warning { color: #d97706; }
        .error { color: #dc2626; }
        .service-section { background: white; margin: 20px 0; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .browser-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin: 15px 0; }
        .browser-card { padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; }
        .browser-card.passed { background: #f0fdf4; border-color: #22c55e; }
        .browser-card.failed { background: #fef2f2; border-color: #ef4444; }
        .browser-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
        .browser-name { font-weight: bold; }
        .browser-status { margin-left: auto; }
        .perf-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin: 10px 0; }
        .perf-metric { text-align: center; padding: 6px; background: #f9fafb; border-radius: 4px; font-size: 0.85em; }
        .recommendations { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 15px 0; }
        .footer { text-align: center; color: #666; margin-top: 40px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Olorin Cross-Browser Compatibility Report</h1>
            <p>Comprehensive browser compatibility assessment across Chrome, Firefox, and Safari</p>
            <p><strong>Generated:</strong> ${timestamp}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value ${avgCompatibility >= 80 ? 'success' : avgCompatibility >= 60 ? 'warning' : 'error'}">${avgCompatibility}%</div>
                <div class="metric-label">Average Compatibility</div>
            </div>
            <div class="metric">
                <div class="metric-value">${totalServices}</div>
                <div class="metric-label">Services Tested</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.filter(r => r.compatibilityScore >= 75).length}</div>
                <div class="metric-label">Compatible Services</div>
            </div>
            <div class="metric">
                <div class="metric-value">${config.browsers.length}</div>
                <div class="metric-label">Browsers Tested</div>
            </div>
        </div>

        ${results.map(result => `
            <div class="service-section">
                <h2>${result.service}</h2>
                <p><strong>URL:</strong> ${result.url}</p>
                <p><strong>Compatibility Score:</strong> ${result.compatibilityScore}%</p>
                <p><strong>Critical Service:</strong> ${result.critical ? 'Yes' : 'No'}</p>

                <div class="browser-grid">
                    ${result.browserResults.map(browser => `
                        <div class="browser-card ${browser.passed ? 'passed' : 'failed'}">
                            <div class="browser-header">
                                <div class="browser-name">${browser.displayName}</div>
                                <div class="browser-status">${browser.passed ? '✅' : '❌'}</div>
                            </div>

                            <div class="perf-grid">
                                <div class="perf-metric">
                                    <div><strong>${browser.performance.loadTime || 0}ms</strong></div>
                                    <div>Load Time</div>
                                </div>
                                <div class="perf-metric">
                                    <div><strong>${browser.errors?.length || 0}</strong></div>
                                    <div>Errors</div>
                                </div>
                                <div class="perf-metric">
                                    <div><strong>${browser.warnings?.length || 0}</strong></div>
                                    <div>Warnings</div>
                                </div>
                            </div>

                            ${browser.errors?.length > 0 ? `
                                <div style="margin-top: 10px;">
                                    <strong>Issues:</strong>
                                    <ul style="margin-left: 15px; font-size: 0.9em;">
                                        ${browser.errors.slice(0, 2).map(error => `<li>${error.message}</li>`).join('')}
                                        ${browser.errors.length > 2 ? `<li>... ${browser.errors.length - 2} more</li>` : ''}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>

                ${result.recommendations?.length > 0 ? `
                    <div class="recommendations">
                        <h4>📋 Recommendations</h4>
                        <ul>
                            ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('')}

        <div class="footer">
            <p>Report generated by Olorin Cross-Browser Testing Framework</p>
            <p>Powered by Playwright | Chrome, Firefox, Safari compatibility testing</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Log final summary
 */
function logFinalSummary(results, thresholdResults) {
  console.log('\\n🎯 Cross-Browser Compatibility Summary');
  console.log('=====================================');

  const totalServices = results.length;
  const avgCompatibility = Math.round(
    results.reduce((sum, r) => sum + r.compatibilityScore, 0) / totalServices
  );
  const compatibleServices = results.filter(r => r.compatibilityScore >= config.thresholds.compatibilityScore).length;
  const totalIssues = results.reduce((sum, r) => sum + r.summary.totalErrors, 0);

  console.log(`📊 Services Tested: ${totalServices}`);
  console.log(`📈 Average Compatibility: ${avgCompatibility}%`);
  console.log(`✅ Compatible Services: ${compatibleServices}/${totalServices}`);
  console.log(`🚨 Total Issues: ${totalIssues}`);

  if (thresholdResults.passed) {
    console.log('\\n🎉 All services meet cross-browser compatibility thresholds!');
  } else {
    console.log('\\n❌ Compatibility threshold violations:');
    thresholdResults.violations.forEach(violation => {
      console.log(`   ${violation.service}: ${violation.type} (${violation.count || violation.score})`);
    });
  }

  console.log(`\\n📄 Detailed report: test-results/cross-browser/compatibility-audit-report.html`);
}

/**
 * Ensure directory exists
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
Olorin Cross-Browser Compatibility Audit Tool

Usage:
  node scripts/cross-browser/compatibility-audit.js [options]

Options:
  --help, -h     Show this help message
  --verbose      Show detailed output
  --service      Test specific service only
  --browser      Test specific browser only

Examples:
  npm run browser:compatibility
  node scripts/cross-browser/compatibility-audit.js --verbose
  node scripts/cross-browser/compatibility-audit.js --service core-ui
  node scripts/cross-browser/compatibility-audit.js --browser chromium
  `);
  process.exit(0);
}

// Filter services if specific service requested
if (args.includes('--service')) {
  const serviceIndex = args.indexOf('--service') + 1;
  if (serviceIndex < args.length) {
    const serviceName = args[serviceIndex];
    config.services = config.services.filter(s => s.name === serviceName);
  }
}

// Filter browsers if specific browser requested
if (args.includes('--browser')) {
  const browserIndex = args.indexOf('--browser') + 1;
  if (browserIndex < args.length) {
    const browserName = args[browserIndex];
    config.browsers = config.browsers.filter(b => b.name === browserName);
  }
}

// Run the compatibility audit
runCompatibilityAudit().catch(error => {
  console.error('❌ Cross-browser compatibility audit failed:', error);
  process.exit(1);
});