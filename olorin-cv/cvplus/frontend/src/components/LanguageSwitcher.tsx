/**
 * Language Switcher Component
 *
 * Allows users to switch between supported languages.
 * Updates document direction (LTR/RTL) automatically.
 */

import { useTranslation } from 'react-i18next';
import { GlassButton } from '@/components/glass';

const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'he', name: 'עברית', dir: 'rtl' },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (languageCode: string, direction: 'ltr' | 'rtl') => {
    i18n.changeLanguage(languageCode);
    document.documentElement.dir = direction;
    document.documentElement.lang = languageCode;
  };

  return (
    <div className="flex gap-2" role="group" aria-label="Language selection">
      {LANGUAGES.map((lang) => (
        <GlassButton
          key={lang.code}
          variant={i18n.language === lang.code ? 'primary' : 'outline'}
          size="sm"
          onClick={() => changeLanguage(lang.code, lang.dir)}
          aria-label={`Switch to ${lang.name}`}
          aria-pressed={i18n.language === lang.code}
        >
          {lang.name}
        </GlassButton>
      ))}
    </div>
  );
}
