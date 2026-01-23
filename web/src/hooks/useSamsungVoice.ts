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
import logger from '@/utils/logger';

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
      logger.debug('Checking API availability...', 'useSamsungVoice');
      logger.debug('window.webapis:', 'useSamsungVoice', { type: typeof window.webapis, value: window.webapis });

      try {
        if (window.webapis) {
          logger.debug('webapis keys:', 'useSamsungVoice', { keys: Object.keys(window.webapis) });
        }

        if (window.webapis?.voiceinteraction) {
          const version = window.webapis.voiceinteraction.getVersion();
          logger.debug('VoiceInteraction API available', 'useSamsungVoice', { version });
          setIsAvailable(true);
          setError(null);
          return true;
        } else {
          logger.debug('voiceinteraction not in webapis', 'useSamsungVoice');
          setError('VoiceInteraction API not found');
        }
      } catch (err: any) {
        logger.debug('VoiceInteraction API error', 'useSamsungVoice', { error: err?.message || err });
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
      logger.debug('Setting up voice callbacks...', 'useSamsungVoice');

      const callbacks: VoiceInteractionCallbacks = {
        // Report current app state
        onupdatestate: () => {
          logger.debug('onupdatestate called', 'useSamsungVoice', { returning: currentStateRef.current });
          return currentStateRef.current;
        },

        // Handle search queries - this is the main one for free-form voice!
        onsearch: (searchTerm) => {
          logger.debug('onsearch received', 'useSamsungVoice', { searchTerm });
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
            logger.debug('Search query', 'useSamsungVoice', { query });

            if (query && onSearch) {
              onSearch(query);
            }
            return true;
          } catch (err) {
            logger.error('Error processing search', 'useSamsungVoice', err);
            return false;
          }
        },

        // Handle custom commands (JSON format)
        oncustom: (jsonString) => {
          logger.debug('oncustom received', 'useSamsungVoice', { jsonString });
          try {
            const data = JSON.parse(jsonString);
            if (onCommand) {
              onCommand('custom', data);
            }
            return true;
          } catch (err) {
            logger.error('Error parsing custom command', 'useSamsungVoice', err);
            return false;
          }
        },

        // Handle navigation commands
        onnavigation: (direction) => {
          logger.debug('onnavigation', 'useSamsungVoice', { direction });
          if (onNavigation) {
            onNavigation(direction);
          }
          return true;
        },

        // Media controls
        onplay: () => {
          logger.debug('onplay', 'useSamsungVoice');
          onCommand?.('play');
          return true;
        },
        onpause: () => {
          logger.debug('onpause', 'useSamsungVoice');
          onCommand?.('pause');
          return true;
        },
        onstop: () => {
          logger.debug('onstop', 'useSamsungVoice');
          onCommand?.('stop');
          return true;
        },
        onfastforward: () => {
          logger.debug('onfastforward', 'useSamsungVoice');
          onCommand?.('fastforward');
          return true;
        },
        onrewind: () => {
          logger.debug('onrewind', 'useSamsungVoice');
          onCommand?.('rewind');
          return true;
        },
        onchangeprevioustrack: () => {
          logger.debug('onchangeprevioustrack', 'useSamsungVoice');
          onCommand?.('previous');
          return true;
        },
        onchangenexttrack: () => {
          logger.debug('onchangenexttrack', 'useSamsungVoice');
          onCommand?.('next');
          return true;
        },

        // Item selection
        onselection: (index) => {
          logger.debug('onselection', 'useSamsungVoice', { index });
          onCommand?.('select', { index });
          return true;
        },
        ontitleselection: (title) => {
          logger.debug('ontitleselection', 'useSamsungVoice', { title });
          onCommand?.('select', { title });
          return true;
        },
      };

      window.webapis.voiceinteraction.setCallback(callbacks);
      logger.debug('Voice callbacks registered successfully', 'useSamsungVoice');

    } catch (err: any) {
      logger.error('Failed to set callbacks', 'useSamsungVoice', err);
      setError(err?.message || 'Failed to initialize voice');
    }
  }, [enabled, isAvailable, onSearch, onCommand, onNavigation]);

  // Start listening for voice commands
  const startListening = useCallback(() => {
    if (!isAvailable || !window.webapis?.voiceinteraction) {
      logger.debug('Cannot start listening - API not available', 'useSamsungVoice');
      return;
    }

    try {
      window.webapis.voiceinteraction.listen();
      setIsListening(true);
      logger.debug('Started listening for voice commands', 'useSamsungVoice');
    } catch (err: any) {
      logger.error('Failed to start listening', 'useSamsungVoice', err);
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
