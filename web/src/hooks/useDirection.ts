import { useState, useEffect } from 'react';
import i18n from '@bayit/shared-i18n';

type Direction = 'rtl' | 'ltr';
type FlexDirection = 'row' | 'row-reverse';
type TextAlign = 'left' | 'right';

interface DirectionResult {
  isRTL: boolean;
  direction: Direction;
  flexDirection: FlexDirection;
  textAlign: TextAlign;
}

const RTL_LANGUAGES = ['he', 'ar'];

export const useDirection = (): DirectionResult => {
  const [isRTL, setIsRTL] = useState(() => {
    return RTL_LANGUAGES.includes(i18n.language);
  });

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      const rtl = RTL_LANGUAGES.includes(lng);
      setIsRTL(rtl);

      // Update document direction for web
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;
    };

    // Set initial direction
    handleLanguageChange(i18n.language);

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    textAlign: isRTL ? 'right' : 'left',
  };
};

export default useDirection;
