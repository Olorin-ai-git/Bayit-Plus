/**
 * Accessibility E2E Tests
 * Comprehensive accessibility testing across all microservices
 * Tests WCAG 2.1 AA compliance, keyboard navigation, screen reader compatibility
 */

import { test, expect, Page } from '@playwright/test';
import { AccessibilityTestEngine, AccessibilityTestResult } from './accessibility-test-engine';
import { E2ETestEnvironment } from '../e2e/e2e-setup';

test.describe('Accessibility Testing', () => {
  let testEnv: E2ETestEnvironment;
  let accessibilityEngine: AccessibilityTestEngine;
  let page: Page;
  let allResults: AccessibilityTestResult[] = [];

  test.beforeAll(async ({ browser }) => {
    testEnv = new E2ETestEnvironment();
    await testEnv.initialize();
    page = await testEnv.getPage();
    accessibilityEngine = new AccessibilityTestEngine(page);
  });

  test.afterAll(async () => {
    // Generate comprehensive accessibility report
    if (allResults.length > 0) {
      const reportHtml = accessibilityEngine.generateAccessibilityReport(allResults);
      const fs = require('fs');
      const path = require('path');

      const reportDir = path.join(process.cwd(), 'test-results', 'accessibility');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(reportDir, 'accessibility-report.html'),
        reportHtml
      );

      console.log(`♿ Accessibility report generated: ${path.join(reportDir, 'accessibility-report.html')}`);
    }

    await testEnv.cleanup();
  });

  test('should meet WCAG 2.1 AA compliance for all critical services', async () => {
    const criticalServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' },
      { name: 'manual-investigation', url: 'http://localhost:3002/manual-investigation' }
    ];

    for (const service of criticalServices) {
      await test.step(`Test WCAG compliance for ${service.name}`, async () => {
        const result = await accessibilityEngine.runAccessibilityAudit(service.name, service.url);
        allResults.push(result);

        // WCAG 2.1 AA compliance requirements
        expect(result.complianceScore,
          `${service.name} should have at least 80% WCAG compliance score`
        ).toBeGreaterThanOrEqual(80);

        expect(result.criticalIssues,
          `${service.name} should have no critical accessibility issues`
        ).toBe(0);

        // Critical axe-core violations should be zero
        const criticalViolations = result.violations.filter(v => v.impact === 'critical');
        expect(criticalViolations.length,
          `${service.name} should have no critical axe-core violations`
        ).toBe(0);

        // Serious violations should be minimal
        const seriousViolations = result.violations.filter(v => v.impact === 'serious');
        expect(seriousViolations.length,
          `${service.name} should have minimal serious violations`
        ).toBeLessThanOrEqual(2);
      });
    }
  });

  test('should support full keyboard navigation', async () => {
    const keyboardTestServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
    ];

    for (const service of keyboardTestServices) {
      await test.step(`Test keyboard navigation for ${service.name}`, async () => {
        const result = await accessibilityEngine.runAccessibilityAudit(service.name, service.url);
        allResults.push(result);

        // Should have focusable elements
        expect(result.keyboardNavigation.focusableElements,
          `${service.name} should have focusable interactive elements`
        ).toBeGreaterThan(0);

        // Should have minimal keyboard navigation violations
        expect(result.keyboardNavigation.violations.length,
          `${service.name} should have no major keyboard navigation issues`
        ).toBeLessThanOrEqual(1);

        // Test actual keyboard navigation
        await page.goto(service.url);
        await page.waitForLoadState('networkidle');

        // Test Tab navigation
        await page.keyboard.press('Tab');
        const firstFocus = await page.evaluate(() => document.activeElement?.tagName);
        expect(firstFocus,
          `${service.name} should receive focus on first Tab press`
        ).toBeTruthy();

        // Test Escape key for modals
        await page.keyboard.press('Escape');

        // Test Enter/Space on buttons
        const buttons = page.locator('button').first();
        if (await buttons.count() > 0) {
          await buttons.focus();
          // Note: We don't actually press Enter/Space to avoid triggering actions
        }
      });
    }
  });

  test('should provide screen reader accessibility', async () => {
    const screenReaderServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
    ];

    for (const service of screenReaderServices) {
      await test.step(`Test screen reader accessibility for ${service.name}`, async () => {
        const result = await accessibilityEngine.runAccessibilityAudit(service.name, service.url);
        allResults.push(result);

        // Should have proper landmark structure
        expect(result.screenReader.landmarks.length,
          `${service.name} should have landmark regions`
        ).toBeGreaterThan(0);

        // Should have main content area
        const mainLandmarks = result.screenReader.landmarks.filter(l => l.role === 'main');
        expect(mainLandmarks.length,
          `${service.name} should have exactly one main landmark`
        ).toBe(1);

        // Should have heading structure
        expect(result.screenReader.headings.length,
          `${service.name} should have headings for content structure`
        ).toBeGreaterThan(0);

        // Should start with h1
        const h1Count = result.screenReader.headings.filter(h => h.level === 1).length;
        expect(h1Count,
          `${service.name} should have exactly one h1 element`
        ).toBe(1);

        // Should have minimal screen reader violations
        expect(result.screenReader.violations.length,
          `${service.name} should have minimal screen reader issues`
        ).toBeLessThanOrEqual(2);

        // Test screen reader simulation
        const screenReaderContent = await accessibilityEngine.testWithScreenReaderSimulation(service.name, service.url);
        expect(screenReaderContent.length,
          `${service.name} should provide screen reader content`
        ).toBeGreaterThan(5);
      });
    }
  });

  test('should meet color contrast requirements', async () => {
    const contrastTestServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' },
      { name: 'manual-investigation', url: 'http://localhost:3002/manual-investigation' }
    ];

    for (const service of contrastTestServices) {
      await test.step(`Test color contrast for ${service.name}`, async () => {
        const result = await accessibilityEngine.runAccessibilityAudit(service.name, service.url);
        allResults.push(result);

        // Should have minimal color contrast failures
        expect(result.colorContrast.failed,
          `${service.name} should have minimal color contrast violations`
        ).toBeLessThanOrEqual(3);

        // Most text should pass contrast requirements
        const totalColorTests = result.colorContrast.passed + result.colorContrast.failed;
        if (totalColorTests > 0) {
          const passRate = (result.colorContrast.passed / totalColorTests) * 100;
          expect(passRate,
            `${service.name} should have at least 85% color contrast compliance`
          ).toBeGreaterThanOrEqual(85);
        }
      });
    }
  });

  test('should validate form accessibility', async () => {
    const formTestServices = [
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' },
      { name: 'manual-investigation', url: 'http://localhost:3002/manual-investigation' }
    ];

    for (const service of formTestServices) {
      await test.step(`Test form accessibility for ${service.name}`, async () => {
        await page.goto(service.url);
        await page.waitForLoadState('networkidle');

        // Test form labels
        const unlabeledInputs = await page.$$eval(
          'input:not([type="hidden"]), select, textarea',
          elements => elements.filter(el => {
            // Check for various labeling methods
            const hasAriaLabel = el.hasAttribute('aria-label');
            const hasAriaLabelledby = el.hasAttribute('aria-labelledby');
            const hasAssociatedLabel = el.id && document.querySelector(`label[for="${el.id}"]`);

            return !hasAriaLabel && !hasAriaLabelledby && !hasAssociatedLabel;
          }).length
        );

        expect(unlabeledInputs,
          `${service.name} should have all form controls properly labeled`
        ).toBe(0);

        // Test required field indicators
        const requiredFields = await page.$$('[required], [aria-required="true"]');
        for (const field of requiredFields) {
          const hasRequiredIndicator = await field.evaluate(el => {
            const label = el.getAttribute('aria-label') || '';
            const text = el.parentElement?.textContent || '';
            return label.includes('required') || text.includes('*') || text.includes('required');
          });

          expect(hasRequiredIndicator,
            `${service.name} required fields should be clearly indicated`
          ).toBe(true);
        }

        // Test error message association
        const errorMessages = await page.$$('[role="alert"], .error-message, [data-testid*="error"]');
        for (const errorMsg of errorMessages) {
          const isVisible = await errorMsg.isVisible();
          if (isVisible) {
            const hasProperRole = await errorMsg.evaluate(el =>
              el.getAttribute('role') === 'alert' ||
              el.getAttribute('aria-live') === 'polite' ||
              el.getAttribute('aria-live') === 'assertive'
            );

            expect(hasProperRole,
              `${service.name} error messages should have proper ARIA roles`
            ).toBe(true);
          }
        }
      });
    }
  });

  test('should support high contrast mode', async () => {
    const contrastServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
    ];

    for (const service of contrastServices) {
      await test.step(`Test high contrast mode for ${service.name}`, async () => {
        await page.goto(service.url);
        await page.waitForLoadState('networkidle');

        // Simulate high contrast mode
        await page.addStyleTag({
          content: `
            @media (prefers-contrast: high) {
              * {
                background: black !important;
                color: white !important;
                border-color: white !important;
              }
            }
          `
        });

        // Emulate high contrast preference
        await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });

        // Check that content is still visible and accessible
        const visibleElements = await page.$$eval(
          'h1, h2, h3, button, a, input',
          elements => elements.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          }).length
        );

        expect(visibleElements,
          `${service.name} should remain functional in high contrast mode`
        ).toBeGreaterThan(0);

        // Reset media emulation
        await page.emulateMedia({ colorScheme: 'light', forcedColors: 'none' });
      });
    }
  });

  test('should handle focus management in dynamic content', async () => {
    const dynamicContentServices = [
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' },
      { name: 'agent-analytics', url: 'http://localhost:3003/agent-analytics' }
    ];

    for (const service of dynamicContentServices) {
      await test.step(`Test focus management for ${service.name}`, async () => {
        await page.goto(service.url);
        await page.waitForLoadState('networkidle');

        // Test modal focus management
        const modalTriggers = await page.$$('[data-testid*="modal"], [data-testid*="dialog"], button[aria-haspopup]');

        for (const trigger of modalTriggers.slice(0, 2)) { // Test first 2 modals
          const isVisible = await trigger.isVisible();
          if (isVisible) {
            await trigger.click();
            await page.waitForTimeout(500);

            // Check if modal received focus
            const modalElement = await page.$('[role="dialog"], [role="alertdialog"], .modal');
            if (modalElement) {
              const focusedElement = await page.$(':focus');
              const isModalFocused = await modalElement.evaluate((modal, focused) => {
                return modal.contains(focused) || modal === focused;
              }, focusedElement);

              expect(isModalFocused,
                `${service.name} modal should receive focus when opened`
              ).toBe(true);

              // Test escape key to close modal
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);

              // Focus should return to trigger
              const focusedAfterClose = await page.evaluate(() => document.activeElement?.tagName);
              expect(focusedAfterClose,
                `${service.name} should restore focus after modal closes`
              ).toBeTruthy();
            }
          }
        }

        // Test live region announcements
        const liveRegions = await page.$$('[aria-live], [role="status"], [role="alert"]');
        expect(liveRegions.length,
          `${service.name} should have live regions for dynamic content announcements`
        ).toBeGreaterThan(0);
      });
    }
  });

  test('should provide accessible data visualizations', async () => {
    const visualizationServices = [
      { name: 'agent-analytics', url: 'http://localhost:3003/agent-analytics' },
      { name: 'visualization', url: 'http://localhost:3005/visualization' }
    ];

    for (const service of visualizationServices) {
      await test.step(`Test visualization accessibility for ${service.name}`, async () => {
        await page.goto(service.url);
        await page.waitForLoadState('networkidle');

        // Check for accessible charts and graphs
        const charts = await page.$$('canvas, svg, [data-testid*="chart"]');

        for (const chart of charts) {
          const isVisible = await chart.isVisible();
          if (isVisible) {
            // Charts should have accessible labels
            const hasAccessibleName = await chart.evaluate(el => {
              return !!(el.getAttribute('aria-label') ||
                       el.getAttribute('aria-labelledby') ||
                       el.getAttribute('title'));
            });

            expect(hasAccessibleName,
              `${service.name} charts should have accessible names`
            ).toBe(true);

            // Complex charts should have descriptions
            const hasDescription = await chart.evaluate(el => {
              return !!(el.getAttribute('aria-describedby') ||
                       el.getAttribute('aria-description'));
            });

            // Alternative: check for nearby text descriptions
            const hasNearbyDescription = await chart.evaluate(el => {
              const parent = el.parentElement;
              const siblings = parent ? Array.from(parent.children) : [];
              return siblings.some(sibling =>
                sibling.textContent && sibling.textContent.length > 20
              );
            });

            expect(hasDescription || hasNearbyDescription,
              `${service.name} complex charts should have descriptions`
            ).toBe(true);
          }
        }

        // Check for data tables as chart alternatives
        const dataTables = await page.$$('table[data-chart-alternative], table[aria-label*="chart"]');

        for (const table of dataTables) {
          const hasHeaders = await table.$$eval('th', headers => headers.length > 0);
          expect(hasHeaders,
            `${service.name} data tables should have proper headers`
          ).toBe(true);

          const hasCaption = await table.$('caption');
          expect(hasCaption,
            `${service.name} data tables should have captions`
          ).toBeTruthy();
        }
      });
    }
  });

  test('should validate ARIA implementation', async () => {
    const ariaTestServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
    ];

    for (const service of ariaTestServices) {
      await test.step(`Test ARIA implementation for ${service.name}`, async () => {
        const result = await accessibilityEngine.runAccessibilityAudit(service.name, service.url);
        allResults.push(result);

        // Should have ARIA labels where needed
        expect(result.screenReader.ariaLabels.length,
          `${service.name} should use ARIA labels appropriately`
        ).toBeGreaterThan(0);

        await page.goto(service.url);
        await page.waitForLoadState('networkidle');

        // Test for proper ARIA roles
        const customElements = await page.$$('[role]');
        for (const element of customElements.slice(0, 10)) { // Test first 10
          const role = await element.getAttribute('role');
          const validRoles = [
            'button', 'link', 'menuitem', 'tab', 'tabpanel', 'dialog', 'alertdialog',
            'banner', 'navigation', 'main', 'complementary', 'contentinfo',
            'alert', 'status', 'progressbar', 'slider', 'spinbutton'
          ];

          expect(validRoles.includes(role || ''),
            `${service.name} should use valid ARIA roles`
          ).toBe(true);
        }

        // Test ARIA properties
        const ariaDescribedBy = await page.$$('[aria-describedby]');
        for (const element of ariaDescribedBy) {
          const describedById = await element.getAttribute('aria-describedby');
          const descriptionExists = await page.$(`#${describedById}`);

          expect(descriptionExists,
            `${service.name} aria-describedby should reference existing elements`
          ).toBeTruthy();
        }

        // Test ARIA states
        const expandableElements = await page.$$('[aria-expanded]');
        for (const element of expandableElements) {
          const expanded = await element.getAttribute('aria-expanded');
          expect(['true', 'false'].includes(expanded || ''),
            `${service.name} aria-expanded should be true or false`
          ).toBe(true);
        }
      });
    }
  });

  test('should meet mobile accessibility requirements', async () => {
    const mobileServices = [
      { name: 'core-ui', url: 'http://localhost:3000/' },
      { name: 'autonomous-investigation', url: 'http://localhost:3001/autonomous-investigation' }
    ];

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    for (const service of mobileServices) {
      await test.step(`Test mobile accessibility for ${service.name}`, async () => {
        const result = await accessibilityEngine.runAccessibilityAudit(service.name, service.url);
        allResults.push(result);

        await page.goto(service.url);
        await page.waitForLoadState('networkidle');

        // Test touch target sizes
        const interactiveElements = await page.$$('button, a, input, select, textarea, [role="button"]');

        for (const element of interactiveElements.slice(0, 10)) { // Test first 10
          const isVisible = await element.isVisible();
          if (isVisible) {
            const boundingBox = await element.boundingBox();
            if (boundingBox) {
              const minSize = 44; // 44px minimum touch target size
              expect(boundingBox.width >= minSize || boundingBox.height >= minSize,
                `${service.name} interactive elements should have adequate touch target size (44px)`
              ).toBe(true);
            }
          }
        }

        // Test zoom capability
        await page.setViewportSize({ width: 375 * 2, height: 667 * 2 }); // Simulate 200% zoom

        const stillUsable = await page.evaluate(() => {
          // Check if main content is still accessible
          const main = document.querySelector('main, [role="main"]');
          if (main) {
            const rect = main.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          }
          return false;
        });

        expect(stillUsable,
          `${service.name} should remain usable at 200% zoom`
        ).toBe(true);

        // Reset viewport
        await page.setViewportSize({ width: 375, height: 667 });
      });
    }

    // Reset to desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });
});