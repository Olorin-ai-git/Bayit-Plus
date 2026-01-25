/**
 * Category Display Name Utility
 *
 * Provides secure, i18n-aware category display name resolution
 * with XSS protection and proper capitalization handling.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Whitelist of allowed languages for security
 * These are the 10 languages supported by @olorin/shared-i18n
 */
const ALLOWED_LANGUAGES = ['en', 'es', 'he', 'ar', 'fr', 'de', 'it', 'zh', 'hi', 'ta', 'bn', 'ja'];

/**
 * Get category display name with XSS protection.
 * Priority: i18n translation → multilingual backend field → sanitized fallback
 *
 * SECURITY: All backend values sanitized with DOMPurify
 * i18n: Uses @olorin/shared-i18n (MANDATORY) - NO text transformation - preserves translations
 *
 * @param category Category object from backend with name, name_en fields
 * @param translationKey i18n key to lookup (e.g., "home.action")
 * @param language Current language code from @olorin/shared-i18n
 * @param t Translation function from useTranslation() hook
 */
export const getCategoryDisplayName = (
  category: {
    name: string;
    name_en?: string;
    [key: string]: any;
  },
  translationKey: string,
  language: string,
  t: (key: string, defaultValue?: string) => string
): string => {
  // Validate language against whitelist (security)
  const validLanguage = ALLOWED_LANGUAGES.includes(language) ? language : 'he';

  // 1. Try i18n translation from @olorin/shared-i18n (HIGHEST PRIORITY - preserves proper capitalization)
  const translation = t(translationKey);
  if (translation !== translationKey) {
    return translation;  // i18n handles sanitization
  }

  // 2. Use sanitized multilingual field from backend
  let displayName = '';
  if (validLanguage === 'en' && category.name_en) {
    displayName = DOMPurify.sanitize(category.name_en, { ALLOWED_TAGS: [] });
  } else {
    // Fallback to default name (Hebrew)
    displayName = DOMPurify.sanitize(category.name || '', { ALLOWED_TAGS: [] });
  }

  // 3. Return as-is (NO transformation - backend is source of truth)
  return displayName;
};
