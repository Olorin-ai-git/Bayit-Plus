/**
 * Platform-agnostic i18n initialization for @olorin/i18n.
 *
 * This module provides the core i18next initialization with all supported languages.
 * Platform-specific initialization should use:
 *
 * - Web: import { initWebI18n } from '@olorin/i18n/web'
 * - React Native: import { initNativeI18n } from '@olorin/i18n/native'
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import he from "../../packages/ui/bayit-i18n/locales/he.json";
import en from "../../packages/ui/bayit-i18n/locales/en.json";
import es from "../../packages/ui/bayit-i18n/locales/es.json";
import zh from "../../packages/ui/bayit-i18n/locales/zh.json";
import fr from "../../packages/ui/bayit-i18n/locales/fr.json";
import it from "../../packages/ui/bayit-i18n/locales/it.json";
import hi from "../../packages/ui/bayit-i18n/locales/hi.json";
import ta from "../../packages/ui/bayit-i18n/locales/ta.json";
import bn from "../../packages/ui/bayit-i18n/locales/bn.json";
import ja from "../../packages/ui/bayit-i18n/locales/ja.json";

import type { LanguageCode, LanguageInfo } from "./types";
import { getInitialLanguageWeb } from "./web";
import { logger } from "../utils/logger";

// Language metadata matching Olorin ecosystem standards
export const languages: LanguageInfo[] = [
  { code: "he", name: "עברית", flag: "🇮🇱", rtl: true },
  { code: "en", name: "English", flag: "🇺🇸", rtl: false },
  { code: "es", name: "Español", flag: "🇪🇸", rtl: false },
  { code: "zh", name: "中文", flag: "🇨🇳", rtl: false },
  { code: "fr", name: "Français", flag: "🇫🇷", rtl: false },
  { code: "it", name: "Italiano", flag: "🇮🇹", rtl: false },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳", rtl: false },
  { code: "ta", name: "தமிழ्", flag: "🇮🇳", rtl: false },
  { code: "bn", name: "বাংলা", flag: "🇧🇩", rtl: false },
  { code: "ja", name: "日本語", flag: "🇯🇵", rtl: false },
];

// Translation resources for all supported languages
const resources = {
  he: { translation: he },
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
  fr: { translation: fr },
  it: { translation: it },
  hi: { translation: hi },
  ta: { translation: ta },
  bn: { translation: bn },
  ja: { translation: ja },
};

// Initialize i18next with sensible defaults
// Note: Language is set to 'he' by default, platform-specific init will update it
const initialLang = getInitialLanguageWeb();
i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: "he",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  // Use v4 format (i18next 25.x+ dropped v3 support)
  compatibilityJSON: "v4",
});

/**
 * Load saved language preference from storage.
 * This function is platform-aware and works on both web and native.
 *
 * For web: uses localStorage
 * For React Native: uses AsyncStorage (requires platform-specific init)
 *
 * @deprecated Use initWebI18n() for web or initNativeI18n() for React Native
 */
export const loadSavedLanguage = async (): Promise<void> => {
  try {
    let savedLang: string | null = null;

    // Try web first
    if (typeof window !== "undefined" && window.localStorage) {
      savedLang = window.localStorage.getItem("@olorin_language");
    } else {
      // Try AsyncStorage for React Native
      try {
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default;
        savedLang = await AsyncStorage.getItem("@olorin_language");
      } catch {
        // AsyncStorage not available
      }
    }

    if (savedLang) {
      const validLanguages: LanguageCode[] = [
        "he",
        "en",
        "es",
        "zh",
        "fr",
        "it",
        "hi",
        "ta",
        "bn",
        "ja",
      ];
      if (validLanguages.includes(savedLang as LanguageCode)) {
        await i18n.changeLanguage(savedLang);
      }
    }
  } catch (error) {
    logger.warn("Error loading saved language", "I18n", error);
  }
};

/**
 * Save language preference to storage.
 * This function is platform-aware and works on both web and native.
 *
 * For web: uses localStorage
 * For React Native: uses AsyncStorage (requires platform-specific init)
 *
 * @deprecated Use saveLanguageWeb() for web or saveLanguageNative() for React Native
 */
export const saveLanguage = async (lang: LanguageCode): Promise<void> => {
  try {
    // Try web first
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("@olorin_language", lang);
    } else {
      // Try AsyncStorage for React Native
      try {
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default;
        await AsyncStorage.setItem("@olorin_language", lang);
      } catch {
        // AsyncStorage not available
      }
    }

    await i18n.changeLanguage(lang);
  } catch (error) {
    logger.warn("Error saving language", "I18n", error);
  }
};

/**
 * Get current language information.
 * @returns Language info object with code, name, flag, RTL status
 */
export const getCurrentLanguage = (): LanguageInfo => {
  const current = languages.find(
    (l) => l.code === (i18n.language as LanguageCode),
  );
  return current || languages[0];
};

/**
 * Check if current language is RTL.
 * @returns True if current language is right-to-left
 */
export const isRTL = (): boolean => {
  return getCurrentLanguage().rtl;
};

export default i18n;
