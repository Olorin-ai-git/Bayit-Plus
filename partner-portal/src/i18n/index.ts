/**
 * B2B Partner Portal i18n Configuration (Unified)
 *
 * Uses the unified @olorin/shared-i18n package for B2B Partner Portal.
 * Supports 10 languages with fallback to B2B-specific overrides.
 */

import i18n, { languages } from '@olorin/shared-i18n';
import { initWebI18n as initWebI18nCore, saveLanguageWeb, setupWebDirectionListener } from '@olorin/shared-i18n/web';
import { getB2BConfig } from '../config/env';

// Re-export language list for compatibility
export { languages };

/**
 * Get initial language from config or saved preference.
 */
function getInitialLanguageFromConfig(): string {
  return getB2BConfig().defaultLanguage || 'he';
}

/**
 * Initialize i18n for B2B Partner Portal.
 * Uses the unified @olorin/i18n package with environment-configured defaults.
 */
export async function initializeI18n(): Promise<typeof i18n> {
  // Load from localStorage if available
  await initWebI18nCore();

  // If no saved preference, apply configured default
  const configDefault = getInitialLanguageFromConfig();
  if (i18n.language === 'he' || !i18n.language) {
    // Check if config specifies a different default
    if (configDefault && configDefault !== 'he') {
      await i18n.changeLanguage(configDefault);
    }
  }

  // Setup web-specific direction handling
  setupWebDirectionListener();

  return i18n;
}

/**
 * Change the current language.
 * @param lang Language code
 */
export async function changeLanguage(lang: string): Promise<void> {
  await saveLanguageWeb(lang as any);
}

/**
 * Get current language information.
 */
export function getCurrentLanguage() {
  return languages.find((l) => l.code === i18n.language) || languages[0];
}

/**
 * Check if current language is RTL.
 */
export function isRTL(): boolean {
  const current = getCurrentLanguage();
  return current.rtl;
}

export { i18n };
