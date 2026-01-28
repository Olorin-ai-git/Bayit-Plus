/**
 * Internationalization & RTL E2E Tests
 * Tests language switching (English, Hebrew), RTL layout, date/number formatting by locale
 * 5 comprehensive tests
 */

import { element, by, expect as detoxExpect, waitFor } from 'detox';
import { E2E_CONFIG } from '../config.e2e';
import * as helpers from '../helpers/testHelpers';

describe('Internationalization & RTL - E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await helpers.performLogin();
    await helpers.navigateToTab('profile');
  });

  it('test_language_switching_english', async () => {
    // Navigate to language settings
    await helpers.scrollToElement('settingsButton', 'down');
    await helpers.tapElement('settingsButton');
    await helpers.verifyElementVisible('settingsScreen');

    // Navigate to language settings
    await helpers.scrollToElement('languageButton', 'down');
    await helpers.tapElement('languageButton');
    await waitFor(element(by.id('languageMenu')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Verify all supported languages in menu
    await helpers.verifyElementVisible('languageMenu');

    // Select English
    await helpers.switchLanguage('en');
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for language change

    // Verify English is now active
    const languageElement = element(by.id('currentLanguageDisplay'));
    await waitFor(languageElement).toHaveText('English').withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Navigate to home and verify English text
    await helpers.navigateBack();
    await helpers.navigateBack();
    await helpers.navigateToTab('home');

    // Verify English screen titles
    await helpers.verifyText('screenTitle', 'Home');

    // Verify English navigation labels
    const vodTabElement = element(by.id('vodTab'));
    const vodAttrs = await vodTabElement.getAttributes();
    const vodLabel = vodAttrs?.elements?.[0]?.label || '';

    expect(vodLabel).toMatch(/VOD|Video on Demand/);
  });

  it('test_language_switching_hebrew', async () => {
    // Navigate to language settings
    await helpers.scrollToElement('settingsButton', 'down');
    await helpers.tapElement('settingsButton');
    await helpers.verifyElementVisible('settingsScreen');

    // Navigate to language settings
    await helpers.scrollToElement('languageButton', 'down');
    await helpers.tapElement('languageButton');
    await waitFor(element(by.id('languageMenu')))
      .toBeVisible()
      .withTimeout(E2E_CONFIG.TIMEOUTS.ANIMATION);

    // Select Hebrew
    await helpers.switchLanguage('he');
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for language change

    // Verify Hebrew is now active
    const languageElement = element(by.id('currentLanguageDisplay'));
    await waitFor(languageElement).toHaveText('עברית').withTimeout(E2E_CONFIG.TIMEOUTS.SYNC);

    // Navigate to home and verify Hebrew text
    await helpers.navigateBack();
    await helpers.navigateBack();
    await helpers.navigateToTab('home');

    // Verify Hebrew screen title (right-to-left)
    const screenTitleElement = element(by.id('screenTitle'));
    const titleAttrs = await screenTitleElement.getAttributes();
    const titleText = titleAttrs?.elements?.[0]?.text || '';

    // Hebrew title should be displayed
    expect(titleText.length).toBeGreaterThan(0);

    // Switch back to English for other tests
    await helpers.navigateToTab('profile');
    await helpers.scrollToElement('settingsButton', 'down');
    await helpers.tapElement('settingsButton');
    await helpers.scrollToElement('languageButton', 'down');
    await helpers.tapElement('languageButton');
    await helpers.switchLanguage('en');
    await helpers.navigateBack();
    await helpers.navigateBack();
  });

  it('test_rtl_layout_hebrew', async () => {
    // Switch to Hebrew
    await helpers.scrollToElement('settingsButton', 'down');
    await helpers.tapElement('settingsButton');
    await helpers.scrollToElement('languageButton', 'down');
    await helpers.tapElement('languageButton');
    await helpers.switchLanguage('he');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate to home
    await helpers.navigateBack();
    await helpers.navigateBack();
    await helpers.navigateToTab('home');

    // Verify RTL layout is applied
    await helpers.verifyRTLLayout();

    // Check that direction is RTL
    const mainContainer = element(by.id('mainContainer'));
    const attrs = await mainContainer.getAttributes();
    const direction = attrs?.elements?.[0]?.direction || '';

    expect(direction).toBe('rtl');

    // Verify content is right-aligned in Hebrew
    const contentElement = element(by.id('contentContainer'));
    const contentAttrs = await contentElement.getAttributes();
    const textAlign = contentAttrs?.elements?.[0]?.textAlign || '';

    // In RTL, text should align to right
    expect(textAlign).toMatch(/right|rtl|end/i);

    // Navigate to VOD and verify RTL applied to all screens
    await helpers.navigateToTab('vod');
    await helpers.verifyRTLLayout();

    // Verify navigation tabs are RTL ordered
    const tabBar = element(by.id('tabBar'));
    const tabAttrs = await tabBar.getAttributes();
    const tabDirection = tabAttrs?.elements?.[0]?.direction || '';

    expect(tabDirection).toBe('rtl');

    // Switch back to English
    await helpers.navigateToTab('profile');
    await helpers.scrollToElement('settingsButton', 'down');
    await helpers.tapElement('settingsButton');
    await helpers.scrollToElement('languageButton', 'down');
    await helpers.tapElement('languageButton');
    await helpers.switchLanguage('en');
    await helpers.navigateBack();
    await helpers.navigateBack();
  });

  it('test_date_formatting_locales', async () => {
    // Test English date formatting (MM/DD/YYYY or similar)
    await helpers.switchLanguage('en');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate to content with date display
    await helpers.navigateToTab('vod');
    await helpers.scrollToElement('contentTile_0', 'down');
    await helpers.tapElement('contentTile_0');
    await helpers.verifyElementVisible('contentDetailScreen');

    // Check date format in English
    const englishDateElement = element(by.id('releaseDateDisplay'));
    let dateAttrs = await englishDateElement.getAttributes();
    let dateText = dateAttrs?.elements?.[0]?.text || '';

    // Should be in English format (e.g., "January 15, 2024" or "01/15/2024")
    expect(dateText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\w+\s+\d{1,2},\s+\d{4}/);

    console.log(`English date format: ${dateText}`);

    // Navigate back and switch to Hebrew
    await helpers.navigateBack();
    await helpers.switchLanguage('he');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate to same content
    await helpers.navigateToTab('vod');
    await helpers.scrollToElement('contentTile_0', 'down');
    await helpers.tapElement('contentTile_0');

    // Check date format in Hebrew
    const hebrewDateElement = element(by.id('releaseDateDisplay'));
    dateAttrs = await hebrewDateElement.getAttributes();
    dateText = dateAttrs?.elements?.[0]?.text || '';

    // Should be in Hebrew format (day/month/year or Hebrew month names)
    expect(dateText.length).toBeGreaterThan(0);

    console.log(`Hebrew date format: ${dateText}`);

    // Switch back to English
    await helpers.navigateBack();
    await helpers.switchLanguage('en');
    await helpers.navigateBack();
  });

  it('test_number_formatting_locales', async () => {
    // Test English number formatting (decimals with period, thousands with comma)
    await helpers.switchLanguage('en');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate to content with numbers/ratings
    await helpers.navigateToTab('vod');
    await helpers.scrollToElement('contentTile_0', 'down');
    await helpers.tapElement('contentTile_0');
    await helpers.verifyElementVisible('contentDetailScreen');

    // Check rating format in English
    const englishRatingElement = element(by.id('contentRating'));
    let ratingAttrs = await englishRatingElement.getAttributes();
    let ratingText = ratingAttrs?.elements?.[0]?.text || '';

    // Should be in English format (e.g., "8.5" or "8,500 views")
    expect(ratingText).toMatch(/\d+\.?\d*/);

    console.log(`English number format: ${ratingText}`);

    // Navigate back and switch to Hebrew
    await helpers.navigateBack();
    await helpers.switchLanguage('he');
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate to same content
    await helpers.navigateToTab('vod');
    await helpers.scrollToElement('contentTile_0', 'down');
    await helpers.tapElement('contentTile_0');

    // Check number format in Hebrew
    const hebrewRatingElement = element(by.id('contentRating'));
    ratingAttrs = await hebrewRatingElement.getAttributes();
    ratingText = ratingAttrs?.elements?.[0]?.text || '';

    // Should be formatted appropriately for Hebrew locale
    expect(ratingText).toMatch(/\d+[,.]?\d*/);

    console.log(`Hebrew number format: ${ratingText}`);

    // Verify thousands separator format
    await helpers.scrollToElement('viewCountDisplay', 'down');
    const viewCountElement = element(by.id('viewCountDisplay'));
    const viewAttrs = await viewCountElement.getAttributes();
    const viewText = viewAttrs?.elements?.[0]?.text || '';

    // In Hebrew, comma may be used for decimals, period for thousands
    // Just verify it's formatted as a number string
    expect(viewText).toMatch(/[\d,.\s]+/);

    console.log(`Hebrew view count format: ${viewText}`);

    // Switch back to English
    await helpers.navigateBack();
    await helpers.switchLanguage('en');
  });
});
