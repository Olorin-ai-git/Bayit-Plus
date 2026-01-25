import { useTranslation } from 'react-i18next';
import { languages } from '@olorin/shared-i18n';
import { saveLanguageWeb } from '@olorin/shared-i18n/web';
import { GlassButton } from './glass';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    await saveLanguageWeb(langCode as any);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {languages.map((lang) => (
        <GlassButton
          key={lang.code}
          variant={i18n.language === lang.code ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handleLanguageChange(lang.code)}
        >
          {lang.flag} {lang.name}
        </GlassButton>
      ))}
    </div>
  );
}
