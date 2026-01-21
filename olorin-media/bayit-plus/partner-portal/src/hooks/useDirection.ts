/**
 * useDirection Hook
 *
 * RTL/LTR direction management for i18n support.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DirectionHelpers {
  isRTL: boolean;
  direction: 'rtl' | 'ltr';
  flexDirection: 'row-reverse' | 'row';
  textAlign: 'right' | 'left';
}

const RTL_LANGUAGES = ['he', 'ar', 'fa', 'ur'];

export function useDirection(): DirectionHelpers {
  const { i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState(() => RTL_LANGUAGES.includes(i18n.language));

  useEffect(() => {
    const checkRTL = RTL_LANGUAGES.includes(i18n.language);
    setIsRTL(checkRTL);

    // Update document direction
    document.documentElement.dir = checkRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return {
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    textAlign: isRTL ? 'right' : 'left',
  };
}

export default useDirection;
