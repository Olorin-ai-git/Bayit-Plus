import { useState, useEffect } from 'react';
import { I18nManager, FlexStyle, TextStyle } from 'react-native';
import i18n from '../i18n';
import { languages } from '../i18n';

type Direction = 'rtl' | 'ltr';
type FlexDirection = 'row' | 'row-reverse';
type TextAlign = 'left' | 'right';

interface DirectionResult {
  isRTL: boolean;
  direction: Direction;
  flexDirection: FlexDirection;
  textAlign: TextAlign;
}

export const useDirection = (): DirectionResult => {
  const [isRTL, setIsRTL] = useState(() => {
    const lang = languages.find(l => l.code === i18n.language);
    return lang?.rtl ?? true;
  });

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      const lang = languages.find(l => l.code === lng);
      const rtl = lang?.rtl ?? true;
      setIsRTL(rtl);

      // Update React Native's I18nManager for native RTL support
      if (I18nManager.isRTL !== rtl) {
        I18nManager.allowRTL(rtl);
        I18nManager.forceRTL(rtl);
      }
    };

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
