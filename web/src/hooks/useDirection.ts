import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { announceToScreenReader, getLanguageName } from '../utils/accessibility';

type Direction = 'rtl' | 'ltr';
type FlexDirection = 'row' | 'row-reverse';
type TextAlign = 'left' | 'right';
type JustifyContent = 'flex-start' | 'flex-end';
type AlignItems = 'flex-start' | 'flex-end';

interface DirectionResult {
  isRTL: boolean;
  direction: Direction;
  flexDirection: FlexDirection;  // always 'row', document.dir handles visual direction
  textAlign: TextAlign;
  justifyContent: JustifyContent;  // always 'flex-start', document.dir handles visual direction
  alignItems: AlignItems;          // always 'flex-start', document.dir handles visual direction
}

const RTL_LANGUAGES = ['he', 'ar'];

// Check if language is RTL (handles both 'he' and 'he-IL' formats)
const isRTLLanguage = (lng: string): boolean => {
  const langCode = lng?.split('-')[0]?.toLowerCase() || '';
  return RTL_LANGUAGES.includes(langCode);
};

export const useDirection = (): DirectionResult => {
  const { i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState(() => {
    return isRTLLanguage(i18n.language);
  });

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      const rtl = isRTLLanguage(lng);
      setIsRTL(rtl);

      // Only update the language attribute initially
      document.documentElement.lang = lng;

      // Wait for splash screen to be removed before changing direction
      // This keeps the splash screen RTL while allowing the app to switch based on language
      const updateDirection = () => {
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';

        // Announce language change to screen readers (WCAG 4.1.3)
        const languageName = getLanguageName(lng);
        announceToScreenReader(
          `Language changed to ${languageName}`,
          { delay: 200, assertive: false }
        );
      };

      if ((window as any).splashScreenRemoved) {
        // Splash already removed, safe to change direction immediately
        updateDirection();
      } else {
        // Wait for splash removal event
        const handleSplashRemoved = () => {
          updateDirection();
          window.removeEventListener('splashRemoved', handleSplashRemoved);
        };
        window.addEventListener('splashRemoved', handleSplashRemoved);
      }
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
    flexDirection: 'row' as FlexDirection, // document.dir handles the visual direction
    textAlign: isRTL ? 'right' : 'left',
    justifyContent: 'flex-start' as JustifyContent, // document.dir handles the visual direction
    alignItems: 'flex-start' as AlignItems, // document.dir handles the visual direction
  };
};

export default useDirection;
