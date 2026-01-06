import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import he from './locales/he.json'
import en from './locales/en.json'
import es from './locales/es.json'

const LANGUAGE_KEY = '@bayit_language'

export const languages = [
  { code: 'he', name: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'en', name: 'English', flag: '🇺🇸', rtl: false },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false },
]

const resources = {
  he: { translation: he },
  en: { translation: en },
  es: { translation: es },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'he',
  fallbackLng: 'he',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
})

export const loadSavedLanguage = () => {
  try {
    const savedLang = localStorage.getItem(LANGUAGE_KEY)
    if (savedLang && ['he', 'en', 'es'].includes(savedLang)) {
      i18n.changeLanguage(savedLang)
    }
  } catch (error) {
    console.log('Error loading saved language:', error)
  }
}

export const saveLanguage = (lang) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang)
    i18n.changeLanguage(lang)
  } catch (error) {
    console.log('Error saving language:', error)
  }
}

export const getCurrentLanguage = () => {
  return languages.find((l) => l.code === i18n.language) || languages[0]
}

export const isRTL = () => {
  const current = getCurrentLanguage()
  return current.rtl
}

export default i18n
