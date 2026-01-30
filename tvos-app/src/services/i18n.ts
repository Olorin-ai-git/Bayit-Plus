/**
 * Bayit+ tvOS Internationalization (i18n) Service
 * Uses @bayit/i18n/native which merges:
 * - 74 core keys from @olorin/shared-i18n
 * - 8 platform keys from @bayit/i18n
 * Supports: Hebrew (RTL), English, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese
 */

import { initBayitI18nNative } from '@bayit/i18n/native';

// i18n instance (initialized on first call)
let i18n: Awaited<ReturnType<typeof initBayitI18nNative>> | null = null;

/**
 * Initialize i18n for tvOS app
 * Loads user's preferred language from AsyncStorage
 * Falls back to Hebrew (default)
 */
export async function initializeI18n(): Promise<void> {
  try {
    // Initialize with merged resources (Olorin core + Bayit+ platform)
    i18n = await initBayitI18nNative();

    // Note: initBayitI18nNative() already loads saved language from AsyncStorage
    // and sets it as the initial language, so no additional loading needed
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Get i18n instance for advanced usage
 */
export function getI18n() {
  if (!i18n) {
    throw new Error('i18n not initialized. Call initializeI18n() first.');
  }
  return i18n;
}

/**
 * Check if i18n is ready
 */
export function isI18nReady(): boolean {
  return i18n !== null;
}
