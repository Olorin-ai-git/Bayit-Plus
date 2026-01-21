/**
 * Language Selector Component
 *
 * Dropdown for selecting the interface language.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
}

const languages: Language[] = [
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false },
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('b2b_language', langCode);
    setIsOpen(false);

    // Update document direction
    const lang = languages.find((l) => l.code === langCode);
    if (lang) {
      document.documentElement.dir = lang.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = langCode;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2
          rounded-xl
          bg-white/5 border border-white/10
          text-white/80 text-sm
          hover:bg-white/10 hover:border-white/20
          focus:outline-none focus:ring-2 focus:ring-partner-primary/50
          transition-all duration-200
        "
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-base">{currentLanguage.code === 'he' ? '🇮🇱' : currentLanguage.code === 'es' ? '🇪🇸' : '🇺🇸'}</span>
        <span>{currentLanguage.nativeName}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="
            absolute right-0 rtl:right-auto rtl:left-0 mt-2
            w-48
            rounded-xl border border-white/10
            bg-glass-card backdrop-blur-xl
            py-1
            shadow-xl shadow-black/30
            z-50
          "
          role="listbox"
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5
                text-left rtl:text-right
                text-sm
                hover:bg-white/10
                transition-colors
                ${lang.code === currentLanguage.code ? 'text-partner-primary bg-partner-primary/10' : 'text-white/80'}
              `}
              role="option"
              aria-selected={lang.code === currentLanguage.code}
            >
              <span className="text-base">
                {lang.code === 'he' ? '🇮🇱' : lang.code === 'es' ? '🇪🇸' : '🇺🇸'}
              </span>
              <span className="flex-1">{lang.nativeName}</span>
              {lang.code === currentLanguage.code && (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
