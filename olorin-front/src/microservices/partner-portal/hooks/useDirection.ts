/**
 * Direction Hook
 *
 * Provides RTL/LTR direction support based on current language.
 * NO HARDCODED VALUES - All configuration from environment variables.
 */

import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const RTL_LANGUAGES = ['he', 'ar', 'fa'];

export function useDirection() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const isRTL = useMemo(
    () => RTL_LANGUAGES.includes(currentLanguage),
    [currentLanguage]
  );

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [isRTL, currentLanguage]);

  const direction = isRTL ? 'rtl' : 'ltr';
  const flexDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';
  const marginStart = isRTL ? 'mr' : 'ml';
  const marginEnd = isRTL ? 'ml' : 'mr';
  const paddingStart = isRTL ? 'pr' : 'pl';
  const paddingEnd = isRTL ? 'pl' : 'pr';

  return {
    isRTL,
    direction,
    flexDirection,
    textAlign,
    marginStart,
    marginEnd,
    paddingStart,
    paddingEnd,
    currentLanguage,
  };
}

export function useDirectionClass(
  ltrClass: string,
  rtlClass: string
): string {
  const { isRTL } = useDirection();
  return isRTL ? rtlClass : ltrClass;
}
