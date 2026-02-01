/**
 * Avatar Dialogue Hook
 *
 * Manages dialogue selection, TTS integration, and speech synchronization
 * Supports i18n via @bayit/i18n for multi-language dialogue
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

/**
 * i18n-aware dialogue keys for each category
 */
const DIALOGUE_I18N_KEYS: Record<string, string[]> = {
  wake: ['avatar.dialogue.wake.here', 'avatar.dialogue.wake.service', 'avatar.dialogue.wake.listening', 'avatar.dialogue.wake.hmm', 'avatar.dialogue.wake.yes'],
  listening: ['avatar.dialogue.listening.see', 'avatar.dialogue.listening.interesting', 'avatar.dialogue.listening.let'],
  processing: ['avatar.dialogue.processing.vast', 'avatar.dialogue.processing.seek', 'avatar.dialogue.processing.moment', 'avatar.dialogue.processing.consulting'],
  presenting: ['avatar.dialogue.presenting.here', 'avatar.dialogue.presenting.found', 'avatar.dialogue.presenting.behold', 'avatar.dialogue.presenting.exactly'],
  presenting_single: ['avatar.dialogue.presentingSingle.this', 'avatar.dialogue.presentingSingle.precisely', 'avatar.dialogue.presentingSingle.exactly'],
  nothing_found: ['avatar.dialogue.nothingFound.rephrase', 'avatar.dialogue.nothingFound.elsewhere', 'avatar.dialogue.nothingFound.sorry'],
  interruption: ['avatar.dialogue.interruption.got', 'avatar.dialogue.interruption.speak', 'avatar.dialogue.interruption.course'],
  clarification: ['avatar.dialogue.clarification.didYouMean', 'avatar.dialogue.clarification.unclear', 'avatar.dialogue.clarification.whichOne'],
  clarification_needed: ['avatar.dialogue.clarificationNeeded.pardon', 'avatar.dialogue.clarificationNeeded.didntCatch', 'avatar.dialogue.clarificationNeeded.sayAgain'],
  confirmation: ['avatar.dialogue.confirmation.done', 'avatar.dialogue.confirmation.completed', 'avatar.dialogue.confirmation.understood'],
  dismissal: ['avatar.dialogue.dismissal.rest', 'avatar.dialogue.dismissal.return', 'avatar.dialogue.dismissal.farewell'],
  error: ['avatar.dialogue.error.technical', 'avatar.dialogue.error.apologies', 'avatar.dialogue.error.failed'],
  idle_timeout: ['avatar.dialogue.idleTimeout.still', 'avatar.dialogue.idleTimeout.anything', 'avatar.dialogue.idleTimeout.resting'],
  personality: ['avatar.dialogue.personality.wisdom', 'avatar.dialogue.personality.patience', 'avatar.dialogue.personality.magic'],
  waiting: ['avatar.dialogue.waiting.moment', 'avatar.dialogue.waiting.patience', 'avatar.dialogue.waiting.searching'],
  success: ['avatar.dialogue.success.aha', 'avatar.dialogue.success.found', 'avatar.dialogue.success.excellent'],
  warning: ['avatar.dialogue.warning.caution', 'avatar.dialogue.warning.careful', 'avatar.dialogue.warning.wait'],
  magical_reveal: ['avatar.dialogue.magicalReveal.behold', 'avatar.dialogue.magicalReveal.witness', 'avatar.dialogue.magicalReveal.observe'],
  agreement: ['avatar.dialogue.agreement.yes', 'avatar.dialogue.agreement.indeed', 'avatar.dialogue.agreement.certainly'],
  disagreement: ['avatar.dialogue.disagreement.no', 'avatar.dialogue.disagreement.afraid', 'avatar.dialogue.disagreement.unfortunately'],
};

/**
 * Gesture mappings for dialogue categories
 */
const CATEGORY_GESTURES: Record<string, GestureType> = {
  wake: 'greeting',
  listening: 'listening',
  processing: 'thinking',
  presenting: 'presenting',
  presenting_single: 'single_result',
  nothing_found: 'shrugging',
  interruption: 'attentive',
  clarification: 'clarification',
  clarification_needed: 'clarification',
  confirmation: 'confirmation',
  dismissal: 'farewell',
  error: 'confused',
  idle_timeout: 'idle',
  personality: 'presenting',
  waiting: 'waiting',
  success: 'success',
  warning: 'warning',
  magical_reveal: 'magical_reveal',
  agreement: 'agreement',
  disagreement: 'disagreement',
};

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
  /** Use i18n translations for dialogue (default: true) */
  useI18n?: boolean;
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
  const {
    onGestureChange,
    onDialogueStart,
    onDialogueEnd,
    onSpeechStart,
    onSpeechEnd,
    useI18n = true,
  } = options;

  const { t } = useTranslation();

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
   * Get a random i18n-translated dialogue for a category
   */
  const getI18nDialogue = useCallback(
    (category: string, interpolation?: Record<string, string | number>): DialogueLine => {
      const keys = DIALOGUE_I18N_KEYS[category];
      if (!keys || keys.length === 0) {
        return { text: '', gesture: CATEGORY_GESTURES[category] || 'idle' };
      }
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const text = interpolation ? t(randomKey, interpolation) : t(randomKey);
      return {
        text,
        gesture: CATEGORY_GESTURES[category] || 'idle',
      };
    },
    [t]
  );

  /**
   * Get time-based greeting with i18n support
   */
  const getI18nGreeting = useCallback((): DialogueLine => {
    const hour = new Date().getHours();
    let timeKey: string;
    if (hour >= 5 && hour < 12) {
      timeKey = 'avatar.dialogue.greeting.morning';
    } else if (hour >= 12 && hour < 17) {
      timeKey = 'avatar.dialogue.greeting.afternoon';
    } else if (hour >= 17 && hour < 21) {
      timeKey = 'avatar.dialogue.greeting.evening';
    } else {
      timeKey = 'avatar.dialogue.greeting.night';
    }
    return {
      text: t(timeKey),
      gesture: 'greeting',
    };
  }, [t]);

  /**
   * Cleanup timeouts on unmount to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);

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

  // Dialogue getters with i18n support
  const getWakeDialogue = useCallback(() => {
    return useI18n ? getI18nDialogue('wake') : getRandomDialogue('wake');
  }, [useI18n, getI18nDialogue]);

  const getGreetingDialogue = useCallback(() => {
    return useI18n ? getI18nGreeting() : getTimeBasedGreeting();
  }, [useI18n, getI18nGreeting]);

  const getProcessingDialogue = useCallback(
    (isLong = false) => {
      const category = isLong ? 'processing' : 'listening';
      return useI18n ? getI18nDialogue(category) : getRandomDialogue(category);
    },
    [useI18n, getI18nDialogue]
  );

  const getPresentingDialogue = useCallback(
    (context: DialogueContext = 'default') => {
      return useI18n ? getI18nDialogue('presenting') : getRandomDialogue('presenting_media', context);
    },
    [useI18n, getI18nDialogue]
  );

  const getSearchDialogue = useCallback(
    (count: number, query?: string) => {
      if (useI18n) {
        const keys = ['avatar.dialogue.presentingList.found', 'avatar.dialogue.presentingList.gathered', 'avatar.dialogue.presentingList.choices'];
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return {
          text: t(randomKey, { count }),
          gesture: 'presenting' as GestureType,
        };
      }
      return getSearchResultDialogue(count, query);
    },
    [useI18n, t]
  );

  const getNothingFoundDialogue = useCallback(() => {
    return useI18n ? getI18nDialogue('nothing_found') : getRandomDialogue('nothing_found');
  }, [useI18n, getI18nDialogue]);

  const getClarificationDialogue = useCallback(
    (guess?: string) => {
      if (useI18n) {
        if (guess) {
          return {
            text: t('avatar.dialogue.clarification.didYouMean', { guess }),
            gesture: 'confused' as GestureType,
          };
        }
        return getI18nDialogue('clarification');
      }
      const dialogue = getRandomDialogue('clarification');
      if (guess) {
        return formatDialogue(dialogue, { guess });
      }
      return dialogue;
    },
    [useI18n, getI18nDialogue, t]
  );

  const getConfirmationDialogue = useCallback(() => {
    return useI18n ? getI18nDialogue('confirmation') : getRandomDialogue('confirmation');
  }, [useI18n, getI18nDialogue]);

  const getDismissalDialogueFunc = useCallback(() => {
    return useI18n ? getI18nDialogue('dismissal') : getDismissalDialogue();
  }, [useI18n, getI18nDialogue]);

  const getInterruptionDialogue = useCallback(() => {
    return useI18n ? getI18nDialogue('interruption') : getRandomDialogue('interruption');
  }, [useI18n, getI18nDialogue]);

  const getErrorDialogue = useCallback(() => {
    return useI18n ? getI18nDialogue('error') : getRandomDialogue('error');
  }, [useI18n, getI18nDialogue]);

  const getIdleTimeoutDialogue = useCallback(() => {
    return useI18n ? getI18nDialogue('idle_timeout') : getRandomDialogue('idle_timeout');
  }, [useI18n, getI18nDialogue]);

  const getPersonalityDialogue = useCallback(
    (context: DialogueContext) => {
      if (!shouldUsePersonalityMoment()) {
        return null;
      }
      return useI18n ? getI18nDialogue('personality') : getRandomDialogue('personality', context);
    },
    [useI18n, getI18nDialogue]
  );

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
