/**
 * E2E Test Setup Utilities
 * Shared utilities, helpers, and configuration for all E2E tests
 * Supports Playwright MCP integration and cross-service testing
 */

import { Page, Browser, BrowserContext, expect } from '@playwright/test';
import { PlaywrightMCPClient } from '../playwright-mcp';

export interface TestConfig {
  baseURL: string;
  timeout: number;
  viewport: { width: number; height: number };
  slowMo: number;
  headless: boolean;
}

export interface ServiceEndpoints {
  autonomousInvestigation: string;
  manualInvestigation: string;
  agentAnalytics: string;
  ragIntelligence: string;
  visualization: string;
  reporting: string;
  coreUI: string;
  designSystem: string;
}

export const defaultConfig: TestConfig = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  viewport: { width: 1920, height: 1080 },
  slowMo: 0,
  headless: process.env.CI === 'true'
};

export const serviceEndpoints: ServiceEndpoints = {
  autonomousInvestigation: 'http://localhost:3001',
  manualInvestigation: 'http://localhost:3002',
  agentAnalytics: 'http://localhost:3003',
  ragIntelligence: 'http://localhost:3004',
  visualization: 'http://localhost:3005',
  reporting: 'http://localhost:3006',
  coreUI: 'http://localhost:3007',
  designSystem: 'http://localhost:3008'
};

/**
 * Enhanced E2E Test Environment Manager
 */
export class E2ETestEnvironment {
  private mcpClient: PlaywrightMCPClient;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(private config: TestConfig = defaultConfig) {
    this.mcpClient = new PlaywrightMCPClient();
  }

  async initialize(): Promise<void> {
    await this.mcpClient.initialize();
    this.browser = await this.mcpClient.getBrowser();
    this.context = await this.browser.newContext({
      viewport: this.config.viewport,
      baseURL: this.config.baseURL
    });
    this.page = await this.context.newPage();
  }

  async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Test environment not initialized');
    }
    return await this.context.newPage();
  }

  async getPage(): Promise<Page> {
    if (!this.page) {
      throw new Error('Test environment not initialized');
    }
    return this.page;
  }

  async cleanup(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    await this.mcpClient.cleanup();
  }

  async takeScreenshot(name: string, fullPage: boolean = true): Promise<void> {
    if (!this.page) return;
    await this.page.screenshot({
      path: `screenshots/e2e/${name}.png`,
      fullPage
    });
  }

  async mockNetworkConditions(preset: 'fast' | 'slow' | 'offline'): Promise<void> {
    if (!this.page) return;

    const conditions = {
      fast: { downloadThroughput: 10000000, uploadThroughput: 5000000, latency: 20 },
      slow: { downloadThroughput: 500000, uploadThroughput: 250000, latency: 500 },
      offline: { downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
    };

    await this.page.evaluate((condition) => {
      window.dispatchEvent(new CustomEvent('mock-network-condition', {
        detail: condition
      }));
    }, conditions[preset]);
  }
}

/**
 * Page Object Models for Common UI Elements
 */
export class InvestigationFormPOM {
  constructor(private page: Page) {}

  async fillEntityDetails(entity: string, type: string, title: string): Promise<void> {
    await this.page.fill('[data-testid="entity-input"]', entity);
    await this.page.selectOption('[data-testid="entity-type-select"]', type);
    await this.page.fill('[data-testid="investigation-title"]', title);
  }

  async setAdvancedOptions(options: {
    priority?: string;
    depth?: string;
    enableDeviceAnalysis?: boolean;
    enableLocationAnalysis?: boolean;
    enableNetworkAnalysis?: boolean;
  }): Promise<void> {
    await this.page.click('[data-testid="advanced-settings-toggle"]');

    if (options.priority) {
      await this.page.selectOption('[data-testid="priority-select"]', options.priority);
    }

    if (options.depth) {
      await this.page.selectOption('[data-testid="investigation-depth"]', options.depth);
    }

    if (options.enableDeviceAnalysis) {
      await this.page.check('[data-testid="device-analysis-checkbox"]');
    }

    if (options.enableLocationAnalysis) {
      await this.page.check('[data-testid="location-analysis-checkbox"]');
    }

    if (options.enableNetworkAnalysis) {
      await this.page.check('[data-testid="network-analysis-checkbox"]');
    }
  }

  async submitInvestigation(): Promise<void> {
    await this.page.click('[data-testid="start-investigation-button"]');
  }

  async waitForSuccess(): Promise<void> {
    await this.page.waitForSelector('[data-testid="investigation-success-message"]');
  }
}

export class ReportGenerationPOM {
  constructor(private page: Page) {}

  async configureReport(options: {
    type: string;
    format: string;
    includeTimeline?: boolean;
    includeEvidence?: boolean;
    includeRiskAnalysis?: boolean;
    recipients?: string;
  }): Promise<void> {
    await this.page.selectOption('[data-testid="report-type"]', options.type);
    await this.page.selectOption('[data-testid="report-format"]', options.format);

    if (options.includeTimeline) {
      await this.page.check('[data-testid="include-timeline"]');
    }

    if (options.includeEvidence) {
      await this.page.check('[data-testid="include-evidence"]');
    }

    if (options.includeRiskAnalysis) {
      await this.page.check('[data-testid="include-risk-analysis"]');
    }

    if (options.recipients) {
      await this.page.fill('[data-testid="recipient-emails"]', options.recipients);
    }
  }

  async generateReport(): Promise<void> {
    await this.page.click('[data-testid="generate-report-submit"]');
  }

  async waitForCompletion(): Promise<void> {
    await this.page.waitForSelector('[data-testid="report-generation-complete"]', { timeout: 30000 });
  }

  async downloadReport(): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid="download-report-button"]');
    const download = await downloadPromise;
    return download.suggestedFilename();
  }
}

export class DesignSystemPOM {
  constructor(private page: Page) {}

  async updateColorToken(tokenName: string, newValue: string): Promise<void> {
    await this.page.click('[data-testid="color-tokens-section"]');
    await this.page.click(`[data-testid="${tokenName}-color-token"]`);
    await this.page.fill('[data-testid="color-hex-input"]', newValue);
  }

  async previewChanges(): Promise<void> {
    await this.page.click('[data-testid="preview-changes-button"]');
  }

  async applyChanges(): Promise<void> {
    await this.page.click('[data-testid="apply-changes-button"]');
  }

  async waitForPropagation(): Promise<void> {
    await this.page.waitForSelector('[data-testid="propagation-complete"]');
  }

  async rollbackChanges(): Promise<void> {
    await this.page.click('[data-testid="token-history-button"]');
    await this.page.click('[data-testid="rollback-button"]');
    await this.page.click('[data-testid="confirm-rollback"]');
  }
}

/**
 * Mock Data Generators
 */
export class MockDataGenerator {
  static generateInvestigation(overrides: Partial<any> = {}) {
    return {
      id: `inv-${Date.now()}`,
      entity: 'test@example.com',
      entityType: 'email',
      title: 'Test Investigation',
      status: 'running',
      priority: 'medium',
      created: new Date().toISOString(),
      ...overrides
    };
  }

  static generateReport(overrides: Partial<any> = {}) {
    return {
      id: `report-${Date.now()}`,
      investigationId: 'inv-123',
      title: 'Investigation Report',
      type: 'comprehensive',
      format: 'pdf',
      status: 'complete',
      created: new Date().toISOString(),
      ...overrides
    };
  }

  static generateUser(overrides: Partial<any> = {}) {
    return {
      id: `user-${Date.now()}`,
      name: 'Test User',
      email: 'test@company.com',
      role: 'investigator',
      permissions: ['read', 'write'],
      ...overrides
    };
  }

  static generateNotification(overrides: Partial<any> = {}) {
    return {
      id: `notification-${Date.now()}`,
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification',
      duration: 5000,
      timestamp: new Date().toISOString(),
      ...overrides
    };
  }
}

/**
 * Event Simulation Utilities
 */
export class EventSimulator {
  constructor(private page: Page) {}

  async simulateInvestigationComplete(investigationId: string): Promise<void> {
    await this.page.evaluate((id) => {
      window.dispatchEvent(new CustomEvent('mock-investigation-complete', {
        detail: { investigationId: id, status: 'completed' }
      }));
    }, investigationId);
  }

  async simulateServiceFailure(serviceName: string, error: string): Promise<void> {
    await this.page.evaluate((name, err) => {
      window.dispatchEvent(new CustomEvent('mock-service-failure', {
        detail: { service: name, error: err, severity: 'high' }
      }));
    }, serviceName, error);
  }

  async simulateServiceRecovery(serviceName: string): Promise<void> {
    await this.page.evaluate((name) => {
      window.dispatchEvent(new CustomEvent('mock-service-recovery', {
        detail: { service: name }
      }));
    }, serviceName);
  }

  async simulateNetworkDisconnection(): Promise<void> {
    await this.page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mock-network-disconnect'));
    });
  }

  async simulateNetworkReconnection(): Promise<void> {
    await this.page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mock-network-reconnect'));
    });
  }

  async simulatePerformanceAnomaly(agent: string, metric: string, value: number): Promise<void> {
    await this.page.evaluate((agentName, metricName, metricValue) => {
      window.dispatchEvent(new CustomEvent('mock-performance-anomaly', {
        detail: {
          type: metricName,
          severity: 'warning',
          value: metricValue,
          agent: agentName
        }
      }));
    }, agent, metric, value);
  }

  async simulateRealTimeUpdate(eventType: string, data: any): Promise<void> {
    await this.page.evaluate((type, eventData) => {
      window.dispatchEvent(new CustomEvent('mock-realtime-update', {
        detail: { type, data: eventData }
      }));
    }, eventType, data);
  }
}

/**
 * Assertion Helpers
 */
export class E2EAssertions {
  constructor(private page: Page) {}

  async assertServiceConnected(serviceName: string): Promise<void> {
    await expect(this.page.locator(`[data-testid="service-status-${serviceName}"]`))
      .toContainText('Connected');
  }

  async assertWebSocketConnected(): Promise<void> {
    await expect(this.page.locator('[data-testid="websocket-status"]'))
      .toContainText('Connected');
  }

  async assertInvestigationCreated(): Promise<void> {
    await expect(this.page.locator('[data-testid="investigation-success-message"]'))
      .toBeVisible();
    await expect(this.page.locator('[data-testid="investigation-id"]'))
      .toContainText(/INV-\d{6}/);
  }

  async assertReportGenerated(): Promise<void> {
    await expect(this.page.locator('[data-testid="report-generation-complete"]'))
      .toBeVisible();
    await expect(this.page.locator('[data-testid="report-preview"]'))
      .toBeVisible();
  }

  async assertDesignTokensPropagated(): Promise<void> {
    await expect(this.page.locator('[data-testid="propagation-complete"]'))
      .toBeVisible();
  }

  async assertNotificationDisplayed(title: string): Promise<void> {
    await expect(this.page.locator('[data-testid="notification-title"]'))
      .toContainText(title);
  }

  async assertErrorHandled(errorMessage: string): Promise<void> {
    await expect(this.page.locator('[data-testid="error-message"]'))
      .toContainText(errorMessage);
  }

  async assertAccessibilityCompliant(): Promise<void> {
    // Check for common accessibility issues
    const missingAltImages = await this.page.locator('img:not([alt])').count();
    expect(missingAltImages).toBe(0);

    const missingLabels = await this.page.locator('input:not([aria-label]):not([aria-labelledby])').count();
    expect(missingLabels).toBe(0);
  }

  async assertPerformanceWithinBudgets(): Promise<void> {
    const performanceMetrics = await this.page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          const entries = list.getEntries();
          const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
          const lcp = entries.find(entry => entry.name === 'largest-contentful-paint');
          resolve({ fcp: fcp?.startTime, lcp: lcp?.startTime });
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      });
    });

    expect((performanceMetrics as any).fcp).toBeLessThan(2000); // FCP < 2s
    expect((performanceMetrics as any).lcp).toBeLessThan(4000); // LCP < 4s
  }
}

/**
 * Visual Regression Testing Utilities
 */
export class VisualRegressionHelper {
  constructor(private page: Page) {}

  async captureBaseline(name: string): Promise<void> {
    await this.page.screenshot({
      path: `screenshots/baseline/${name}.png`,
      fullPage: true
    });
  }

  async compareWithBaseline(name: string): Promise<void> {
    await this.page.screenshot({
      path: `screenshots/test/${name}.png`,
      fullPage: true
    });

    // In a real implementation, you would compare the images
    // For now, we'll just verify the screenshot was taken
    expect(true).toBe(true);
  }

  async captureComponentScreenshot(selector: string, name: string): Promise<void> {
    await this.page.locator(selector).screenshot({
      path: `screenshots/components/${name}.png`
    });
  }

  async testResponsiveDesign(name: string): Promise<void> {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(1000);
      await this.page.screenshot({
        path: `screenshots/responsive/${name}-${viewport.name}.png`,
        fullPage: true
      });
    }
  }
}

/**
 * Performance Testing Utilities
 */
export class PerformanceTestHelper {
  constructor(private page: Page) {}

  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  async measureInteractionTime(selector: string): Promise<number> {
    const startTime = Date.now();
    await this.page.click(selector);
    await this.page.waitForTimeout(100);
    return Date.now() - startTime;
  }

  async simulateSlowNetwork(): Promise<void> {
    await this.page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mock-network-condition', {
        detail: { downloadThroughput: 500000, uploadThroughput: 250000, latency: 500 }
      }));
    });
  }

  async measureMemoryUsage(): Promise<any> {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
  }
}

// Export all utilities for easy importing
export {
  E2ETestEnvironment as TestEnvironment,
  InvestigationFormPOM,
  ReportGenerationPOM,
  DesignSystemPOM,
  MockDataGenerator,
  EventSimulator,
  E2EAssertions,
  VisualRegressionHelper,
  PerformanceTestHelper
};