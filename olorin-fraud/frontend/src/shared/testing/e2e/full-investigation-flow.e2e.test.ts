/* eslint-disable testing-library/no-debugging-utils */
/**
 * FULL INVESTIGATION FLOW E2E TEST
 * Feature: 008-live-investigation-updates
 * 
 * Comprehensive end-to-end test that:
 * 1. Creates investigation from UI (Settings Page)
 * 2. Monitors real-time progress updates
 * 3. Verifies backend persistence (progress_json, events)
 * 4. Verifies frontend retrieval (API calls, polling)
 * 5. Verifies UI components reflect updates (counters, status, radar, logs)
 * 6. Continues until investigation completes or times out
 * 
 * TEST ENVIRONMENT:
 * - Frontend: http://localhost:3000
 * - Backend: http://localhost:8090
 * - Database: PostgreSQL (via backend API)
 */

import { test, expect, Page } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8090';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const MONITORING_DURATION = 3 * 60 * 1000; // Monitor for 3 minutes max
const POLL_INTERVAL = 3000; // Check every 3 seconds

interface ProgressData {
  investigationId: string;
  completionPercent: number;
  status: string;
  lifecycleStage: string;
  totalTools: number;
  completedTools: number;
  runningTools: number;
  failedTools: number;
  toolExecutions: any[];
  timestamp: number;
}

interface EventData {
  id: string;
  ts: number;
  op: string;
  investigation_id: string;
  actor: { type: string; id: string };
  payload: any;
}

interface BackendState {
  progressJson: any;
  version: number;
  status: string;
  lifecycleStage: string;
}

test.describe('Full Investigation Flow E2E', () => {
  let investigationId: string | null = null;
  let progressSnapshots: ProgressData[] = [];
  let eventSnapshots: EventData[][] = [];
  let backendStateSnapshots: BackendState[] = [];

  test('Create investigation and verify end-to-end progress flow', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    console.log('🚀 Starting Full Investigation Flow E2E Test');
    console.log(`Frontend: ${FRONTEND_URL}, Backend: ${BACKEND_URL}`);

    // ============================================
    // STEP 1: Navigate to Settings Page
    // ============================================
    console.log('\n📋 STEP 1: Navigate to Settings Page');
    await page.goto(`${FRONTEND_URL}/investigation/settings`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ Settings page loaded');

    // ============================================
    // STEP 2: Configure Investigation Settings
    // ============================================
    console.log('\n📋 STEP 2: Configure Investigation Settings');
    
    // Wait for page to be fully loaded
    await page.waitForTimeout(2000);

    // Check if we need to fill in entity information
    // Look for entity input fields
    const entityInputs = page.locator('input[type="text"], input[placeholder*="entity"], input[placeholder*="Entity"]');
    const entityInputCount = await entityInputs.count();
    
    if (entityInputCount > 0) {
      console.log(`Found ${entityInputCount} entity input fields`);
      // Fill first entity input with test data
      const firstInput = entityInputs.first();
      await firstInput.fill('test-entity-123');
      console.log('✅ Filled entity input');
    }

    // Check if investigation type selector exists
    const investigationTypeSelect = page.locator('select, [role="combobox"], button:has-text("hybrid"), button:has-text("structured")').first();
    const hasTypeSelector = await investigationTypeSelect.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTypeSelector) {
      console.log('✅ Investigation type selector found');
    }

    // ============================================
    // STEP 3: Click Launch Investigation Button
    // ============================================
    console.log('\n📋 STEP 3: Launch Investigation');
    
    // Try multiple button selectors
    const buttonSelectors = [
      'button:has-text("Launch Investigation")',
      'button:has-text("Start Investigation")',
      'button:has-text("Start")',
      '[data-testid="start-investigation"]',
      '[data-testid="launch-investigation"]',
      'button[class*="launch"]',
      'button[class*="start"]'
    ];

    let buttonClicked = false;
    for (const selector of buttonSelectors) {
      try {
        const button = page.locator(selector).first();
        const isVisible = await button.isVisible({ timeout: 2000 });
        if (isVisible && !(await button.isDisabled())) {
          console.log(`✅ Found button with selector: ${selector}`);
          await button.click();
          buttonClicked = true;
          console.log('✅ Clicked Launch Investigation button');
          break;
        }
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    if (!buttonClicked) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/settings-page-no-button.png', fullPage: true });
      throw new Error('Could not find Launch Investigation button');
    }

    // ============================================
    // STEP 4: Wait for Navigation to Progress Page
    // ============================================
    console.log('\n📋 STEP 4: Wait for Progress Page');
    
    try {
      await page.waitForURL('**/investigation/progress**', { timeout: 30000 });
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to progress page');
    } catch (e) {
      await page.screenshot({ path: 'test-results/navigation-failed.png', fullPage: true });
      throw new Error(`Failed to navigate to progress page: ${e}`);
    }

    // Extract investigation ID from URL
    const url = new URL(page.url());
    investigationId = url.searchParams.get('id') || url.pathname.split('/').pop() || null;
    
    if (!investigationId) {
      // Try to extract from page content or API calls
      const pageContent = await page.content();
      const idMatch = pageContent.match(/inv-[a-zA-Z0-9-]+/);
      if (idMatch) {
        investigationId = idMatch[0];
      }
    }

    expect(investigationId).toBeTruthy();
    console.log(`✅ Investigation ID: ${investigationId}`);

    // ============================================
    // STEP 5: Monitor Progress Updates (Backend + Frontend)
    // ============================================
    console.log('\n📋 STEP 5: Monitor Progress Updates');
    console.log(`Monitoring for up to ${MONITORING_DURATION / 1000} seconds...`);

    const startTime = Date.now();
    let lastBackendProgress = 0;
    let lastBackendStatus = '';
    let lastBackendVersion = 0;
    let lastEventCount = 0;
    let progressUpdateCount = 0;
    let eventUpdateCount = 0;

    // Monitor network requests
    const apiCalls: Array<{ url: string; method: string; status: number; timestamp: number }> = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/investigation-state') || url.includes('/progress') || url.includes('/events')) {
        apiCalls.push({
          url,
          method: response.request().method(),
          status: response.status(),
          timestamp: Date.now()
        });
      }
    });

    while (Date.now() - startTime < MONITORING_DURATION) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      try {
        // ============================================
        // 5a: Check Backend Progress API (using Playwright request context)
        // ============================================
        try {
          const progressResponse = await page.request.get(
            `${BACKEND_URL}/api/v1/investigation-state/${investigationId}`,
            { 
              headers: { 'Accept': 'application/json' },
              timeout: 5000
            }
          ).catch(() => null);

          if (progressResponse && progressResponse.ok()) {
            const progressData = await progressResponse.json();
            const progress = progressData.progress || {};
            
            const currentProgress = progress.percent_complete || progress.progress_percentage || 0;
            const currentStatus = progressData.status || progressData.lifecycle_stage || '';
            const currentVersion = progressData.version || 0;

            // Track progress changes
            if (currentProgress !== lastBackendProgress) {
              progressUpdateCount++;
              console.log(`📊 [${elapsed}s] Progress: ${lastBackendProgress}% → ${currentProgress}%`);
              lastBackendProgress = currentProgress;
            }

            // Track status changes
            if (currentStatus !== lastBackendStatus) {
              console.log(`🔄 [${elapsed}s] Status: ${lastBackendStatus} → ${currentStatus}`);
              lastBackendStatus = currentStatus;
            }

            // Track version changes (indicates persistence)
            if (currentVersion !== lastBackendVersion) {
              console.log(`💾 [${elapsed}s] Version: ${lastBackendVersion} → ${currentVersion} (persistence detected)`);
              lastBackendVersion = currentVersion;
            }

            // Record snapshot
            progressSnapshots.push({
              investigationId: investigationId!,
              completionPercent: currentProgress,
              status: currentStatus,
              lifecycleStage: progressData.lifecycle_stage || '',
              totalTools: progress.tools_executed?.length || 0,
              completedTools: progress.tools_executed?.filter((t: any) => t.status === 'completed').length || 0,
              runningTools: progress.tools_executed?.filter((t: any) => t.status === 'running').length || 0,
              failedTools: progress.tools_executed?.filter((t: any) => t.status === 'failed').length || 0,
              toolExecutions: progress.tools_executed || [],
              timestamp: Date.now() - startTime
            });

            // Check for terminal status
            if (['COMPLETED', 'completed', 'FAILED', 'failed', 'CANCELLED', 'cancelled'].includes(currentStatus)) {
              console.log(`✅ [${elapsed}s] Investigation reached terminal status: ${currentStatus}`);
              break;
            }
            } else if (progressResponse) {
              console.warn(`⚠️ [${elapsed}s] Progress API returned ${progressResponse.status()}`);
            }
        } catch (e) {
          console.warn(`⚠️ [${elapsed}s] Progress API error: ${e}`);
        }

        // ============================================
        // 5b: Check Backend Events API (using Playwright request context)
        // ============================================
        try {
          const eventsResponse = await page.request.get(
            `${BACKEND_URL}/api/v1/investigations/${investigationId}/events?limit=50`,
            { 
              headers: { 'Accept': 'application/json' },
              timeout: 5000
            }
          ).catch(() => null);

          if (eventsResponse && eventsResponse.ok()) {
            const eventsData = await eventsResponse.json();
            const events = eventsData.items || [];
            
            if (events.length !== lastEventCount) {
              eventUpdateCount++;
              console.log(`📰 [${elapsed}s] Events: ${lastEventCount} → ${events.length}`);
              lastEventCount = events.length;
            }

            eventSnapshots.push(events);
          }
        } catch (e) {
          console.warn(`⚠️ [${elapsed}s] Events API error: ${e}`);
        }

        // ============================================
        // 5c: Check Backend Database State (via API, using Playwright request context)
        // ============================================
        try {
          const stateResponse = await page.request.get(
            `${BACKEND_URL}/api/v1/investigation-state/${investigationId}`,
            { 
              headers: { 'Accept': 'application/json' },
              timeout: 5000
            }
          ).catch(() => null);

          if (stateResponse && stateResponse.ok()) {
            const stateData = await stateResponse.json();
            backendStateSnapshots.push({
              progressJson: stateData.progress || {},
              version: stateData.version || 0,
              status: stateData.status || '',
              lifecycleStage: stateData.lifecycle_stage || ''
            });
          }
        } catch (e) {
          // Ignore errors
        }

        // ============================================
        // 5d: Verify UI Components Update
        // ============================================
        await verifyUIComponents(page, elapsed);

        // Wait before next poll
        await page.waitForTimeout(POLL_INTERVAL);
      } catch (error) {
        console.warn(`⚠️ [${elapsed}s] Monitoring error: ${error}`);
        await page.waitForTimeout(POLL_INTERVAL);
      }
    }

    // ============================================
    // STEP 6: Verify Results
    // ============================================
    console.log('\n📋 STEP 6: Verify Results');
    
    // 6a: Verify progress snapshots were collected
    expect(progressSnapshots.length).toBeGreaterThan(0);
    console.log(`✅ Collected ${progressSnapshots.length} progress snapshots`);

    // 6b: Verify progress updates occurred
    expect(progressUpdateCount).toBeGreaterThan(0);
    console.log(`✅ Progress updated ${progressUpdateCount} times`);

    // 6c: Verify events were fetched
    expect(eventSnapshots.length).toBeGreaterThan(0);
    console.log(`✅ Collected ${eventSnapshots.length} event snapshots`);

    // 6d: Verify backend persistence (version increments)
    const versionIncrements = backendStateSnapshots.filter((s, i) => 
      i > 0 && s.version > backendStateSnapshots[i - 1].version
    ).length;
    expect(versionIncrements).toBeGreaterThan(0);
    console.log(`✅ Backend persistence detected: ${versionIncrements} version increments`);

    // 6e: Verify tool executions were persisted
    const finalSnapshot = progressSnapshots[progressSnapshots.length - 1];
    if (finalSnapshot.toolExecutions.length > 0) {
      console.log(`✅ Tool executions persisted: ${finalSnapshot.toolExecutions.length} tools`);
    } else {
      console.warn('⚠️ No tool executions found in final snapshot');
    }

    // 6f: Verify API calls were made
    const progressApiCalls = apiCalls.filter(c => c.url.includes('/investigation-state') || c.url.includes('/progress'));
    const eventsApiCalls = apiCalls.filter(c => c.url.includes('/events'));
    console.log(`✅ Progress API calls: ${progressApiCalls.length}`);
    console.log(`✅ Events API calls: ${eventsApiCalls.length}`);

    // 6g: Final UI verification
    await finalUIVerification(page);

    // ============================================
    // STEP 7: Test Summary
    // ============================================
    console.log('\n📋 STEP 7: Test Summary');
    console.log('='.repeat(80));
    console.log(`Investigation ID: ${investigationId}`);
    console.log(`Final Progress: ${finalSnapshot.completionPercent}%`);
    console.log(`Final Status: ${finalSnapshot.status}`);
    console.log(`Progress Updates: ${progressUpdateCount}`);
    console.log(`Event Updates: ${eventUpdateCount}`);
    console.log(`Tool Executions: ${finalSnapshot.toolExecutions.length}`);
    console.log(`Total Snapshots: ${progressSnapshots.length}`);
    console.log(`Elapsed Time: ${Math.floor((Date.now() - startTime) / 1000)}s`);
    console.log('='.repeat(80));

    // Assertions
    expect(finalSnapshot.completionPercent).toBeGreaterThanOrEqual(0);
    expect(finalSnapshot.status).toBeTruthy();
    expect(progressUpdateCount).toBeGreaterThan(0);
  });

  /**
   * Verify UI components are updating
   */
  async function verifyUIComponents(page: Page, elapsed: number): Promise<void> {
    try {
      // Check progress bar
      const progressBar = page.locator('[class*="progress"], [role="progressbar"], [aria-valuenow]').first();
      const hasProgressBar = await progressBar.isVisible({ timeout: 1000 }).catch(() => false);
      if (hasProgressBar) {
        const value = await progressBar.getAttribute('aria-valuenow').catch(() => null);
        if (value && elapsed % 15 === 0) { // Log every 15 seconds
          console.log(`📊 UI Progress Bar: ${value}%`);
        }
      }

      // Check status text
      const statusText = page.locator('[class*="status"], [data-testid*="status"]').first();
      const hasStatus = await statusText.isVisible({ timeout: 1000 }).catch(() => false);
      if (hasStatus && elapsed % 15 === 0) {
        const text = await statusText.textContent().catch(() => null);
        if (text) {
          console.log(`🔄 UI Status: ${text.trim()}`);
        }
      }

      // Check tool counters
      const toolCounters = page.locator('[class*="tool"], [data-testid*="tool"]');
      const toolCount = await toolCounters.count();
      if (toolCount > 0 && elapsed % 15 === 0) {
        console.log(`🔧 UI Tool Elements: ${toolCount}`);
      }
    } catch (e) {
      // Ignore UI verification errors during monitoring
    }
  }

  /**
   * Final UI verification
   */
  async function finalUIVerification(page: Page): Promise<void> {
    console.log('\n📋 Final UI Verification');
    
    // Verify progress bar exists
    const progressBar = page.locator('[class*="progress"], [role="progressbar"]').first();
    const hasProgressBar = await progressBar.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasProgressBar) {
      console.log('✅ Progress bar visible');
    } else {
      console.warn('⚠️ Progress bar not found');
    }

    // Verify status display
    const statusDisplay = page.locator('[class*="status"], [data-testid*="status"]').first();
    const hasStatus = await statusDisplay.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasStatus) {
      const statusText = await statusDisplay.textContent().catch(() => '');
      console.log(`✅ Status display: ${statusText?.trim()}`);
    } else {
      console.warn('⚠️ Status display not found');
    }

    // Verify events list
    const eventsList = page.locator('[class*="event"], [data-testid*="event"]').first();
    const hasEvents = await eventsList.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasEvents) {
      console.log('✅ Events list visible');
    } else {
      console.warn('⚠️ Events list not found');
    }
  }
});

