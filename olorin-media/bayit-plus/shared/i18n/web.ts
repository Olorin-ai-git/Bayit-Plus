/**
 * Web-specific i18n utilities using localStorage for language persistence.
 *
 * Use this module in Web applications (React, Next.js, SPA):
 *
 *   import { initWebI18n, saveLanguageWeb } from '@olorin/i18n/web';
 *   import i18n from '@olorin/i18n';
 *
 *   // In your app initialization
 *   await initWebI18n();
 */

import type { LanguageCode } from './types';

const LANGUAGE_KEY = '@olorin_language';

/**
 * Type-safe localStorage access for web.
 */
function getWebStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Get initial language synchronously for web (used at module init time).
 * Checks localStorage for saved preference, falls back to Hebrew.
 */
export function getInitialLanguageWeb(): LanguageCode {
  try {
    const storage = getWebStorage();
    if (storage) {
      const saved = storage.getItem(LANGUAGE_KEY);
      const validLanguages: LanguageCode[] = ['he', 'en', 'es', 'zh', 'fr', 'it', 'hi', 'ta', 'bn', 'ja'];
      if (saved && validLanguages.includes(saved as LanguageCode)) {
        return saved as LanguageCode;
      }
    }
  } catch (error) {
    // Ignore errors in SSR or restricted environments
  }
  return 'he';
}

/**
 * Save language preference to localStorage.
 * @param langCode Language code to save
 */
export async function saveLanguageWeb(langCode: LanguageCode): Promise<void> {
  try {
    const storage = getWebStorage();
    if (storage) {
      storage.setItem(LANGUAGE_KEY, langCode);
    }
  } catch (error) {
    console.warn('Failed to save language preference:', error);
  }
}

/**
 * Load saved language preference from localStorage.
 * @returns Saved language code or Hebrew if none found
 */
export async function loadSavedLanguageWeb(): Promise<LanguageCode> {
  try {
    const storage = getWebStorage();
    if (storage) {
      const saved = storage.getItem(LANGUAGE_KEY);
      const validLanguages: LanguageCode[] = ['he', 'en', 'es', 'zh', 'fr', 'it', 'hi', 'ta', 'bn', 'ja'];
      if (saved && validLanguages.includes(saved as LanguageCode)) {
        return saved as LanguageCode;
      }
    }
  } catch (error) {
    console.warn('Failed to load saved language:', error);
  }
  return 'he';
}

/**
 * Initialize web-specific i18n configuration.
 *
 * Call this function early in your app initialization:
 *
 *   useEffect(() => {
 *     initWebI18n();
 *   }, []);
 */
export async function initWebI18n(): Promise<void> {
  try {
    const savedLang = await loadSavedLanguageWeb();
    // Import here to avoid circular imports
    const i18n = await import('./index').then(m => m.default);
    if (savedLang && savedLang !== 'he') {
      await i18n.changeLanguage(savedLang);
    }
  } catch (error) {
    console.warn('Failed to initialize web i18n:', error);
  }
}

/**
 * Set up language change listener for web document updates.
 * Updates document lang and dir attributes when language changes.
 */
export async function setupWebDirectionListener(): Promise<void> {
  try {
    const i18n = await import('./index').then(m => m.default);

    i18n.on('languageChanged', (lng: string) => {
      const isRTL = ['he', 'ar'].includes(lng);
      document.documentElement.lang = lng;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    });

    // Set initial direction
    const currentLang = i18n.language as LanguageCode;
    const isRTL = ['he', 'ar'].includes(currentLang);
    document.documentElement.lang = currentLang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  } catch (error) {
    console.warn('Failed to setup direction listener:', error);
  }
}

/**
 * Get storage key for language preference.
 * Useful for SSR or testing.
 */
export function getLanguageStorageKey(): string {
  return LANGUAGE_KEY;
}
