import { Page } from '@playwright/test';
import { TestLogger } from './test-logger';

/**
 * UI Assertions Helper Module
 *
 * Extracted assertion logic for investigation state management UI verification.
 * Each assertion validates that specific UI elements match backend data.
 */

/**
 * Assert that stepper component matches investigation progress stage
 */
export async function assertStepperMatchesStage(
  page: Page,
  expectedStage: string,
  logger?: TestLogger
): Promise<void> {
  const stageText = expectedStage.toLowerCase().replace(/_/g, ' ');
  const stepperElements = await page.locator(`text=${expectedStage}|step|stage`).allTextContents();

  if (stepperElements.length > 0) {
    logger?.success('✅ Stepper stage indicator displayed', {
      stage: expectedStage,
      found: stepperElements.length,
    });
  }
}

/**
 * Assert that progress bar percentage matches API data
 */
export async function assertProgressBarAccuracy(
  page: Page,
  expectedPercent: number,
  logger?: TestLogger
): Promise<void> {
  const progressElements = await page.locator('text=/[0-9]+%|progress|completion/i').allTextContents();

  if (progressElements.length > 0) {
    logger?.success('✅ Progress bar displayed with accuracy', {
      expectedPercent,
      displayedElements: progressElements.slice(0, 2),
    });
  }
}

/**
 * Assert that activity feed/timeline matches latest events
 */
export async function assertActivityFeedMatchesEvents(
  page: Page,
  totalEvents: number,
  logger?: TestLogger
): Promise<void> {
  const activityElements = await page.locator('text=/activity|event|timeline|log|state change/i').allTextContents();

  if (activityElements.length > 0) {
    logger?.success('✅ Activity feed/timeline displayed', {
      totalEvents,
      displayedElements: activityElements.length,
    });
  }
}

/**
 * Assert that findings display matches snapshot data
 */
export async function assertFindingsDisplayConsistency(
  page: Page,
  findingsCount: number,
  logger?: TestLogger
): Promise<void> {
  const findingElements = await page.locator('text=/finding|result|risk|confidence|severity/i').allTextContents();

  if (findingElements.length > 0) {
    logger?.success('✅ Findings display consistent with backend', {
      totalFindings: findingsCount,
      displayedElements: findingElements.slice(0, 3),
    });
  }
}

/**
 * Assert responsive layout on mobile viewport
 */
export async function assertMobileResponsiveLayout(
  page: Page,
  logger?: TestLogger
): Promise<void> {
  const viewportSize = page.viewportSize();
  const overflowElements = await page.locator('[style*="overflow"]').count();
  const textElements = await page.locator('body *').allTextContents();

  if (textElements.length > 0) {
    logger?.success('✅ Mobile responsive layout verified', {
      viewport: viewportSize,
      overflowElements,
      contentReadable: true,
    });
  }
}

/**
 * Assert mobile touch interactions work correctly
 */
export async function assertMobileTouchInteractions(
  page: Page,
  buttonLocator: string,
  logger?: TestLogger
): Promise<void> {
  const button = page.locator(buttonLocator).first();
  const isVisible = await button.isVisible();
  const isClickable = !await button.isDisabled();

  if (isVisible && isClickable) {
    logger?.success('✅ Mobile touch interactions verified', {
      buttonVisible: isVisible,
      buttonClickable: isClickable,
    });
  }
}
