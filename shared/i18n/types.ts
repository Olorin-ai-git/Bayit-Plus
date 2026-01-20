/**
 * Type definitions for @olorin/i18n package.
 *
 * This module provides TypeScript types that match the Olorin.ai
 * internationalization system design.
 */

/**
 * Language codes supported by Olorin ecosystem.
 */
export type LanguageCode =
  | 'he'  // Hebrew
  | 'en'  // English
  | 'es'  // Spanish
  | 'zh'  // Chinese
  | 'fr'  // French
  | 'it'  // Italian
  | 'hi'  // Hindi
  | 'ta'  // Tamil
  | 'bn'  // Bengali
  | 'ja'; // Japanese

/**
 * All supported language codes as array.
 */
export const SUPPORTED_LANGUAGES: LanguageCode[] = [
  'he', 'en', 'es', 'zh', 'fr', 'it', 'hi', 'ta', 'bn', 'ja'
];

/**
 * Language metadata describing a supported language.
 */
export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  flag: string;
  rtl: boolean;
}

/**
 * Translation key type for type-safe translation access.
 * This should be auto-generated from locale files.
 */
export type TranslationKey = string;

/**
 * Translation value type - can be string, number, object, or array.
 */
export type TranslationValue = string | number | TranslationObject | TranslationArray;

export interface TranslationObject {
  [key: string]: TranslationValue;
}

export interface TranslationArray extends Array<TranslationValue> {}

/**
 * Full translation namespace for a language.
 */
export interface TranslationNamespace {
  [key: string]: TranslationValue;
}

/**
 * Storage for all translations by language.
 */
export interface TranslationResources {
  [lang in LanguageCode]?: TranslationNamespace;
}

/**
 * Direction information for RTL/LTR support.
 */
export type Direction = 'rtl' | 'ltr';

/**
 * Text alignment options.
 */
export type TextAlign = 'left' | 'right' | 'center';

/**
 * Flex direction options.
 */
export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';

/**
 * RTL-aware layout result.
 */
export interface DirectionResult {
  isRTL: boolean;
  direction: Direction;
  flexDirection: FlexDirection;
  textAlign: TextAlign;
  justifyContent: 'flex-start' | 'flex-end' | 'center';
  alignItems: 'flex-start' | 'flex-end' | 'center';
}
