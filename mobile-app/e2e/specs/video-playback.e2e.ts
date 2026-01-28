/**
 * Video Playback E2E Tests
 * Tests HLS/DASH streaming, quality switching, seek, subtitles, fullscreen
 * 10 comprehensive tests
 */

import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { E2E_CONFIG } from '../config.e2e';
import * as helpers from '../helpers/testHelpers';

describe('Video Playback - E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await helpers.performLogin();
    await helpers.navigateToTab('vod');
  });

  it('test_play_hls_stream', async () => {
    const startTime = Date.now();
    await helpers.startVideoPlayback();
    const playTime = Date.now() - startTime;

    await helpers.verifyVideoPlaying();
    expect(playTime).toBeLessThan(E2E_CONFIG.PERFORMANCE.NETWORK_LATENCY || 5000);
  });

  it('test_play_dash_stream', async () => {
    // Find and play DASH content
    await helpers.scrollToElement('dashContentTile', 'down');
    await helpers.tapElement('dashContentTile');
    await helpers.verifyVideoPlaying();
  });

  it('test_quality_switching', async () => {
    await helpers.startVideoPlayback();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Let video load

    // Switch quality
    await helpers.switchQuality('720p');
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for quality switch

    // Verify video still playing
    await helpers.verifyVideoPlaying();

    // Switch to lower quality
    await helpers.switchQuality('480p');
    await helpers.verifyVideoPlaying();

    // Switch to high quality
    await helpers.switchQuality('1080p');
    await helpers.verifyVideoPlaying();
  });

  it('test_seek_functionality', async () => {
    await helpers.startVideoPlayback();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Let video play

    // Seek to 30 seconds
    await helpers.seekToTimestamp(30);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify video still playing at new position
    await helpers.verifyVideoPlaying();

    // Seek to end
    await helpers.seekToTimestamp(3600); // 1 hour
    await helpers.verifyVideoPlaying();
  });

  it('test_fullscreen_mode', async () => {
    await helpers.startVideoPlayback();
    await helpers.tapElement('fullscreenButton');
    await waitFor(element(by.id('fullscreenPlayer')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Exit fullscreen
    await helpers.tapElement('exitFullscreenButton');
    await helpers.verifyElementNotVisible('fullscreenPlayer');
  });

  it('test_subtitles_display', async () => {
    await helpers.startVideoPlayback();
    await helpers.toggleSubtitles(true);
    await waitFor(element(by.id('subtitleView')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Verify subtitles are shown
    await helpers.verifyElementVisible('subtitleView');

    // Disable subtitles
    await helpers.toggleSubtitles(false);
    await helpers.verifyElementNotVisible('subtitleView');
  });

  it('test_resume_playback', async () => {
    // Play video to a point
    await helpers.startVideoPlayback();
    await helpers.seekToTimestamp(60); // Seek to 1 minute
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Close video player
    await helpers.navigateBack();
    await helpers.verifyElementVisible('vodScreen');

    // Reopen same video
    await helpers.startVideoPlayback();
    // Should resume from saved position (or near it)
    await helpers.verifyVideoPlaying();
  });

  it('test_network_quality_adaptation', async () => {
    await helpers.startVideoPlayback();

    // Simulate network change to slow 4G
    await helpers.setNetworkCondition('SLOW_4G');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Video should still be playing (potentially at lower quality)
    await helpers.verifyVideoPlaying();

    // Restore network
    await helpers.setNetworkCondition('WIFI');
  });

  it('test_audio_track_switching', async () => {
    await helpers.startVideoPlayback();
    await helpers.tapElement('audioButton');
    await waitFor(element(by.id('audioMenu')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Select different audio track
    await helpers.tapElement('audioTrack_1');
    await helpers.verifyVideoPlaying();
  });

  it('test_playback_controls_responsive', async () => {
    await helpers.startVideoPlayback();

    // Test pause
    await helpers.tapElement('pauseButton');
    await waitFor(element(by.id('pauseIndicator')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Test play
    await helpers.tapElement('playButton');
    await helpers.verifyVideoPlaying();

    // Test fast forward
    await helpers.tapElement('fastForwardButton');
    await helpers.verifyVideoPlaying();

    // Test rewind
    await helpers.tapElement('rewindButton');
    await helpers.verifyVideoPlaying();
  });
});
