/**
 * @bayit/shared-i18n/native - DEPRECATED
 *
 * This package has been consolidated into @bayit/i18n.
 * Please migrate to using @bayit/i18n/native directly.
 */

export {
  initBayitI18nNative,
  saveLanguageNative,
  loadLanguageNative,
} from '@bayit/i18n/native';

// Legacy function names for backward compatibility
export { initBayitI18nNative as initNativeI18n } from '@bayit/i18n/native';
export { loadLanguageNative as loadSavedLanguageNative } from '@bayit/i18n/native';

// Helper for initial language detection (kept for compatibility)
export function getInitialLanguageNative(): string {
  return 'he';
}

// Legacy exports
export function getLanguageStorageKeyNative(): string {
  return 'bayit_language';
}

export async function clearI18nPreferences(): Promise<void> {
  // No-op - can be done via @bayit/i18n/native if needed
}

export function isNativeRTL(): boolean {
  return false;
}
