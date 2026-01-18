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
          console.log('[VoiceSupport] Cannot query permission status');
        }
      }
    };

    checkSupport();
  }, []);

  // Subscribe to voice service events
  useEffect(() => {
    const handleStateChange = (state: typeof voiceState) => {
      console.log('[VoiceSupport] State changed:', state);
    };

    const handleError = (error: Error) => {
      console.error('[VoiceSupport] Error:', error);
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
      console.warn('[VoiceSupport] Voice not supported on this platform');
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        console.warn('[VoiceSupport] Microphone permission denied');
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
        console.log('[VoiceSupport] Intro TTS started');
      },
      onComplete: () => {
        console.log('[VoiceSupport] Intro TTS completed');
        setSessionIntroPlayed(true);
        setCurrentIntroText(null);
        setVoiceState('idle');
        resolve();
      },
      onError: (error) => {
        console.error('[VoiceSupport] Intro TTS error:', error);
        setCurrentIntroText(null);
        setVoiceState('error');
        setTimeout(() => {
          setVoiceState('idle');
        }, 3000);
        reject(error);
      },
    });
  }, [setVoiceState, setCurrentIntroText, setSessionIntroPlayed]);

  // Play wizard intro message
  const playIntro = useCallback(async (): Promise<void> => {
    // Get intro message for current language
    const currentLang = (i18n.language || 'en') as 'en' | 'he' | 'es';
    const introMessages = supportConfig.voiceAssistant.wizardIntro;
    const introText = introMessages[currentLang] || introMessages.en;

    console.log('[VoiceSupport] Playing intro:', { language: currentLang, text: introText.substring(0, 50) });

    // Set speaking state and intro text for modal display
    setVoiceState('speaking');
    setCurrentIntroText(introText);

    // Check if we should use pre-recorded audio
    const introAudioPaths = supportConfig.voiceAssistant.wizardIntroAudio;
    const audioPath = introAudioPaths[currentLang] || '';

    if (supportConfig.voiceAssistant.usePrerecordedIntro && audioPath) {
      console.log('[VoiceSupport] Using pre-recorded intro audio:', audioPath);

      return new Promise<void>((resolve, reject) => {
        const audio = new Audio(audioPath);

        audio.onplay = () => {
          console.log('[VoiceSupport] Pre-recorded intro started');
        };

        audio.onended = () => {
          console.log('[VoiceSupport] Pre-recorded intro completed');
          setSessionIntroPlayed(true);
          setCurrentIntroText(null);
          setVoiceState('idle');
          resolve();
        };

        audio.onerror = (error) => {
          console.error('[VoiceSupport] Pre-recorded intro error:', error);
          // Fallback to TTS if pre-recorded audio fails
          console.log('[VoiceSupport] Falling back to TTS');
          playIntroWithTTS(introText, resolve, reject);
        };

        audio.play().catch((error) => {
          console.error('[VoiceSupport] Failed to play pre-recorded audio:', error);
          // Fallback to TTS
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
    console.log('[VoiceSupport] Activating voice assistant', { hasPlayedSessionIntro });

    // Open the voice modal first
    openVoiceModal();

    // Check if first time this session
    if (!hasPlayedSessionIntro) {
      // Play intro message
      await playIntro();
      // After intro, start listening for user input
      console.log('[VoiceSupport] Intro complete, starting to listen');
      await startListening();
    } else {
      // Start listening immediately (no intro needed)
      console.log('[VoiceSupport] No intro needed, starting to listen');
      await startListening();
    }
  }, [hasPlayedSessionIntro, openVoiceModal, playIntro, startListening]);

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
