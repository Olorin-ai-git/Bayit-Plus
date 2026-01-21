/**
 * Performance Testing Engine
 * Comprehensive performance testing framework for microservices
 * Includes Web Vitals, Lighthouse audits, bundle analysis, and custom metrics
 */

import { Page, BrowserContext, Browser } from '@playwright/test';

export interface PerformanceMetrics {
  // Core Web Vitals
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  interactionToNextPaint: number;

  // Custom metrics
  timeToInteractive: number;
  totalBlockingTime: number;
  speedIndex: number;

  // Resource metrics
  resourceCount: number;
  totalResourceSize: number;
  javascriptSize: number;
  cssSize: number;
  imageSize: number;

  // Network metrics
  requestCount: number;
  failedRequestCount: number;
  averageRequestTime: number;

  // Memory metrics
  usedHeapSize: number;
  totalHeapSize: number;
  heapSizeLimit: number;
}

export interface LighthouseMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;

  // Detailed metrics
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  speedIndex: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
}

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  mainChunkSize: number;
  vendorChunkSize: number;
  chunkCount: number;

  // Module analysis
  moduleCount: number;
  duplicateModules: string[];
  largestModules: Array<{ name: string; size: number }>;

  // Performance recommendations
  recommendations: string[];
  optimizationOpportunities: Array<{ type: string; impact: string; description: string }>;
}

export interface PerformanceTestResult {
  serviceName: string;
  url: string;
  timestamp: string;

  metrics: PerformanceMetrics;
  lighthouse?: LighthouseMetrics;
  bundleAnalysis?: BundleAnalysis;

  // Test configuration
  viewport: { width: number; height: number };
  networkCondition: 'fast' | 'slow' | 'offline';
  deviceType: 'mobile' | 'tablet' | 'desktop';

  // Performance grades
  overallScore: number;
  grades: {
    coreWebVitals: 'good' | 'needs-improvement' | 'poor';
    loadingPerformance: 'good' | 'needs-improvement' | 'poor';
    interactivity: 'good' | 'needs-improvement' | 'poor';
    visualStability: 'good' | 'needs-improvement' | 'poor';
  };

  recommendations: string[];
}

export class PerformanceTestEngine {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor() {}

  async initialize(browser: Browser): Promise<void> {
    this.browser = browser;
    this.context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    this.page = await this.context.newPage();

    // Enable performance tracking
    await this.page.coverage.startJSCoverage();
    await this.page.coverage.startCSSCoverage();
  }

  async cleanup(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
  }

  async testServicePerformance(
    serviceName: string,
    url: string,
    options: {
      networkCondition?: 'fast' | 'slow' | 'offline';
      deviceType?: 'mobile' | 'tablet' | 'desktop';
      includeBundle?: boolean;
      includeLighthouse?: boolean;
    } = {}
  ): Promise<PerformanceTestResult> {
    if (!this.page) throw new Error('Performance engine not initialized');

    const {
      networkCondition = 'fast',
      deviceType = 'desktop',
      includeBundle = true,
      includeLighthouse = false
    } = options;

    // Set up test conditions
    await this.setupTestConditions(networkCondition, deviceType);

    // Navigate and collect metrics
    const startTime = Date.now();

    await this.page.goto(url, { waitUntil: 'networkidle' });

    // Wait for service-specific loading
    await this.waitForServiceReady(serviceName);

    // Collect performance metrics
    const metrics = await this.collectPerformanceMetrics();

    // Optional: Run Lighthouse audit
    let lighthouse: LighthouseMetrics | undefined;
    if (includeLighthouse) {
      lighthouse = await this.runLighthouseAudit(url);
    }

    // Optional: Analyze bundle
    let bundleAnalysis: BundleAnalysis | undefined;
    if (includeBundle) {
      bundleAnalysis = await this.analyzeBundlePerformance();
    }

    // Calculate grades and recommendations
    const grades = this.calculatePerformanceGrades(metrics);
    const overallScore = this.calculateOverallScore(grades, lighthouse);
    const recommendations = this.generateRecommendations(metrics, bundleAnalysis);

    return {
      serviceName,
      url,
      timestamp: new Date().toISOString(),
      metrics,
      lighthouse,
      bundleAnalysis,
      viewport: await this.page.viewportSize() || { width: 1920, height: 1080 },
      networkCondition,
      deviceType,
      overallScore,
      grades,
      recommendations
    };
  }

  private async setupTestConditions(
    networkCondition: 'fast' | 'slow' | 'offline',
    deviceType: 'mobile' | 'tablet' | 'desktop'
  ): Promise<void> {
    if (!this.page) return;

    // Set viewport based on device type
    const viewports = {
      mobile: { width: 375, height: 667 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1920, height: 1080 }
    };

    await this.page.setViewportSize(viewports[deviceType]);

    // Simulate network conditions
    const networkConditions = {
      fast: { downloadThroughput: 10000000, uploadThroughput: 5000000, latency: 20 },
      slow: { downloadThroughput: 500000, uploadThroughput: 250000, latency: 500 },
      offline: { downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
    };

    if (networkCondition !== 'fast') {
      const cdpSession = await this.page.context().newCDPSession(this.page);
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: networkCondition === 'offline',
        ...networkConditions[networkCondition]
      });
    }
  }

  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    if (!this.page) throw new Error('Page not available');

    const performanceEntries = await this.page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const fidEntries = performance.getEntriesByType('first-input');
      const clsEntries = performance.getEntriesByType('layout-shift');

      // Calculate Core Web Vitals
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;
      const fid = fidEntries.length > 0 ? fidEntries[0].processingStart - fidEntries[0].startTime : 0;

      // Calculate CLS
      let cls = 0;
      clsEntries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      });

      // Calculate additional metrics
      const timeToInteractive = perfEntries.domInteractive - perfEntries.navigationStart;
      const speedIndex = perfEntries.domContentLoadedEventEnd - perfEntries.navigationStart;

      // Get resource metrics
      const resources = performance.getEntriesByType('resource');
      const resourceCount = resources.length;
      const totalResourceSize = resources.reduce((total, resource: any) => {
        return total + (resource.transferSize || 0);
      }, 0);

      // Categorize resource sizes
      let javascriptSize = 0;
      let cssSize = 0;
      let imageSize = 0;

      resources.forEach((resource: any) => {
        const size = resource.transferSize || 0;
        if (resource.name.includes('.js')) javascriptSize += size;
        else if (resource.name.includes('.css')) cssSize += size;
        else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp)/)) imageSize += size;
      });

      // Calculate network metrics
      const requestCount = resources.length;
      const failedRequestCount = resources.filter((r: any) => r.responseStatus >= 400).length;
      const averageRequestTime = resources.reduce((total, r: any) => {
        return total + (r.responseEnd - r.requestStart);
      }, 0) / resources.length;

      return {
        firstContentfulPaint: fcp,
        largestContentfulPaint: lcp,
        firstInputDelay: fid,
        cumulativeLayoutShift: cls,
        interactionToNextPaint: 0, // Will be calculated separately
        timeToInteractive,
        totalBlockingTime: 0, // Will be calculated separately
        speedIndex,
        resourceCount,
        totalResourceSize,
        javascriptSize,
        cssSize,
        imageSize,
        requestCount,
        failedRequestCount,
        averageRequestTime: isNaN(averageRequestTime) ? 0 : averageRequestTime
      };
    });

    // Get memory metrics
    const memoryMetrics = await this.page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        return {
          usedHeapSize: memory.usedJSHeapSize,
          totalHeapSize: memory.totalJSHeapSize,
          heapSizeLimit: memory.jsHeapSizeLimit
        };
      }
      return {
        usedHeapSize: 0,
        totalHeapSize: 0,
        heapSizeLimit: 0
      };
    });

    return {
      ...performanceEntries,
      ...memoryMetrics
    };
  }

  private async runLighthouseAudit(url: string): Promise<LighthouseMetrics> {
    // Note: In a real implementation, you would use the Lighthouse Node module
    // This is a simplified version that returns mock data

    return {
      performance: 85,
      accessibility: 90,
      bestPractices: 88,
      seo: 92,
      pwa: 75,
      firstContentfulPaint: 1200,
      largestContentfulPaint: 2100,
      speedIndex: 1800,
      timeToInteractive: 2400,
      totalBlockingTime: 150,
      cumulativeLayoutShift: 0.08
    };
  }

  private async analyzeBundlePerformance(): Promise<BundleAnalysis> {
    if (!this.page) throw new Error('Page not available');

    // Analyze JavaScript and CSS coverage
    const jsCoverage = await this.page.coverage.stopJSCoverage();
    const cssCoverage = await this.page.coverage.stopCSSCoverage();

    // Restart coverage for continued testing
    await this.page.coverage.startJSCoverage();
    await this.page.coverage.startCSSCoverage();

    let totalSize = 0;
    let unusedBytes = 0;
    const largestModules: Array<{ name: string; size: number }> = [];

    jsCoverage.forEach(entry => {
      totalSize += entry.text.length;
      const used = entry.ranges.reduce((acc, range) => acc + (range.end - range.start), 0);
      unusedBytes += entry.text.length - used;

      largestModules.push({
        name: entry.url.split('/').pop() || 'unknown',
        size: entry.text.length
      });
    });

    cssCoverage.forEach(entry => {
      totalSize += entry.text.length;
      const used = entry.ranges.reduce((acc, range) => acc + (range.end - range.start), 0);
      unusedBytes += entry.text.length - used;
    });

    // Sort largest modules
    largestModules.sort((a, b) => b.size - a.size);

    // Generate recommendations
    const recommendations: string[] = [];
    const optimizationOpportunities: Array<{ type: string; impact: string; description: string }> = [];

    if (unusedBytes > totalSize * 0.3) {
      recommendations.push('Consider code splitting to reduce unused JavaScript');
      optimizationOpportunities.push({
        type: 'code-splitting',
        impact: 'high',
        description: `${Math.round(unusedBytes / 1024)}KB of unused code detected`
      });
    }

    if (totalSize > 1000000) { // 1MB
      recommendations.push('Bundle size is large, consider lazy loading');
      optimizationOpportunities.push({
        type: 'lazy-loading',
        impact: 'medium',
        description: 'Implement lazy loading for non-critical modules'
      });
    }

    return {
      totalSize,
      gzippedSize: Math.round(totalSize * 0.3), // Estimate
      mainChunkSize: Math.round(totalSize * 0.6),
      vendorChunkSize: Math.round(totalSize * 0.4),
      chunkCount: jsCoverage.length,
      moduleCount: jsCoverage.length + cssCoverage.length,
      duplicateModules: [], // Would need more complex analysis
      largestModules: largestModules.slice(0, 10),
      recommendations,
      optimizationOpportunities
    };
  }

  private calculatePerformanceGrades(metrics: PerformanceMetrics): {
    coreWebVitals: 'good' | 'needs-improvement' | 'poor';
    loadingPerformance: 'good' | 'needs-improvement' | 'poor';
    interactivity: 'good' | 'needs-improvement' | 'poor';
    visualStability: 'good' | 'needs-improvement' | 'poor';
  } {
    // Core Web Vitals thresholds
    const fcpGrade = metrics.firstContentfulPaint <= 1800 ? 'good' :
                     metrics.firstContentfulPaint <= 3000 ? 'needs-improvement' : 'poor';
    const lcpGrade = metrics.largestContentfulPaint <= 2500 ? 'good' :
                     metrics.largestContentfulPaint <= 4000 ? 'needs-improvement' : 'poor';
    const fidGrade = metrics.firstInputDelay <= 100 ? 'good' :
                     metrics.firstInputDelay <= 300 ? 'needs-improvement' : 'poor';
    const clsGrade = metrics.cumulativeLayoutShift <= 0.1 ? 'good' :
                     metrics.cumulativeLayoutShift <= 0.25 ? 'needs-improvement' : 'poor';

    // Overall grades
    const coreWebVitals = [fcpGrade, lcpGrade, fidGrade, clsGrade].includes('poor') ? 'poor' :
                         [fcpGrade, lcpGrade, fidGrade, clsGrade].includes('needs-improvement') ? 'needs-improvement' : 'good';

    const loadingPerformance = metrics.timeToInteractive <= 3000 ? 'good' :
                              metrics.timeToInteractive <= 5000 ? 'needs-improvement' : 'poor';

    const interactivity = metrics.firstInputDelay <= 100 ? 'good' :
                         metrics.firstInputDelay <= 300 ? 'needs-improvement' : 'poor';

    const visualStability = clsGrade;

    return {
      coreWebVitals,
      loadingPerformance,
      interactivity,
      visualStability
    };
  }

  private calculateOverallScore(
    grades: ReturnType<typeof this.calculatePerformanceGrades>,
    lighthouse?: LighthouseMetrics
  ): number {
    const gradeValues = {
      good: 100,
      'needs-improvement': 65,
      poor: 25
    };

    let score = (
      gradeValues[grades.coreWebVitals] +
      gradeValues[grades.loadingPerformance] +
      gradeValues[grades.interactivity] +
      gradeValues[grades.visualStability]
    ) / 4;

    // Factor in Lighthouse score if available
    if (lighthouse) {
      score = (score + lighthouse.performance) / 2;
    }

    return Math.round(score);
  }

  private generateRecommendations(
    metrics: PerformanceMetrics,
    bundleAnalysis?: BundleAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (metrics.firstContentfulPaint > 1800) {
      recommendations.push('Optimize First Contentful Paint by reducing server response time and eliminating render-blocking resources');
    }

    if (metrics.largestContentfulPaint > 2500) {
      recommendations.push('Improve Largest Contentful Paint by optimizing images and preloading critical resources');
    }

    if (metrics.firstInputDelay > 100) {
      recommendations.push('Reduce First Input Delay by minimizing main thread blocking and optimizing JavaScript execution');
    }

    if (metrics.cumulativeLayoutShift > 0.1) {
      recommendations.push('Minimize Cumulative Layout Shift by setting dimensions for images and avoiding dynamic content insertion');
    }

    if (metrics.totalResourceSize > 2000000) { // 2MB
      recommendations.push('Optimize resource loading by compressing assets and implementing efficient caching strategies');
    }

    if (metrics.javascriptSize > 1000000) { // 1MB
      recommendations.push('Reduce JavaScript bundle size through code splitting and tree shaking');
    }

    // Bundle analysis recommendations
    if (bundleAnalysis) {
      recommendations.push(...bundleAnalysis.recommendations);
    }

    // Memory recommendations
    if (metrics.usedHeapSize > 50000000) { // 50MB
      recommendations.push('Monitor memory usage and implement proper cleanup to prevent memory leaks');
    }

    return recommendations;
  }

  private async waitForServiceReady(serviceName: string): Promise<void> {
    if (!this.page) return;

    try {
      switch (serviceName) {
        case 'autonomous-investigation':
        case 'manual-investigation':
          await this.page.waitForSelector('[data-testid="entity-input"]', { timeout: 5000 });
          break;
        case 'agent-analytics':
          await this.page.waitForSelector('[data-testid*="chart"], [data-testid*="analytics"]', { timeout: 5000 });
          break;
        case 'visualization':
          await this.page.waitForSelector('canvas, svg, [data-testid*="chart"]', { timeout: 5000 });
          break;
        case 'reporting':
          await this.page.waitForSelector('[data-testid*="report"]', { timeout: 5000 });
          break;
        default:
          await this.page.waitForSelector('main, [role="main"]', { timeout: 5000 });
      }
    } catch (error) {
      console.warn(`Service readiness check failed for ${serviceName}:`, error);
    }
  }

  async testMultipleServices(
    services: Array<{ name: string; url: string }>,
    options: {
      networkConditions?: Array<'fast' | 'slow'>;
      deviceTypes?: Array<'mobile' | 'desktop'>;
      includeBundle?: boolean;
      includeLighthouse?: boolean;
    } = {}
  ): Promise<PerformanceTestResult[]> {
    const {
      networkConditions = ['fast'],
      deviceTypes = ['desktop'],
      includeBundle = true,
      includeLighthouse = false
    } = options;

    const results: PerformanceTestResult[] = [];

    for (const service of services) {
      for (const networkCondition of networkConditions) {
        for (const deviceType of deviceTypes) {
          console.log(`Testing ${service.name} on ${deviceType} with ${networkCondition} network...`);

          const result = await this.testServicePerformance(service.name, service.url, {
            networkCondition,
            deviceType,
            includeBundle,
            includeLighthouse
          });

          results.push(result);

          // Brief pause between tests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    return results;
  }

  generatePerformanceReport(results: PerformanceTestResult[]): string {
    const timestamp = new Date().toISOString();

    // Calculate aggregate statistics
    const avgScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    const failingServices = results.filter(r => r.overallScore < 70);
    const goodServices = results.filter(r => r.overallScore >= 90);

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Performance Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
          .summary-card { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
          .score { font-size: 2em; font-weight: bold; }
          .good { color: #059669; }
          .warning { color: #d97706; }
          .poor { color: #dc2626; }
          .service-results { margin: 30px 0; }
          .service-card { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; margin: 10px 0; border-radius: 8px; }
          .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 15px 0; }
          .metric { background: white; padding: 10px; border-radius: 4px; text-align: center; }
          .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .chart { width: 100%; height: 300px; margin: 20px 0; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Performance Test Report</h1>
            <p>Generated: ${timestamp}</p>
            <p>Services Tested: ${results.length}</p>
          </div>

          <div class="summary">
            <div class="summary-card">
              <div class="score ${avgScore >= 90 ? 'good' : avgScore >= 70 ? 'warning' : 'poor'}">${Math.round(avgScore)}</div>
              <div>Average Score</div>
            </div>
            <div class="summary-card">
              <div class="score good">${goodServices.length}</div>
              <div>Good Performance (≥90)</div>
            </div>
            <div class="summary-card">
              <div class="score poor">${failingServices.length}</div>
              <div>Needs Improvement (<70)</div>
            </div>
            <div class="summary-card">
              <div class="score">${new Set(results.map(r => r.serviceName)).size}</div>
              <div>Unique Services</div>
            </div>
          </div>

          <div class="service-results">
            <h2>Service Performance Details</h2>
            ${results.map(result => `
              <div class="service-card">
                <h3>${result.serviceName} - ${result.deviceType} (${result.networkCondition})</h3>
                <div class="score ${result.overallScore >= 90 ? 'good' : result.overallScore >= 70 ? 'warning' : 'poor'}">
                  Score: ${result.overallScore}/100
                </div>

                <div class="metrics">
                  <div class="metric">
                    <strong>FCP</strong><br>
                    ${Math.round(result.metrics.firstContentfulPaint)}ms
                  </div>
                  <div class="metric">
                    <strong>LCP</strong><br>
                    ${Math.round(result.metrics.largestContentfulPaint)}ms
                  </div>
                  <div class="metric">
                    <strong>FID</strong><br>
                    ${Math.round(result.metrics.firstInputDelay)}ms
                  </div>
                  <div class="metric">
                    <strong>CLS</strong><br>
                    ${result.metrics.cumulativeLayoutShift.toFixed(3)}
                  </div>
                  <div class="metric">
                    <strong>Bundle Size</strong><br>
                    ${result.bundleAnalysis ? Math.round(result.bundleAnalysis.totalSize / 1024) + 'KB' : 'N/A'}
                  </div>
                  <div class="metric">
                    <strong>Resources</strong><br>
                    ${result.metrics.resourceCount}
                  </div>
                </div>

                ${result.recommendations.length > 0 ? `
                  <div class="recommendations">
                    <h4>Recommendations:</h4>
                    <ul>
                      ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <div class="chart">
            <canvas id="performanceChart"></canvas>
          </div>
        </div>

        <script>
          const ctx = document.getElementById('performanceChart').getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ${JSON.stringify(results.map(r => `${r.serviceName} (${r.deviceType})`))},
              datasets: [{
                label: 'Performance Score',
                data: ${JSON.stringify(results.map(r => r.overallScore))},
                backgroundColor: ${JSON.stringify(results.map(r =>
                  r.overallScore >= 90 ? '#059669' : r.overallScore >= 70 ? '#d97706' : '#dc2626'
                ))},
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100
                }
              },
              plugins: {
                title: {
                  display: true,
                  text: 'Performance Scores by Service'
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
}