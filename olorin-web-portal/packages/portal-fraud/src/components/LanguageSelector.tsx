import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English' },
    // Additional languages can be added when translations are ready
  ];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="flex items-center space-x-2">
      <Globe className="h-4 w-4 text-wizard-text-muted" />
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="wizard-select text-sm py-1 px-2"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
