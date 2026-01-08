/**
 * Presence Aware Playback Hook
 * Automatically pauses when user leaves, resumes with greeting when user returns
 *
 * Features:
 * - Auto-pause when user absence detected
 * - Voice greeting when user returns
 * - Offer to resume with timeout (auto-resume if no response)
 * - Integration with TTS for voice greetings
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { presenceDetectionService } from '../services/presenceDetectionService';
import { ttsService } from '../services/ttsService';

interface UsePresenceAwarePlaybackOptions {
  onPauseByPresence?: () => void;
  onResumeByPresence?: () => void;
  onUserReturn?: () => void;
  onUserAbsent?: () => void;
  autoResumeAfterMs?: number; // Auto-resume if no response (default: 5000ms)
}

export function usePresenceAwarePlayback(options: UsePresenceAwarePlaybackOptions = {}) {
  const {
    onPauseByPresence,
    onResumeByPresence,
    onUserReturn,
    onUserAbsent,
    autoResumeAfterMs = 5000,
  } = options;

  const [isPresent, setIsPresent] = useState(true);
  const [isPausedByPresence, setIsPausedByPresence] = useState(false);
  const presencePauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceUnsubscribeRef = useRef<(() => void) | null>(null);
  const absenceUnsubscribeRef = useRef<(() => void) | null>(null);
  const returnUnsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Start presence monitoring and handle state changes
   */
  useEffect(() => {
    // Start monitoring
    presenceDetectionService.startMonitoring();

    // Handle user absence - pause content
    const unsubscribeAbsence = presenceDetectionService.onUserAbsent((state) => {
      setIsPresent(false);
      setIsPausedByPresence(true);

      if (onUserAbsent) {
        onUserAbsent();
      }

      if (onPauseByPresence) {
        onPauseByPresence();
      }
    });

    // Handle user return - greet and offer resume
    const unsubscribeReturn = presenceDetectionService.onUserReturn(async (state) => {
      setIsPresent(true);

      if (onUserReturn) {
        onUserReturn();
      }

      // Play greeting and offer resume
      try {
        const greeting = 'ברוך הבא! רוצה להמשיך לצפות?';
        await ttsService.speak(greeting, 'normal');

        // Auto-resume if user doesn't respond
        presencePauseTimeoutRef.current = setTimeout(() => {
          if (isPausedByPresence) {
            setIsPausedByPresence(false);
            if (onResumeByPresence) {
              onResumeByPresence();
            }
          }
        }, autoResumeAfterMs);
      } catch (error) {
        console.warn('Failed to play greeting:', error);
        // Even if TTS fails, offer resume with timeout
        presencePauseTimeoutRef.current = setTimeout(() => {
          if (isPausedByPresence) {
            setIsPausedByPresence(false);
            if (onResumeByPresence) {
              onResumeByPresence();
            }
          }
        }, autoResumeAfterMs);
      }
    });

    presenceUnsubscribeRef.current = unsubscribeAbsence;
    returnUnsubscribeRef.current = unsubscribeReturn;

    return () => {
      // Cleanup
      if (presenceUnsubscribeRef.current) {
        presenceUnsubscribeRef.current();
      }
      if (returnUnsubscribeRef.current) {
        returnUnsubscribeRef.current();
      }
      if (presencePauseTimeoutRef.current) {
        clearTimeout(presencePauseTimeoutRef.current);
      }
    };
  }, [isPausedByPresence, onPauseByPresence, onResumeByPresence, onUserReturn, onUserAbsent, autoResumeAfterMs]);

  /**
   * Cancel auto-resume timeout
   * Call when user confirms resume manually
   */
  const cancelAutoResume = useCallback(() => {
    if (presencePauseTimeoutRef.current) {
      clearTimeout(presencePauseTimeoutRef.current);
      presencePauseTimeoutRef.current = null;
    }
  }, []);

  /**
   * Manually resume content (cancels auto-resume timeout)
   */
  const manualResume = useCallback(() => {
    cancelAutoResume();
    setIsPausedByPresence(false);
    if (onResumeByPresence) {
      onResumeByPresence();
    }
  }, [cancelAutoResume, onResumeByPresence]);

  /**
   * Get current presence state
   */
  const getPresenceState = useCallback(() => {
    return presenceDetectionService.getCurrentState();
  }, []);

  /**
   * Check if presence detection is available
   */
  const isPresenceDetectionAvailable = useCallback(() => {
    return presenceDetectionService.isAvailable();
  }, []);

  return {
    // State
    isPresent,
    isPausedByPresence,
    presenceDetectionAvailable: isPresenceDetectionAvailable(),

    // Actions
    cancelAutoResume,
    manualResume,
    getPresenceState,
  };
}

export default usePresenceAwarePlayback;
