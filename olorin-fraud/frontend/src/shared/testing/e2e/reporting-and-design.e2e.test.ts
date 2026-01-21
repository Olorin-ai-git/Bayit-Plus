/**
 * E2E Tests for Reporting and Design System Workflows
 * Tests report generation, design token propagation, and cross-service UI consistency
 * Covers reporting, design-system, and core-ui microservices
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { PlaywrightMCPClient } from '../playwright-mcp';

describe('Reporting and Design System E2E Flow', () => {
  let browser: Browser;
  let page: Page;
  let mcpClient: PlaywrightMCPClient;

  beforeAll(async () => {
    mcpClient = new PlaywrightMCPClient();
    await mcpClient.initialize();
    browser = await mcpClient.getBrowser();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
    await mcpClient.cleanup();
  });

  // Helper to create completed investigation for report generation
  async function setupCompletedInvestigation(page: Page) {
    await page.click('[data-testid="autonomous-investigation-tab"]');
    await page.fill('[data-testid="entity-input"]', 'completed@example.com');
    await page.selectOption('[data-testid="entity-type-select"]', 'email');
    await page.fill('[data-testid="investigation-title"]', 'Completed Investigation for Reporting');
    await page.click('[data-testid="start-investigation-button"]');

    // Simulate investigation completion
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('mock-investigation-complete', {
        detail: { investigationId: 'inv-123', status: 'completed' }
      }));
    });

    await page.waitForSelector('[data-testid="investigation-complete"]');
  }

  describe('Report Generation Workflow', () => {
    test('should generate comprehensive investigation report', async () => {
      await setupCompletedInvestigation(page);

      // Navigate to reporting service
      await page.click('[data-testid="generate-report-button"]');
      await expect(page).toHaveURL(/.*reporting/);

      // Verify report generation interface
      await expect(page.locator('[data-testid="report-generation-form"]')).toBeVisible();

      // Configure report parameters
      await page.selectOption('[data-testid="report-type"]', 'comprehensive');
      await page.selectOption('[data-testid="report-format"]', 'pdf');
      await page.check('[data-testid="include-timeline"]');
      await page.check('[data-testid="include-evidence"]');
      await page.check('[data-testid="include-risk-analysis"]');

      // Set report recipients
      await page.fill('[data-testid="recipient-emails"]', 'analyst@company.com, manager@company.com');

      // Add custom sections
      await page.click('[data-testid="add-custom-section"]');
      await page.fill('[data-testid="custom-section-title"]', 'Executive Summary');
      await page.fill('[data-testid="custom-section-content"]', 'High-level findings and recommendations');

      // Take screenshot of report configuration
      await page.screenshot({
        path: 'screenshots/report-configuration.png',
        fullPage: true
      });

      // Generate report
      await page.click('[data-testid="generate-report-submit"]');

      // Verify report generation progress
      await expect(page.locator('[data-testid="report-generation-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-percentage"]')).toBeVisible();

      // Wait for report completion
      await page.waitForSelector('[data-testid="report-generation-complete"]', { timeout: 30000 });

      // Verify report preview
      await expect(page.locator('[data-testid="report-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-title"]')).toContainText('Investigation Report');

      // Test report sections
      await expect(page.locator('[data-testid="executive-summary-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeline-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="evidence-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="risk-analysis-section"]')).toBeVisible();

      // Verify download functionality
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-report-button"]');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/investigation-report.*\.pdf/);
    });

    test('should handle real-time collaborative report editing', async () => {
      await setupCompletedInvestigation(page);
      await page.click('[data-testid="generate-report-button"]');

      // Start collaborative editing session
      await page.click('[data-testid="collaborative-edit-button"]');
      await expect(page.locator('[data-testid="collaboration-session-active"]')).toBeVisible();

      // Verify real-time editing indicators
      await expect(page.locator('[data-testid="active-collaborators"]')).toBeVisible();

      // Simulate another user joining
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-collaborator-joined', {
          detail: { user: 'analyst@company.com', cursor: { section: 'executive-summary', position: 10 } }
        }));
      });

      // Verify collaborator indicators
      await expect(page.locator('[data-testid="collaborator-cursor"]')).toBeVisible();
      await expect(page.locator('[data-testid="collaborator-name"]')).toContainText('analyst@company.com');

      // Test real-time text editing
      await page.click('[data-testid="executive-summary-editor"]');
      await page.type('[data-testid="executive-summary-editor"]', 'This investigation revealed significant security concerns.');

      // Verify change propagation
      await expect(page.locator('[data-testid="change-indicator"]')).toBeVisible();

      // Test comment system
      await page.click('[data-testid="add-comment-button"]');
      await page.fill('[data-testid="comment-text"]', 'Please review this section for accuracy');
      await page.click('[data-testid="submit-comment"]');

      await expect(page.locator('[data-testid="comment-thread"]')).toBeVisible();
      await expect(page.locator('[data-testid="comment-content"]')).toContainText('Please review this section');
    });

    test('should export reports in multiple formats', async () => {
      await setupCompletedInvestigation(page);
      await page.click('[data-testid="generate-report-button"]');

      // Generate base report
      await page.selectOption('[data-testid="report-type"]', 'standard');
      await page.click('[data-testid="generate-report-submit"]');
      await page.waitForSelector('[data-testid="report-generation-complete"]');

      // Test PDF export
      await page.click('[data-testid="export-options-button"]');
      await expect(page.locator('[data-testid="export-formats"]')).toBeVisible();

      const pdfDownload = page.waitForEvent('download');
      await page.click('[data-testid="export-pdf"]');
      const pdfFile = await pdfDownload;
      expect(pdfFile.suggestedFilename()).toMatch(/.*\.pdf$/);

      // Test Word document export
      const docxDownload = page.waitForEvent('download');
      await page.click('[data-testid="export-docx"]');
      const docxFile = await docxDownload;
      expect(docxFile.suggestedFilename()).toMatch(/.*\.docx$/);

      // Test HTML export
      const htmlDownload = page.waitForEvent('download');
      await page.click('[data-testid="export-html"]');
      const htmlFile = await htmlDownload;
      expect(htmlFile.suggestedFilename()).toMatch(/.*\.html$/);

      // Test CSV data export
      const csvDownload = page.waitForEvent('download');
      await page.click('[data-testid="export-csv"]');
      const csvFile = await csvDownload;
      expect(csvFile.suggestedFilename()).toMatch(/.*\.csv$/);

      // Verify export notifications
      await expect(page.locator('[data-testid="export-success-notification"]')).toBeVisible();
    });

    test('should handle report scheduling and automation', async () => {
      await page.click('[data-testid="reporting-dashboard"]');

      // Navigate to scheduled reports
      await page.click('[data-testid="scheduled-reports-tab"]');
      await expect(page.locator('[data-testid="scheduled-reports-list"]')).toBeVisible();

      // Create new scheduled report
      await page.click('[data-testid="create-schedule-button"]');

      // Configure schedule parameters
      await page.fill('[data-testid="schedule-name"]', 'Weekly Security Summary');
      await page.selectOption('[data-testid="report-template"]', 'security-summary');
      await page.selectOption('[data-testid="schedule-frequency"]', 'weekly');
      await page.selectOption('[data-testid="schedule-day"]', 'monday');
      await page.fill('[data-testid="schedule-time"]', '09:00');

      // Set recipients
      await page.fill('[data-testid="schedule-recipients"]', 'security-team@company.com');

      // Configure data filters
      await page.selectOption('[data-testid="date-range-filter"]', 'last-7-days');
      await page.selectOption('[data-testid="severity-filter"]', 'medium-and-above');

      // Save schedule
      await page.click('[data-testid="save-schedule-button"]');

      // Verify schedule creation
      await expect(page.locator('[data-testid="schedule-created-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="schedule-list-item"]')).toContainText('Weekly Security Summary');

      // Test schedule modification
      await page.click('[data-testid="edit-schedule-button"]');
      await page.selectOption('[data-testid="schedule-frequency"]', 'daily');
      await page.click('[data-testid="update-schedule-button"]');

      await expect(page.locator('[data-testid="schedule-updated-success"]')).toBeVisible();
    });
  });

  describe('Design System Integration', () => {
    test('should propagate design token updates across all services', async () => {
      // Navigate to design system service
      await page.click('[data-testid="design-system-tab"]');
      await expect(page).toHaveURL(/.*design-system/);

      // Verify design tokens dashboard
      await expect(page.locator('[data-testid="design-tokens-dashboard"]')).toBeVisible();

      // View current color tokens
      await page.click('[data-testid="color-tokens-section"]');
      await expect(page.locator('[data-testid="color-token-grid"]')).toBeVisible();

      // Edit primary color token
      await page.click('[data-testid="primary-color-token"]');
      await expect(page.locator('[data-testid="token-editor"]')).toBeVisible();

      // Change primary color
      await page.fill('[data-testid="color-hex-input"]', '#2563eb');
      await page.fill('[data-testid="token-name"]', 'primary-blue-600');

      // Preview changes
      await page.click('[data-testid="preview-changes-button"]');
      await expect(page.locator('[data-testid="preview-mode-active"]')).toBeVisible();

      // Verify preview across components
      await expect(page.locator('[data-testid="preview-button"]')).toHaveCSS('background-color', 'rgb(37, 99, 235)');

      // Apply changes
      await page.click('[data-testid="apply-changes-button"]');

      // Verify propagation notification
      await expect(page.locator('[data-testid="token-propagation-started"]')).toBeVisible();

      // Check propagation to all services
      const services = [
        'autonomous-investigation',
        'manual-investigation',
        'agent-analytics',
        'rag-intelligence',
        'visualization',
        'reporting',
        'core-ui'
      ];

      for (const service of services) {
        await expect(page.locator(`[data-testid="service-update-${service}"]`)).toContainText('Updated');
      }

      // Verify propagation completion
      await expect(page.locator('[data-testid="propagation-complete"]')).toBeVisible();

      // Test rollback capability
      await page.click('[data-testid="token-history-button"]');
      await expect(page.locator('[data-testid="token-history-list"]')).toBeVisible();

      await page.click('[data-testid="rollback-button"]');
      await expect(page.locator('[data-testid="rollback-confirmation"]')).toBeVisible();

      await page.click('[data-testid="confirm-rollback"]');
      await expect(page.locator('[data-testid="rollback-complete"]')).toBeVisible();
    });

    test('should maintain component consistency across services', async () => {
      await page.click('[data-testid="design-system-tab"]');

      // Navigate to component library
      await page.click('[data-testid="component-library-tab"]');
      await expect(page.locator('[data-testid="component-library"]')).toBeVisible();

      // Test button component consistency
      await page.click('[data-testid="button-component-card"]');
      await expect(page.locator('[data-testid="component-variants"]')).toBeVisible();

      // Verify all variants are displayed
      const variants = ['primary', 'secondary', 'danger', 'success'];
      for (const variant of variants) {
        await expect(page.locator(`[data-testid="button-variant-${variant}"]`)).toBeVisible();
      }

      // Test component usage across services
      await page.click('[data-testid="component-usage-tab"]');
      await expect(page.locator('[data-testid="usage-analytics"]')).toBeVisible();

      // Verify usage statistics
      await expect(page.locator('[data-testid="total-implementations"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="services-using-component"]')).toContainText(/\d+/);

      // Test component validation
      await page.click('[data-testid="validate-implementations-button"]');
      await expect(page.locator('[data-testid="validation-in-progress"]')).toBeVisible();

      await page.waitForSelector('[data-testid="validation-complete"]', { timeout: 15000 });

      // Verify validation results
      await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="consistent-implementations"]')).toBeVisible();

      // Check for any inconsistencies
      const inconsistencies = await page.locator('[data-testid="validation-inconsistency"]').count();
      if (inconsistencies > 0) {
        await expect(page.locator('[data-testid="fix-inconsistencies-button"]')).toBeVisible();
      }
    });

    test('should handle responsive design token updates', async () => {
      await page.click('[data-testid="design-system-tab"]');

      // Navigate to responsive tokens
      await page.click('[data-testid="responsive-tokens-section"]');
      await expect(page.locator('[data-testid="breakpoint-editor"]')).toBeVisible();

      // Test breakpoint modifications
      await page.click('[data-testid="tablet-breakpoint"]');
      await page.fill('[data-testid="breakpoint-value"]', '992px');

      // Test spacing token updates
      await page.click('[data-testid="spacing-tokens"]');
      await page.click('[data-testid="spacing-lg"]');
      await page.fill('[data-testid="spacing-value"]', '2rem');

      // Preview responsive changes
      await page.click('[data-testid="responsive-preview-button"]');

      // Test different viewport sizes
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(1000);

        // Take screenshots for visual regression
        await page.screenshot({
          path: `screenshots/responsive-${viewport.name}.png`,
          fullPage: true
        });

        // Verify responsive behavior
        await expect(page.locator('[data-testid="responsive-indicator"]')).toContainText(viewport.name);
      }

      // Apply responsive changes
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.click('[data-testid="apply-responsive-changes"]');

      // Verify propagation to responsive components
      await expect(page.locator('[data-testid="responsive-propagation-complete"]')).toBeVisible();
    });

    test('should support theme switching and validation', async () => {
      await page.click('[data-testid="design-system-tab"]');

      // Navigate to theme management
      await page.click('[data-testid="theme-management-tab"]');
      await expect(page.locator('[data-testid="theme-editor"]')).toBeVisible();

      // Create new theme
      await page.click('[data-testid="create-theme-button"]');
      await page.fill('[data-testid="theme-name"]', 'Dark Professional');
      await page.selectOption('[data-testid="base-theme"]', 'dark');

      // Customize theme colors
      await page.fill('[data-testid="primary-theme-color"]', '#1f2937');
      await page.fill('[data-testid="secondary-theme-color"]', '#374151');
      await page.fill('[data-testid="accent-theme-color"]', '#3b82f6');

      // Set typography
      await page.selectOption('[data-testid="primary-font"]', 'Inter');
      await page.selectOption('[data-testid="heading-font"]', 'Inter');

      // Save theme
      await page.click('[data-testid="save-theme-button"]');
      await expect(page.locator('[data-testid="theme-saved-success"]')).toBeVisible();

      // Test theme application
      await page.click('[data-testid="apply-theme-button"]');
      await expect(page.locator('[data-testid="theme-applying"]')).toBeVisible();

      // Verify theme changes across services
      await page.waitForSelector('[data-testid="theme-applied"]', { timeout: 10000 });

      // Test theme validation
      await page.click('[data-testid="validate-theme-button"]');
      await expect(page.locator('[data-testid="theme-validation-running"]')).toBeVisible();

      // Check accessibility compliance
      await expect(page.locator('[data-testid="accessibility-check"]')).toBeVisible();
      await expect(page.locator('[data-testid="contrast-ratio-check"]')).toBeVisible();

      // Verify validation results
      await page.waitForSelector('[data-testid="theme-validation-complete"]');
      await expect(page.locator('[data-testid="accessibility-score"]')).toBeVisible();

      // Test theme switching
      await page.click('[data-testid="theme-switcher"]');
      await page.click('[data-testid="light-theme-option"]');

      await expect(page.locator('[data-testid="theme-switched"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-theme"]')).toContainText('light');
    });
  });

  describe('Core UI Service Integration', () => {
    test('should handle global notifications and alerts', async () => {
      // Test global notification system
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-global-notification', {
          detail: {
            type: 'success',
            title: 'Investigation Complete',
            message: 'Your investigation has been completed successfully',
            duration: 5000,
            actions: [{ label: 'View Report', action: 'view-report' }]
          }
        }));
      });

      // Verify notification appears
      await expect(page.locator('[data-testid="global-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="notification-title"]')).toContainText('Investigation Complete');
      await expect(page.locator('[data-testid="notification-action"]')).toContainText('View Report');

      // Test notification action
      await page.click('[data-testid="notification-action"]');
      await expect(page.locator('[data-testid="action-executed"]')).toBeVisible();

      // Test notification auto-dismiss
      await page.waitForTimeout(6000);
      await expect(page.locator('[data-testid="global-notification"]')).not.toBeVisible();

      // Test critical alert
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-critical-alert', {
          detail: {
            type: 'error',
            title: 'System Alert',
            message: 'Critical security event detected',
            persistent: true
          }
        }));
      });

      await expect(page.locator('[data-testid="critical-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-priority"]')).toContainText('Critical');
    });

    test('should maintain global state and context', async () => {
      // Test user context
      await expect(page.locator('[data-testid="user-context"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-role"]')).toContainText('Investigator');

      // Test investigation context
      await setupCompletedInvestigation(page);
      await expect(page.locator('[data-testid="investigation-context"]')).toBeVisible();

      // Navigate between services and verify context preservation
      await page.click('[data-testid="agent-analytics-tab"]');
      await expect(page.locator('[data-testid="current-investigation"]')).toContainText('Completed Investigation');

      await page.click('[data-testid="visualization-tab"]');
      await expect(page.locator('[data-testid="investigation-data-loaded"]')).toBeVisible();

      await page.click('[data-testid="reporting-tab"]');
      await expect(page.locator('[data-testid="report-context"]')).toContainText('Completed Investigation');

      // Test context updates
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-context-update', {
          detail: {
            investigation: { status: 'archived', priority: 'low' }
          }
        }));
      });

      await expect(page.locator('[data-testid="context-updated"]')).toBeVisible();
    });

    test('should handle global search and navigation', async () => {
      // Test global search
      await page.click('[data-testid="global-search-input"]');
      await page.type('[data-testid="global-search-input"]', 'investigation');

      // Verify search suggestions
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-result"]')).toBeVisible();

      // Test search filters
      await page.click('[data-testid="search-filter-investigations"]');
      await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();

      // Test search across services
      await page.type('[data-testid="global-search-input"]', ' reports');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-testid="cross-service-results"]')).toBeVisible();

      // Test navigation shortcuts
      await page.keyboard.press('Control+k');
      await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

      await page.type('[data-testid="command-input"]', 'new investigation');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-testid="investigation-form"]')).toBeVisible();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle service failures gracefully across all services', async () => {
      // Simulate reporting service failure
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-service-failure', {
          detail: { service: 'reporting', error: 'Service unavailable', severity: 'high' }
        }));
      });

      // Verify error notification
      await expect(page.locator('[data-testid="service-error-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="failed-service"]')).toContainText('reporting');

      // Verify graceful degradation
      await page.click('[data-testid="reporting-tab"]');
      await expect(page.locator('[data-testid="service-unavailable"]')).toBeVisible();
      await expect(page.locator('[data-testid="fallback-message"]')).toContainText('temporarily unavailable');

      // Test alternative workflows
      await expect(page.locator('[data-testid="alternative-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-report-generation"]')).toBeVisible();

      // Test service recovery
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-service-recovery', {
          detail: { service: 'reporting' }
        }));
      });

      await expect(page.locator('[data-testid="service-recovery-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-restored"]')).toContainText('reporting service restored');
    });

    test('should maintain data consistency during failures', async () => {
      await setupCompletedInvestigation(page);

      // Start report generation
      await page.click('[data-testid="generate-report-button"]');
      await page.selectOption('[data-testid="report-type"]', 'comprehensive');
      await page.click('[data-testid="generate-report-submit"]');

      // Simulate failure during generation
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-generation-failure', {
          detail: { stage: 'data-collection', progress: 45 }
        }));
      });

      // Verify failure handling
      await expect(page.locator('[data-testid="generation-failed"]')).toBeVisible();
      await expect(page.locator('[data-testid="failure-stage"]')).toContainText('data-collection');

      // Test data recovery
      await page.click('[data-testid="resume-generation-button"]');
      await expect(page.locator('[data-testid="resuming-from-checkpoint"]')).toBeVisible();

      // Verify checkpoint restoration
      await expect(page.locator('[data-testid="progress-restored"]')).toContainText('45%');

      // Test data integrity validation
      await page.click('[data-testid="validate-data-button"]');
      await expect(page.locator('[data-testid="data-validation-running"]')).toBeVisible();

      await page.waitForSelector('[data-testid="data-validation-complete"]');
      await expect(page.locator('[data-testid="data-integrity"]')).toContainText('Validated');
    });
  });
});