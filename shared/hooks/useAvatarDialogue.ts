/**
 * Avatar Dialogue Hook
 *
 * Manages dialogue selection, TTS integration, and speech synchronization
 */

import { useCallback, useRef, useState } from 'react';
import {
  DialogueLine,
  DialogueCategory,
  DialogueContext,
  getRandomDialogue,
  getTimeBasedGreeting,
  getDismissalDialogue,
  getSearchResultDialogue,
  formatDialogue,
  shouldUsePersonalityMoment,
} from '../constants/avatarDialogues';
import { GestureType, GESTURE_LIBRARY } from '../constants/avatarGestures';
import { AvatarCoreState } from '../constants/avatarStates';

export interface DialogueState {
  currentDialogue: DialogueLine | null;
  isPlaying: boolean;
  isSpeaking: boolean;
  currentGesture: GestureType;
  dialogueQueue: DialogueLine[];
}

export interface UseAvatarDialogueOptions {
  onGestureChange?: (gesture: GestureType) => void;
  onDialogueStart?: (dialogue: DialogueLine) => void;
  onDialogueEnd?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export interface UseAvatarDialogueReturn {
  // State
  currentDialogue: DialogueLine | null;
  isPlaying: boolean;
  isSpeaking: boolean;
  currentGesture: GestureType;

  // Actions
  playDialogue: (dialogue: DialogueLine) => Promise<void>;
  queueDialogue: (dialogue: DialogueLine) => void;
  clearQueue: () => void;
  stopDialogue: () => void;

  // Dialogue getters
  getWakeDialogue: () => DialogueLine;
  getGreetingDialogue: () => DialogueLine;
  getProcessingDialogue: (isLong?: boolean) => DialogueLine;
  getPresentingDialogue: (context?: DialogueContext) => DialogueLine;
  getSearchDialogue: (count: number, query?: string) => DialogueLine;
  getNothingFoundDialogue: () => DialogueLine;
  getClarificationDialogue: (guess?: string) => DialogueLine;
  getConfirmationDialogue: () => DialogueLine;
  getDismissalDialogue: () => DialogueLine;
  getInterruptionDialogue: () => DialogueLine;
  getErrorDialogue: () => DialogueLine;
  getIdleTimeoutDialogue: () => DialogueLine;
  getPersonalityDialogue: (context: DialogueContext) => DialogueLine | null;

  // State-based dialogue
  getDialogueForState: (state: AvatarCoreState) => DialogueLine;
}

export function useAvatarDialogue(
  options: UseAvatarDialogueOptions = {}
): UseAvatarDialogueReturn {
  const { onGestureChange, onDialogueStart, onDialogueEnd, onSpeechStart, onSpeechEnd } =
    options;

  const [state, setState] = useState<DialogueState>({
    currentDialogue: null,
    isPlaying: false,
    isSpeaking: false,
    currentGesture: 'idle',
    dialogueQueue: [],
  });

  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueProcessingRef = useRef<boolean>(false);

  /**
   * Set current gesture
   */
  const setGesture = useCallback(
    (gesture: GestureType) => {
      setState((prev) => ({ ...prev, currentGesture: gesture }));
      onGestureChange?.(gesture);

      // Handle gesture transition
      const gestureDef = GESTURE_LIBRARY[gesture];
      if (gestureDef && !gestureDef.looping && gestureDef.transitionTo) {
        if (gestureTimeoutRef.current) {
          clearTimeout(gestureTimeoutRef.current);
        }
        gestureTimeoutRef.current = setTimeout(() => {
          setGesture(gestureDef.transitionTo as GestureType);
        }, gestureDef.duration);
      }
    },
    [onGestureChange]
  );

  /**
   * Play a dialogue line
   */
  const playDialogue = useCallback(
    async (dialogue: DialogueLine): Promise<void> => {
      // Update state
      setState((prev) => ({
        ...prev,
        currentDialogue: dialogue,
        isPlaying: true,
        isSpeaking: true,
      }));

      // Set gesture
      if (dialogue.gesture) {
        setGesture(dialogue.gesture as GestureType);
      }

      // Notify listeners
      onDialogueStart?.(dialogue);
      onSpeechStart?.();

      // Calculate speech duration (rough estimate: 100ms per character)
      const duration = dialogue.duration || dialogue.text.length * 100;

      // Wait for speech to complete
      return new Promise((resolve) => {
        speechTimeoutRef.current = setTimeout(() => {
          setState((prev) => ({
            ...prev,
            isSpeaking: false,
            isPlaying: false,
          }));

          onSpeechEnd?.();
          onDialogueEnd?.();

          // Process queue
          processQueue();

          resolve();
        }, duration);
      });
    },
    [setGesture, onDialogueStart, onDialogueEnd, onSpeechStart, onSpeechEnd]
  );

  /**
   * Queue a dialogue for later playback
   */
  const queueDialogue = useCallback((dialogue: DialogueLine) => {
    setState((prev) => ({
      ...prev,
      dialogueQueue: [...prev.dialogueQueue, dialogue],
    }));
  }, []);

  /**
   * Process dialogue queue
   */
  const processQueue = useCallback(() => {
    if (queueProcessingRef.current) return;

    setState((prev) => {
      if (prev.dialogueQueue.length === 0 || prev.isPlaying) {
        return prev;
      }

      const [next, ...rest] = prev.dialogueQueue;
      queueProcessingRef.current = true;

      // Play next dialogue asynchronously
      setTimeout(() => {
        playDialogue(next).finally(() => {
          queueProcessingRef.current = false;
        });
      }, 0);

      return { ...prev, dialogueQueue: rest };
    });
  }, [playDialogue]);

  /**
   * Clear dialogue queue
   */
  const clearQueue = useCallback(() => {
    setState((prev) => ({ ...prev, dialogueQueue: [] }));
  }, []);

  /**
   * Stop current dialogue
   */
  const stopDialogue = useCallback(() => {
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      currentDialogue: null,
      isPlaying: false,
      isSpeaking: false,
      currentGesture: 'idle',
    }));

    onSpeechEnd?.();
    onDialogueEnd?.();
  }, [onSpeechEnd, onDialogueEnd]);

  // Dialogue getters
  const getWakeDialogue = useCallback(() => getRandomDialogue('wake'), []);

  const getGreetingDialogue = useCallback(() => getTimeBasedGreeting(), []);

  const getProcessingDialogue = useCallback((isLong = false) => {
    return getRandomDialogue(isLong ? 'processing' : 'listening');
  }, []);

  const getPresentingDialogue = useCallback((context: DialogueContext = 'default') => {
    return getRandomDialogue('presenting_media', context);
  }, []);

  const getSearchDialogue = useCallback((count: number, query?: string) => {
    return getSearchResultDialogue(count, query);
  }, []);

  const getNothingFoundDialogue = useCallback(() => getRandomDialogue('nothing_found'), []);

  const getClarificationDialogue = useCallback((guess?: string) => {
    const dialogue = getRandomDialogue('clarification');
    if (guess) {
      return formatDialogue(dialogue, { guess });
    }
    return dialogue;
  }, []);

  const getConfirmationDialogue = useCallback(() => getRandomDialogue('confirmation'), []);

  const getDismissalDialogueFunc = useCallback(() => getDismissalDialogue(), []);

  const getInterruptionDialogue = useCallback(() => getRandomDialogue('interruption'), []);

  const getErrorDialogue = useCallback(() => getRandomDialogue('error'), []);

  const getIdleTimeoutDialogue = useCallback(() => getRandomDialogue('idle_timeout'), []);

  const getPersonalityDialogue = useCallback((context: DialogueContext) => {
    if (!shouldUsePersonalityMoment()) {
      return null;
    }
    return getRandomDialogue('personality', context);
  }, []);

  /**
   * Get dialogue based on avatar state
   */
  const getDialogueForState = useCallback(
    (avatarState: AvatarCoreState): DialogueLine => {
      switch (avatarState) {
        case 'dormant':
          return { text: '', gesture: 'idle' };
        case 'listening':
          return getWakeDialogue();
        case 'processing':
          return getProcessingDialogue();
        case 'responding':
          return getPresentingDialogue();
        case 'confused':
          return getClarificationDialogue();
        case 'interrupted':
          return getInterruptionDialogue();
        default:
          return { text: '', gesture: 'idle' };
      }
    },
    [
      getWakeDialogue,
      getProcessingDialogue,
      getPresentingDialogue,
      getClarificationDialogue,
      getInterruptionDialogue,
    ]
  );

  return {
    // State
    currentDialogue: state.currentDialogue,
    isPlaying: state.isPlaying,
    isSpeaking: state.isSpeaking,
    currentGesture: state.currentGesture,

    // Actions
    playDialogue,
    queueDialogue,
    clearQueue,
    stopDialogue,

    // Dialogue getters
    getWakeDialogue,
    getGreetingDialogue,
    getProcessingDialogue,
    getPresentingDialogue,
    getSearchDialogue,
    getNothingFoundDialogue,
    getClarificationDialogue,
    getConfirmationDialogue,
    getDismissalDialogue: getDismissalDialogueFunc,
    getInterruptionDialogue,
    getErrorDialogue,
    getIdleTimeoutDialogue,
    getPersonalityDialogue,

    // State-based
    getDialogueForState,
  };
}
