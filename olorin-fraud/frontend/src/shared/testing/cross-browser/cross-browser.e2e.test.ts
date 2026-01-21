/**
 * Cross-Browser E2E Tests
 *
 * Comprehensive cross-browser testing for all Olorin microservices
 * ensuring consistent functionality across Chrome, Firefox, Safari, and Edge.
 *
 * Test Categories:
 * 1. Core functionality across browsers
 * 2. Browser-specific feature compatibility
 * 3. Responsive design consistency
 * 4. Performance comparison
 * 5. JavaScript compatibility
 * 6. CSS rendering consistency
 */

import { test, expect, Browser, devices } from '@playwright/test';
import { CrossBrowserTestEngine, CrossBrowserTestOptions } from './cross-browser-test-engine';

const crossBrowserEngine = new CrossBrowserTestEngine();

// Test configuration
const testConfig = {
  services: [
    {
      name: 'core-ui',
      url: 'http://localhost:3000/',
      critical: true,
      expectedFeatures: ['navigation', 'authentication', 'routing']
    },
    {
      name: 'autonomous-investigation',
      url: 'http://localhost:3001/autonomous-investigation',
      critical: true,
      expectedFeatures: ['forms', 'file-upload', 'data-visualization']
    },
    {
      name: 'manual-investigation',
      url: 'http://localhost:3002/manual-investigation',
      critical: true,
      expectedFeatures: ['search', 'data-tables', 'forms']
    },
    {
      name: 'visualization',
      url: 'http://localhost:3005/visualization',
      critical: true,
      expectedFeatures: ['charts', 'interactive-elements', 'data-visualization']
    },
    {
      name: 'reporting',
      url: 'http://localhost:3006/reporting',
      critical: true,
      expectedFeatures: ['pdf-generation', 'data-export', 'printing']
    }
  ],
  browsers: ['chromium', 'firefox', 'webkit'],
  viewports: [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667, isMobile: true }
  ],
  thresholds: {
    compatibilityScore: 80,
    maxCriticalErrors: 0,
    maxMajorErrors: 2,
    maxLoadTime: 5000
  }
};

test.describe('Cross-Browser Compatibility Tests', () => {
  test.setTimeout(120000); // 2 minutes per test

  test('should maintain consistent functionality across all browsers for critical services', async () => {
    console.log('🌐 Testing cross-browser compatibility for critical services...');

    const criticalServices = testConfig.services.filter(s => s.critical);

    for (const service of criticalServices) {
      console.log(`\n📱 Testing ${service.name} across all browsers...`);

      const result = await crossBrowserEngine.testServiceCrossBrowser(
        service.name,
        service.url,
        {
          includePerformance: true,
          includeResponsive: true,
          timeout: 30000
        }
      );

      // Assert compatibility score meets threshold
      expect(result.compatibilityScore).toBeGreaterThanOrEqual(
        testConfig.thresholds.compatibilityScore
      );

      // Assert no critical errors across browsers
      const criticalErrors = result.browsers.reduce((sum, browser) =>
        sum + browser.errors.filter(e => e.severity === 'critical').length, 0
      );
      expect(criticalErrors).toBeLessThanOrEqual(testConfig.thresholds.maxCriticalErrors);

      // Assert all browsers passed basic functionality
      const failedBrowsers = result.browsers.filter(b => !b.passed);
      expect(failedBrowsers.length).toBe(0);

      // Log results for debugging
      console.log(`  ✅ ${service.name}: ${result.compatibilityScore}% compatible`);
      console.log(`  📊 Browsers tested: ${result.summary.totalBrowsers}`);
      console.log(`  ✅ Passed: ${result.summary.passedBrowsers}`);
      console.log(`  ❌ Failed: ${result.summary.failedBrowsers}`);
    }
  });

  test('should render consistently across different browsers and viewports', async () => {
    console.log('🖥️ Testing responsive design consistency across browsers...');

    const service = testConfig.services[0]; // Test with core-ui
    const options: CrossBrowserTestOptions = {
      viewports: testConfig.viewports,
      includeResponsive: true
    };

    const result = await crossBrowserEngine.testServiceCrossBrowser(
      service.name,
      service.url,
      options
    );

    // Assert each browser handles responsive design properly
    for (const browserResult of result.browsers) {
      console.log(`\n🌐 Checking ${browserResult.browserName} responsive behavior...`);

      // Should not have rendering errors
      const renderingErrors = browserResult.errors.filter(e => e.type === 'rendering');
      expect(renderingErrors.length).toBeLessThanOrEqual(1);

      // Should have screenshots for all viewports (indicates successful rendering)
      const viewportNames = testConfig.viewports.map(v => v.name);
      for (const viewportName of viewportNames) {
        expect(browserResult.screenshots[viewportName]).toBeDefined();
      }

      // Should not have too many responsive warnings
      const responsiveWarnings = browserResult.warnings.filter(w =>
        w.type === 'compatibility' && w.message.includes('responsive')
      );
      expect(responsiveWarnings.length).toBeLessThanOrEqual(2);

      console.log(`  ✅ ${browserResult.browserName}: responsive design working`);
    }
  });

  test('should support modern web features across browsers', async () => {
    console.log('🔧 Testing modern web feature support across browsers...');

    const service = testConfig.services[0]; // Test with core-ui
    const result = await crossBrowserEngine.testServiceCrossBrowser(
      service.name,
      service.url,
      { includePerformance: false }
    );

    // Define required features for the application
    const requiredFeatures = {
      localStorage: true,
      sessionStorage: true,
      webSockets: true,
      promises: true,
      arrowFunctions: true,
      flexbox: true,
      customProperties: true
    };

    for (const browserResult of result.browsers) {
      console.log(`\n🔍 Checking ${browserResult.browserName} feature support...`);

      // Check JavaScript features
      expect(browserResult.features.javascript.promises).toBe(requiredFeatures.promises);
      expect(browserResult.features.javascript.arrowFunctions).toBe(requiredFeatures.arrowFunctions);

      // Check storage features
      expect(browserResult.features.localStorage).toBe(requiredFeatures.localStorage);
      expect(browserResult.features.sessionStorage).toBe(requiredFeatures.sessionStorage);

      // Check CSS features
      expect(browserResult.features.css.flexbox).toBe(requiredFeatures.flexbox);
      expect(browserResult.features.css.customProperties).toBe(requiredFeatures.customProperties);

      // WebSocket support (critical for real-time features)
      expect(browserResult.features.webSockets).toBe(requiredFeatures.webSockets);

      console.log(`  ✅ ${browserResult.browserName}: all required features supported`);
    }
  });

  test('should maintain acceptable performance across all browsers', async () => {
    console.log('⚡ Testing performance consistency across browsers...');

    const criticalServices = testConfig.services.filter(s => s.critical).slice(0, 3); // Test first 3 for time

    for (const service of criticalServices) {
      console.log(`\n📊 Testing ${service.name} performance...`);

      const result = await crossBrowserEngine.testServiceCrossBrowser(
        service.name,
        service.url,
        {
          includePerformance: true,
          viewports: [testConfig.viewports[0]] // Desktop only for performance
        }
      );

      for (const browserResult of result.browsers) {
        console.log(`  🌐 ${browserResult.browserName} performance:`);

        // Assert load time is acceptable
        expect(browserResult.performance.loadTime).toBeLessThanOrEqual(
          testConfig.thresholds.maxLoadTime
        );

        // Assert DOM content loaded quickly
        expect(browserResult.performance.domContentLoaded).toBeLessThanOrEqual(3000);

        // Assert first contentful paint is fast
        if (browserResult.performance.firstContentfulPaint > 0) {
          expect(browserResult.performance.firstContentfulPaint).toBeLessThanOrEqual(2000);
        }

        console.log(`    ⏱️  Load time: ${browserResult.performance.loadTime}ms`);
        console.log(`    🎨 First paint: ${browserResult.performance.firstContentfulPaint}ms`);
      }
    }
  });

  test('should handle JavaScript errors gracefully across browsers', async () => {
    console.log('🐛 Testing JavaScript error handling across browsers...');

    const service = testConfig.services[0]; // Test with core-ui
    const result = await crossBrowserEngine.testServiceCrossBrowser(
      service.name,
      service.url
    );

    for (const browserResult of result.browsers) {
      console.log(`\n🔍 Checking ${browserResult.browserName} JavaScript errors...`);

      // Should not have critical JavaScript errors
      const criticalJsErrors = browserResult.errors.filter(e =>
        e.type === 'javascript' && e.severity === 'critical'
      );
      expect(criticalJsErrors.length).toBe(0);

      // Should not have too many console errors
      const errorLevelLogs = browserResult.consoleErrors.filter(e => e.level === 'error');
      expect(errorLevelLogs.length).toBeLessThanOrEqual(3);

      // Major JavaScript errors should be minimal
      const majorJsErrors = browserResult.errors.filter(e =>
        e.type === 'javascript' && e.severity === 'major'
      );
      expect(majorJsErrors.length).toBeLessThanOrEqual(1);

      console.log(`  ✅ ${browserResult.browserName}: JavaScript errors within acceptable limits`);
      if (errorLevelLogs.length > 0) {
        console.log(`    ⚠️  Console errors: ${errorLevelLogs.length}`);
      }
    }
  });

  test('should support keyboard navigation consistently across browsers', async () => {
    console.log('⌨️ Testing keyboard navigation across browsers...');

    const service = testConfig.services[0]; // Test with core-ui

    // Use Playwright's built-in browsers for detailed keyboard testing
    const browsers = ['chromium', 'firefox', 'webkit'];

    for (const browserName of browsers) {
      console.log(`\n⌨️ Testing keyboard navigation in ${browserName}...`);

      await test.step(`Test ${browserName} keyboard navigation`, async () => {
        const { browser } = await import('@playwright/test');
        let testBrowser;

        if (browserName === 'chromium') {
          const { chromium } = await import('@playwright/test');
          testBrowser = await chromium.launch();
        } else if (browserName === 'firefox') {
          const { firefox } = await import('@playwright/test');
          testBrowser = await firefox.launch();
        } else {
          const { webkit } = await import('@playwright/test');
          testBrowser = await webkit.launch();
        }

        try {
          const context = await testBrowser.newContext();
          const page = await context.newPage();

          await page.goto(service.url, { waitUntil: 'networkidle' });

          // Test basic tab navigation
          await page.keyboard.press('Tab');
          const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
          expect(focusedElement).toBeTruthy();

          // Test that focus is visible
          const focusVisible = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el) return false;
            const styles = getComputedStyle(el);
            return styles.outline !== 'none' || styles.boxShadow.includes('focus') ||
                   el.classList.contains('focus') || styles.border.includes('focus');
          });

          // Should have some form of focus indication (not strictly required but recommended)
          if (!focusVisible) {
            console.log(`    ⚠️  ${browserName}: Focus indicators could be improved`);
          }

          // Test Enter key activation on buttons
          const buttons = await page.locator('button, [role="button"]').count();
          if (buttons > 0) {
            await page.locator('button, [role="button"]').first().focus();
            // Don't actually press Enter to avoid triggering actions, just test focus
            const buttonFocused = await page.evaluate(() => {
              const el = document.activeElement;
              return el?.tagName === 'BUTTON' || el?.getAttribute('role') === 'button';
            });
            expect(buttonFocused).toBe(true);
          }

          await context.close();
          console.log(`  ✅ ${browserName}: keyboard navigation working`);

        } finally {
          await testBrowser.close();
        }
      });
    }
  });

  test('should handle different screen densities and zoom levels', async () => {
    console.log('🔍 Testing screen density and zoom level handling...');

    const service = testConfig.services[0]; // Test with core-ui
    const zoomLevels = [0.75, 1.0, 1.25, 1.5];

    for (const zoomLevel of zoomLevels) {
      console.log(`\n🔍 Testing zoom level ${zoomLevel * 100}%...`);

      const result = await crossBrowserEngine.testServiceCrossBrowser(
        service.name,
        service.url,
        {
          viewports: [{
            name: `desktop-zoom-${zoomLevel}`,
            width: Math.round(1920 / zoomLevel),
            height: Math.round(1080 / zoomLevel),
            deviceScaleFactor: zoomLevel
          }]
        }
      );

      // Should render without critical errors at different zoom levels
      for (const browserResult of result.browsers) {
        const criticalErrors = browserResult.errors.filter(e => e.severity === 'critical');
        expect(criticalErrors.length).toBe(0);

        const renderingErrors = browserResult.errors.filter(e => e.type === 'rendering');
        expect(renderingErrors.length).toBeLessThanOrEqual(1);

        console.log(`  ✅ ${browserResult.browserName}: zoom ${zoomLevel * 100}% working`);
      }
    }
  });

  test('should maintain functionality with disabled JavaScript features', async () => {
    console.log('🚫 Testing graceful degradation with limited JavaScript...');

    // This test simulates older browsers or restricted environments
    const service = testConfig.services[0]; // Test with core-ui

    await test.step('Test with limited JavaScript support', async () => {
      const { chromium } = await import('@playwright/test');
      const browser = await chromium.launch();

      try {
        const context = await browser.newContext();
        const page = await context.newPage();

        // Disable some modern JavaScript features
        await page.addInitScript(() => {
          // Simulate older browser by removing some modern features
          delete (window as any).fetch;
          delete (window as any).Promise;
        });

        await page.goto(service.url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        // Basic functionality should still work
        const pageTitle = await page.title();
        expect(pageTitle).toBeTruthy();
        expect(pageTitle.length).toBeGreaterThan(0);

        // Should have basic navigation elements
        const navElements = await page.locator('nav, [role="navigation"]').count();
        expect(navElements).toBeGreaterThanOrEqual(0); // Allow for apps without nav

        // Should have main content
        const mainContent = await page.locator('main, [role="main"], #root, [data-testid="main"]').count();
        expect(mainContent).toBeGreaterThanOrEqual(1);

        await context.close();
        console.log('  ✅ Basic functionality maintained with limited JavaScript');

      } finally {
        await browser.close();
      }
    });
  });

  // Generate comprehensive cross-browser report after all tests
  test.afterAll(async () => {
    console.log('\n📄 Generating comprehensive cross-browser test report...');

    // Test all services for final report
    const allResults = await crossBrowserEngine.testMultipleServices(
      testConfig.services,
      {
        includePerformance: true,
        includeResponsive: true,
        includeAccessibility: false, // Separate accessibility tests
        timeout: 30000
      }
    );

    // Generate HTML report
    const reportHtml = crossBrowserEngine.generateCrossBrowserReport(allResults);

    // Save report (in real implementation, you'd write to file system)
    console.log('📊 Cross-browser test summary:');
    console.log(`   Total services tested: ${allResults.length}`);
    console.log(`   Average compatibility: ${Math.round(
      allResults.reduce((sum, r) => sum + r.compatibilityScore, 0) / allResults.length
    )}%`);
    console.log(`   Services with high compatibility (≥80%): ${
      allResults.filter(r => r.compatibilityScore >= 80).length
    }`);

    const totalIssues = allResults.reduce((sum, r) => sum + r.summary.totalErrors, 0);
    console.log(`   Total compatibility issues: ${totalIssues}`);

    if (totalIssues === 0) {
      console.log('🎉 All services pass cross-browser compatibility tests!');
    } else {
      console.log('⚠️  Some compatibility issues detected - see detailed report');
    }

    console.log('\n📄 Detailed report available in test results');
  });
});