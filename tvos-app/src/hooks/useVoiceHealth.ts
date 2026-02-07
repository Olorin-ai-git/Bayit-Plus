/**
 * useVoiceHealth - Voice Health Check Hook
 *
 * Checks voice service health and capabilities
 */

import { useEffect, useState } from 'react';
import { speechService } from '../services/speech';
import { config } from '../config/appConfig';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useVoiceHealth');

import type { VoiceHealth } from './types/voiceFeatures.types';

export type { VoiceHealth };

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

        const speechRecognitionAvailable = permissions.speech;
        const microphoneAvailable = permissions.microphone;
        const ttsAvailable = true;

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
