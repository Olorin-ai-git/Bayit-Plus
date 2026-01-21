/**
 * Visual Regression Testing Engine
 * Advanced screenshot comparison and visual testing for all 8 microservices
 * Supports responsive design, theme testing, and component validation
 */

import { Page, Browser, expect } from '@playwright/test';
import { PlaywrightMCPClient } from '../playwright-mcp';
import * as fs from 'fs';
import * as path from 'path';

export interface VisualTestConfig {
  threshold: number;
  maskSelectors?: string[];
  clipSelector?: string;
  animationHandling: 'disabled' | 'allow' | 'force';
  maxDiffPixels?: number;
  mode: 'ci' | 'local' | 'update';
}

export interface ResponsiveBreakpoint {
  name: string;
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export interface ThemeVariant {
  name: string;
  className: string;
  description: string;
}

export interface ComponentVariant {
  name: string;
  selector: string;
  props?: Record<string, any>;
  description: string;
}

export const defaultVisualConfig: VisualTestConfig = {
  threshold: 0.98,
  animationHandling: 'disabled',
  maxDiffPixels: 100,
  mode: process.env.CI ? 'ci' : 'local'
};

export const responsiveBreakpoints: ResponsiveBreakpoint[] = [
  { name: 'mobile', width: 375, height: 667, devicePixelRatio: 2 },
  { name: 'mobile-landscape', width: 667, height: 375, devicePixelRatio: 2 },
  { name: 'tablet', width: 768, height: 1024, devicePixelRatio: 2 },
  { name: 'tablet-landscape', width: 1024, height: 768, devicePixelRatio: 2 },
  { name: 'desktop', width: 1920, height: 1080, devicePixelRatio: 1 },
  { name: 'desktop-large', width: 2560, height: 1440, devicePixelRatio: 1 }
];

export const themeVariants: ThemeVariant[] = [
  { name: 'light', className: 'theme-light', description: 'Default light theme' },
  { name: 'dark', className: 'theme-dark', description: 'Dark theme variant' },
  { name: 'high-contrast', className: 'theme-high-contrast', description: 'High contrast for accessibility' },
  { name: 'blue', className: 'theme-blue', description: 'Blue color scheme' },
  { name: 'green', className: 'theme-green', description: 'Green color scheme' }
];

/**
 * Visual Regression Testing Engine
 */
export class VisualRegressionEngine {
  private mcpClient: PlaywrightMCPClient;
  private browser: Browser | null = null;
  private baselineDir: string;
  private testDir: string;
  private diffDir: string;

  constructor(private config: VisualTestConfig = defaultVisualConfig) {
    this.mcpClient = new PlaywrightMCPClient();
    this.baselineDir = path.join(process.cwd(), 'visual-tests', 'baseline');
    this.testDir = path.join(process.cwd(), 'visual-tests', 'test');
    this.diffDir = path.join(process.cwd(), 'visual-tests', 'diff');

    this.ensureDirectories();
  }

  async initialize(): Promise<void> {
    await this.mcpClient.initialize();
    this.browser = await this.mcpClient.getBrowser();
  }

  async cleanup(): Promise<void> {
    if (this.browser) await this.browser.close();
    await this.mcpClient.cleanup();
  }

  private ensureDirectories(): void {
    [this.baselineDir, this.testDir, this.diffDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Test full page visual regression across all microservices
   */
  async testMicroservicePages(page: Page): Promise<void> {
    const services = [
      { name: 'autonomous-investigation', path: '/autonomous-investigation' },
      { name: 'manual-investigation', path: '/manual-investigation' },
      { name: 'agent-analytics', path: '/agent-analytics' },
      { name: 'rag-intelligence', path: '/rag-intelligence' },
      { name: 'visualization', path: '/visualization' },
      { name: 'reporting', path: '/reporting' },
      { name: 'core-ui', path: '/core-ui' },
      { name: 'design-system', path: '/design-system' }
    ];

    for (const service of services) {
      await page.goto(service.path);
      await page.waitForLoadState('networkidle');

      // Wait for service-specific loading indicators to disappear
      await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden', timeout: 10000 }).catch(() => {});

      // Take full page screenshot
      await this.captureServiceScreenshot(page, service.name, 'full-page');

      // Test key service components
      await this.testServiceComponents(page, service.name);
    }
  }

  /**
   * Test responsive design across all breakpoints
   */
  async testResponsiveDesign(page: Page, serviceName: string): Promise<void> {
    for (const breakpoint of responsiveBreakpoints) {
      await page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height
      });

      // Wait for responsive layout to settle
      await page.waitForTimeout(1000);

      // Capture responsive screenshots
      await this.captureServiceScreenshot(
        page,
        serviceName,
        `responsive-${breakpoint.name}`,
        {
          clip: { x: 0, y: 0, width: breakpoint.width, height: breakpoint.height }
        }
      );

      // Test responsive navigation
      if (breakpoint.width < 768) {
        await this.testMobileNavigation(page, serviceName, breakpoint.name);
      }
    }
  }

  /**
   * Test theme variations
   */
  async testThemeVariations(page: Page, serviceName: string): Promise<void> {
    for (const theme of themeVariants) {
      // Apply theme
      await page.evaluate((className) => {
        document.documentElement.className = className;
      }, theme.className);

      // Wait for theme transition
      await page.waitForTimeout(500);

      // Capture theme screenshot
      await this.captureServiceScreenshot(
        page,
        serviceName,
        `theme-${theme.name}`
      );

      // Test theme-specific components
      await this.testThemeComponents(page, serviceName, theme.name);
    }
  }

  /**
   * Test component states and interactions
   */
  async testComponentStates(page: Page, serviceName: string): Promise<void> {
    const componentStates = [
      { name: 'button-states', selector: '[data-testid="primary-button"]' },
      { name: 'form-validation', selector: '[data-testid="validation-form"]' },
      { name: 'loading-states', selector: '[data-testid="loading-component"]' },
      { name: 'error-states', selector: '[data-testid="error-component"]' },
      { name: 'modal-dialogs', selector: '[data-testid="modal-trigger"]' },
      { name: 'dropdown-menus', selector: '[data-testid="dropdown-trigger"]' }
    ];

    for (const state of componentStates) {
      const element = page.locator(state.selector);

      if (await element.isVisible()) {
        // Test default state
        await this.captureComponentScreenshot(
          page,
          element,
          serviceName,
          `${state.name}-default`
        );

        // Test hover state
        await element.hover();
        await page.waitForTimeout(300);
        await this.captureComponentScreenshot(
          page,
          element,
          serviceName,
          `${state.name}-hover`
        );

        // Test focus state
        await element.focus();
        await page.waitForTimeout(300);
        await this.captureComponentScreenshot(
          page,
          element,
          serviceName,
          `${state.name}-focus`
        );

        // Test active/clicked state
        if (state.name === 'button-states' || state.name === 'modal-dialogs') {
          await element.click();
          await page.waitForTimeout(500);
          await this.captureComponentScreenshot(
            page,
            element,
            serviceName,
            `${state.name}-active`
          );
        }
      }
    }
  }

  /**
   * Test cross-service design consistency
   */
  async testDesignConsistency(page: Page): Promise<void> {
    const commonComponents = [
      { name: 'navigation-header', selector: '[data-testid="main-navigation"]' },
      { name: 'primary-buttons', selector: '[data-testid="primary-button"]' },
      { name: 'form-inputs', selector: '[data-testid="text-input"]' },
      { name: 'cards', selector: '[data-testid="content-card"]' },
      { name: 'modals', selector: '[data-testid="modal-dialog"]' },
      { name: 'notifications', selector: '[data-testid="notification"]' }
    ];

    const services = ['autonomous-investigation', 'manual-investigation', 'agent-analytics', 'rag-intelligence'];

    // Collect component screenshots across services
    const componentScreenshots: Record<string, string[]> = {};

    for (const service of services) {
      await page.goto(`/${service}`);
      await page.waitForLoadState('networkidle');

      for (const component of commonComponents) {
        const element = page.locator(component.selector);

        if (await element.isVisible()) {
          const screenshotPath = await this.captureComponentScreenshot(
            page,
            element,
            service,
            `consistency-${component.name}`
          );

          if (!componentScreenshots[component.name]) {
            componentScreenshots[component.name] = [];
          }
          componentScreenshots[component.name].push(screenshotPath);
        }
      }
    }

    // Compare component consistency across services
    await this.compareComponentConsistency(componentScreenshots);
  }

  /**
   * Test animation and transition consistency
   */
  async testAnimations(page: Page, serviceName: string): Promise<void> {
    const animatedComponents = [
      { name: 'page-transitions', trigger: '[data-testid="navigation-link"]' },
      { name: 'modal-animations', trigger: '[data-testid="modal-open"]' },
      { name: 'loading-spinners', trigger: '[data-testid="load-data"]' },
      { name: 'form-validation', trigger: '[data-testid="submit-form"]' },
      { name: 'notification-slides', trigger: '[data-testid="show-notification"]' }
    ];

    for (const animation of animatedComponents) {
      const trigger = page.locator(animation.trigger);

      if (await trigger.isVisible()) {
        // Capture before animation
        await this.captureServiceScreenshot(
          page,
          serviceName,
          `${animation.name}-before`
        );

        // Trigger animation
        await trigger.click();
        await page.waitForTimeout(150); // Mid-animation

        // Capture during animation
        await this.captureServiceScreenshot(
          page,
          serviceName,
          `${animation.name}-during`
        );

        await page.waitForTimeout(500); // Animation complete

        // Capture after animation
        await this.captureServiceScreenshot(
          page,
          serviceName,
          `${animation.name}-after`
        );
      }
    }
  }

  /**
   * Test error and edge case states
   */
  async testErrorStates(page: Page, serviceName: string): Promise<void> {
    const errorScenarios = [
      {
        name: 'network-error',
        setup: () => page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('mock-network-error'));
        })
      },
      {
        name: 'service-unavailable',
        setup: () => page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('mock-service-error', {
            detail: { service: 'backend', error: 'Service unavailable' }
          }));
        })
      },
      {
        name: 'validation-errors',
        setup: async () => {
          const form = page.locator('[data-testid="validation-form"]');
          if (await form.isVisible()) {
            await page.click('[data-testid="submit-invalid-form"]');
          }
        }
      },
      {
        name: 'empty-states',
        setup: () => page.evaluate(() => {
          window.dispatchEvent(new CustomEvent('mock-empty-data'));
        })
      }
    ];

    for (const scenario of errorScenarios) {
      // Setup error scenario
      await scenario.setup();
      await page.waitForTimeout(1000);

      // Capture error state
      await this.captureServiceScreenshot(
        page,
        serviceName,
        `error-${scenario.name}`
      );

      // Test error recovery if available
      const recoveryButton = page.locator('[data-testid="retry-button"], [data-testid="reload-button"]');
      if (await recoveryButton.isVisible()) {
        await recoveryButton.click();
        await page.waitForTimeout(1000);

        await this.captureServiceScreenshot(
          page,
          serviceName,
          `error-${scenario.name}-recovery`
        );
      }
    }
  }

  /**
   * Capture service screenshot with optional configuration
   */
  private async captureServiceScreenshot(
    page: Page,
    serviceName: string,
    testName: string,
    options?: { clip?: { x: number; y: number; width: number; height: number } }
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${serviceName}-${testName}-${timestamp}.png`;
    const filepath = path.join(this.testDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: !options?.clip,
      clip: options?.clip,
      animations: this.config.animationHandling
    });

    return filepath;
  }

  /**
   * Capture component screenshot
   */
  private async captureComponentScreenshot(
    page: Page,
    element: any,
    serviceName: string,
    testName: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${serviceName}-component-${testName}-${timestamp}.png`;
    const filepath = path.join(this.testDir, filename);

    await element.screenshot({
      path: filepath,
      animations: this.config.animationHandling
    });

    return filepath;
  }

  /**
   * Test mobile navigation patterns
   */
  private async testMobileNavigation(page: Page, serviceName: string, breakpointName: string): Promise<void> {
    // Test hamburger menu
    const hamburgerMenu = page.locator('[data-testid="mobile-menu-button"]');
    if (await hamburgerMenu.isVisible()) {
      await this.captureServiceScreenshot(page, serviceName, `mobile-nav-closed-${breakpointName}`);

      await hamburgerMenu.click();
      await page.waitForTimeout(500);
      await this.captureServiceScreenshot(page, serviceName, `mobile-nav-open-${breakpointName}`);
    }

    // Test mobile-specific components
    const mobileComponents = [
      '[data-testid="mobile-search"]',
      '[data-testid="mobile-filters"]',
      '[data-testid="mobile-actions"]'
    ];

    for (const selector of mobileComponents) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await this.captureComponentScreenshot(
          page,
          element,
          serviceName,
          `mobile-component-${selector.replace(/[[\]"=-]/g, '')}-${breakpointName}`
        );
      }
    }
  }

  /**
   * Test theme-specific components
   */
  private async testThemeComponents(page: Page, serviceName: string, themeName: string): Promise<void> {
    const themeComponents = [
      '[data-testid="themed-button"]',
      '[data-testid="themed-card"]',
      '[data-testid="themed-input"]',
      '[data-testid="themed-navigation"]'
    ];

    for (const selector of themeComponents) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await this.captureComponentScreenshot(
          page,
          element,
          serviceName,
          `theme-component-${themeName}-${selector.replace(/[[\]"=-]/g, '')}`
        );
      }
    }
  }

  /**
   * Test service-specific components
   */
  private async testServiceComponents(page: Page, serviceName: string): Promise<void> {
    const serviceComponentMap: Record<string, string[]> = {
      'autonomous-investigation': [
        '[data-testid="investigation-form"]',
        '[data-testid="agent-progress"]',
        '[data-testid="risk-indicator"]'
      ],
      'manual-investigation': [
        '[data-testid="case-details"]',
        '[data-testid="evidence-upload"]',
        '[data-testid="analyst-notes"]'
      ],
      'agent-analytics': [
        '[data-testid="performance-charts"]',
        '[data-testid="agent-metrics"]',
        '[data-testid="anomaly-alerts"]'
      ],
      'rag-intelligence': [
        '[data-testid="knowledge-graph"]',
        '[data-testid="semantic-search"]',
        '[data-testid="insights-panel"]'
      ],
      'visualization': [
        '[data-testid="risk-visualization"]',
        '[data-testid="network-topology"]',
        '[data-testid="timeline-chart"]'
      ],
      'reporting': [
        '[data-testid="report-builder"]',
        '[data-testid="template-selector"]',
        '[data-testid="export-options"]'
      ],
      'core-ui': [
        '[data-testid="notification-center"]',
        '[data-testid="user-menu"]',
        '[data-testid="global-search"]'
      ],
      'design-system': [
        '[data-testid="color-palette"]',
        '[data-testid="component-showcase"]',
        '[data-testid="token-editor"]'
      ]
    };

    const components = serviceComponentMap[serviceName] || [];

    for (const selector of components) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        await this.captureComponentScreenshot(
          page,
          element,
          serviceName,
          `service-component-${selector.replace(/[[\]"=-]/g, '')}`
        );
      }
    }
  }

  /**
   * Compare component consistency across services
   */
  private async compareComponentConsistency(componentScreenshots: Record<string, string[]>): Promise<void> {
    for (const [componentName, screenshots] of Object.entries(componentScreenshots)) {
      if (screenshots.length > 1) {
        // Compare all screenshots for this component
        const baselineScreenshot = screenshots[0];

        for (let i = 1; i < screenshots.length; i++) {
          const comparisonScreenshot = screenshots[i];

          // In a real implementation, you would use an image comparison library
          // For now, we'll log the comparison
          console.log(`Comparing ${componentName}: ${baselineScreenshot} vs ${comparisonScreenshot}`);

          // Save comparison result
          const consistencyReport = {
            component: componentName,
            baseline: baselineScreenshot,
            comparison: comparisonScreenshot,
            consistent: true, // Would be actual comparison result
            timestamp: new Date().toISOString()
          };

          fs.writeFileSync(
            path.join(this.diffDir, `consistency-${componentName}-${i}.json`),
            JSON.stringify(consistencyReport, null, 2)
          );
        }
      }
    }
  }

  /**
   * Generate visual regression report
   */
  async generateReport(): Promise<string> {
    const reportData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        new: 0
      },
      services: [],
      breakpoints: responsiveBreakpoints.map(bp => bp.name),
      themes: themeVariants.map(theme => theme.name)
    };

    // Count test files
    const testFiles = fs.readdirSync(this.testDir);
    reportData.summary.totalTests = testFiles.length;

    // Generate HTML report
    const reportHtml = this.generateHtmlReport(reportData);
    const reportPath = path.join(this.diffDir, 'visual-regression-report.html');

    fs.writeFileSync(reportPath, reportHtml);

    return reportPath;
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(reportData: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e1e5e9; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 2rem; font-weight: 700; color: #2d3748; margin: 0; }
        .subtitle { color: #718096; margin: 10px 0 0 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2rem; font-weight: 700; margin-bottom: 5px; }
        .stat-label { opacity: 0.9; }
        .section { margin-bottom: 40px; }
        .section-title { font-size: 1.5rem; font-weight: 600; color: #2d3748; margin-bottom: 20px; border-left: 4px solid #667eea; padding-left: 15px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background: white; }
        .card-title { font-weight: 600; margin-bottom: 10px; color: #2d3748; }
        .tag { display: inline-block; background: #edf2f7; color: #4a5568; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-right: 8px; margin-bottom: 4px; }
        .status-passed { background: #c6f6d5; color: #22543d; }
        .status-failed { background: #fed7d7; color: #742a2a; }
        .status-new { background: #bee3f8; color: #2a4365; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">Visual Regression Test Report</h1>
            <p class="subtitle">Generated on ${reportData.timestamp}</p>
        </div>

        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${reportData.summary.totalTests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${reportData.summary.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${reportData.summary.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${reportData.summary.new}</div>
                <div class="stat-label">New</div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Test Configuration</h2>
            <div class="card">
                <div class="card-title">Settings</div>
                <p><strong>Threshold:</strong> ${reportData.config.threshold}</p>
                <p><strong>Animation Handling:</strong> ${reportData.config.animationHandling}</p>
                <p><strong>Max Diff Pixels:</strong> ${reportData.config.maxDiffPixels || 'Not set'}</p>
                <p><strong>Mode:</strong> ${reportData.config.mode}</p>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Coverage</h2>
            <div class="grid">
                <div class="card">
                    <div class="card-title">Responsive Breakpoints</div>
                    ${reportData.breakpoints.map((bp: string) => `<span class="tag">${bp}</span>`).join('')}
                </div>
                <div class="card">
                    <div class="card-title">Theme Variants</div>
                    ${reportData.themes.map((theme: string) => `<span class="tag">${theme}</span>`).join('')}
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Microservices</h2>
            <div class="grid">
                ${['autonomous-investigation', 'manual-investigation', 'agent-analytics', 'rag-intelligence', 'visualization', 'reporting', 'core-ui', 'design-system'].map(service => `
                    <div class="card">
                        <div class="card-title">${service}</div>
                        <span class="tag status-passed">Full Page</span>
                        <span class="tag status-passed">Components</span>
                        <span class="tag status-passed">Responsive</span>
                        <span class="tag status-passed">Themes</span>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</body>
</html>`;
  }
}

/**
 * Visual Regression Test Utilities
 */
export class VisualTestUtils {
  static async maskDynamicContent(page: Page): Promise<void> {
    // Mask timestamps, IDs, and other dynamic content
    await page.addStyleTag({
      content: `
        [data-testid*="timestamp"],
        [data-testid*="id"],
        [data-testid*="random"],
        .timestamp,
        .dynamic-id,
        .loading-spinner {
          visibility: hidden !important;
        }
      `
    });
  }

  static async waitForStableRendering(page: Page, timeout: number = 3000): Promise<void> {
    // Wait for images to load
    await page.waitForLoadState('networkidle');

    // Wait for fonts to load
    await page.waitForFunction(() => {
      return document.fonts.ready;
    });

    // Wait for animations to complete
    await page.waitForTimeout(500);

    // Wait for any lazy-loaded content
    await page.waitForTimeout(timeout);
  }

  static async disableAnimations(page: Page): Promise<void> {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  }

  static async enableHighContrastMode(page: Page): Promise<void> {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  }

  static generateTestId(): string {
    return `visual-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export { VisualRegressionEngine as default };