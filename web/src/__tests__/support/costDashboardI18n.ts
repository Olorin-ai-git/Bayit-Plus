import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../../../packages/ui/bayit-i18n/locales/en.json';

void i18n.use(initReactI18next).init({ lng: 'en', fallbackLng: 'en', resources: { en: { translation: en } }, initImmediate: false, interpolation: { escapeValue: false } });

beforeEach(async () => { i18n.addResourceBundle('en', 'translation', en, true, true); await i18n.changeLanguage('en'); });
