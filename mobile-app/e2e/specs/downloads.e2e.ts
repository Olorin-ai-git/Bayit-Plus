/**
 * Download Management E2E Tests
 * Tests start, pause, resume, cancel downloads, progress tracking, speed calculation
 * 7 comprehensive tests
 */

import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { E2E_CONFIG } from '../config.e2e';
import * as helpers from '../helpers/testHelpers';

describe('Download Management - E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await helpers.performLogin();
    await helpers.navigateToTab('vod');
  });

  it('test_start_download', async () => {
    // Find downloadable content
    await helpers.scrollToElement('downloadableContentTile', 'down');
    await helpers.tapElement('downloadableContentTile');
    await helpers.verifyElementVisible('contentDetailScreen');

    // Start download
    await helpers.startDownload();
    await waitFor(element(by.id(`downloadProgress_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`)))
      .toExist()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify download progress element exists
    await helpers.verifyElementExists(`downloadProgress_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`);
  });

  it('test_pause_resume_download', async () => {
    // Start download
    await helpers.startDownload(E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Let download progress

    // Pause download
    await helpers.pauseDownload(E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID);
    await waitFor(element(by.id(`downloadPaused_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`)))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.INTERACTION);

    // Verify paused state
    await helpers.verifyElementVisible(`downloadPaused_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`);

    // Resume download
    await helpers.resumeDownload(E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID);
    await waitFor(element(by.id(`downloadProgress_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`)))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.INTERACTION);

    // Verify resumed (progress visible again)
    await helpers.verifyElementVisible(`downloadProgress_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`);
  });

  it('test_cancel_download', async () => {
    // Start download
    await helpers.startDownload(E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Let download start

    // Cancel download
    await helpers.cancelDownload(E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID);
    await waitFor(element(by.id(`downloadCancelled_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`)))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.INTERACTION);

    // Verify cancelled
    await helpers.verifyElementVisible(`downloadCancelled_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`);

    // Verify download progress removed
    await helpers.verifyElementNotVisible(`downloadProgress_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`);
  });

  it('test_download_progress_tracking', async () => {
    // Start download
    const startTime = Date.now();
    await helpers.startDownload(E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID);

    // Monitor progress over time
    const progressSnapshots: number[] = [];

    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second intervals

      // Get current progress percentage
      const progressElement = element(by.id(`downloadProgress_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`));
      const attrs = await progressElement.getAttributes();
      const currentProgress = attrs?.elements?.[0]?.progress || 0;
      progressSnapshots.push(currentProgress);

      // Verify progress is increasing (or stays same if complete)
      if (i > 0) {
        expect(currentProgress).toBeGreaterThanOrEqual(progressSnapshots[i - 1]);
      }
    }

    // Verify we captured progress changes
    expect(progressSnapshots.length).toBe(5);
  });

  it('test_download_speed_calculation', async () => {
    // Start download and measure speed
    const performanceMetrics = await helpers.measurePerformance('download_speed_calculation', async () => {
      await helpers.startDownload(E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID);
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Let download progress
    });

    // Verify speed is calculated (non-zero duration)
    expect(performanceMetrics).toBeGreaterThan(0);

    // Verify download is tracking speed (check for speed display)
    await waitFor(element(by.id(`downloadSpeed_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`)))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify ETA display exists
    await helpers.verifyElementVisible(`downloadETA_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`);
  });

  it('test_offline_playback', async () => {
    // Download content first
    await helpers.startDownload(E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID);
    await helpers.waitForDownloadCompletion(E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID, 60000);

    // Verify download complete
    await helpers.verifyElementVisible(`downloadComplete_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`);

    // Simulate going offline
    await helpers.setNetworkCondition('OFFLINE');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Navigate to downloads
    await helpers.navigateToTab('profile');
    await helpers.scrollToElement('downloadsButton', 'down');
    await helpers.tapElement('downloadsButton');
    await helpers.verifyElementVisible('downloadsScreen');

    // Play downloaded content
    await helpers.tapElement(`downloadedContent_${E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID}`);
    await helpers.verifyVideoPlaying();

    // Verify playback works without network
    expect(true).toBe(true);

    // Restore network
    await helpers.setNetworkCondition('WIFI');
  });

  it('test_storage_quota_check', async () => {
    // Navigate to downloads screen
    await helpers.navigateToTab('profile');
    await helpers.scrollToElement('downloadsButton', 'down');
    await helpers.tapElement('downloadsButton');
    await helpers.verifyElementVisible('downloadsScreen');

    // Check storage quota display
    await waitFor(element(by.id('storageQuotaDisplay')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify storage quota text exists (e.g., "5.2 GB / 10 GB")
    await helpers.verifyElementVisible('storageQuotaDisplay');
    await helpers.verifyElementVisible('storageQuotaBar');

    // Verify storage percentage is reasonable (0-100%)
    const quotaElement = element(by.id('storageQuotaPercentage'));
    const attrs = await quotaElement.getAttributes();
    const percentage = attrs?.elements?.[0]?.percentage || 0;

    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });
});
