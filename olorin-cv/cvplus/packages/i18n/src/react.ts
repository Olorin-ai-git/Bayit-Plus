/**
 * @fileoverview React-specific exports for @cvplus/i18n module
 * Provides React components, hooks, and utilities for internationalization
  */

// React hooks
import { useTranslation } from './hooks/useTranslation';
import { useRTL, RTLWrapper, rtlService } from './rtl';

// React components
import { LanguageSelector } from './components/LanguageSelector';
import { 
  TranslatedText,
  withTranslation,
  ConditionalTranslation,
  PluralTranslation,
  GenderAwareTranslation,
  ProfessionalTranslation,
} from './components/TranslatedText';

// React providers
import { I18nProvider } from './providers/I18nProvider';

// React utilities
import { createI18nContext } from './providers/context';

// Core functionality for React apps
import {
  translationService,
  initializeI18n,
  SUPPORTED_LANGUAGES,
  LANGUAGE_CONFIG,
  TRANSLATION_NAMESPACES,
} from './index';

// Export everything individually
export { useTranslation };
export { useRTL, RTLWrapper };
export { LanguageSelector };
export { 
  TranslatedText,
  withTranslation,
  ConditionalTranslation,
  PluralTranslation,
  GenderAwareTranslation,
  ProfessionalTranslation,
};
export { I18nProvider };
export { createI18nContext };
export {
  translationService,
  rtlService,
  initializeI18n,
  SUPPORTED_LANGUAGES,
  LANGUAGE_CONFIG,
  TRANSLATION_NAMESPACES,
};

// Re-export types needed for React components
export type {
  SupportedLanguage,
  I18nHookReturn,
  LanguageSelectorProps,
  TranslatedTextProps,
  RTLWrapperProps,
  TranslationOptions,
  RTLLayoutOptions,
} from './types';

// Default export with all React-specific functionality
const ReactI18n = {
  useTranslation,
  useRTL,
  LanguageSelector,
  TranslatedText,
  RTLWrapper,
  I18nProvider,
  withTranslation,
  ConditionalTranslation,
  PluralTranslation,
  GenderAwareTranslation,
  ProfessionalTranslation,
  createI18nContext,
  translationService,
  rtlService,
  initializeI18n,
  SUPPORTED_LANGUAGES,
  LANGUAGE_CONFIG,
  TRANSLATION_NAMESPACES,
};

export default ReactI18n;