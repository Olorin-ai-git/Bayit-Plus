/**
 * GlassLanguageSelector Component
 * Multi-language selector with glassmorphic styling
 * Supports all 10 languages from @olorin/shared-i18n
 *
 * Languages: English, Hebrew, Spanish, Chinese, French, Italian, Hindi, Tamil, Bengali, Japanese
 *
 * @example
 * <GlassLanguageSelector />
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { languages } from '@olorin/shared-i18n';
import { saveLanguageWeb } from '@olorin/shared-i18n/web';
import { GlassCard } from './GlassCard';

export const GlassLanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    await saveLanguageWeb(lng as any);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Screen reader announcement region (WCAG 4.1.3) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {currentLanguage && `Current language: ${currentLanguage.name}`}
      </div>

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-white transition-all duration-200 hover:bg-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-wizard-accent-purple/50 min-h-[44px]"
        aria-label={`Select language. Current: ${currentLanguage.name}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-5 h-5 text-wizard-accent-purple" />
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="text-sm font-medium hidden sm:inline">{currentLanguage.name}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 z-50">
          <GlassCard className="p-2 shadow-2xl border border-white/20">
            <div className="max-h-80 overflow-y-auto">
              {languages.map((language) => {
                const isSelected = i18n.language === language.code;

                return (
                  <button
                    key={language.code}
                    onClick={() => changeLanguage(language.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-left min-h-[44px] ${
                      isSelected
                        ? 'bg-wizard-accent-purple/20 text-wizard-accent-purple'
                        : 'text-white hover:bg-white/10'
                    }`}
                    role="menuitem"
                    aria-current={isSelected ? 'true' : undefined}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{language.flag}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{language.name}</span>
                        <span className="text-xs text-white/60">{language.nativeName}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-wizard-accent-purple" />
                    )}
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default GlassLanguageSelector;
