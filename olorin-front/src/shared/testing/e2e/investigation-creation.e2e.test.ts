/**
 * E2E Tests for Investigation Creation Flow
 * Tests the complete user journey from investigation setup to execution
 * Covers autonomous-investigation and manual-investigation microservices
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { PlaywrightMCPClient } from '../playwright-mcp';

describe('Investigation Creation E2E Flow', () => {
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

    // Setup viewport for consistent testing
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
    await mcpClient.cleanup();
  });

  describe('Autonomous Investigation Creation', () => {
    test('should create new autonomous investigation with email entity', async () => {
      // Navigate to autonomous investigation service
      await page.click('[data-testid="autonomous-investigation-tab"]');
      await expect(page).toHaveURL(/.*autonomous-investigation/);

      // Verify autonomous investigation interface loads
      await expect(page.locator('[data-testid="investigation-form"]')).toBeVisible();

      // Fill investigation details
      await page.fill('[data-testid="entity-input"]', 'suspicious@example.com');
      await page.selectOption('[data-testid="entity-type-select"]', 'email');
      await page.fill('[data-testid="investigation-title"]', 'Email Security Investigation');
      await page.fill('[data-testid="investigation-description"]', 'Investigating suspicious email activity');

      // Configure investigation parameters
      await page.click('[data-testid="advanced-settings-toggle"]');
      await page.selectOption('[data-testid="priority-select"]', 'high');
      await page.selectOption('[data-testid="investigation-depth"]', 'comprehensive');

      // Enable specific analysis modules
      await page.check('[data-testid="device-analysis-checkbox"]');
      await page.check('[data-testid="location-analysis-checkbox"]');
      await page.check('[data-testid="network-analysis-checkbox"]');

      // Take screenshot before submission
      await page.screenshot({
        path: 'screenshots/investigation-creation-form.png',
        fullPage: true
      });

      // Submit investigation
      await page.click('[data-testid="start-investigation-button"]');

      // Verify investigation creation success
      await expect(page.locator('[data-testid="investigation-success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="investigation-id"]')).toContainText(/INV-\d{6}/);

      // Verify redirect to investigation dashboard
      await expect(page).toHaveURL(/.*investigation\/[a-zA-Z0-9-]+/);
      await expect(page.locator('[data-testid="investigation-status"]')).toContainText('Running');

      // Verify real-time updates start
      await page.waitForSelector('[data-testid="agent-execution-log"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
    });

    test('should handle form validation errors correctly', async () => {
      await page.click('[data-testid="autonomous-investigation-tab"]');

      // Try to submit empty form
      await page.click('[data-testid="start-investigation-button"]');

      // Verify validation errors appear
      await expect(page.locator('[data-testid="entity-input-error"]')).toContainText('Entity is required');
      await expect(page.locator('[data-testid="entity-type-error"]')).toContainText('Entity type is required');

      // Test invalid email format
      await page.fill('[data-testid="entity-input"]', 'invalid-email');
      await page.selectOption('[data-testid="entity-type-select"]', 'email');
      await page.click('[data-testid="start-investigation-button"]');

      await expect(page.locator('[data-testid="entity-input-error"]')).toContainText('Invalid email format');

      // Test valid form submission
      await page.fill('[data-testid="entity-input"]', 'valid@example.com');
      await page.fill('[data-testid="investigation-title"]', 'Valid Investigation');

      // Verify error messages disappear
      await expect(page.locator('[data-testid="entity-input-error"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="entity-type-error"]')).not.toBeVisible();
    });

    test('should support different entity types', async () => {
      await page.click('[data-testid="autonomous-investigation-tab"]');

      const entityTypes = [
        { type: 'email', value: 'test@example.com', label: 'Email Address' },
        { type: 'ip', value: '192.168.1.100', label: 'IP Address' },
        { type: 'phone', value: '+1-555-123-4567', label: 'Phone Number' },
        { type: 'username', value: 'testuser123', label: 'Username' }
      ];

      for (const entity of entityTypes) {
        // Clear previous inputs
        await page.fill('[data-testid="entity-input"]', '');

        // Select entity type
        await page.selectOption('[data-testid="entity-type-select"]', entity.type);

        // Verify UI updates for entity type
        await expect(page.locator('[data-testid="entity-type-label"]')).toContainText(entity.label);

        // Fill entity value
        await page.fill('[data-testid="entity-input"]', entity.value);

        // Verify entity-specific validation and suggestions
        await expect(page.locator('[data-testid="entity-suggestions"]')).toBeVisible();
      }
    });
  });

  describe('Manual Investigation Creation', () => {
    test('should create manual investigation with analyst assignment', async () => {
      // Navigate to manual investigation service
      await page.click('[data-testid="manual-investigation-tab"]');
      await expect(page).toHaveURL(/.*manual-investigation/);

      // Verify manual investigation interface loads
      await expect(page.locator('[data-testid="manual-investigation-form"]')).toBeVisible();

      // Fill investigation details
      await page.fill('[data-testid="case-title"]', 'Complex Fraud Case');
      await page.fill('[data-testid="case-description"]', 'Multi-vector fraud investigation requiring manual analysis');

      // Select investigation type
      await page.selectOption('[data-testid="investigation-type"]', 'fraud');
      await page.selectOption('[data-testid="urgency-level"]', 'critical');

      // Assign analyst
      await page.click('[data-testid="analyst-assignment-dropdown"]');
      await page.click('[data-testid="analyst-option-senior"]');

      // Add evidence files
      await page.setInputFiles('[data-testid="evidence-upload"]', [
        'test-data/sample-log.txt',
        'test-data/screenshot.png'
      ]);

      // Verify file upload progress
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 15000 });

      // Configure manual analysis parameters
      await page.check('[data-testid="require-peer-review"]');
      await page.check('[data-testid="sensitive-data-flag"]');

      // Set timeline
      await page.selectOption('[data-testid="estimated-duration"]', '48-hours');
      await page.fill('[data-testid="deadline-date"]', '2024-12-31');

      // Submit manual investigation
      await page.click('[data-testid="create-manual-investigation"]');

      // Verify creation success
      await expect(page.locator('[data-testid="manual-investigation-created"]')).toBeVisible();
      await expect(page.locator('[data-testid="case-number"]')).toContainText(/CASE-\d{6}/);

      // Verify analyst notification
      await expect(page.locator('[data-testid="analyst-notification"]')).toContainText('Analyst notified');

      // Verify case appears in analyst dashboard
      await page.click('[data-testid="analyst-dashboard-link"]');
      await expect(page.locator('[data-testid="assigned-cases-list"]')).toContainText('Complex Fraud Case');
    });

    test('should support investigation escalation workflow', async () => {
      // Start with autonomous investigation
      await page.click('[data-testid="autonomous-investigation-tab"]');
      await page.fill('[data-testid="entity-input"]', 'escalation@example.com');
      await page.selectOption('[data-testid="entity-type-select"]', 'email');
      await page.fill('[data-testid="investigation-title"]', 'Escalation Test Investigation');

      // Configure for auto-escalation
      await page.click('[data-testid="advanced-settings-toggle"]');
      await page.check('[data-testid="auto-escalate-checkbox"]');
      await page.selectOption('[data-testid="escalation-threshold"]', 'medium-risk');

      await page.click('[data-testid="start-investigation-button"]');

      // Wait for investigation to start
      await page.waitForSelector('[data-testid="investigation-status"]');

      // Simulate escalation trigger (mock high-risk finding)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-escalation-trigger', {
          detail: { riskLevel: 'high', reason: 'Suspicious activity detected' }
        }));
      });

      // Verify escalation notification
      await expect(page.locator('[data-testid="escalation-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="escalation-reason"]')).toContainText('Suspicious activity detected');

      // Verify manual investigation is created
      await page.click('[data-testid="view-escalated-case"]');
      await expect(page).toHaveURL(/.*manual-investigation/);
      await expect(page.locator('[data-testid="escalated-from"]')).toContainText('Escalation Test Investigation');
    });
  });

  describe('Cross-Service Communication', () => {
    test('should handle real-time updates across services', async () => {
      // Create investigation
      await page.click('[data-testid="autonomous-investigation-tab"]');
      await page.fill('[data-testid="entity-input"]', 'realtime@example.com');
      await page.selectOption('[data-testid="entity-type-select"]', 'email');
      await page.fill('[data-testid="investigation-title"]', 'Real-time Test');
      await page.click('[data-testid="start-investigation-button"]');

      // Wait for investigation dashboard
      await page.waitForSelector('[data-testid="investigation-dashboard"]');

      // Verify WebSocket connection established
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Verify real-time agent updates
      await page.waitForSelector('[data-testid="agent-update"]', { timeout: 10000 });

      // Check agent analytics service integration
      await expect(page.locator('[data-testid="analytics-metrics"]')).toBeVisible();

      // Check RAG intelligence integration
      await expect(page.locator('[data-testid="rag-insights"]')).toBeVisible();

      // Check visualization service updates
      await expect(page.locator('[data-testid="risk-visualization"]')).toBeVisible();

      // Verify event bus communication
      const eventCounts = await page.locator('[data-testid="event-counter"]').textContent();
      expect(parseInt(eventCounts || '0')).toBeGreaterThan(0);
    });

    test('should handle service failures gracefully', async () => {
      // Start investigation
      await page.click('[data-testid="autonomous-investigation-tab"]');
      await page.fill('[data-testid="entity-input"]', 'failure-test@example.com');
      await page.selectOption('[data-testid="entity-type-select"]', 'email');
      await page.fill('[data-testid="investigation-title"]', 'Service Failure Test');
      await page.click('[data-testid="start-investigation-button"]');

      // Wait for investigation to start
      await page.waitForSelector('[data-testid="investigation-dashboard"]');

      // Simulate service failure
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-service-failure', {
          detail: { service: 'agent-analytics', error: 'Connection timeout' }
        }));
      });

      // Verify error notification appears
      await expect(page.locator('[data-testid="service-error-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('agent-analytics service unavailable');

      // Verify graceful degradation
      await expect(page.locator('[data-testid="investigation-status"]')).toContainText('Running with limitations');

      // Verify retry mechanism
      await page.click('[data-testid="retry-failed-service"]');
      await expect(page.locator('[data-testid="retry-notification"]')).toContainText('Retrying connection');

      // Simulate service recovery
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-service-recovery', {
          detail: { service: 'agent-analytics' }
        }));
      });

      // Verify recovery notification
      await expect(page.locator('[data-testid="service-recovery-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="investigation-status"]')).toContainText('Running');
    });
  });

  describe('Accessibility and Responsive Design', () => {
    test('should meet WCAG accessibility guidelines', async () => {
      await page.click('[data-testid="autonomous-investigation-tab"]');

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="entity-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="entity-type-select"]')).toBeFocused();

      // Test ARIA labels and roles
      const entityInput = page.locator('[data-testid="entity-input"]');
      await expect(entityInput).toHaveAttribute('aria-label', 'Entity to investigate');
      await expect(entityInput).toHaveAttribute('role', 'textbox');

      // Test screen reader announcements
      await page.fill('[data-testid="entity-input"]', 'test@example.com');
      await expect(page.locator('[data-testid="validation-announcement"]')).toHaveAttribute('aria-live', 'polite');

      // Test color contrast and focus indicators
      const focusedButton = page.locator('[data-testid="start-investigation-button"]:focus');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify focus indicator is visible
      const focusStyles = await focusedButton.evaluate(el => getComputedStyle(el).outline);
      expect(focusStyles).not.toBe('none');
    });

    test('should work correctly on mobile devices', async () => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();

      // Verify mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();

      // Test mobile form layout
      await page.click('[data-testid="mobile-autonomous-investigation"]');
      await expect(page.locator('[data-testid="investigation-form"]')).toBeVisible();

      // Verify form elements are appropriately sized for mobile
      const entityInput = page.locator('[data-testid="entity-input"]');
      const inputBox = await entityInput.boundingBox();
      expect(inputBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size

      // Test mobile-specific interactions
      await entityInput.tap();
      await page.keyboard.type('mobile@example.com');

      // Verify mobile keyboard doesn't obscure form
      await expect(page.locator('[data-testid="start-investigation-button"]')).toBeVisible();
    });

    test('should work correctly on tablet devices', async () => {
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();

      // Verify tablet layout
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();

      // Test two-column layout on tablet
      await page.click('[data-testid="autonomous-investigation-tab"]');
      await expect(page.locator('[data-testid="form-column"]')).toBeVisible();
      await expect(page.locator('[data-testid="preview-column"]')).toBeVisible();

      // Test touch interactions
      await page.locator('[data-testid="entity-type-select"]').tap();
      await expect(page.locator('[data-testid="entity-type-dropdown"]')).toBeVisible();
    });
  });

  describe('Performance Testing', () => {
    test('should load investigation form within performance budgets', async () => {
      const startTime = Date.now();

      await page.goto('http://localhost:3000');
      await page.waitForSelector('[data-testid="autonomous-investigation-tab"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds

      // Test First Contentful Paint
      const fcpMetric = await page.evaluate(() => {
        return new Promise(resolve => {
          new PerformanceObserver(list => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
              resolve(fcpEntry.startTime);
            }
          }).observe({ entryTypes: ['paint'] });
        });
      });

      expect(fcpMetric).toBeLessThan(2000); // FCP should be under 2 seconds
    });

    test('should handle rapid form interactions efficiently', async () => {
      await page.click('[data-testid="autonomous-investigation-tab"]');

      // Rapid typing test
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await page.keyboard.type('a');
        await page.keyboard.press('Backspace');
      }

      const typingTime = Date.now() - startTime;
      expect(typingTime).toBeLessThan(5000); // Should handle rapid typing efficiently

      // Test form responsiveness during validation
      await page.fill('[data-testid="entity-input"]', 'performance@example.com');

      const validationStart = Date.now();
      await page.blur('[data-testid="entity-input"]'); // Trigger validation
      await page.waitForSelector('[data-testid="validation-complete"]');

      const validationTime = Date.now() - validationStart;
      expect(validationTime).toBeLessThan(500); // Validation should be near-instant
    });
  });

  describe('Visual Regression Testing', () => {
    test('should maintain consistent visual appearance', async () => {
      await page.click('[data-testid="autonomous-investigation-tab"]');

      // Take baseline screenshot
      await page.screenshot({
        path: 'screenshots/baseline/investigation-form.png',
        fullPage: true
      });

      // Fill form and take screenshot
      await page.fill('[data-testid="entity-input"]', 'visual@example.com');
      await page.selectOption('[data-testid="entity-type-select"]', 'email');
      await page.fill('[data-testid="investigation-title"]', 'Visual Regression Test');

      await page.screenshot({
        path: 'screenshots/test/filled-form.png',
        fullPage: true
      });

      // Test dark mode visual consistency
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForSelector('[data-testid="dark-theme-active"]');

      await page.screenshot({
        path: 'screenshots/test/dark-mode-form.png',
        fullPage: true
      });

      // Test error state visuals
      await page.fill('[data-testid="entity-input"]', '');
      await page.click('[data-testid="start-investigation-button"]');

      await page.screenshot({
        path: 'screenshots/test/error-state-form.png',
        fullPage: true
      });
    });
  });
});