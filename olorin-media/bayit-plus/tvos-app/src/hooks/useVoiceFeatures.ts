/**
 * useVoiceFeatures - Voice Feature Detection and Capabilities Hook
 *
 * Ported from mobile for tvOS:
 * - Feature detection and capabilities checking
 * - Language support verification
 * - Voice health status
 * - Command suggestions
 *
 * TV SPECIFIC:
 * - TV voice timeout (45s vs 30s mobile)
 * - Menu button trigger capability check
 * - Siri integration support
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { speechService } from '../services/speech';
import { ttsService } from '../services/tts';
import { config } from '../config/appConfig';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useVoiceFeatures');

// ============================================
// Voice Health Check Hook
// ============================================

interface VoiceHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  speechRecognitionAvailable: boolean;
  ttsAvailable: boolean;
  microphoneAvailable: boolean;
  supportedLanguages: string[];
}

/**
 * Hook for checking voice service health and capabilities
 */
export const useVoiceHealth = (): VoiceHealth => {
  const [health, setHealth] = useState<VoiceHealth>({
    status: 'unavailable',
    speechRecognitionAvailable: false,
    ttsAvailable: false,
    microphoneAvailable: false,
    supportedLanguages: config.voice.languages,
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const permissions = await speechService.checkPermissions();

        // Determine overall health
        const speechRecognitionAvailable = permissions.speech;
        const microphoneAvailable = permissions.microphone;
        const ttsAvailable = true; // TTSModule availability

        let status: 'healthy' | 'degraded' | 'unavailable' = 'unavailable';
        if (speechRecognitionAvailable && microphoneAvailable) {
          status = 'healthy';
        } else if (microphoneAvailable || speechRecognitionAvailable) {
          status = 'degraded';
        }

        setHealth({
          status,
          speechRecognitionAvailable,
          ttsAvailable,
          microphoneAvailable,
          supportedLanguages: config.voice.languages,
        });
      } catch (error) {
        moduleLogger.error('Health check failed:', error);
        setHealth({
          status: 'unavailable',
          speechRecognitionAvailable: false,
          ttsAvailable: false,
          microphoneAvailable: false,
          supportedLanguages: config.voice.languages,
        });
      }
    };

    checkHealth();
  }, []);

  return health;
};

// ============================================
// Voice Language Support Hook
// ============================================

interface LanguageSupport {
  currentLanguage: string;
  supportedLanguages: string[];
  isLanguageSupported: (language: string) => boolean;
  setLanguage: (language: string) => Promise<void>;
}

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

// ============================================
// Voice Capabilities Hook
// ============================================

interface VoiceCapabilities {
  menuButtonTriggerAvailable: boolean;
  wakeWordAvailable: boolean;
  ttsAvailable: boolean;
  speechRecognitionAvailable: boolean;
  maxListeningDurationMs: number;
  suggestedTimeout: number;
  voiceFeaturesEnabled: boolean;
}

/**
 * Hook for checking TV-specific voice capabilities
 */
export const useVoiceCapabilities = (): VoiceCapabilities => {
  const health = useVoiceHealth();

  const menuButtonTriggerAvailable = true; // Always available on tvOS
  const wakeWordAvailable = config.features.wakeWord;
  const speechRecognitionAvailable = health.speechRecognitionAvailable;
  const ttsAvailable = health.ttsAvailable;
  const maxListeningDurationMs = config.voice.listenTimeoutMs; // 45s for TV
  const voiceFeaturesEnabled = config.features.voiceCommands;

  return {
    menuButtonTriggerAvailable,
    wakeWordAvailable,
    ttsAvailable,
    speechRecognitionAvailable,
    maxListeningDurationMs,
    suggestedTimeout: maxListeningDurationMs,
    voiceFeaturesEnabled,
  };
};

// ============================================
// Voice Command Suggestions Hook
// ============================================

interface CommandSuggestion {
  text: string;
  description: string;
  category: 'navigation' | 'playback' | 'search' | 'window';
}

/**
 * Hook for getting voice command suggestions
 */
export const useVoiceCommandSuggestions = (
  language: string = config.voice.defaultLanguage,
): CommandSuggestion[] => {
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);

  useEffect(() => {
    // TV-specific command suggestions
    const tvSuggestions: Record<string, CommandSuggestion[]> = {
      he: [
        {
          text: 'Open Home',
          description: 'Go to home screen',
          category: 'navigation',
        },
        {
          text: 'Search for drama',
          description: 'Search for dramas',
          category: 'search',
        },
        {
          text: 'Play Channel 13',
          description: 'Play live TV',
          category: 'playback',
        },
        {
          text: 'Open window 2',
          description: 'Open second window',
          category: 'window',
        },
        {
          text: 'Continue watching',
          description: 'Resume last video',
          category: 'playback',
        },
      ],
      en: [
        {
          text: 'Open Home',
          description: 'Go to home screen',
          category: 'navigation',
        },
        {
          text: 'Search for drama',
          description: 'Search for dramas',
          category: 'search',
        },
        {
          text: 'Play Channel 13',
          description: 'Play live TV',
          category: 'playback',
        },
        {
          text: 'Open window 2',
          description: 'Open second window',
          category: 'window',
        },
        {
          text: 'Continue watching',
          description: 'Resume last video',
          category: 'playback',
        },
      ],
      es: [
        {
          text: 'Open Home',
          description: 'Go to home screen',
          category: 'navigation',
        },
        {
          text: 'Search for drama',
          description: 'Search for dramas',
          category: 'search',
        },
        {
          text: 'Play Channel 13',
          description: 'Play live TV',
          category: 'playback',
        },
        {
          text: 'Open window 2',
          description: 'Open second window',
          category: 'window',
        },
        {
          text: 'Continue watching',
          description: 'Resume last video',
          category: 'playback',
        },
      ],
    };

    setSuggestions(tvSuggestions[language] || tvSuggestions.en);
  }, [language]);

  return suggestions;
};

// ============================================
// Composite Voice Features Hook
// ============================================

export interface VoiceFeaturesOptions {
  enableHealthCheck?: boolean;
  enableLanguageSupport?: boolean;
  defaultLanguage?: string;
}

/**
 * Composite hook combining all voice feature capabilities
 * Use this for comprehensive voice system information
 */
export const useVoiceFeatures = (options: VoiceFeaturesOptions = {}) => {
  const {
    enableHealthCheck = true,
    enableLanguageSupport = true,
    defaultLanguage = config.voice.defaultLanguage,
  } = options;

  const health = enableHealthCheck ? useVoiceHealth() : null;
  const languageSupport = enableLanguageSupport
    ? useVoiceLanguageSupport(defaultLanguage)
    : null;
  const capabilities = useVoiceCapabilities();
  const commandSuggestions = useVoiceCommandSuggestions(defaultLanguage);

  return {
    // Health
    health,
    isHealthy: health?.status === 'healthy',

    // Language support
    currentLanguage: languageSupport?.currentLanguage || defaultLanguage,
    supportedLanguages: languageSupport?.supportedLanguages || [],
    isLanguageSupported: languageSupport?.isLanguageSupported || (() => true),
    setLanguage: languageSupport?.setLanguage || (async () => {}),

    // Capabilities
    menuButtonTriggerAvailable: capabilities.menuButtonTriggerAvailable,
    wakeWordAvailable: capabilities.wakeWordAvailable,
    ttsAvailable: capabilities.ttsAvailable,
    speechRecognitionAvailable: capabilities.speechRecognitionAvailable,
    maxListeningDurationMs: capabilities.maxListeningDurationMs,
    voiceFeaturesEnabled: capabilities.voiceFeaturesEnabled,

    // Command suggestions
    commandSuggestions,
  };
};
