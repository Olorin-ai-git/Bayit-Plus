/**
 * RTL Context for managing right-to-left language support
 * Handles dir attribute and document-level RTL state
 */

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface RTLContextType {
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  toggleDirection: () => void;
}

const RTLContext = createContext<RTLContextType | undefined>(undefined);

interface RTLProviderProps {
  children: ReactNode;
}

// RTL languages list (constant outside component to avoid re-creation)
const RTL_LANGUAGES = ['he', 'ar', 'fa', 'ur'];

/**
 * RTL Provider Component
 * Manages RTL state and updates document direction attribute
 */
export const RTLProvider: React.FC<RTLProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState<boolean>(false);

  // Update RTL state when language changes
  useEffect(() => {
    const updateRTL = (lng: string) => {
      const shouldBeRTL = RTL_LANGUAGES.includes(lng);
      setIsRTL(shouldBeRTL);

      // Update document direction attribute
      document.documentElement.dir = shouldBeRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;

      // Add/remove RTL class for Tailwind RTL plugin
      if (shouldBeRTL) {
        document.documentElement.classList.add('rtl');
      } else {
        document.documentElement.classList.remove('rtl');
      }
    };

    // Initial setup
    updateRTL(i18n.language);

    // Listen for language changes
    i18n.on('languageChanged', updateRTL);

    return () => {
      i18n.off('languageChanged', updateRTL);
    };
  }, [i18n]);

  const toggleDirection = () => {
    const newLang = isRTL ? 'en' : 'he';
    i18n.changeLanguage(newLang);
  };

  const direction: 'ltr' | 'rtl' = isRTL ? 'rtl' : 'ltr';

  // ✅ Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      isRTL,
      direction,
      toggleDirection,
    }),
    [isRTL, direction, toggleDirection]
  );

  return (
    <RTLContext.Provider value={value}>
      {children}
    </RTLContext.Provider>
  );
};

/**
 * Hook to access RTL context
 * @throws Error if used outside RTLProvider
 */
export const useRTL = (): RTLContextType => {
  const context = useContext(RTLContext);
  if (!context) {
    throw new Error('useRTL must be used within RTLProvider');
  }
  return context;
};
