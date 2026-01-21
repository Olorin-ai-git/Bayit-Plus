import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

/**
 * LanguageSelector Component
 * Multi-language selector with support for 5 languages
 * Used across all Olorin portals
 */
const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-selector flex items-center space-x-2">
      <Globe className="w-5 h-5 text-wizard-text-secondary" />
      <select
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="bg-transparent text-wizard-text-primary border border-wizard-border-primary rounded-lg px-3 py-1 focus:outline-none focus:border-wizard-accent-purple transition-colors cursor-pointer"
        aria-label="Select language"
      >
        <option value="en">EN</option>
        <option value="fr">FR</option>
        <option value="es">ES</option>
        <option value="it">IT</option>
        <option value="zh">中文</option>
      </select>
    </div>
  );
};

export { LanguageSelector };
