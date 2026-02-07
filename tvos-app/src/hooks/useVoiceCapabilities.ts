/**
 * useVoiceCapabilities - TV-Specific Voice Capabilities Hook
 *
 * Checks TV-specific voice capabilities including
 * menu button trigger, wake word, TTS, and speech recognition.
 */

import { config } from '../config/appConfig';
import { useVoiceHealth } from './useVoiceHealth';

import type { VoiceCapabilities } from './types/voiceFeatures.types';

export type { VoiceCapabilities };

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
