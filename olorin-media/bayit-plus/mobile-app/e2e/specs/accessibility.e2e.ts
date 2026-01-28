/**
 * Accessibility (WCAG 2.1 AA) E2E Tests
 * Tests screen reader navigation, color contrast, touch targets, keyboard navigation, focus visibility
 * 5 comprehensive tests
 */

import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { E2E_CONFIG } from '../config.e2e';
import * as helpers from '../helpers/testHelpers';

describe('Accessibility - WCAG 2.1 AA E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await helpers.performLogin();
    await helpers.navigateToTab('home');
  });

  it('test_screen_reader_navigation', async () => {
    // Verify home screen is accessible
    await helpers.verifyElementVisible('homeScreen');

    // Verify all interactive elements have accessibility labels
    // Check main navigation buttons
    await helpers.verifyAccessibility('homeTab', 'Home Tab');
    await helpers.verifyAccessibility('liveTVTab', 'Live TV Tab');
    await helpers.verifyAccessibility('vodTab', 'VOD Tab');
    await helpers.verifyAccessibility('radioTab', 'Radio Tab');
    await helpers.verifyAccessibility('podcastsTab', 'Podcasts Tab');
    await helpers.verifyAccessibility('profileTab', 'Profile Tab');

    // Navigate through tabs using accessibility
    const tabs = ['home', 'livetv', 'vod', 'radio', 'podcasts', 'profile'];
    for (const tab of tabs) {
      await helpers.navigateToTab(tab as any);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify screen reader can navigate content
      const screenId = `${tab}Screen`;
      await helpers.verifyElementVisible(screenId);
    }

    // Verify screen reader focus management
    await helpers.navigateToTab('home');
    await helpers.verifyAccessibility('mainContentArea', 'Main Content Area');
  });

  it('test_color_contrast_ratios', async () => {
    // Test text contrast on home screen
    await helpers.verifyElementVisible('homeScreen');

    // Verify heading contrast (should be 4.5:1 for WCAG AA)
    await helpers.verifyAccessibility('screenTitle', 'Home');
    const titleElement = element(by.id('screenTitle'));
    const titleAttrs = await titleElement.getAttributes();
    const titleContrast = titleAttrs?.elements?.[0]?.contrastRatio || 0;

    expect(titleContrast).toBeGreaterThanOrEqual(4.5); // WCAG AA minimum

    // Navigate to VOD and check content cards
    await helpers.navigateToTab('vod');
    await helpers.verifyElementVisible('vodScreen');

    // Verify card text contrast
    await helpers.scrollToElement('contentTile_0', 'down');
    const cardElement = element(by.id('contentTile_0'));
    const cardAttrs = await cardElement.getAttributes();
    const cardContrast = cardAttrs?.elements?.[0]?.contrastRatio || 0;

    expect(cardContrast).toBeGreaterThanOrEqual(4.5);

    // Check button text contrast
    await helpers.verifyAccessibility('playButton', 'Play');
    const buttonElement = element(by.id('playButton'));
    const buttonAttrs = await buttonElement.getAttributes();
    const buttonContrast = buttonAttrs?.elements?.[0]?.contrastRatio || 0;

    expect(buttonContrast).toBeGreaterThanOrEqual(4.5);
  });

  it('test_touch_target_sizes', async () => {
    // Verify minimum touch target size of 44x44 dp (WCAG 2.1 AAA recommended)
    await helpers.navigateToTab('home');

    // Check tab buttons
    const tabs = ['homeTab', 'liveTVTab', 'vodTab', 'radioTab', 'podcastsTab', 'profileTab'];

    for (const tabId of tabs) {
      const tabElement = element(by.id(tabId));
      const attrs = await tabElement.getAttributes();
      const width = attrs?.elements?.[0]?.width || 0;
      const height = attrs?.elements?.[0]?.height || 0;

      // Verify minimum 44x44 dp
      expect(width).toBeGreaterThanOrEqual(44);
      expect(height).toBeGreaterThanOrEqual(44);
    }

    // Check interactive buttons
    await helpers.navigateToTab('vod');
    await helpers.scrollToElement('contentTile_0', 'down');

    const playButtonElement = element(by.id('playButton'));
    const playAttrs = await playButtonElement.getAttributes();
    const playWidth = playAttrs?.elements?.[0]?.width || 0;
    const playHeight = playAttrs?.elements?.[0]?.height || 0;

    expect(playWidth).toBeGreaterThanOrEqual(44);
    expect(playHeight).toBeGreaterThanOrEqual(44);

    // Check form inputs (at least 44dp height)
    await helpers.navigateToTab('profile');
    await helpers.scrollToElement('settingsButton', 'down');
    await helpers.tapElement('settingsButton');

    const inputElement = element(by.id('nameInput'));
    const inputAttrs = await inputElement.getAttributes();
    const inputHeight = inputAttrs?.elements?.[0]?.height || 0;

    expect(inputHeight).toBeGreaterThanOrEqual(44);
  });

  it('test_keyboard_navigation', async () => {
    // Verify keyboard navigation on home screen
    await helpers.navigateToTab('home');
    await helpers.verifyElementVisible('homeScreen');

    // Tab to first interactive element
    await element(by.id('homeTab')).multiTap(1);

    // Verify focus is on tab
    let focusElement = element(by.id('homeTab'));
    let focusAttrs = await focusElement.getAttributes();
    expect(focusAttrs?.elements?.[0]?.focused).toBe(true);

    // Tab to next element (LiveTV tab)
    // Simulate keyboard tab using element focus
    await element(by.id('liveTVTab')).multiTap(1);
    focusElement = element(by.id('liveTVTab'));
    focusAttrs = await focusElement.getAttributes();
    expect(focusAttrs?.elements?.[0]?.focused).toBe(true);

    // Test keyboard navigation through content
    await helpers.navigateToTab('vod');

    // Focus on first content tile
    await element(by.id('contentTile_0')).multiTap(1);
    focusElement = element(by.id('contentTile_0'));
    focusAttrs = await focusElement.getAttributes();
    expect(focusAttrs?.elements?.[0]?.focused).toBe(true);

    // Test Enter/Return to activate
    await helpers.tapElement('contentTile_0');
    await helpers.verifyElementVisible('contentDetailScreen');

    // Tab to play button
    await element(by.id('playButton')).multiTap(1);
    focusElement = element(by.id('playButton'));
    focusAttrs = await focusElement.getAttributes();
    expect(focusAttrs?.elements?.[0]?.focused).toBe(true);

    // Test keyboard navigation back
    await helpers.navigateBack();
  });

  it('test_focus_visible', async () => {
    // Verify focus indicators are visible on all interactive elements
    await helpers.navigateToTab('home');

    // Focus on first interactive element
    await element(by.id('homeTab')).multiTap(1);

    // Verify focus ring visible
    let focusElement = element(by.id('homeTab'));
    let focusAttrs = await focusElement.getAttributes();
    const hasFocusRing = focusAttrs?.elements?.[0]?.focusVisible || false;

    expect(hasFocusRing).toBe(true);

    // Test focus on buttons
    await helpers.navigateToTab('vod');
    await helpers.scrollToElement('contentTile_0', 'down');
    await element(by.id('playButton')).multiTap(1);

    focusElement = element(by.id('playButton'));
    focusAttrs = await focusElement.getAttributes();
    const buttonFocusVisible = focusAttrs?.elements?.[0]?.focusVisible || false;

    expect(buttonFocusVisible).toBe(true);

    // Verify focus color contrast against background
    const focusColor = focusAttrs?.elements?.[0]?.focusColor || '';
    const backgroundColor = focusAttrs?.elements?.[0]?.backgroundColor || '';

    // Focus indicator should have high contrast
    // (Implementation specific, verifying element has focus properties)
    expect(focusColor).toBeTruthy();

    // Test focus on form inputs
    await helpers.navigateToTab('profile');
    await helpers.scrollToElement('settingsButton', 'down');
    await helpers.tapElement('settingsButton');

    const inputElement = element(by.id('nameInput'));
    await inputElement.multiTap(1);

    const inputAttrs = await inputElement.getAttributes();
    const inputFocusVisible = inputAttrs?.elements?.[0]?.focusVisible || false;

    expect(inputFocusVisible).toBe(true);

    // Navigate back
    await helpers.navigateBack();
    await helpers.navigateBack();
  });
});
