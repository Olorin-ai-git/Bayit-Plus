/**
 * Voice Support Hook
 * Provides voice interaction functionality for support components
 */

import { useCallback, useEffect, useState } from 'react';
import { useSupportStore } from '../stores/supportStore';
import { voiceSupportService } from '../services/voiceSupportService';
import { supportConfig } from '../config/supportConfig';

interface UseVoiceSupportReturn {
  // State
  voiceState: ReturnType<typeof useSupportStore>['voiceState'];
  currentTranscript: string;
  lastResponse: string;
  isVoiceModalOpen: boolean;
  isSupported: boolean;
  hasPermission: boolean;

  // Actions
  startListening: () => Promise<void>;
  stopListening: () => void;
  interrupt: () => void;
  openVoiceModal: () => void;
  closeVoiceModal: () => void;
  resetConversation: () => void;
  requestPermission: () => Promise<boolean>;
}

export function useVoiceSupport(): UseVoiceSupportReturn {
  const {
    voiceState,
    currentTranscript,
    lastResponse,
    isVoiceModalOpen,
    setVoiceState,
    openVoiceModal,
    closeVoiceModal,
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

    // Reset state
    setVoiceState('idle');
    closeVoiceModal();
  }, [voiceState, stopListening, interrupt, setVoiceState, closeVoiceModal]);

  return {
    voiceState,
    currentTranscript,
    lastResponse,
    isVoiceModalOpen,
    isSupported,
    hasPermission,
    startListening,
    stopListening,
    interrupt,
    openVoiceModal,
    closeVoiceModal: handleCloseVoiceModal,
    resetConversation,
    requestPermission,
  };
}

export default useVoiceSupport;
