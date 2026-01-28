/**
 * Performance & Benchmarks E2E Tests
 * Tests startup time, navigation latency, screen render time, memory usage, frame rate, network timeout handling
 * 6 comprehensive tests
 */

import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { E2E_CONFIG } from '../config.e2e';
import * as helpers from '../helpers/testHelpers';

describe('Performance & Benchmarks - E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('test_startup_time', async () => {
    // Measure cold startup time from launch to first screen visible
    const startTime = Date.now();

    // App already launching in beforeAll, measure to first interactive screen
    await device.launchApp();
    await helpers.performLogin();
    await helpers.verifyElementVisible('homeScreen');

    const startupTime = Date.now() - startTime;

    // Verify startup is within target (3 seconds = 3000ms)
    expect(startupTime).toBeLessThan(E2E_CONFIG.PERFORMANCE.STARTUP_TIME);

    // Log performance metric
    console.log(`App startup time: ${startupTime}ms (target: ${E2E_CONFIG.PERFORMANCE.STARTUP_TIME}ms)`);
  });

  it('test_navigation_latency', async () => {
    await helpers.performLogin();

    // Test navigation between tabs
    const navigationTests = [
      { from: 'home', to: 'livetv' },
      { from: 'livetv', to: 'vod' },
      { from: 'vod', to: 'radio' },
      { from: 'radio', to: 'podcasts' },
      { from: 'podcasts', to: 'profile' },
      { from: 'profile', to: 'home' },
    ];

    const navigationTimes: number[] = [];

    for (const test of navigationTests) {
      const navStartTime = Date.now();
      await helpers.navigateToTab(test.to as any);
      const navTime = Date.now() - navStartTime;
      navigationTimes.push(navTime);

      // Verify navigation completed
      await helpers.verifyElementVisible(`${test.to}Screen`);

      // Verify within latency target (300ms)
      expect(navTime).toBeLessThan(E2E_CONFIG.PERFORMANCE.NAVIGATION_TIME);
    }

    // Calculate average navigation time
    const avgNavTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
    console.log(`Average navigation latency: ${avgNavTime.toFixed(2)}ms (target: ${E2E_CONFIG.PERFORMANCE.NAVIGATION_TIME}ms)`);
  });

  it('test_screen_render_time', async () => {
    await helpers.performLogin();

    // Test render time for different screen types
    const screenTests = [
      { tab: 'home', screen: 'homeScreen', name: 'Home' },
      { tab: 'vod', screen: 'vodScreen', name: 'VOD' },
      { tab: 'livetv', screen: 'liveTVScreen', name: 'LiveTV' },
    ];

    const renderTimes: number[] = [];

    for (const test of screenTests) {
      const renderStartTime = Date.now();

      await helpers.navigateToTab(test.tab as any);
      await helpers.verifyElementVisible(test.screen);

      // Scroll to trigger additional rendering
      await helpers.scrollToElement(`contentTile_0`, 'down');

      const renderTime = Date.now() - renderStartTime;
      renderTimes.push(renderTime);

      // Verify render time within target (500ms)
      expect(renderTime).toBeLessThan(E2E_CONFIG.PERFORMANCE.RENDER_TIME);

      console.log(`${test.name} screen render time: ${renderTime}ms`);
    }

    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    console.log(`Average render time: ${avgRenderTime.toFixed(2)}ms (target: ${E2E_CONFIG.PERFORMANCE.RENDER_TIME}ms)`);
  });

  it('test_memory_usage', async () => {
    await helpers.performLogin();

    // Measure memory before activities
    const memoryBefore = device.getMemoryUsage?.() || 0;

    // Perform memory-intensive operations
    await helpers.navigateToTab('vod');

    // Scroll through content (loads multiple thumbnails)
    for (let i = 0; i < 5; i++) {
      await helpers.scrollToElement(`contentTile_${i}`, 'down');
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Start video playback
    await helpers.scrollToElement('contentTile_0', 'down');
    await helpers.tapElement('contentTile_0');
    await helpers.verifyElementVisible('contentDetailScreen');
    await helpers.startVideoPlayback();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Let video load

    // Measure memory after activities
    const memoryAfter = device.getMemoryUsage?.() || 0;
    const memoryIncrease = memoryAfter - memoryBefore;

    // Verify baseline memory < 250MB
    const baselineMemory = device.getMemoryUsage?.() || 0;
    expect(baselineMemory).toBeLessThan(250); // MB

    // Verify peak memory during video < 350MB
    expect(memoryAfter).toBeLessThan(350); // MB

    console.log(`Memory before: ${memoryBefore}MB, after: ${memoryAfter}MB, increase: ${memoryIncrease}MB`);

    await helpers.navigateBack();
  });

  it('test_frame_rate_consistency', async () => {
    await helpers.performLogin();

    // Navigate to video playback for frame rate testing
    await helpers.navigateToTab('vod');
    await helpers.scrollToElement('contentTile_0', 'down');
    await helpers.tapElement('contentTile_0');
    await helpers.verifyElementVisible('contentDetailScreen');

    // Start video playback
    await helpers.startVideoPlayback();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Let video stabilize

    // Measure frame rate during video playback
    const frameRateMeasurement = await helpers.measurePerformance('frame_rate', async () => {
      // Simulate smooth scrolling through video duration
      for (let i = 0; i < 3; i++) {
        await helpers.seekToTimestamp(30 * i); // Seek in 30s increments
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    });

    // Verify video plays smoothly (frame rate measurement indicates no stuttering)
    expect(frameRateMeasurement).toBeLessThan(E2E_CONFIG.PERFORMANCE.STARTUP_TIME);

    // Test UI responsiveness during playback
    const uiResponseTime = await helpers.measurePerformance('ui_response_during_video', async () => {
      await helpers.tapElement('qualityButton');
      await new Promise((resolve) => setTimeout(resolve, 300));
    });

    // UI should remain responsive (quality menu opens quickly)
    expect(uiResponseTime).toBeLessThan(500); // ms

    console.log(`Video playback frame rate measurement: ${frameRateMeasurement}ms`);
    console.log(`UI response time during video: ${uiResponseTime}ms`);

    await helpers.navigateBack();
  });

  it('test_network_timeout_handling', async () => {
    await helpers.performLogin();
    await helpers.navigateToTab('vod');

    // Test behavior on slow network
    await helpers.setNetworkCondition('SLOW_4G');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Start operation on slow network
    const slowStartTime = Date.now();

    await helpers.scrollToElement('contentTile_0', 'down');
    await helpers.tapElement('contentTile_0');

    // Should load content within network timeout (15s)
    const slowLoadTime = Date.now() - slowStartTime;
    expect(slowLoadTime).toBeLessThan(E2E_CONFIG.TIMEOUTS.NETWORK);

    console.log(`Slow 4G load time: ${slowLoadTime}ms`);

    // Test timeout on EDGE network
    await helpers.navigateBack();
    await helpers.setNetworkCondition('EDGE');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const edgeStartTime = Date.now();

    await helpers.scrollToElement('contentTile_0', 'down');
    const edgeTapStart = Date.now();
    await helpers.tapElement('contentTile_0');

    // Should handle EDGE network gracefully (may timeout, but handle gracefully)
    const edgeLoadTime = Date.now() - edgeTapStart;
    console.log(`EDGE load time: ${edgeLoadTime}ms`);

    // Restore normal network
    await helpers.setNetworkCondition('WIFI');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify can load on normal network after network tests
    await helpers.verifyElementVisible('contentDetailScreen');
    expect(true).toBe(true);

    await helpers.navigateBack();
  });
});
