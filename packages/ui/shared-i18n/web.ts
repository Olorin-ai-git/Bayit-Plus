/**
 * @bayit/shared-i18n/web - DEPRECATED
 *
 * This package has been consolidated into @bayit/i18n.
 * Please migrate to using @bayit/i18n/web directly.
 */

export {
  initBayitI18nWeb,
  saveLanguageWeb,
  loadLanguageWeb,
  isRTL,
} from '@bayit/i18n/web';

// Legacy function names for backward compatibility
export { initBayitI18nWeb as initWebI18n } from '@bayit/i18n/web';
export { loadLanguageWeb as loadSavedLanguageWeb } from '@bayit/i18n/web';

// Helper for initial language detection (kept for compatibility)
export function getInitialLanguageWeb(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('bayit_language');
      if (saved) return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'he';
}

// Legacy exports
export function getLanguageStorageKey(): string {
  return 'bayit_language';
}

export async function setupWebDirectionListener(): Promise<void> {
  // No-op - handled by @bayit/i18n/web automatically
}
