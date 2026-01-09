/**
 * useTizenRemoteKeys Hook
 *
 * Handles Samsung TV remote control special keys.
 * Registers for color buttons and other keys that need explicit registration.
 *
 * Note: The microphone button on Samsung remotes triggers Bixby at the system level
 * and cannot be captured by apps. Use the Red button as an alternative for voice.
 */

import { useEffect, useCallback } from 'react';

// Tizen TV Input Device API types
declare global {
  interface Window {
    tizen?: {
      tvinputdevice?: {
        registerKey(keyName: string): void;
        unregisterKey(keyName: string): void;
        getSupportedKeys(): Array<{ name: string; code: number }>;
      };
    };
  }
}

// Key codes for Samsung TV remote
export const TIZEN_KEY_CODES = {
  // Color buttons
  ColorF0Red: 403,
  ColorF1Green: 404,
  ColorF2Yellow: 405,
  ColorF3Blue: 406,
  // Media keys
  MediaPlayPause: 10252,
  MediaPlay: 415,
  MediaPause: 19,
  MediaStop: 413,
  MediaRewind: 412,
  MediaFastForward: 417,
  // Navigation (usually don't need registration)
  ArrowUp: 38,
  ArrowDown: 40,
  ArrowLeft: 37,
  ArrowRight: 39,
  Enter: 13,
  Back: 10009,
} as const;

export interface UseTizenRemoteKeysOptions {
  onRedButton?: () => void;
  onGreenButton?: () => void;
  onYellowButton?: () => void;
  onBlueButton?: () => void;
  onPlayPause?: () => void;
  onBack?: () => void;
  enabled?: boolean;
}

/**
 * Hook to handle Samsung TV remote special keys
 */
export function useTizenRemoteKeys(options: UseTizenRemoteKeysOptions) {
  const {
    onRedButton,
    onGreenButton,
    onYellowButton,
    onBlueButton,
    onPlayPause,
    onBack,
    enabled = true,
  } = options;

  // Register keys with Tizen API
  useEffect(() => {
    if (!enabled) return;

    const tizen = window.tizen;
    if (!tizen?.tvinputdevice) {
      console.log('[TizenRemoteKeys] Not running on Tizen TV');
      return;
    }

    // Keys to register (color buttons and media keys need explicit registration)
    const keysToRegister = [
      'ColorF0Red',
      'ColorF1Green',
      'ColorF2Yellow',
      'ColorF3Blue',
      'MediaPlayPause',
    ];

    // Register each key
    keysToRegister.forEach(key => {
      try {
        tizen.tvinputdevice.registerKey(key);
        console.log(`[TizenRemoteKeys] Registered key: ${key}`);
      } catch (err) {
        console.warn(`[TizenRemoteKeys] Failed to register key ${key}:`, err);
      }
    });

    // Cleanup: unregister keys
    return () => {
      keysToRegister.forEach(key => {
        try {
          tizen.tvinputdevice?.unregisterKey(key);
        } catch (err) {
          // Ignore cleanup errors
        }
      });
    };
  }, [enabled]);

  // Handle key events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const keyCode = event.keyCode;

    switch (keyCode) {
      case TIZEN_KEY_CODES.ColorF0Red:
        console.log('[TizenRemoteKeys] Red button pressed');
        event.preventDefault();
        onRedButton?.();
        break;
      case TIZEN_KEY_CODES.ColorF1Green:
        console.log('[TizenRemoteKeys] Green button pressed');
        event.preventDefault();
        onGreenButton?.();
        break;
      case TIZEN_KEY_CODES.ColorF2Yellow:
        console.log('[TizenRemoteKeys] Yellow button pressed');
        event.preventDefault();
        onYellowButton?.();
        break;
      case TIZEN_KEY_CODES.ColorF3Blue:
        console.log('[TizenRemoteKeys] Blue button pressed');
        event.preventDefault();
        onBlueButton?.();
        break;
      case TIZEN_KEY_CODES.MediaPlayPause:
        console.log('[TizenRemoteKeys] Play/Pause pressed');
        event.preventDefault();
        onPlayPause?.();
        break;
      case TIZEN_KEY_CODES.Back:
        console.log('[TizenRemoteKeys] Back button pressed');
        // Don't prevent default for back - let navigation handle it
        onBack?.();
        break;
    }
  }, [enabled, onRedButton, onGreenButton, onYellowButton, onBlueButton, onPlayPause, onBack]);

  // Add event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    console.log('[TizenRemoteKeys] Key listener registered');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

export default useTizenRemoteKeys;
