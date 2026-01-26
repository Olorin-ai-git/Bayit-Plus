/**
 * useMenuButtonVoice - tvOS Menu Button Long-Press Voice Trigger Hook
 *
 * TV-SPECIFIC HOOK
 *
 * Detects Menu button long-press (500ms) on tvOS Siri Remote and triggers voice listening:
 * - Long-press detection for Menu button
 * - Debouncing to prevent multiple triggers
 * - Integration with voice manager
 * - Focus-aware visual feedback
 * - Timeout handling
 *
 * tvOS Remote Buttons:
 * - Menu (long-press): Voice activation
 * - Select: Confirm
 * - Up/Down/Left/Right: Navigation
 * - Play/Pause: Media control
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { config } from '../config/appConfig';
import { useVoiceStore } from '../stores/voiceStore';

import logger from '@/utils/logger';

const moduleLogger = logger.scope('useMenuButtonVoice');

export interface UseMenuButtonVoiceResult {
  isMenuButtonPressed: boolean;
  isListeningMode: boolean;
  startListening: () => void;
  stopListening: () => void;
  onMenuButtonDown: () => void;
  onMenuButtonUp: () => void;
}

/**
 * Hook for detecting Menu button long-press and triggering voice listening
 * This is the primary voice trigger method on tvOS
 */
export function useMenuButtonVoice(): UseMenuButtonVoiceResult {
  const voiceStore = useVoiceStore();

  const [isMenuButtonPressed, setIsMenuButtonPressed] = useState(false);
  const [isListeningMode, setIsListeningMode] = useState(false);

  const menuButtonPressTimeRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Configuration from app config
  const longPressDuration = config.tv.menuButtonLongPressDurationMs; // 500ms
  const listenTimeout = config.voice.listenTimeoutMs; // 45s

  // Start voice listening
  const startListening = useCallback(() => {
    if (isListeningMode) return;

    setIsListeningMode(true);
    voiceStore.startListening('menu-button');

    moduleLogger.info('Voice listening started via Menu button long-press');

    // Set timeout for maximum listening duration (45s)
    listeningTimeoutRef.current = setTimeout(() => {
      stopListening();
      moduleLogger.warn('Voice listening timeout reached (45s)');
    }, listenTimeout);
  }, [isListeningMode, voiceStore, listenTimeout]);

  // Stop voice listening
  const stopListening = useCallback(() => {
    if (!isListeningMode) return;

    setIsListeningMode(false);
    voiceStore.stopListening();

    // Clear timeout
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
      listeningTimeoutRef.current = null;
    }

    moduleLogger.info('Voice listening stopped');
  }, [isListeningMode, voiceStore]);

  // Handle Menu button press down
  const onMenuButtonDown = useCallback(() => {
    // Ignore if already listening
    if (isListeningMode) return;

    setIsMenuButtonPressed(true);
    menuButtonPressTimeRef.current = Date.now();

    // Set up long-press detection (500ms)
    longPressTimeoutRef.current = setTimeout(() => {
      const pressDuration = Date.now() - (menuButtonPressTimeRef.current || 0);

      if (pressDuration >= longPressDuration) {
        // Long-press detected - start listening
        startListening();
      }
    }, longPressDuration);

    moduleLogger.debug('Menu button pressed');
  }, [isListeningMode, startListening, longPressDuration]);

  // Handle Menu button press up
  const onMenuButtonUp = useCallback(() => {
    if (!isMenuButtonPressed) return;

    const pressDuration = Date.now() - (menuButtonPressTimeRef.current || 0);

    // Clear long-press timeout if it was a short press
    if (longPressTimeoutRef.current && pressDuration < longPressDuration) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;

      moduleLogger.debug('Menu button short-press detected (not long enough for voice)');
    }

    // If listening mode was started, keep it active
    // (user releases button but continues speaking)
    if (isListeningMode) {
      moduleLogger.debug('Menu button released, listening mode continues');
    }

    setIsMenuButtonPressed(false);
    menuButtonPressTimeRef.current = null;
  }, [isMenuButtonPressed, longPressDuration, isListeningMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
    };
  }, []);

  return {
    isMenuButtonPressed,
    isListeningMode,
    startListening,
    stopListening,
    onMenuButtonDown,
    onMenuButtonUp,
  };
}
