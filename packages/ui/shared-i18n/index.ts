/**
 * @bayit/shared-i18n - DEPRECATED
 *
 * This package has been consolidated into @bayit/i18n.
 * All exports are re-exported from @bayit/i18n for backward compatibility.
 *
 * Please migrate to using @bayit/i18n directly:
 *
 * Before: import { languages } from '@bayit/shared-i18n';
 * After:  import { languages } from '@bayit/i18n';
 */

export {
  getBayitTranslations,
  bayitResources,
  supportedLanguages,
  languageNames,
  languages,
  type BayitLanguage,
  type BayitTranslations,
  type LanguageCode,
  type LanguageInfo,
} from '@bayit/i18n';

// Re-export initialization functions
export { initBayitI18nWeb, saveLanguageWeb, loadLanguageWeb, isRTL } from '@bayit/i18n/web';

// For native apps
export { initBayitI18nNative, saveLanguageNative, loadLanguageNative } from '@bayit/i18n/native';
