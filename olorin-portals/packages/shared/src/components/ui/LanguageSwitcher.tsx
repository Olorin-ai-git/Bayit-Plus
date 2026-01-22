/**
 * Language Switcher Component
 * Toggles between English and Hebrew with RTL support
 */

import React from 'react';
import { Globe } from 'lucide-react';
import { useRTL } from '../../contexts/RTLContext';
import { useTranslation } from 'react-i18next';
import { GlassButton } from './GlassButton';

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { isRTL, toggleDirection } = useRTL();
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;
  const languageLabel = currentLanguage === 'he' ? 'עב' : 'EN';

  return (
    <GlassButton
      onClick={toggleDirection}
      variant="ghost"
      size="sm"
      className={`flex items-center gap-2 min-w-[88px] ${className}`}
      aria-label={isRTL ? 'Switch to English' : 'עבור לעברית'}
      title={isRTL ? 'Switch to English' : 'Switch to Hebrew'}
    >
      <Globe className="w-5 h-5 text-white" aria-hidden="true" />
      <span className="text-white font-medium">{languageLabel}</span>
    </GlassButton>
  );
};
