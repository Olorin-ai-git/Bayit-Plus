import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import he from './locales/he.json';
import en from './locales/en.json';
import es from './locales/es.json';

const LANGUAGE_KEY = '@bayit_language';
const isWeb = Platform.OS === 'web';

// Get initial language synchronously for web
// Note: Check window directly since Platform.OS may not be set at module init time
const getInitialLanguage = (): string => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(LANGUAGE_KEY);
      if (saved && ['he', 'en', 'es'].includes(saved)) {
        return saved;
      }
    }
  } catch (e) {
    // Ignore errors (e.g., in SSR or restricted environments)
  }
  return 'he'; // Default fallback
};

export const languages = [
  { code: 'he', name: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
];

const resources = {
  he: { translation: he },
  en: { translation: en },
  es: { translation: es },
};

// Initialize i18n with saved language (or default to Hebrew)
const initialLang = getInitialLanguage();
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'he',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    // Use v3 format for environments without Intl.PluralRules (like tvOS)
    compatibilityJSON: 'v3',
  });

// Type-safe localStorage access for web
const getWebStorage = (): Storage | null => {
  if (isWeb && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

// Load saved language preference
export const loadSavedLanguage = async () => {
  try {
    let savedLang: string | null = null;
    const webStorage = getWebStorage();

    if (webStorage) {
      savedLang = webStorage.getItem(LANGUAGE_KEY);
    } else {
      savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    }

    if (savedLang && ['he', 'en', 'es'].includes(savedLang)) {
      i18n.changeLanguage(savedLang);
    }
  } catch (error) {
    console.log('Error loading saved language:', error);
  }
};

// Save language preference
export const saveLanguage = async (lang: string) => {
  try {
    const webStorage = getWebStorage();

    if (webStorage) {
      webStorage.setItem(LANGUAGE_KEY, lang);
    } else {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    }
    i18n.changeLanguage(lang);
  } catch (error) {
    console.log('Error saving language:', error);
  }
};

// Get current language info
export const getCurrentLanguage = () => {
  return languages.find(l => l.code === i18n.language) || languages[0];
};

// Check if current language is RTL
export const isRTL = () => {
  const current = getCurrentLanguage();
  return current.rtl;
};

export default i18n;
