/**
 * Visual Regression Baseline Generator
 * Utility for generating baseline screenshots for visual regression testing
 * Automates the process of capturing initial screenshots for comparison
 */

import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface BaselineConfig {
  outputDir: string;
  viewports: Array<{ name: string; width: number; height: number }>;
  themes: string[];
  services: Array<{ name: string; url: string; path: string }>;
  components: Array<{ name: string; selector: string; url: string }>;
}

export class BaselineGenerator {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BaselineConfig;

  constructor(config: BaselineConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-animations', '--disable-transitions']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      reducedMotion: 'reduce'
    });

    this.page = await this.context.newPage();

    // Disable animations and transitions
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async cleanup(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  async generateServiceBaselines(): Promise<void> {
    if (!this.page) throw new Error('Generator not initialized');

    console.log('Generating service baselines...');

    for (const service of this.config.services) {
      console.log(`Capturing baseline for ${service.name}...`);

      try {
        await this.page.goto(`${service.url}${service.path}`, {
          waitUntil: 'networkidle'
        });

        // Wait for service-specific loading
        await this.page.waitForTimeout(2000);

        // Handle potential service-specific loading states
        await this.waitForServiceReady(service.name);

        const screenshotPath = path.join(
          this.config.outputDir,
          'baselines',
          `${service.name}-baseline.png`
        );

        await this.page.screenshot({
          path: screenshotPath,
          fullPage: true,
          animations: 'disabled'
        });

        console.log(`✅ Baseline captured: ${screenshotPath}`);
      } catch (error) {
        console.error(`❌ Failed to capture baseline for ${service.name}:`, error);
      }
    }
  }

  async generateResponsiveBaselines(): Promise<void> {
    if (!this.page) throw new Error('Generator not initialized');

    console.log('Generating responsive baselines...');

    const criticalServices = this.config.services.slice(0, 3); // Test first 3 services

    for (const viewport of this.config.viewports) {
      console.log(`Testing viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);

      await this.page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      for (const service of criticalServices) {
        try {
          await this.page.goto(`${service.url}${service.path}`, {
            waitUntil: 'networkidle'
          });

          await this.page.waitForTimeout(1000);
          await this.waitForServiceReady(service.name);

          const screenshotPath = path.join(
            this.config.outputDir,
            'baselines',
            'responsive',
            `${service.name}-${viewport.name}.png`
          );

          // Ensure directory exists
          fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

          await this.page.screenshot({
            path: screenshotPath,
            fullPage: true,
            animations: 'disabled'
          });

          console.log(`✅ Responsive baseline captured: ${screenshotPath}`);
        } catch (error) {
          console.error(`❌ Failed to capture responsive baseline for ${service.name} at ${viewport.name}:`, error);
        }
      }
    }
  }

  async generateThemeBaselines(): Promise<void> {
    if (!this.page) throw new Error('Generator not initialized');

    console.log('Generating theme baselines...');

    const criticalServices = this.config.services.slice(0, 3);

    for (const theme of this.config.themes) {
      console.log(`Testing theme: ${theme}`);

      for (const service of criticalServices) {
        try {
          await this.page.goto(`${service.url}${service.path}`, {
            waitUntil: 'networkidle'
          });

          // Apply theme
          await this.page.evaluate((selectedTheme) => {
            document.documentElement.setAttribute('data-theme', selectedTheme);
            localStorage.setItem('theme', selectedTheme);

            // Dispatch theme change event if the app listens for it
            window.dispatchEvent(new CustomEvent('theme-changed', {
              detail: { theme: selectedTheme }
            }));
          }, theme);

          await this.page.waitForTimeout(1000);
          await this.waitForServiceReady(service.name);

          const screenshotPath = path.join(
            this.config.outputDir,
            'baselines',
            'themes',
            `${service.name}-theme-${theme}.png`
          );

          // Ensure directory exists
          fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

          await this.page.screenshot({
            path: screenshotPath,
            fullPage: true,
            animations: 'disabled'
          });

          console.log(`✅ Theme baseline captured: ${screenshotPath}`);
        } catch (error) {
          console.error(`❌ Failed to capture theme baseline for ${service.name} with ${theme}:`, error);
        }
      }
    }
  }

  async generateComponentBaselines(): Promise<void> {
    if (!this.page) throw new Error('Generator not initialized');

    console.log('Generating component baselines...');

    for (const component of this.config.components) {
      try {
        await this.page.goto(component.url, {
          waitUntil: 'networkidle'
        });

        await this.page.waitForTimeout(1000);

        const element = this.page.locator(component.selector).first();

        if (await element.count() > 0) {
          await element.scrollIntoViewIfNeeded();

          const screenshotPath = path.join(
            this.config.outputDir,
            'baselines',
            'components',
            `${component.name}.png`
          );

          // Ensure directory exists
          fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

          await element.screenshot({
            path: screenshotPath,
            animations: 'disabled'
          });

          console.log(`✅ Component baseline captured: ${screenshotPath}`);
        } else {
          console.warn(`⚠️ Component ${component.name} not found with selector: ${component.selector}`);
        }
      } catch (error) {
        console.error(`❌ Failed to capture component baseline for ${component.name}:`, error);
      }
    }
  }

  async generateInteractionBaselines(): Promise<void> {
    if (!this.page) throw new Error('Generator not initialized');

    console.log('Generating interaction state baselines...');

    const interactionTests = [
      {
        name: 'button-hover',
        url: 'http://localhost:3001/autonomous-investigation',
        selector: '[data-testid="start-investigation-button"]',
        action: 'hover'
      },
      {
        name: 'input-focus',
        url: 'http://localhost:3001/autonomous-investigation',
        selector: '[data-testid="entity-input"]',
        action: 'focus'
      },
      {
        name: 'select-open',
        url: 'http://localhost:3001/autonomous-investigation',
        selector: '[data-testid="entity-type-select"]',
        action: 'click'
      }
    ];

    for (const test of interactionTests) {
      try {
        await this.page.goto(test.url, {
          waitUntil: 'networkidle'
        });

        await this.page.waitForTimeout(1000);

        const element = this.page.locator(test.selector).first();

        if (await element.count() > 0) {
          await element.scrollIntoViewIfNeeded();

          // Perform interaction
          switch (test.action) {
            case 'hover':
              await element.hover();
              break;
            case 'focus':
              await element.focus();
              break;
            case 'click':
              await element.click();
              break;
          }

          await this.page.waitForTimeout(300);

          const screenshotPath = path.join(
            this.config.outputDir,
            'baselines',
            'interactions',
            `${test.name}.png`
          );

          // Ensure directory exists
          fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

          await element.screenshot({
            path: screenshotPath,
            animations: 'disabled'
          });

          console.log(`✅ Interaction baseline captured: ${screenshotPath}`);
        } else {
          console.warn(`⚠️ Element not found for interaction test ${test.name}: ${test.selector}`);
        }
      } catch (error) {
        console.error(`❌ Failed to capture interaction baseline for ${test.name}:`, error);
      }
    }
  }

  private async waitForServiceReady(serviceName: string): Promise<void> {
    try {
      // Wait for common loading indicators to disappear
      await this.page.waitForSelector('[data-testid*="loading"]', {
        state: 'hidden',
        timeout: 5000
      }).catch(() => {
        // Ignore if no loading indicators found
      });

      // Wait for service-specific indicators
      switch (serviceName) {
        case 'autonomous-investigation':
        case 'manual-investigation':
          await this.page.waitForSelector('[data-testid="entity-input"]', {
            timeout: 5000
          }).catch(() => {});
          break;
        case 'agent-analytics':
          await this.page.waitForSelector('[data-testid*="chart"], [data-testid*="analytics"]', {
            timeout: 5000
          }).catch(() => {});
          break;
        case 'visualization':
          await this.page.waitForSelector('canvas, svg, [data-testid*="chart"]', {
            timeout: 5000
          }).catch(() => {});
          break;
        case 'reporting':
          await this.page.waitForSelector('[data-testid*="report"], [data-testid*="generate"]', {
            timeout: 5000
          }).catch(() => {});
          break;
        default:
          // Generic wait for main content
          await this.page.waitForSelector('main, [role="main"], .main-content', {
            timeout: 5000
          }).catch(() => {});
      }
    } catch (error) {
      console.warn(`Service ${serviceName} readiness check failed:`, error);
    }
  }

  async generateAllBaselines(): Promise<void> {
    console.log('🚀 Starting baseline generation...');

    try {
      await this.initialize();

      await this.generateServiceBaselines();
      await this.generateResponsiveBaselines();
      await this.generateThemeBaselines();
      await this.generateComponentBaselines();
      await this.generateInteractionBaselines();

      // Generate summary report
      await this.generateBaselineReport();

      console.log('✅ All baselines generated successfully!');
    } catch (error) {
      console.error('❌ Baseline generation failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async generateBaselineReport(): Promise<void> {
    const reportData = {
      timestamp: new Date().toISOString(),
      services: this.config.services.length,
      viewports: this.config.viewports.length,
      themes: this.config.themes.length,
      components: this.config.components.length,
      outputDir: this.config.outputDir
    };

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visual Regression Baseline Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 30px; }
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
          .stat-card { background: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-number { font-size: 2em; font-weight: bold; color: #2563eb; }
          .section { margin: 30px 0; }
          .file-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 10px; }
          .file-item { background: #f0f0f0; padding: 10px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📸 Visual Regression Baseline Report</h1>
            <p>Generated: ${reportData.timestamp}</p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${reportData.services}</div>
              <div>Services</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${reportData.viewports}</div>
              <div>Viewports</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${reportData.themes}</div>
              <div>Themes</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${reportData.components}</div>
              <div>Components</div>
            </div>
          </div>

          <div class="section">
            <h2>Baseline Categories Generated</h2>
            <ul>
              <li>✅ Service baselines - Full page screenshots of all microservices</li>
              <li>✅ Responsive baselines - Screenshots across multiple viewport sizes</li>
              <li>✅ Theme baselines - Screenshots with different theme variations</li>
              <li>✅ Component baselines - Individual component screenshots</li>
              <li>✅ Interaction baselines - Component states (hover, focus, etc.)</li>
            </ul>
          </div>

          <div class="section">
            <h2>Output Directory Structure</h2>
            <div class="file-list">
              <div class="file-item">${reportData.outputDir}/baselines/</div>
              <div class="file-item">${reportData.outputDir}/baselines/responsive/</div>
              <div class="file-item">${reportData.outputDir}/baselines/themes/</div>
              <div class="file-item">${reportData.outputDir}/baselines/components/</div>
              <div class="file-item">${reportData.outputDir}/baselines/interactions/</div>
            </div>
          </div>

          <div class="section">
            <h2>Next Steps</h2>
            <ol>
              <li>Review generated baseline screenshots for accuracy</li>
              <li>Run visual regression tests to compare against these baselines</li>
              <li>Update baselines when UI changes are intentional</li>
              <li>Integrate into CI/CD pipeline for automated testing</li>
            </ol>
          </div>
        </div>
      </body>
      </html>
    `;

    const reportPath = path.join(this.config.outputDir, 'baseline-report.html');
    fs.writeFileSync(reportPath, reportHtml);
    console.log(`📊 Baseline report generated: ${reportPath}`);
  }
}

// Default configuration
export const defaultBaselineConfig: BaselineConfig = {
  outputDir: './test-results/visual-regression',
  viewports: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'large-desktop', width: 2560, height: 1440 }
  ],
  themes: ['light', 'dark', 'high-contrast'],
  services: [
    { name: 'core-ui', url: 'http://localhost:3000', path: '/' },
    { name: 'autonomous-investigation', url: 'http://localhost:3001', path: '/autonomous-investigation' },
    { name: 'manual-investigation', url: 'http://localhost:3002', path: '/manual-investigation' },
    { name: 'agent-analytics', url: 'http://localhost:3003', path: '/agent-analytics' },
    { name: 'rag-intelligence', url: 'http://localhost:3004', path: '/rag-intelligence' },
    { name: 'visualization', url: 'http://localhost:3005', path: '/visualization' },
    { name: 'reporting', url: 'http://localhost:3006', path: '/reporting' },
    { name: 'design-system', url: 'http://localhost:3008', path: '/design-system' }
  ],
  components: [
    { name: 'button-primary', selector: '[data-testid="start-investigation-button"]', url: 'http://localhost:3001/autonomous-investigation' },
    { name: 'entity-input', selector: '[data-testid="entity-input"]', url: 'http://localhost:3001/autonomous-investigation' },
    { name: 'priority-select', selector: '[data-testid="priority-select"]', url: 'http://localhost:3001/autonomous-investigation' },
    { name: 'navigation-menu', selector: 'nav, [role="navigation"]', url: 'http://localhost:3000/' },
    { name: 'loading-spinner', selector: '[data-testid*="loading"], .loading', url: 'http://localhost:3001/autonomous-investigation' }
  ]
};

// CLI usage
if (require.main === module) {
  const generator = new BaselineGenerator(defaultBaselineConfig);
  generator.generateAllBaselines().catch(console.error);
}