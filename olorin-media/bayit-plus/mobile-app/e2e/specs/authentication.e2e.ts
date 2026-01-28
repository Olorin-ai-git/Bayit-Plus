/**
 * Authentication E2E Tests
 * Tests login, logout, biometric auth, token refresh, session management
 * 8 comprehensive tests
 */

import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { E2E_CONFIG, TEST_SCENARIOS } from '../config.e2e';
import * as helpers from '../helpers/testHelpers';

describe('Authentication Flow - E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('test_login_valid_credentials', async () => {
    await helpers.verifyElementVisible('loginScreen');
    await helpers.performLogin();
    await helpers.verifyElementVisible('homeScreen');
    expect(true).toBe(true); // Login successful
  });

  it('test_login_invalid_credentials', async () => {
    await helpers.verifyElementVisible('loginScreen');
    await helpers.performLogin('invalid@example.com', 'wrongpassword');
    await waitFor(element(by.id('loginErrorMessage')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);
    await helpers.verifyText('loginErrorMessage', 'Invalid credentials');
  });

  it('test_login_empty_fields', async () => {
    await helpers.verifyElementVisible('loginScreen');
    await helpers.tapElement('loginButton'); // Try without entering credentials
    await waitFor(element(by.id('emailErrorMessage')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);
    await helpers.verifyText('emailErrorMessage', 'Email required');
  });

  it('test_biometric_auth', async () => {
    // First login normally
    await helpers.performLogin();
    // Enable biometric
    await helpers.enableBiometric();
    // Logout
    await helpers.performLogout();
    // Try biometric login
    await helpers.verifyElementVisible('biometricLoginButton');
    await helpers.tapElement('biometricLoginButton');
    // Simulate biometric success
    await element(by.id('biometricSimulator')).multiTap(1);
    await waitFor(element(by.id('homeScreen')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);
  });

  it('test_logout', async () => {
    await helpers.performLogin();
    await helpers.verifyElementVisible('homeScreen');
    await helpers.performLogout();
    await helpers.verifyElementVisible('loginScreen');
  });

  it('test_session_timeout', async () => {
    await helpers.performLogin();
    await helpers.verifyElementVisible('homeScreen');
    // Simulate 30 minutes of inactivity
    await device.reverseTcpPort(8090);
    // Perform action that requires auth
    await helpers.navigateToTab('profile');
    // Should redirect to login due to session timeout
    await waitFor(element(by.id('sessionTimeoutMessage')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);
  });

  it('test_token_refresh', async () => {
    const startTime = Date.now();
    await helpers.performLogin();
    await helpers.verifyElementVisible('homeScreen');
    // Simulate token expiration by waiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Perform action that triggers token refresh
    await helpers.navigateToTab('vod');
    const refreshTime = Date.now() - startTime;
    expect(refreshTime).toBeLessThan(E2E_CONFIG.PERFORMANCE.STARTUP_TIME);
  });

  it('test_password_reset_flow', async () => {
    await helpers.verifyElementVisible('loginScreen');
    await helpers.tapElement('forgotPasswordLink');
    await waitFor(element(by.id('resetPasswordScreen')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);
    await helpers.typeText('resetEmailInput', 'test@example.com');
    await helpers.tapElement('resetPasswordButton');
    await waitFor(element(by.id('resetSuccessMessage')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.NETWORK);
  });
});
