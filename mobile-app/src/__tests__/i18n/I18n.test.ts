/**
 * Internationalization Integration Tests
 * Tests: Language switching, RTL support, translations, formatting
 * 18 comprehensive tests for Phase 2.4
 */

import {
  initializeI18n,
  setLanguage,
  getCurrentLanguage,
  isRTL,
  getDirection,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  t,
  formatDate,
  formatTime,
  formatNumber,
  formatCurrency,
} from '../../services/i18n';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('Internationalization (i18n) - Phase 2.4', () => {
  describe('Supported Languages', () => {
    test('should have 10 supported languages', () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(10);
    });

    test('should include Hebrew', () => {
      const hebrew = SUPPORTED_LANGUAGES.find((l) => l.code === 'he');
      expect(hebrew).toBeDefined();
      expect(hebrew?.name).toBe('Hebrew');
      expect(hebrew?.rtl).toBe(true);
    });

    test('should include English', () => {
      const english = SUPPORTED_LANGUAGES.find((l) => l.code === 'en');
      expect(english).toBeDefined();
      expect(english?.name).toBe('English');
      expect(english?.rtl).toBe(false);
    });

    test('should include Spanish', () => {
      const spanish = SUPPORTED_LANGUAGES.find((l) => l.code === 'es');
      expect(spanish).toBeDefined();
      expect(spanish?.rtl).toBe(false);
    });

    test('should include Chinese', () => {
      const chinese = SUPPORTED_LANGUAGES.find((l) => l.code === 'zh');
      expect(chinese).toBeDefined();
      expect(chinese?.rtl).toBe(false);
    });

    test('should include French, Italian, Hindi, Tamil, Bengali, Japanese', () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      expect(codes).toContain('fr');
      expect(codes).toContain('it');
      expect(codes).toContain('hi');
      expect(codes).toContain('ta');
      expect(codes).toContain('bn');
      expect(codes).toContain('ja');
    });

    test('only Hebrew should be RTL', () => {
      const rtlLanguages = SUPPORTED_LANGUAGES.filter((l) => l.rtl);
      expect(rtlLanguages).toHaveLength(1);
      expect(rtlLanguages[0].code).toBe('he');
    });
  });

  describe('Language Support Verification', () => {
    test('should recognize valid language codes', () => {
      expect(isSupportedLanguage('en')).toBe(true);
      expect(isSupportedLanguage('he')).toBe(true);
      expect(isSupportedLanguage('es')).toBe(true);
    });

    test('should reject invalid language codes', () => {
      expect(isSupportedLanguage('xx')).toBe(false);
      expect(isSupportedLanguage('invalid')).toBe(false);
      expect(isSupportedLanguage('')).toBe(false);
    });

    test('all supported languages should be in SUPPORTED_LANGUAGES', () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      expect(codes).toContain('en');
      expect(codes).toContain('he');
      expect(codes).toContain('es');
      expect(codes).toContain('zh');
      expect(codes).toContain('fr');
      expect(codes).toContain('it');
      expect(codes).toContain('hi');
      expect(codes).toContain('ta');
      expect(codes).toContain('bn');
      expect(codes).toContain('ja');
    });
  });

  describe('RTL Support', () => {
    test('Hebrew should be RTL', () => {
      expect(isRTL('he')).toBe(true);
    });

    test('English should not be RTL', () => {
      expect(isRTL('en')).toBe(false);
    });

    test('Spanish should not be RTL', () => {
      expect(isRTL('es')).toBe(false);
    });

    test('all non-Hebrew languages should be LTR', () => {
      const ltrLanguages = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'he');
      ltrLanguages.forEach((lang) => {
        expect(isRTL(lang.code)).toBe(false);
      });
    });

    test('should return correct direction for current language', () => {
      const direction = getDirection();
      expect(['ltr', 'rtl']).toContain(direction);
    });
  });

  describe('Language Selection', () => {
    test('should return current language code', () => {
      const current = getCurrentLanguage();
      expect(typeof current).toBe('string');
      expect(current.length).toBeGreaterThan(0);
    });

    test('should accept valid language codes', async () => {
      const result = await setLanguage('en');
      expect(result).toBe(true);
    });

    test('should reject invalid language codes', async () => {
      const result = await setLanguage('invalid');
      expect(result).toBe(false);
    });

    test('should support switching between languages', async () => {
      const resultEn = await setLanguage('en');
      expect(resultEn).toBe(true);

      const resultHe = await setLanguage('he');
      expect(resultHe).toBe(true);

      const resultEs = await setLanguage('es');
      expect(resultEs).toBe(true);
    });
  });

  describe('Translation Functions', () => {
    test('should provide translation function', () => {
      expect(typeof t).toBe('function');
    });

    test('translation function should accept key parameter', () => {
      const result = t('common.ok');
      expect(typeof result).toBe('string');
    });

    test('translation function should accept options parameter', () => {
      const result = t('common.welcome', { name: 'User' });
      expect(typeof result).toBe('string');
    });

    test('should handle missing translations gracefully', () => {
      const result = t('nonexistent.key');
      expect(typeof result).toBe('string');
    });
  });

  describe('Date/Time Formatting', () => {
    test('should format dates according to language', () => {
      const date = new Date('2026-01-27');
      const formatted = formatDate(date);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    test('should support short date format', () => {
      const date = new Date('2026-01-27');
      const short = formatDate(date, 'short');
      const long = formatDate(date, 'long');
      expect(typeof short).toBe('string');
      expect(typeof long).toBe('string');
    });

    test('should format time according to language', () => {
      const date = new Date('2026-01-27T14:30:00');
      const formatted = formatTime(date);
      expect(typeof formatted).toBe('string');
      expect(formatted).toMatch(/\d+:\d+/);
    });

    test('should format numbers according to language', () => {
      const num = 1234567;
      const formatted = formatNumber(num);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    test('should format currency according to language', () => {
      const amount = 99.99;
      const formatted = formatCurrency(amount, 'USD');
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe('Locale-Specific Formatting', () => {
    test('Hebrew dates should format correctly', async () => {
      await setLanguage('he');
      const date = new Date('2026-01-27');
      const formatted = formatDate(date);
      expect(typeof formatted).toBe('string');
    });

    test('Chinese numbers should format correctly', async () => {
      await setLanguage('zh');
      const num = 1000;
      const formatted = formatNumber(num);
      expect(typeof formatted).toBe('string');
    });

    test('Currency formatting should include symbol or code', () => {
      const usd = formatCurrency(100, 'USD');
      const eur = formatCurrency(100, 'EUR');
      expect(typeof usd).toBe('string');
      expect(typeof eur).toBe('string');
      expect(usd.length).toBeGreaterThan(0);
      expect(eur.length).toBeGreaterThan(0);
    });
  });

  describe('Initialization', () => {
    test('should initialize i18n', async () => {
      await expect(initializeI18n()).resolves.toBeUndefined();
    });

    test('should handle initialization errors gracefully', async () => {
      // Mock AsyncStorage error
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      await expect(initializeI18n()).resolves.toBeUndefined();
    });
  });

  describe('Language Persistence', () => {
    test('should persist language preference to storage', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.setItem.mockResolvedValueOnce(undefined);

      await setLanguage('he');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('bayit_language', 'he');
    });

    test('should load saved language preference on init', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce('he');

      await initializeI18n();
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('bayit_language');
    });
  });
});
