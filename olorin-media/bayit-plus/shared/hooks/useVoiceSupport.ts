/**
 * Voice Support Hook
 * Provides voice interaction functionality for support components
 */

import { useCallback, useEffect, useState } from 'react';
import { useSupportStore } from '../stores/supportStore';
import { voiceSupportService } from '../services/voiceSupportService';
import { ttsService } from '../services/ttsService';
import { supportConfig } from '../config/supportConfig';
import i18n from '../i18n';
import { logger } from '../utils/logger';

// Scoped logger for voice support with voice-specific context
const voiceSupportLogger = logger.scope('VoiceSupport');

interface UseVoiceSupportReturn {
  // State
  voiceState: ReturnType<typeof useSupportStore>['voiceState'];
  currentTranscript: string;
  lastResponse: string;
  isVoiceModalOpen: boolean;
  isSupported: boolean;
  hasPermission: boolean;
  hasPlayedSessionIntro: boolean;
  currentIntroText: string | null;

  // Actions
  startListening: () => Promise<void>;
  stopListening: () => void;
  interrupt: () => void;
  openVoiceModal: () => void;
  closeVoiceModal: () => void;
  resetConversation: () => void;
  requestPermission: () => Promise<boolean>;
  /** Play wizard intro message (first-time session interaction) */
  playIntro: () => Promise<void>;
  /** Activate voice assistant with optional intro (called when FAB is pressed) */
  activateVoiceAssistant: () => Promise<void>;
}

export function useVoiceSupport(): UseVoiceSupportReturn {
  const {
    voiceState,
    currentTranscript,
    lastResponse,
    isVoiceModalOpen,
    hasPlayedSessionIntro,
    currentIntroText,
    setVoiceState,
    openVoiceModal,
    closeVoiceModal,
    setSessionIntroPlayed,
    setCurrentIntroText,
  } = useSupportStore();

  const [hasPermission, setHasPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Check support and permission on mount
  useEffect(() => {
    const checkSupport = async () => {
      const supported = voiceSupportService.isSupported();
      setIsSupported(supported);

      if (supported) {
        // Check if we already have permission
        try {
          const permissionStatus = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });
          setHasPermission(permissionStatus.state === 'granted');

          // Listen for permission changes
          permissionStatus.onchange = () => {
            setHasPermission(permissionStatus.state === 'granted');
          };
        } catch (error) {
          // Some browsers don't support permission query
          voiceSupportLogger.debug('Permission query not supported', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };

    checkSupport();
  }, []);

  // Subscribe to voice service events
  useEffect(() => {
    const handleStateChange = (state: typeof voiceState) => {
      voiceSupportLogger.info('Voice state changed', {
        state,
        previousState: voiceState,
      });
    };

    const handleError = (error: Error) => {
      voiceSupportLogger.error('Voice service error', {
        error: error.message,
        stack: error.stack,
      });
    };

    voiceSupportService.on('stateChange', handleStateChange);
    voiceSupportService.on('error', handleError);

    return () => {
      voiceSupportService.off('stateChange', handleStateChange);
      voiceSupportService.off('error', handleError);
    };
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    if (!isSupported) {
      voiceSupportLogger.warn('Voice not supported on platform', {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      });
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        voiceSupportLogger.warn('Microphone permission denied', {
          isSupported,
        });
        return;
      }
    }

    await voiceSupportService.startListening();
  }, [isSupported, hasPermission]);

  // Stop listening
  const stopListening = useCallback(() => {
    voiceSupportService.stopListening();
  }, []);

  // Interrupt speech
  const interrupt = useCallback(() => {
    voiceSupportService.interrupt();
  }, []);

  // Reset conversation
  const resetConversation = useCallback(() => {
    voiceSupportService.resetConversation();
  }, []);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await voiceSupportService.requestPermission();
    setHasPermission(granted);
    return granted;
  }, []);

  // Handle modal close with cleanup
  const handleCloseVoiceModal = useCallback(() => {
    // Stop any ongoing interaction
    if (voiceState === 'listening') {
      stopListening();
    } else if (voiceState === 'speaking') {
      interrupt();
    }

    // Clear intro text if present
    setCurrentIntroText(null);

    // Reset state
    setVoiceState('idle');
    closeVoiceModal();
  }, [voiceState, stopListening, interrupt, setVoiceState, closeVoiceModal, setCurrentIntroText]);

  // Helper function to play intro with TTS (defined first to avoid circular dependency)
  const playIntroWithTTS = useCallback((introText: string, resolve: () => void, reject: (error: unknown) => void) => {
    const supportVoiceId = supportConfig.voiceAssistant.supportVoice.voiceId;

    ttsService.speak(introText, 'high', supportVoiceId, {
      onStart: () => {
        voiceSupportLogger.info('Intro TTS playback started', {
          textLength: introText.length,
          voiceId: supportVoiceId,
          language: i18n.language,
        });
      },
      onComplete: () => {
        voiceSupportLogger.info('Intro TTS playback completed', {
          textLength: introText.length,
          voiceId: supportVoiceId,
        });
        setSessionIntroPlayed(true);
        setCurrentIntroText(null);
        setVoiceState('idle');
        resolve();
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Voice synthesis unavailable';
        voiceSupportLogger.error('Intro TTS playback failed', {
          error: errorMessage,
          textLength: introText.length,
          voiceId: supportVoiceId,
          stack: error instanceof Error ? error.stack : undefined,
        });

        voiceSupportLogger.warn('Gracefully degrading from TTS failure', {
          errorMessage,
          willShowErrorBriefly: true,
        });

        // Determine error type for better user messaging
        const errorType = errorMessage.includes('Authentication') || errorMessage.includes('auth')
          ? 'authentication'
          : errorMessage.includes('connect') || errorMessage.includes('fetch')
          ? 'connection'
          : 'tts';

        // Set error in store for UI display
        useSupportStore.getState().setVoiceError({
          type: errorType as 'mic' | 'connection' | 'tts',
          message: errorMessage.includes('backend')
            ? 'Voice unavailable. Please ensure you are logged in.'
            : errorMessage
        });

        // Mark intro as played anyway to avoid repeated failures
        setSessionIntroPlayed(true);
        setCurrentIntroText(null);

        // Show error state briefly
        setVoiceState('error');
        setTimeout(() => {
          setVoiceState('idle');
          // Resolve instead of reject to allow voice assistant to continue
          resolve();
        }, 2000);
      },
    });
  }, [setVoiceState, setCurrentIntroText, setSessionIntroPlayed]);

  // Play wizard intro message
  const playIntro = useCallback(async (): Promise<void> => {
    // Get intro message for current language
    const currentLang = (i18n.language || 'en') as 'en' | 'he' | 'es';
    const introMessages = supportConfig.voiceAssistant.wizardIntro;
    const introText = introMessages[currentLang] || introMessages.en;

    voiceSupportLogger.info('Playing wizard intro', {
      language: currentLang,
      textPreview: introText.substring(0, 50),
      textLength: introText.length,
      usePrerecorded: supportConfig.voiceAssistant.usePrerecordedIntro,
    });

    // Set speaking state and intro text for modal display
    setVoiceState('speaking');
    setCurrentIntroText(introText);

    // Check if we should use pre-recorded audio
    const introAudioPaths = supportConfig.voiceAssistant.wizardIntroAudio;
    const audioPath = introAudioPaths[currentLang] || '';

    if (supportConfig.voiceAssistant.usePrerecordedIntro && audioPath) {
      voiceSupportLogger.info('Using pre-recorded intro audio', {
        audioPath,
        language: currentLang,
      });

      return new Promise<void>((resolve, reject) => {
        const audio = new Audio(audioPath);

        audio.onplay = () => {
          voiceSupportLogger.debug('Pre-recorded intro playback started', {
            audioPath,
          });
        };

        audio.onended = () => {
          voiceSupportLogger.info('Pre-recorded intro playback completed', {
            audioPath,
          });
          setSessionIntroPlayed(true);
          setCurrentIntroText(null);
          setVoiceState('idle');
          resolve();
        };

        audio.onerror = (error) => {
          voiceSupportLogger.error('Pre-recorded intro playback error', {
            error,
            audioPath,
          });
          voiceSupportLogger.info('Falling back to TTS', {
            audioPath,
          });
          playIntroWithTTS(introText, resolve, reject);
        };

        audio.play().catch((error) => {
          voiceSupportLogger.error('Failed to play pre-recorded audio', {
            error: error instanceof Error ? error.message : String(error),
            audioPath,
          });
          playIntroWithTTS(introText, resolve, reject);
        });
      });
    }

    // Use live TTS generation
    return new Promise<void>((resolve, reject) => {
      playIntroWithTTS(introText, resolve, reject);
    });
  }, [setVoiceState, setCurrentIntroText, setSessionIntroPlayed, playIntroWithTTS]);

  // Activate voice assistant with optional intro (called when FAB is pressed)
  const activateVoiceAssistant = useCallback(async (): Promise<void> => {
    voiceSupportLogger.info('Activating voice assistant', {
      hasPlayedSessionIntro,
      language: i18n.language,
      isSupported,
      hasPermission,
    });

    // Open the voice modal first
    openVoiceModal();

    // Check if first time this session
    if (!hasPlayedSessionIntro) {
      // Play intro message
      await playIntro();
      // After intro, start listening for user input
      voiceSupportLogger.info('Intro completed, starting listening', {
        language: i18n.language,
      });
      await startListening();
    } else {
      // Start listening immediately (no intro needed)
      voiceSupportLogger.info('Skipping intro, starting listening', {
        hasPlayedSessionIntro: true,
      });
      await startListening();
    }
  }, [hasPlayedSessionIntro, openVoiceModal, playIntro, startListening, isSupported, hasPermission]);

  return {
    voiceState,
    currentTranscript,
    lastResponse,
    isVoiceModalOpen,
    isSupported,
    hasPermission,
    hasPlayedSessionIntro,
    currentIntroText,
    startListening,
    stopListening,
    interrupt,
    openVoiceModal,
    closeVoiceModal: handleCloseVoiceModal,
    resetConversation,
    requestPermission,
    playIntro,
    activateVoiceAssistant,
  };
}

export default useVoiceSupport;
