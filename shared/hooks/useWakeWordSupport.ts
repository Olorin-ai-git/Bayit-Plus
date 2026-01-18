/**
 * Wake Word Support Hook
 * Integrates wake word detection with voice support (Olorin wizard)
 * Automatically opens voice modal when "Jarvis" (temporary) / "Olorin" (intended) is detected
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSupportStore } from '../stores/supportStore';
import { voiceSupportService } from '../services/voiceSupportService';
import { supportConfig } from '../config/supportConfig';
import { VoiceSystemType, getWakeWordConfig } from '../utils/porcupineWakeWordDetector';

interface UseWakeWordSupportOptions {
  enabled?: boolean;
  onWakeWordDetected?: () => void;
  onError?: (error: Error) => void;
}

interface UseWakeWordSupportReturn {
  isListeningForWakeWord: boolean;
  startWakeWordDetection: () => Promise<void>;
  stopWakeWordDetection: () => void;
  isSupported: boolean;
}

export function useWakeWordSupport(
  options: UseWakeWordSupportOptions = {}
): UseWakeWordSupportReturn {
  const {
    enabled = supportConfig.voiceAssistant.wakeWordEnabled,
    onWakeWordDetected,
    onError,
  } = options;

  const { isVoiceModalOpen, openVoiceModal, voiceState } = useSupportStore();
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const detectorRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Check if wake word detection is supported
  const isSupported = typeof window !== 'undefined' &&
    supportConfig.platforms[getCurrentPlatform()]?.wakeWord === true;

  // Initialize wake word detector for Support system (Olorin)
  const initializeDetector = useCallback(async () => {
    if (!enabled || !isSupported || isInitializedRef.current) {
      return;
    }

    try {
      // Dynamically import to avoid loading on unsupported platforms
      const {
        PorcupineWakeWordDetector,
        getPicovoiceAccessKey,
        getWakeWordConfig: getConfig,
      } = await import('../utils/porcupineWakeWordDetector');

      const accessKey = getPicovoiceAccessKey();
      if (!accessKey) {
        console.warn('[WakeWordSupport] No Picovoice access key configured');
        return;
      }

      // Get Support system wake word config (Jarvis temporarily, Olorin intended)
      const supportConfig = getConfig('support');
      console.log(`[WakeWordSupport] Initializing for Support system (Olorin)...`);
      console.log(`[WakeWordSupport] Wake word: "${supportConfig.builtInKeyword}" (intended: "${supportConfig.customPhrase}")`);

      // Create detector for support system
      detectorRef.current = new PorcupineWakeWordDetector();

      // Initialize with support system type
      await detectorRef.current.initialize(
        accessKey,
        supportConfig.customModelPath,
        0.6, // sensitivity
        'support'
      );

      isInitializedRef.current = true;
      console.log(`[WakeWordSupport] Support system ready - say "${supportConfig.builtInKeyword}" to activate Olorin`);
    } catch (error) {
      console.error('[WakeWordSupport] Failed to initialize detector:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to initialize wake word detector'));
    }
  }, [enabled, isSupported, onError]);

  // Handle wake word detection for Support system
  const handleWakeWordDetected = useCallback((keywordIndex: number, system: VoiceSystemType) => {
    // Only respond to support system wake word
    if (system !== 'support') {
      console.log('[WakeWordSupport] Ignoring wake word - not for support system:', system);
      return;
    }

    const supportWakeWord = getWakeWordConfig('support');
    console.log(`[WakeWordSupport] Olorin wake word "${supportWakeWord.builtInKeyword}" detected!`);

    // Don't activate if already in voice interaction
    if (voiceState !== 'idle' || isVoiceModalOpen) {
      console.log('[WakeWordSupport] Already in voice interaction, ignoring');
      return;
    }

    // Stop listening for wake word during interaction
    stopWakeWordDetection();

    // Open voice modal for Olorin support
    openVoiceModal();

    // Start listening immediately
    setTimeout(() => {
      voiceSupportService.startListening();
    }, 500);

    onWakeWordDetected?.();
  }, [voiceState, isVoiceModalOpen, openVoiceModal, onWakeWordDetected]);

  // Handle detector errors
  const handleDetectorError = useCallback(
    (error: Error) => {
      console.error('[WakeWordSupport] Detector error:', error);
      setIsListeningForWakeWord(false);
      onError?.(error);
    },
    [onError]
  );

  // Start wake word detection for Support system
  const startWakeWordDetection = useCallback(async () => {
    if (!isSupported || isListeningForWakeWord) {
      return;
    }

    try {
      // Initialize if needed
      if (!isInitializedRef.current) {
        await initializeDetector();
      }

      if (detectorRef.current) {
        await detectorRef.current.start(handleWakeWordDetected);
        setIsListeningForWakeWord(true);
        const supportWakeWord = getWakeWordConfig('support');
        console.log(`[WakeWordSupport] Listening for Olorin wake word "${supportWakeWord.builtInKeyword}"...`);
      }
    } catch (error) {
      console.error('[WakeWordSupport] Failed to start detection:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to start wake word detection'));
    }
  }, [isSupported, isListeningForWakeWord, initializeDetector, handleWakeWordDetected, onError]);

  // Stop wake word detection
  const stopWakeWordDetection = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.stop();
      setIsListeningForWakeWord(false);
      console.log('[WakeWordSupport] Stopped listening for wake word');
    }
  }, []);

  // Auto-start detection when voice modal closes
  useEffect(() => {
    if (!isVoiceModalOpen && voiceState === 'idle' && enabled && isSupported) {
      // Restart wake word detection after modal closes
      const timer = setTimeout(() => {
        startWakeWordDetection();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isVoiceModalOpen, voiceState, enabled, isSupported, startWakeWordDetection]);

  // Initialize on mount if enabled
  useEffect(() => {
    if (enabled && isSupported) {
      initializeDetector();
    }

    return () => {
      // Cleanup on unmount
      if (detectorRef.current) {
        detectorRef.current.release();
        detectorRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [enabled, isSupported, initializeDetector]);

  return {
    isListeningForWakeWord,
    startWakeWordDetection,
    stopWakeWordDetection,
    isSupported,
  };
}

/**
 * Get current platform identifier
 */
function getCurrentPlatform(): keyof typeof supportConfig.platforms {
  if (typeof window === 'undefined') {
    return 'web'; // SSR default
  }

  // Check for TV platforms
  if (
    navigator.userAgent.includes('TV') ||
    navigator.userAgent.includes('SmartTV') ||
    navigator.userAgent.includes('Apple TV')
  ) {
    if (navigator.userAgent.includes('Apple TV')) {
      return 'tvos';
    }
    return 'androidtv';
  }

  // Check for mobile platforms
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    return 'ios';
  }

  if (/Android/.test(navigator.userAgent)) {
    return 'android';
  }

  return 'web';
}

export default useWakeWordSupport;
