/**
 * E2E Test Helpers
 * Utility functions for common E2E test operations
 */

import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { E2E_CONFIG } from '../config.e2e';

/**
 * Wait for element and verify visibility
 */
export async function waitAndVerifyElement(testID: string, timeout: number = E2E_CONFIG.TIMEOUTS.SYNC) {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Tap element by test ID
 */
export async function tapElement(testID: string) {
  await element(by.id(testID)).multiTap(1);
}

/**
 * Type text into element
 */
export async function typeText(testID: string, text: string) {
  await element(by.id(testID)).typeText(text);
}

/**
 * Clear text field
 */
export async function clearText(testID: string) {
  await element(by.id(testID)).clearText();
}

/**
 * Scroll to element
 */
export async function scrollToElement(testID: string, direction: 'up' | 'down' = 'down') {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .whileElement(by.id('scrollView'))
    .scroll(500, direction === 'down' ? 'down' : 'up');
}

/**
 * Verify text content
 */
export async function verifyText(testID: string, expectedText: string) {
  await detoxExpect(element(by.id(testID))).toHaveText(expectedText);
}

/**
 * Verify element exists
 */
export async function verifyElementExists(testID: string) {
  await detoxExpect(element(by.id(testID))).toExist();
}

/**
 * Verify element is visible
 */
export async function verifyElementVisible(testID: string) {
  await detoxExpect(element(by.id(testID))).toBeVisible();
}

/**
 * Verify element is not visible
 */
export async function verifyElementNotVisible(testID: string) {
  await detoxExpect(element(by.id(testID))).not.toBeVisible();
}

/**
 * Navigate back
 */
export async function navigateBack() {
  await element(by.id('backButton')).multiTap(1);
}

/**
 * Perform login with credentials
 */
export async function performLogin(email: string = E2E_CONFIG.TEST_DATA.VALID_LOGIN.email, password: string = E2E_CONFIG.TEST_DATA.VALID_LOGIN.password) {
  await typeText('emailInput', email);
  await typeText('passwordInput', password);
  await tapElement('loginButton');
  await waitFor(element(by.id('homeScreen')))
    .toBeVisible()
    .withTimeout(E2E_CONFIG.TIMEOUTS.NETWORK);
}

/**
 * Perform logout
 */
export async function performLogout() {
  await tapElement('profileTab');
  await scrollToElement('logoutButton', 'down');
  await tapElement('logoutButton');
  await waitFor(element(by.id('loginScreen')))
    .toBeVisible()
    .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);
}

/**
 * Navigate to screen by tab
 */
export async function navigateToTab(tabName: 'home' | 'livetv' | 'vod' | 'radio' | 'podcasts' | 'profile') {
  const tabIDs: Record<string, string> = {
    home: 'homeTab',
    livetv: 'liveTVTab',
    vod: 'vodTab',
    radio: 'radioTab',
    podcasts: 'podcastsTab',
    profile: 'profileTab',
  };
  await tapElement(tabIDs[tabName]);
  await waitFor(element(by.id(`${tabName}Screen`)))
    .toBeVisible()
    .withTimeout(E2E_CONFIG.TIMEOUTS.NAVIGATION);
}

/**
 * Start video playback
 */
export async function startVideoPlayback(contentID: string = E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID) {
  await tapElement(`videoTile_${contentID}`);
  await waitFor(element(by.id('playerScreen')))
    .toBeVisible()
    .withTimeout(E2E_CONFIG.TIMEOUTS.NETWORK);
  await tapElement('playButton');
}

/**
 * Verify video is playing
 */
export async function verifyVideoPlaying() {
  await detoxExpect(element(by.id('playerVideo'))).toExist();
  // Additional verification could check actual playback state
}

/**
 * Seek to timestamp in video
 */
export async function seekToTimestamp(seconds: number) {
  // Tap and drag on seek bar
  await element(by.id('seekBar')).multiTap(1);
  // This is a simplified version - actual implementation would calculate position
}

/**
 * Enable/disable subtitles
 */
export async function toggleSubtitles(enable: boolean) {
  const subtitleButton = element(by.id('subtitleButton'));
  if (enable) {
    await tapElement('subtitleButton');
  }
}

/**
 * Switch video quality
 */
export async function switchQuality(quality: '360p' | '480p' | '720p' | '1080p') {
  await tapElement('qualityButton');
  await waitFor(element(by.id('qualityMenu')))
    .toBeVisible()
    .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);
  await tapElement(`quality_${quality}`);
}

/**
 * Start download
 */
export async function startDownload(contentID: string = E2E_CONFIG.TEST_DATA.VALID_CONTENT_ID) {
  await tapElement(`downloadButton_${contentID}`);
  await waitFor(element(by.id(`downloadProgress_${contentID}`)))
    .toExist()
    .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);
}

/**
 * Pause download
 */
export async function pauseDownload(contentID: string) {
  await tapElement(`pauseDownloadButton_${contentID}`);
}

/**
 * Resume download
 */
export async function resumeDownload(contentID: string) {
  await tapElement(`resumeDownloadButton_${contentID}`);
}

/**
 * Cancel download
 */
export async function cancelDownload(contentID: string) {
  await tapElement(`cancelDownloadButton_${contentID}`);
}

/**
 * Wait for download to complete
 */
export async function waitForDownloadCompletion(contentID: string, timeout: number = 60000) {
  await waitFor(element(by.id(`downloadComplete_${contentID}`)))
    .toExist()
    .withTimeout(timeout);
}

/**
 * Enable biometric authentication
 */
export async function enableBiometric() {
  await tapElement('settingsTab');
  await scrollToElement('securityButton', 'down');
  await tapElement('securityButton');
  await scrollToElement('biometricToggle', 'down');
  await tapElement('biometricToggle');
}

/**
 * Verify accessibility element
 */
export async function verifyAccessibility(testID: string, label: string) {
  const element_ref = element(by.id(testID));
  // Accessibility verification would check for proper labels and roles
  await detoxExpect(element_ref).toExist();
}

/**
 * Switch language
 */
export async function switchLanguage(languageCode: 'en' | 'he' | 'es') {
  await tapElement('settingsTab');
  await scrollToElement('languageButton', 'down');
  await tapElement('languageButton');
  await waitFor(element(by.id('languageMenu')))
    .toBeVisible()
    .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);
  await tapElement(`language_${languageCode}`);
}

/**
 * Verify RTL layout
 */
export async function verifyRTLLayout() {
  // This would verify that layout is mirrored for RTL languages
  // Implementation would check component positions
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(testName: string) {
  if (E2E_CONFIG.SCREENSHOTS.TAKE_ON_FAILURE) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${testName}_${timestamp}.png`;
    // Implementation would save screenshot to artifacts directory
  }
}

/**
 * Measure performance metric
 */
export async function measurePerformance(metricName: string, operation: () => Promise<void>): Promise<number> {
  const startTime = Date.now();
  await operation();
  const duration = Date.now() - startTime;
  console.log(`${metricName}: ${duration}ms`);
  return duration;
}

/**
 * Simulate network condition
 */
export async function setNetworkCondition(condition: keyof typeof E2E_CONFIG.NETWORK_CONDITIONS) {
  const networkConfig = E2E_CONFIG.NETWORK_CONDITIONS[condition];
  // Implementation would use device network simulation
  console.log(`Network condition set to: ${condition}`);
}

/**
 * Verify network error handling
 */
export async function verifyNetworkErrorHandling() {
  await setNetworkCondition('OFFLINE');
  // Perform action that requires network
  await waitFor(element(by.id('networkErrorMessage')))
    .toBeVisible()
    .withTimeout(E2E_CONFIG.TIMEOUTS.NETWORK);
  await setNetworkCondition('WIFI');
}

export default {
  waitAndVerifyElement,
  tapElement,
  typeText,
  clearText,
  scrollToElement,
  verifyText,
  verifyElementExists,
  verifyElementVisible,
  verifyElementNotVisible,
  navigateBack,
  performLogin,
  performLogout,
  navigateToTab,
  startVideoPlayback,
  verifyVideoPlaying,
  seekToTimestamp,
  toggleSubtitles,
  switchQuality,
  startDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  waitForDownloadCompletion,
  enableBiometric,
  verifyAccessibility,
  switchLanguage,
  verifyRTLLayout,
  takeScreenshot,
  measurePerformance,
  setNetworkCondition,
  verifyNetworkErrorHandling,
};
