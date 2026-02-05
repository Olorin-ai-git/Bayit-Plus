/**
 * i18n Configuration
 *
 * Initializes @bayit/i18n for Chrome extension
 * Supports 10 languages with RTL support for Hebrew
 */

import i18next from 'i18next';
import { initBayitI18nWeb } from '@bayit/i18n/web';
import { logger } from '../lib/logger';

/**
 * Initialize i18n for popup
 */
export async function initializeI18n(): Promise<void> {
  try {
    // Get user's preferred language from storage or browser
    const result = await chrome.storage.sync.get('language');
    const browserLang = chrome.i18n.getUILanguage();
    const defaultLang = result.language || browserLang || 'en';

    logger.info('Initializing i18n', {
      defaultLang,
      browserLang,
      storedLang: result.language,
    });

    // Initialize with web platform configuration
    const i18n = await initBayitI18nWeb();

    // Change to preferred language if different from default
    if (i18n.language !== defaultLang) {
      await i18n.changeLanguage(defaultLang);
    }

    // Setup direction listener for RTL support
    setupDirectionListener(i18n);

    logger.info('i18n initialized successfully', {
      language: i18n.language,
      dir: document.documentElement.getAttribute('dir'),
    });
  } catch (error) {
    logger.error('Failed to initialize i18n', { error: String(error) });
    throw error;
  }
}

/**
 * Setup listener for language changes (RTL support)
 */
function setupDirectionListener(i18n: typeof import('i18next').default): void {
  i18n.on('languageChanged', (lng: string) => {
    const dir = ['he', 'ar'].includes(lng) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lng);

    logger.debug('Language changed', { language: lng, direction: dir });

    // Save to storage
    chrome.storage.sync.set({ language: lng }).catch((error: any) => {
      logger.error('Failed to save language preference', { error: String(error) });
    });
  });
}

/**
 * Change the current UI language
 */
export async function changeLanguage(language: string): Promise<void> {
  await i18next.changeLanguage(language);
}

/**
 * Get the current UI language
 */
export function getCurrentLanguage(): string {
  return i18next.language || 'en';
}

/**
 * Get available languages
 */
export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
] as const;
