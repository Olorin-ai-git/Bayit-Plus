/**
 * useSamsungVoice Hook
 *
 * Integrates with Samsung TV's VoiceInteraction API to receive voice commands
 * from Bixby. When users say "Hey Bixby, search for X" or give voice commands,
 * this hook receives the processed text/commands.
 *
 * Requires:
 * - Samsung Smart TV with Bixby
 * - Privilege: http://developer.samsung.com/privilege/voicecontrol
 * - WebAPI script loaded: $WEBAPIS/webapis/webapis.js
 */

import { useEffect, useCallback, useRef, useState } from 'react';

// Samsung WebAPIs type declarations
declare global {
  interface Window {
    webapis?: {
      voiceinteraction?: {
        getVersion(): string;
        setCallback(callbacks: VoiceInteractionCallbacks): void;
        listen(): void;
        getDataFromSearchTerm(term: any, field: string): string;
        buildVoiceInteractionContentContextItem(
          x: number, y: number, title: string, aliases: string[], focused: boolean
        ): any;
        buildVoiceInteractionContentContextResponse(items: any[]): any;
      };
    };
  }
}

interface VoiceInteractionCallbacks {
  onupdatestate?: () => string;
  onnavigation?: (direction: string) => boolean;
  onselection?: (index: number) => boolean;
  ontitleselection?: (title: string) => boolean;
  onsearch?: (searchTerm: any) => boolean;
  oncustom?: (json: string) => boolean;
  onplay?: () => boolean;
  onpause?: () => boolean;
  onstop?: () => boolean;
  onfastforward?: () => boolean;
  onrewind?: () => boolean;
  onchangeprevioustrack?: () => boolean;
  onchangenexttrack?: () => boolean;
}

export interface UseSamsungVoiceOptions {
  enabled?: boolean;
  onSearch?: (query: string) => void;
  onCommand?: (command: string, data?: any) => void;
  onNavigation?: (direction: string) => void;
  currentState?: 'None' | 'Home' | 'List' | 'Player' | 'Setting' | 'Search';
}

export interface UseSamsungVoiceReturn {
  isAvailable: boolean;
  isListening: boolean;
  error: string | null;
  startListening: () => void;
}

/**
 * Hook to integrate with Samsung TV's voice assistant (Bixby)
 */
export function useSamsungVoice(options: UseSamsungVoiceOptions = {}): UseSamsungVoiceReturn {
  const {
    enabled = true,
    onSearch,
    onCommand,
    onNavigation,
    currentState = 'Home',
  } = options;

  const [isAvailable, setIsAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStateRef = useRef(currentState);
  currentStateRef.current = currentState;

  // Check if Samsung VoiceInteraction API is available
  useEffect(() => {
    const checkAvailability = () => {
      console.log('[SamsungVoice] Checking API availability...');
      console.log('[SamsungVoice] window.webapis:', typeof window.webapis, window.webapis);

      try {
        if (window.webapis) {
          console.log('[SamsungVoice] webapis keys:', Object.keys(window.webapis));
        }

        if (window.webapis?.voiceinteraction) {
          const version = window.webapis.voiceinteraction.getVersion();
          console.log('[SamsungVoice] VoiceInteraction API available, version:', version);
          setIsAvailable(true);
          setError(null);
          return true;
        } else {
          console.log('[SamsungVoice] voiceinteraction not in webapis');
          setError('VoiceInteraction API not found');
        }
      } catch (err: any) {
        console.log('[SamsungVoice] VoiceInteraction API error:', err?.message || err);
        setError(err?.message || 'API check failed');
      }
      setIsAvailable(false);
      return false;
    };

    // Check immediately
    if (!checkAvailability()) {
      // Try again after delays (WebAPIs might load async)
      const timer1 = setTimeout(checkAvailability, 1000);
      const timer2 = setTimeout(checkAvailability, 3000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, []);

  // Set up voice callbacks
  useEffect(() => {
    if (!enabled || !isAvailable || !window.webapis?.voiceinteraction) {
      return;
    }

    try {
      console.log('[SamsungVoice] Setting up voice callbacks...');

      const callbacks: VoiceInteractionCallbacks = {
        // Report current app state
        onupdatestate: () => {
          console.log('[SamsungVoice] onupdatestate called, returning:', currentStateRef.current);
          return currentStateRef.current;
        },

        // Handle search queries - this is the main one for free-form voice!
        onsearch: (searchTerm) => {
          console.log('[SamsungVoice] onsearch received:', searchTerm);
          try {
            // Extract the utterance (what the user actually said)
            const utterance = window.webapis!.voiceinteraction!.getDataFromSearchTerm(
              searchTerm,
              'SEARCH_TERM_UTTERANCE'
            );
            const title = window.webapis!.voiceinteraction!.getDataFromSearchTerm(
              searchTerm,
              'SEARCH_TERM_TITLE'
            );

            const query = utterance || title || '';
            console.log('[SamsungVoice] Search query:', query);

            if (query && onSearch) {
              onSearch(query);
            }
            return true;
          } catch (err) {
            console.error('[SamsungVoice] Error processing search:', err);
            return false;
          }
        },

        // Handle custom commands (JSON format)
        oncustom: (jsonString) => {
          console.log('[SamsungVoice] oncustom received:', jsonString);
          try {
            const data = JSON.parse(jsonString);
            if (onCommand) {
              onCommand('custom', data);
            }
            return true;
          } catch (err) {
            console.error('[SamsungVoice] Error parsing custom command:', err);
            return false;
          }
        },

        // Handle navigation commands
        onnavigation: (direction) => {
          console.log('[SamsungVoice] onnavigation:', direction);
          if (onNavigation) {
            onNavigation(direction);
          }
          return true;
        },

        // Media controls
        onplay: () => {
          console.log('[SamsungVoice] onplay');
          onCommand?.('play');
          return true;
        },
        onpause: () => {
          console.log('[SamsungVoice] onpause');
          onCommand?.('pause');
          return true;
        },
        onstop: () => {
          console.log('[SamsungVoice] onstop');
          onCommand?.('stop');
          return true;
        },
        onfastforward: () => {
          console.log('[SamsungVoice] onfastforward');
          onCommand?.('fastforward');
          return true;
        },
        onrewind: () => {
          console.log('[SamsungVoice] onrewind');
          onCommand?.('rewind');
          return true;
        },
        onchangeprevioustrack: () => {
          console.log('[SamsungVoice] onchangeprevioustrack');
          onCommand?.('previous');
          return true;
        },
        onchangenexttrack: () => {
          console.log('[SamsungVoice] onchangenexttrack');
          onCommand?.('next');
          return true;
        },

        // Item selection
        onselection: (index) => {
          console.log('[SamsungVoice] onselection:', index);
          onCommand?.('select', { index });
          return true;
        },
        ontitleselection: (title) => {
          console.log('[SamsungVoice] ontitleselection:', title);
          onCommand?.('select', { title });
          return true;
        },
      };

      window.webapis.voiceinteraction.setCallback(callbacks);
      console.log('[SamsungVoice] Voice callbacks registered successfully');

    } catch (err: any) {
      console.error('[SamsungVoice] Failed to set callbacks:', err);
      setError(err?.message || 'Failed to initialize voice');
    }
  }, [enabled, isAvailable, onSearch, onCommand, onNavigation]);

  // Start listening for voice commands
  const startListening = useCallback(() => {
    if (!isAvailable || !window.webapis?.voiceinteraction) {
      console.log('[SamsungVoice] Cannot start listening - API not available');
      return;
    }

    try {
      window.webapis.voiceinteraction.listen();
      setIsListening(true);
      console.log('[SamsungVoice] Started listening for voice commands');
    } catch (err: any) {
      console.error('[SamsungVoice] Failed to start listening:', err);
      setError(err?.message || 'Failed to start voice listening');
    }
  }, [isAvailable]);

  return {
    isAvailable,
    isListening,
    error,
    startListening,
  };
}

export default useSamsungVoice;
