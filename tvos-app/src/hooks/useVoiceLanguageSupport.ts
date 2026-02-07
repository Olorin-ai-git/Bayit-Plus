/**
 * useVoiceLanguageSupport - Voice Language Support Hook
 *
 * Manages voice language support and switching
 */

import { useState, useCallback } from 'react';
import { speechService } from '../services/speech';
import { ttsService } from '../services/tts';
import { config } from '../config/appConfig';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useVoiceLanguageSupport');

import type { LanguageSupport } from './types/voiceFeatures.types';

export type { LanguageSupport };

/**
 * Hook for managing voice language support
 */
export const useVoiceLanguageSupport = (defaultLanguage: string = 'he'): LanguageSupport => {
  const [currentLanguage, setCurrentLanguage] = useState(defaultLanguage);

  const supportedLanguages = config.voice.languages;

  const isLanguageSupported = useCallback(
    (language: string): boolean => supportedLanguages.includes(language),
    [supportedLanguages],
  );

  const setLanguage = useCallback(
    async (language: string): Promise<void> => {
      if (!isLanguageSupported(language)) {
        moduleLogger.warn('Language not supported:', language);
        return;
      }

      try {
        await speechService.setLanguage(language);
        ttsService.setLanguage(language);
        setCurrentLanguage(language);
        moduleLogger.info('Voice language set to:', language);
      } catch (error) {
        moduleLogger.error('Failed to set language:', error);
      }
    },
    [isLanguageSupported],
  );

  return {
    currentLanguage,
    supportedLanguages,
    isLanguageSupported,
    setLanguage,
  };
};
