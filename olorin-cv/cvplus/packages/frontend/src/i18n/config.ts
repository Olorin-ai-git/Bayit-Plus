// CVPlus i18n integration - Phase 3 implementation
import i18nextModule from 'i18next';
import { initializeI18n, SUPPORTED_LANGUAGES, LANGUAGE_CONFIG } from '@cvplus/i18n';
import { translationService } from '@cvplus/i18n';

// Re-export types and constants from the CVPlus i18n module
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
export const supportedLanguages = LANGUAGE_CONFIG;

// Store i18next instance - set it immediately with the module import
// so react-i18next can access it even before async initialization completes
export const i18nConfig: { instance: any } = {
  instance: i18nextModule,
};

// Initialize CVPlus i18n system
const initCVPlusI18n = async () => {
  try {
    await initializeI18n({
      defaultLanguage: 'en',
      fallbackLanguage: 'en',
      enableProfessionalTerms: true,
      enableCaching: true,
      enableRTL: true,
      enableDevTools: process.env.NODE_ENV === 'development',
      namespaces: ['common', 'cv', 'features', 'premium', 'errors', 'forms'],
      preloadLanguages: ['en'],
      detectionOptions: {
        order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
        caches: ['localStorage', 'cookie'],
        storageKey: 'cvplus-language',
      },
      backendOptions: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },
    });

    // Store the i18next instance for react-i18next provider
    i18nConfig.instance = i18nextModule;
    logger.info('CVPlus i18n system initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize CVPlus i18n system:', error);
    // Fallback to basic i18next configuration if CVPlus i18n fails
    await initBasicI18n();
  }
};

// Fallback basic i18n configuration
const initBasicI18n = async () => {
  const i18next = await import('i18next');
  const { initReactI18next } = await import('react-i18next');
  const HttpBackendModule = await import('i18next-http-backend');
  const LanguageDetectorModule = await import('i18next-browser-languagedetector');

  const Backend = HttpBackendModule.default || HttpBackendModule;
  const LanguageDetector = LanguageDetectorModule.default || LanguageDetectorModule;

  const instance = i18next.default;

  // Configure and initialize in proper order: react plugin FIRST, then backends, then init
  await instance
    .use(initReactI18next)
    .use(Backend)
    .use(LanguageDetector)
    .init({
      fallbackLng: 'en',
      debug: process.env.NODE_ENV === 'development',

      interpolation: {
        escapeValue: false,
      },

      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },

      ns: ['common', 'cv', 'features', 'premium', 'errors', 'forms'],
      defaultNS: 'common',

      detection: {
        order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
        caches: ['localStorage', 'cookie'],
        lookupLocalStorage: 'cvplus-language',
        lookupCookie: 'cvplus-language',
      },

      react: {
        useSuspense: false,  // Disable suspense to prevent hook issues
      },

      preload: ['en'],
      keySeparator: '.',
      nsSeparator: ':',
    });

  // Store the initialized instance
  i18nConfig.instance = instance;
};

// Initialize the i18n system
const initializationPromise = initCVPlusI18n();

// Export the initialization promise for critical paths
export { translationService, initializationPromise };
export default translationService;