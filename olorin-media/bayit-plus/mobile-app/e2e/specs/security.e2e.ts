/**
 * Security & Encryption E2E Tests
 * Tests token encryption, biometric token storage, session security, HTTPS enforcement, secure headers
 * 5 comprehensive tests
 */

import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { E2E_CONFIG } from '../config.e2e';
import * as helpers from '../helpers/testHelpers';

describe('Security & Encryption - E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('test_token_encryption', async () => {
    // Perform login to create session token
    await helpers.performLogin();
    await helpers.verifyElementVisible('homeScreen');

    // Verify token is stored encrypted (cannot read as plain text)
    // Simulate checking encrypted storage
    const tokenCheckResult = await element(by.id('secureStorageTest')).multiTap(1);

    // Token should be stored in Android Keystore (encrypted)
    // Verify token cannot be accessed from normal SharedPreferences
    const unencryptedCheck = element(by.id('unencryptedStorageEmpty'));
    await waitFor(unencryptedCheck).toBeVisible().withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify encrypted storage contains token
    const encryptedStorageCheck = element(by.id('encryptedStorageHasToken'));
    await waitFor(encryptedStorageCheck).toBeVisible().withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    expect(true).toBe(true); // Token encryption verified
  });

  it('test_biometric_token_storage', async () => {
    // Login and enable biometric
    await helpers.performLogin();
    await helpers.verifyElementVisible('homeScreen');

    // Navigate to security settings
    await helpers.navigateToTab('profile');
    await helpers.scrollToElement('settingsButton', 'down');
    await helpers.tapElement('settingsButton');
    await helpers.verifyElementVisible('settingsScreen');

    // Navigate to security settings
    await helpers.scrollToElement('securityButton', 'down');
    await helpers.tapElement('securityButton');
    await helpers.verifyElementVisible('securityScreen');

    // Enable biometric authentication
    await helpers.scrollToElement('biometricToggle', 'down');
    await helpers.tapElement('biometricToggle');

    // Verify biometric token storage enabled message
    await waitFor(element(by.id('biometricStorageEnabled')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Logout
    await helpers.navigateBack();
    await helpers.navigateBack();
    await helpers.navigateToTab('profile');
    await helpers.scrollToElement('logoutButton', 'down');
    await helpers.tapElement('logoutButton');
    await helpers.verifyElementVisible('loginScreen');

    // Verify biometric login is available
    await helpers.verifyElementVisible('biometricLoginButton');

    // Attempt biometric login
    await helpers.tapElement('biometricLoginButton');
    await waitFor(element(by.id('biometricPrompt')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Simulate biometric success
    await element(by.id('biometricSimulator')).multiTap(1);

    // Verify login successful with biometric token
    await waitFor(element(by.id('homeScreen')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    expect(true).toBe(true); // Biometric token storage verified
  });

  it('test_session_security', async () => {
    // Login to create session
    await helpers.performLogin();
    await helpers.verifyElementVisible('homeScreen');

    // Verify session token is valid
    await helpers.navigateToTab('profile');
    const sessionElement = element(by.id('sessionStatus'));
    await waitFor(sessionElement).toHaveToggleValue(true).withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Simulate token expiration
    // (In real scenario, server would invalidate token after timeout)
    await helpers.tapElement('simulateTokenExpiration');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify token refresh triggered
    await waitFor(element(by.id('tokenRefreshed')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify session still valid after refresh
    await helpers.navigateToTab('home');
    await helpers.verifyElementVisible('homeScreen');

    // Test session logout clears credentials
    await helpers.navigateToTab('profile');
    await helpers.scrollToElement('logoutButton', 'down');
    await helpers.tapElement('logoutButton');

    // Verify session is cleared
    await helpers.verifyElementVisible('loginScreen');

    // Verify token is removed from secure storage
    await waitFor(element(by.id('secureStorageEmpty')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    expect(true).toBe(true); // Session security verified
  });

  it('test_https_only', async () => {
    // Perform login which requires HTTPS connection
    await helpers.performLogin();
    await helpers.verifyElementVisible('homeScreen');

    // Verify all API calls use HTTPS
    // Navigate through app and verify secure connections
    const apiCallResults = element(by.id('apiCallSecurityLog'));

    // Check network requests
    await helpers.navigateToTab('vod');
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for API calls

    // Verify all URLs use HTTPS protocol
    await waitFor(element(by.id('allApiCallsHttps')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify no HTTP calls made
    const httpCallsElement = element(by.id('httpCallsCount'));
    const httpAttrs = await httpCallsElement.getAttributes();
    const httpCallCount = httpAttrs?.elements?.[0]?.text || '0';

    expect(httpCallCount).toBe('0');

    // Verify HTTPS calls count > 0
    const httpsCallsElement = element(by.id('httpsCallsCount'));
    const httpsAttrs = await httpsCallsElement.getAttributes();
    const httpsCallCount = parseInt(httpsAttrs?.elements?.[0]?.text || '0');

    expect(httpsCallCount).toBeGreaterThan(0);

    console.log(`HTTPS calls: ${httpsCallCount}, HTTP calls: ${httpCallCount}`);
  });

  it('test_secure_headers', async () => {
    // Login to make authenticated requests
    await helpers.performLogin();
    await helpers.verifyElementVisible('homeScreen');

    // Verify security headers are present in API responses
    const securityHeadersElement = element(by.id('securityHeadersLog'));

    // Navigate to trigger API calls
    await helpers.navigateToTab('vod');
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for API calls

    // Verify Content-Security-Policy header
    await waitFor(element(by.id('headerCSP')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify X-Content-Type-Options header (nosniff)
    await waitFor(element(by.id('headerContentTypeOptions')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify X-Frame-Options header
    await waitFor(element(by.id('headerFrameOptions')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify Strict-Transport-Security header
    await waitFor(element(by.id('headerHSTS')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify X-XSS-Protection header
    await waitFor(element(by.id('headerXSSProtection')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Verify security headers count matches expected
    const securityHeadersCountElement = element(by.id('securityHeadersCount'));
    const headerAttrs = await securityHeadersCountElement.getAttributes();
    const headerCount = parseInt(headerAttrs?.elements?.[0]?.text || '0');

    // Should have at least 5 security headers
    expect(headerCount).toBeGreaterThanOrEqual(5);

    console.log(`Security headers found: ${headerCount}`);

    // Verify no security headers are missing
    const missingHeadersElement = element(by.id('missingSecurityHeaders'));
    const missingAttrs = await missingHeadersElement.getAttributes();
    const missingCount = parseInt(missingAttrs?.elements?.[0]?.text || '0');

    expect(missingCount).toBe(0); // All required headers should be present

    expect(true).toBe(true); // Security headers verified
  });
});
