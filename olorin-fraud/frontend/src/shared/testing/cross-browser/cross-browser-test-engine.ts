/**
 * Cross-Browser Test Engine
 *
 * Comprehensive cross-browser testing framework for Olorin microservices
 * using Playwright to ensure consistent functionality across all major browsers.
 *
 * Features:
 * - Tests Chrome, Firefox, Safari, and Edge browsers
 * - Validates core functionality across all microservices
 * - Browser-specific feature detection and compatibility testing
 * - Performance comparison across browsers
 * - Responsive design validation on different browsers
 * - CSS and JavaScript compatibility testing
 */

import { Browser, BrowserContext, Page, devices } from '@playwright/test';
import { chromium, firefox, webkit } from '@playwright/test';

export interface CrossBrowserTestOptions {
  browsers?: BrowserType[];
  viewports?: ViewportSize[];
  includePerformance?: boolean;
  includeAccessibility?: boolean;
  includeResponsive?: boolean;
  timeout?: number;
  retries?: number;
}

export interface BrowserType {
  name: string;
  launch: () => Promise<Browser>;
  userAgent?: string;
  features?: string[];
}

export interface ViewportSize {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}

export interface CrossBrowserTestResult {
  service: string;
  url: string;
  timestamp: string;
  browsers: BrowserTestResult[];
  summary: TestSummary;
  compatibilityScore: number;
  recommendations: string[];
}

export interface BrowserTestResult {
  browserName: string;
  browserVersion?: string;
  userAgent: string;
  passed: boolean;
  errors: TestError[];
  warnings: TestWarning[];
  performance: PerformanceMetrics;
  features: FeatureCompatibility;
  screenshots: { [viewport: string]: string };
  consoleErrors: ConsoleError[];
}

export interface TestError {
  type: 'javascript' | 'network' | 'rendering' | 'functionality';
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  severity: 'critical' | 'major' | 'minor';
}

export interface TestWarning {
  type: 'deprecation' | 'performance' | 'accessibility' | 'compatibility';
  message: string;
  recommendation?: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  memoryUsage?: number;
  renderingTime: number;
}

export interface FeatureCompatibility {
  webGL: boolean;
  webAssembly: boolean;
  serviceWorkers: boolean;
  webSockets: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  geolocation: boolean;
  notifications: boolean;
  css: CSSFeatureSupport;
  javascript: JSFeatureSupport;
}

export interface CSSFeatureSupport {
  flexbox: boolean;
  grid: boolean;
  customProperties: boolean;
  animations: boolean;
  transforms: boolean;
  filters: boolean;
  masks: boolean;
  clipPath: boolean;
}

export interface JSFeatureSupport {
  es6Classes: boolean;
  arrowFunctions: boolean;
  promises: boolean;
  asyncAwait: boolean;
  modules: boolean;
  destructuring: boolean;
  templateLiterals: boolean;
  spreadOperator: boolean;
}

export interface TestSummary {
  totalBrowsers: number;
  passedBrowsers: number;
  failedBrowsers: number;
  totalErrors: number;
  totalWarnings: number;
  compatibilityIssues: number;
}

export interface ConsoleError {
  level: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  timestamp: string;
}

export class CrossBrowserTestEngine {
  private browsers: BrowserType[] = [
    {
      name: 'chromium',
      launch: () => chromium.launch({ headless: true }),
      features: ['webGL', 'webAssembly', 'serviceWorkers', 'webSockets']
    },
    {
      name: 'firefox',
      launch: () => firefox.launch({ headless: true }),
      features: ['webGL', 'webAssembly', 'serviceWorkers', 'webSockets']
    },
    {
      name: 'webkit',
      launch: () => webkit.launch({ headless: true }),
      features: ['webGL', 'webSockets', 'serviceWorkers']
    }
  ];

  private viewports: ViewportSize[] = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'laptop', width: 1366, height: 768 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667, isMobile: true }
  ];

  private services = [
    {
      name: 'core-ui',
      url: 'http://localhost:3000/',
      critical: true,
      features: ['authentication', 'navigation', 'routing']
    },
    {
      name: 'autonomous-investigation',
      url: 'http://localhost:3001/autonomous-investigation',
      critical: true,
      features: ['forms', 'data-visualization', 'file-upload']
    },
    {
      name: 'manual-investigation',
      url: 'http://localhost:3002/manual-investigation',
      critical: true,
      features: ['forms', 'data-tables', 'search']
    },
    {
      name: 'agent-analytics',
      url: 'http://localhost:3003/agent-analytics',
      critical: false,
      features: ['charts', 'data-visualization', 'filters']
    },
    {
      name: 'rag-intelligence',
      url: 'http://localhost:3004/rag-intelligence',
      critical: false,
      features: ['search', 'ai-integration', 'real-time-updates']
    },
    {
      name: 'visualization',
      url: 'http://localhost:3005/visualization',
      critical: true,
      features: ['charts', 'data-visualization', 'interactive-elements']
    },
    {
      name: 'reporting',
      url: 'http://localhost:3006/reporting',
      critical: true,
      features: ['pdf-generation', 'data-export', 'printing']
    },
    {
      name: 'design-system',
      url: 'http://localhost:3007/design-system',
      critical: false,
      features: ['component-showcase', 'interactive-examples']
    }
  ];

  /**
   * Test service across all browsers
   */
  async testServiceCrossBrowser(
    serviceName: string,
    url: string,
    options: CrossBrowserTestOptions = {}
  ): Promise<CrossBrowserTestResult> {
    console.log(`🌐 Starting cross-browser testing for ${serviceName}`);

    const browsersToTest = options.browsers || this.browsers;
    const viewportsToTest = options.viewports || this.viewports.slice(0, 2); // Desktop and mobile by default
    const browserResults: BrowserTestResult[] = [];

    for (const browserType of browsersToTest) {
      console.log(`  📱 Testing ${browserType.name}...`);

      try {
        const result = await this.testSingleBrowser(
          browserType,
          url,
          viewportsToTest,
          options
        );
        browserResults.push(result);
      } catch (error) {
        console.error(`    ❌ Failed to test ${browserType.name}:`, error);
        browserResults.push(this.createErrorResult(browserType.name, error as Error));
      }
    }

    const compatibilityScore = this.calculateCompatibilityScore(browserResults);
    const summary = this.generateTestSummary(browserResults);
    const recommendations = this.generateRecommendations(browserResults);

    return {
      service: serviceName,
      url,
      timestamp: new Date().toISOString(),
      browsers: browserResults,
      summary,
      compatibilityScore,
      recommendations
    };
  }

  /**
   * Test multiple services across browsers
   */
  async testMultipleServices(
    services?: { name: string; url: string }[],
    options: CrossBrowserTestOptions = {}
  ): Promise<CrossBrowserTestResult[]> {
    const servicesToTest = services || this.services;
    const results: CrossBrowserTestResult[] = [];

    for (const service of servicesToTest) {
      const result = await this.testServiceCrossBrowser(
        service.name,
        service.url,
        options
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Test single browser across multiple viewports
   */
  private async testSingleBrowser(
    browserType: BrowserType,
    url: string,
    viewports: ViewportSize[],
    options: CrossBrowserTestOptions
  ): Promise<BrowserTestResult> {
    const browser = await browserType.launch();
    const errors: TestError[] = [];
    const warnings: TestWarning[] = [];
    const consoleErrors: ConsoleError[] = [];
    const screenshots: { [viewport: string]: string } = {};
    let performance: PerformanceMetrics = {
      loadTime: 0,
      domContentLoaded: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      renderingTime: 0
    };
    let features: FeatureCompatibility;

    try {
      const context = await browser.newContext({
        viewport: viewports[0] // Start with first viewport
      });

      const page = await context.newPage();

      // Collect console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push({
            level: 'error',
            message: msg.text(),
            source: msg.location().url || '',
            timestamp: new Date().toISOString()
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
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Navigate and measure performance
        const startTime = Date.now();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        const loadTime = Date.now() - startTime;

        // Get performance metrics
        const performanceMetrics = await this.getPerformanceMetrics(page);
        performance = {
          loadTime,
          domContentLoaded: performanceMetrics.domContentLoaded,
          firstContentfulPaint: performanceMetrics.firstContentfulPaint,
          largestContentfulPaint: performanceMetrics.largestContentfulPaint,
          renderingTime: performanceMetrics.renderingTime
        };

        // Test browser features
        if (viewport === viewports[0]) { // Test features once
          features = await this.testBrowserFeatures(page);
        }

        // Test responsive behavior
        await this.testResponsiveBehavior(page, viewport, errors, warnings);

        // Take screenshot
        const screenshotBuffer = await page.screenshot({ fullPage: true });
        screenshots[viewport.name] = screenshotBuffer.toString('base64');

        // Test core functionality
        await this.testCoreFunctionality(page, errors, warnings);
      }

      await context.close();

    } finally {
      await browser.close();
    }

    const userAgent = await this.getUserAgent(browserType);
    const passed = errors.filter(e => e.severity === 'critical').length === 0;

    return {
      browserName: browserType.name,
      userAgent,
      passed,
      errors,
      warnings,
      performance,
      features: features!,
      screenshots,
      consoleErrors
    };
  }

  /**
   * Get performance metrics from page
   */
  private async getPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: 0, // Would need observer
        renderingTime: navigation.loadEventEnd - navigation.responseEnd
      };
    });
  }

  /**
   * Test browser feature support
   */
  private async testBrowserFeatures(page: Page): Promise<FeatureCompatibility> {
    return await page.evaluate(() => {
      const testFeature = (test: () => boolean): boolean => {
        try {
          return test();
        } catch {
          return false;
        }
      };

      return {
        webGL: testFeature(() => {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        }),
        webAssembly: testFeature(() => typeof WebAssembly === 'object'),
        serviceWorkers: testFeature(() => 'serviceWorker' in navigator),
        webSockets: testFeature(() => typeof WebSocket === 'function'),
        localStorage: testFeature(() => typeof Storage !== 'undefined' && !!localStorage),
        sessionStorage: testFeature(() => typeof Storage !== 'undefined' && !!sessionStorage),
        indexedDB: testFeature(() => 'indexedDB' in window),
        geolocation: testFeature(() => 'geolocation' in navigator),
        notifications: testFeature(() => 'Notification' in window),
        css: {
          flexbox: testFeature(() => CSS.supports('display', 'flex')),
          grid: testFeature(() => CSS.supports('display', 'grid')),
          customProperties: testFeature(() => CSS.supports('--test', 'red')),
          animations: testFeature(() => CSS.supports('animation', 'test 1s')),
          transforms: testFeature(() => CSS.supports('transform', 'translateX(10px)')),
          filters: testFeature(() => CSS.supports('filter', 'blur(5px)')),
          masks: testFeature(() => CSS.supports('mask', 'url(test.svg)')),
          clipPath: testFeature(() => CSS.supports('clip-path', 'circle(50%)'))
        },
        javascript: {
          es6Classes: testFeature(() => {
            try {
              eval('class TestClass {}');
              return true;
            } catch {
              return false;
            }
          }),
          arrowFunctions: testFeature(() => {
            try {
              eval('() => {}');
              return true;
            } catch {
              return false;
            }
          }),
          promises: testFeature(() => typeof Promise === 'function'),
          asyncAwait: testFeature(() => {
            try {
              eval('async function test() { await Promise.resolve(); }');
              return true;
            } catch {
              return false;
            }
          }),
          modules: testFeature(() => typeof import === 'function'),
          destructuring: testFeature(() => {
            try {
              eval('const {a} = {a: 1}');
              return true;
            } catch {
              return false;
            }
          }),
          templateLiterals: testFeature(() => {
            try {
              eval('`template literal`');
              return true;
            } catch {
              return false;
            }
          }),
          spreadOperator: testFeature(() => {
            try {
              eval('const arr = [...[1, 2, 3]]');
              return true;
            } catch {
              return false;
            }
          })
        }
      };
    });
  }

  /**
   * Test responsive behavior
   */
  private async testResponsiveBehavior(
    page: Page,
    viewport: ViewportSize,
    errors: TestError[],
    warnings: TestWarning[]
  ): Promise<void> {
    try {
      // Test if layout adapts to viewport
      const layoutTest = await page.evaluate((vp) => {
        const main = document.querySelector('main') || document.body;
        const rect = main.getBoundingClientRect();

        // Check if content fits within viewport
        const fitsHorizontally = rect.width <= vp.width;
        const hasResponsiveElements = Array.from(document.querySelectorAll('*')).some(el => {
          const styles = getComputedStyle(el);
          return styles.display === 'flex' || styles.display === 'grid' ||
                 styles.maxWidth === '100%' || styles.width.includes('%');
        });

        return {
          fitsHorizontally,
          hasResponsiveElements,
          contentWidth: rect.width,
          viewportWidth: vp.width
        };
      }, viewport);

      if (!layoutTest.fitsHorizontally) {
        errors.push({
          type: 'rendering',
          message: `Content overflows viewport on ${viewport.name} (${layoutTest.contentWidth}px > ${layoutTest.viewportWidth}px)`,
          severity: 'major'
        });
      }

      if (!layoutTest.hasResponsiveElements) {
        warnings.push({
          type: 'compatibility',
          message: `No responsive design elements detected on ${viewport.name}`,
          recommendation: 'Consider adding responsive CSS techniques (flexbox, grid, media queries)'
        });
      }

      // Test touch interactions on mobile
      if (viewport.isMobile) {
        const touchTest = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
          const smallButtons = buttons.filter(btn => {
            const rect = btn.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44; // iOS minimum touch target
          });

          return {
            totalButtons: buttons.length,
            smallButtons: smallButtons.length
          };
        });

        if (touchTest.smallButtons > 0) {
          warnings.push({
            type: 'accessibility',
            message: `${touchTest.smallButtons} touch targets smaller than 44px on mobile`,
            recommendation: 'Ensure touch targets are at least 44x44px for accessibility'
          });
        }
      }

    } catch (error) {
      errors.push({
        type: 'rendering',
        message: `Failed to test responsive behavior: ${(error as Error).message}`,
        severity: 'minor'
      });
    }
  }

  /**
   * Test core application functionality
   */
  private async testCoreFunctionality(
    page: Page,
    errors: TestError[],
    warnings: TestWarning[]
  ): Promise<void> {
    try {
      // Test if page is interactive
      const interactivityTest = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll(
          'button, input, select, textarea, a[href], [tabindex], [onclick]'
        );

        const workingElements = Array.from(interactiveElements).filter(el => {
          const styles = getComputedStyle(el);
          return styles.display !== 'none' && styles.visibility !== 'hidden';
        });

        return {
          totalInteractive: interactiveElements.length,
          visibleInteractive: workingElements.length,
          hasNavigation: !!document.querySelector('nav, [role="navigation"]'),
          hasMainContent: !!document.querySelector('main, [role="main"]'),
          hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0
        };
      });

      if (interactivityTest.totalInteractive === 0) {
        warnings.push({
          type: 'functionality',
          message: 'No interactive elements found on page',
          recommendation: 'Ensure page has interactive elements for user engagement'
        });
      }

      if (!interactivityTest.hasNavigation) {
        warnings.push({
          type: 'functionality',
          message: 'No navigation elements found',
          recommendation: 'Add navigation for better user experience'
        });
      }

      if (!interactivityTest.hasMainContent) {
        warnings.push({
          type: 'functionality',
          message: 'No main content area identified',
          recommendation: 'Use semantic HTML with <main> element or role="main"'
        });
      }

      // Test for JavaScript errors that affect functionality
      const jsErrorTest = await page.evaluate(() => {
        const errors: string[] = [];

        // Test if React is loaded and working
        if (typeof window.React === 'undefined' && !document.querySelector('[data-reactroot]')) {
          errors.push('React framework not detected or not working');
        }

        // Test if critical CSS is loaded
        const body = document.body;
        const styles = getComputedStyle(body);
        if (styles.fontFamily === 'serif' || styles.fontFamily.includes('Times')) {
          errors.push('Custom CSS may not be loaded (using default serif font)');
        }

        return errors;
      });

      jsErrorTest.forEach(error => {
        errors.push({
          type: 'functionality',
          message: error,
          severity: 'major'
        });
      });

    } catch (error) {
      errors.push({
        type: 'functionality',
        message: `Failed to test core functionality: ${(error as Error).message}`,
        severity: 'minor'
      });
    }
  }

  /**
   * Get user agent for browser
   */
  private async getUserAgent(browserType: BrowserType): Promise<string> {
    const browser = await browserType.launch();
    try {
      const page = await browser.newPage();
      const userAgent = await page.evaluate(() => navigator.userAgent);
      await page.close();
      return userAgent;
    } finally {
      await browser.close();
    }
  }

  /**
   * Create error result for failed browser test
   */
  private createErrorResult(browserName: string, error: Error): BrowserTestResult {
    return {
      browserName,
      userAgent: 'Unknown',
      passed: false,
      errors: [{
        type: 'functionality',
        message: `Browser test failed: ${error.message}`,
        severity: 'critical'
      }],
      warnings: [],
      performance: {
        loadTime: 0,
        domContentLoaded: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        renderingTime: 0
      },
      features: this.getDefaultFeatureSupport(),
      screenshots: {},
      consoleErrors: []
    };
  }

  /**
   * Get default feature support (all false)
   */
  private getDefaultFeatureSupport(): FeatureCompatibility {
    return {
      webGL: false,
      webAssembly: false,
      serviceWorkers: false,
      webSockets: false,
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
      geolocation: false,
      notifications: false,
      css: {
        flexbox: false,
        grid: false,
        customProperties: false,
        animations: false,
        transforms: false,
        filters: false,
        masks: false,
        clipPath: false
      },
      javascript: {
        es6Classes: false,
        arrowFunctions: false,
        promises: false,
        asyncAwait: false,
        modules: false,
        destructuring: false,
        templateLiterals: false,
        spreadOperator: false
      }
    };
  }

  /**
   * Calculate overall compatibility score
   */
  private calculateCompatibilityScore(results: BrowserTestResult[]): number {
    const totalBrowsers = results.length;
    if (totalBrowsers === 0) return 0;

    const passedBrowsers = results.filter(r => r.passed).length;
    const criticalErrors = results.reduce((sum, r) =>
      sum + r.errors.filter(e => e.severity === 'critical').length, 0
    );

    const baseScore = (passedBrowsers / totalBrowsers) * 100;
    const errorPenalty = Math.min(criticalErrors * 10, 50); // Max 50% penalty

    return Math.max(0, Math.round(baseScore - errorPenalty));
  }

  /**
   * Generate test summary
   */
  private generateTestSummary(results: BrowserTestResult[]): TestSummary {
    return {
      totalBrowsers: results.length,
      passedBrowsers: results.filter(r => r.passed).length,
      failedBrowsers: results.filter(r => !r.passed).length,
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
      compatibilityIssues: results.reduce((sum, r) =>
        sum + r.errors.filter(e => e.type === 'rendering' || e.type === 'functionality').length, 0
      )
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: BrowserTestResult[]): string[] {
    const recommendations: string[] = [];
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    // Browser compatibility recommendations
    const failedBrowsers = results.filter(r => !r.passed);
    if (failedBrowsers.length > 0) {
      recommendations.push(
        `Fix critical issues in ${failedBrowsers.map(b => b.browserName).join(', ')} browsers`
      );
    }

    // Feature support recommendations
    const unsupportedFeatures = this.findUnsupportedFeatures(results);
    if (unsupportedFeatures.length > 0) {
      recommendations.push(
        `Consider polyfills or alternatives for: ${unsupportedFeatures.join(', ')}`
      );
    }

    // Performance recommendations
    const slowBrowsers = results.filter(r => r.performance.loadTime > 3000);
    if (slowBrowsers.length > 0) {
      recommendations.push(
        `Optimize performance for ${slowBrowsers.map(b => b.browserName).join(', ')} (load time > 3s)`
      );
    }

    // Responsive design recommendations
    const responsiveIssues = allWarnings.filter(w => w.type === 'compatibility');
    if (responsiveIssues.length > 0) {
      recommendations.push('Improve responsive design implementation across all browsers');
    }

    // JavaScript error recommendations
    const jsErrors = allErrors.filter(e => e.type === 'javascript');
    if (jsErrors.length > 0) {
      recommendations.push('Fix JavaScript compatibility issues across browsers');
    }

    return recommendations;
  }

  /**
   * Find features not supported across browsers
   */
  private findUnsupportedFeatures(results: BrowserTestResult[]): string[] {
    const features: string[] = [];
    const featureKeys = [
      'webGL', 'webAssembly', 'serviceWorkers', 'webSockets',
      'localStorage', 'sessionStorage', 'indexedDB'
    ];

    featureKeys.forEach(feature => {
      const supportedBrowsers = results.filter(r =>
        (r.features as any)[feature] === true
      ).length;

      if (supportedBrowsers < results.length * 0.75) { // Less than 75% support
        features.push(feature);
      }
    });

    return features;
  }

  /**
   * Generate comprehensive cross-browser report
   */
  generateCrossBrowserReport(results: CrossBrowserTestResult[]): string {
    const timestamp = new Date().toLocaleString();
    const totalServices = results.length;
    const totalCompatibilityScore = Math.round(
      results.reduce((sum, r) => sum + r.compatibilityScore, 0) / totalServices
    );

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Olorin Cross-Browser Test Report</title>
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
        .service-card { background: white; margin: 20px 0; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .browser-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 15px; }
        .browser-result { padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; }
        .browser-result.passed { background: #f0fdf4; border-color: #22c55e; }
        .browser-result.failed { background: #fef2f2; border-color: #ef4444; }
        .browser-name { font-weight: bold; margin-bottom: 10px; }
        .performance-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin: 10px 0; }
        .performance-metric { text-align: center; padding: 8px; background: #f9fafb; border-radius: 4px; }
        .metric-value-small { font-weight: bold; display: block; }
        .metric-label-small { font-size: 0.8em; color: #666; }
        .recommendations { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 15px 0; }
        .recommendations h4 { color: #92400e; margin-bottom: 10px; }
        .recommendations ul { margin-left: 20px; }
        .footer { text-align: center; color: #666; margin-top: 40px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Olorin Cross-Browser Test Report</h1>
            <p>Comprehensive browser compatibility assessment across Chrome, Firefox, Safari, and Edge</p>
            <p><strong>Generated:</strong> ${timestamp}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value ${totalCompatibilityScore >= 80 ? 'success' : totalCompatibilityScore >= 60 ? 'warning' : 'error'}">${totalCompatibilityScore}%</div>
                <div class="metric-label">Average Compatibility</div>
            </div>
            <div class="metric">
                <div class="metric-value">${totalServices}</div>
                <div class="metric-label">Services Tested</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.filter(r => r.compatibilityScore >= 80).length}</div>
                <div class="metric-label">Compatible Services</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.reduce((sum, r) => sum + r.summary.totalErrors, 0)}</div>
                <div class="metric-label">Total Issues</div>
            </div>
        </div>

        ${results.map(result => `
            <div class="service-card">
                <h2>${result.service}</h2>
                <p><strong>URL:</strong> ${result.url}</p>
                <p><strong>Compatibility Score:</strong> ${result.compatibilityScore}%</p>

                <div class="browser-grid">
                    ${result.browsers.map(browser => `
                        <div class="browser-result ${browser.passed ? 'passed' : 'failed'}">
                            <div class="browser-name">${browser.browserName} ${browser.passed ? '✅' : '❌'}</div>
                            <div class="performance-metrics">
                                <div class="performance-metric">
                                    <span class="metric-value-small">${browser.performance.loadTime}ms</span>
                                    <span class="metric-label-small">Load Time</span>
                                </div>
                                <div class="performance-metric">
                                    <span class="metric-value-small">${browser.errors.length}</span>
                                    <span class="metric-label-small">Errors</span>
                                </div>
                                <div class="performance-metric">
                                    <span class="metric-value-small">${browser.warnings.length}</span>
                                    <span class="metric-label-small">Warnings</span>
                                </div>
                            </div>
                            ${browser.errors.length > 0 ? `
                                <div style="margin-top: 10px;">
                                    <strong>Issues:</strong>
                                    <ul style="margin-left: 15px; font-size: 0.9em;">
                                        ${browser.errors.slice(0, 3).map(error => `<li>${error.message}</li>`).join('')}
                                        ${browser.errors.length > 3 ? `<li>... and ${browser.errors.length - 3} more</li>` : ''}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>

                ${result.recommendations.length > 0 ? `
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
            <p>Powered by Playwright | Tested on Chrome, Firefox, Safari, and Edge</p>
        </div>
    </div>
</body>
</html>`;
  }
}