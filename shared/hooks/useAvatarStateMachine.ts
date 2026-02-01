/**
 * Avatar State Machine Hook
 *
 * Manages avatar state transitions, form changes (hat/wizard),
 * and coordinates with dialogue and gesture systems
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AvatarCoreState,
  AvatarVisualForm,
  AVATAR_CORE_STATES,
  canTransitionState,
  getNextState,
  HAT_TO_WIZARD_TRANSITION,
  WIZARD_TO_HAT_TRANSITION,
  STATE_TIMING,
} from '../constants/avatarStates';
import { GestureType, getGestureForVoiceState } from '../constants/avatarGestures';
import { DialogueLine } from '../constants/avatarDialogues';

export interface AvatarStateMachineState {
  coreState: AvatarCoreState;
  visualForm: AvatarVisualForm;
  gesture: GestureType;
  isTransitioning: boolean;
  transitionPhase: string | null;
  transitionProgress: number;
}

export interface UseAvatarStateMachineOptions {
  initialState?: AvatarCoreState;
  onStateChange?: (from: AvatarCoreState, to: AvatarCoreState) => void;
  onFormChange?: (form: AvatarVisualForm) => void;
  onTransitionStart?: (type: 'summon' | 'dismiss') => void;
  onTransitionEnd?: (type: 'summon' | 'dismiss') => void;
  onTransitionPhase?: (phase: string, progress: number) => void;
  onGestureChange?: (gesture: GestureType) => void;
  onIdleTimeout?: () => void;
  onListeningTimeout?: () => void;
}

export interface UseAvatarStateMachineReturn {
  // State
  state: AvatarStateMachineState;
  coreState: AvatarCoreState;
  visualForm: AvatarVisualForm;
  gesture: GestureType;
  isTransitioning: boolean;

  // State transitions
  trigger: (triggerName: string) => boolean;
  transitionTo: (newState: AvatarCoreState) => boolean;

  // Form transitions
  summonWizard: () => Promise<void>;
  dismissWizard: () => Promise<void>;

  // Gesture control
  setGesture: (gesture: GestureType) => void;

  // Dialogue integration
  speakDialogue: (dialogue: DialogueLine) => void;

  // Utility
  reset: () => void;
  canTransitionTo: (state: AvatarCoreState) => boolean;
}

export function useAvatarStateMachine(
  options: UseAvatarStateMachineOptions = {}
): UseAvatarStateMachineReturn {
  const {
    initialState = 'dormant',
    onStateChange,
    onFormChange,
    onTransitionStart,
    onTransitionEnd,
    onTransitionPhase,
    onGestureChange,
    onIdleTimeout,
    onListeningTimeout,
  } = options;

  const [state, setState] = useState<AvatarStateMachineState>({
    coreState: initialState,
    visualForm: AVATAR_CORE_STATES[initialState].form,
    gesture: 'idle',
    isTransitioning: false,
    transitionPhase: null,
    transitionProgress: 0,
  });

  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTransitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Clear all timeouts
   */
  const clearAllTimeouts = useCallback(() => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    if (autoTransitionRef.current) clearTimeout(autoTransitionRef.current);
  }, []);

  /**
   * Set up state-specific timeouts
   */
  const setupStateTimeouts = useCallback(
    (newState: AvatarCoreState) => {
      clearAllTimeouts();

      // Set up idle timeout for responding state
      if (newState === 'responding') {
        idleTimeoutRef.current = setTimeout(() => {
          onIdleTimeout?.();
        }, STATE_TIMING.respondingIdleTimeout);
      }

      // Set up listening timeout
      if (newState === 'listening') {
        listeningTimeoutRef.current = setTimeout(() => {
          onListeningTimeout?.();
          transitionTo('dormant');
        }, STATE_TIMING.listeningTimeout);
      }

      // Set up auto-transition
      const stateDef = AVATAR_CORE_STATES[newState];
      if (stateDef.autoTransitionTo && stateDef.autoTransitionDelay) {
        autoTransitionRef.current = setTimeout(() => {
          transitionTo(stateDef.autoTransitionTo as AvatarCoreState);
        }, stateDef.autoTransitionDelay);
      }
    },
    [clearAllTimeouts, onIdleTimeout, onListeningTimeout]
  );

  /**
   * Transition to a new state
   */
  const transitionTo = useCallback(
    (newState: AvatarCoreState): boolean => {
      if (!canTransitionState(state.coreState, newState)) {
        return false;
      }

      const oldState = state.coreState;
      const newForm = AVATAR_CORE_STATES[newState].form;
      const newGesture = getGestureForVoiceState(
        newState === 'dormant'
          ? 'idle'
          : newState === 'confused'
            ? 'error'
            : (newState as 'idle' | 'listening' | 'processing' | 'speaking' | 'error')
      );

      setState((prev) => ({
        ...prev,
        coreState: newState,
        visualForm: newForm,
        gesture: newGesture,
      }));

      onStateChange?.(oldState, newState);
      if (newForm !== state.visualForm) {
        onFormChange?.(newForm);
      }
      onGestureChange?.(newGesture);

      setupStateTimeouts(newState);

      return true;
    },
    [
      state.coreState,
      state.visualForm,
      onStateChange,
      onFormChange,
      onGestureChange,
      setupStateTimeouts,
    ]
  );

  /**
   * Trigger a state transition by trigger name
   */
  const trigger = useCallback(
    (triggerName: string): boolean => {
      const nextState = getNextState(state.coreState, triggerName);
      if (nextState) {
        return transitionTo(nextState);
      }
      return false;
    },
    [state.coreState, transitionTo]
  );

  /**
   * Summon wizard (hat → wizard transition)
   */
  const summonWizard = useCallback(async (): Promise<void> => {
    if (state.visualForm === 'wizard' || state.isTransitioning) {
      return;
    }

    setState((prev) => ({ ...prev, isTransitioning: true }));
    onTransitionStart?.('summon');

    const phases = HAT_TO_WIZARD_TRANSITION.phases;
    let elapsed = 0;

    for (const phase of phases) {
      setState((prev) => ({
        ...prev,
        transitionPhase: phase.name,
        transitionProgress: elapsed / HAT_TO_WIZARD_TRANSITION.totalDuration,
      }));
      onTransitionPhase?.(phase.name, elapsed / HAT_TO_WIZARD_TRANSITION.totalDuration);

      await new Promise<void>((resolve) => {
        transitionTimeoutRef.current = setTimeout(() => resolve(), phase.duration);
      });
      elapsed += phase.duration;
    }

    setState((prev) => ({
      ...prev,
      visualForm: 'wizard',
      isTransitioning: false,
      transitionPhase: null,
      transitionProgress: 1,
    }));
    onFormChange?.('wizard');
    onTransitionEnd?.('summon');
  }, [state.visualForm, state.isTransitioning, onTransitionStart, onTransitionEnd, onTransitionPhase, onFormChange]);

  /**
   * Dismiss wizard (wizard → hat transition)
   */
  const dismissWizard = useCallback(async (): Promise<void> => {
    if (state.visualForm === 'hat' || state.isTransitioning) {
      return;
    }

    setState((prev) => ({ ...prev, isTransitioning: true }));
    onTransitionStart?.('dismiss');

    const phases = WIZARD_TO_HAT_TRANSITION.phases;
    let elapsed = 0;

    for (const phase of phases) {
      setState((prev) => ({
        ...prev,
        transitionPhase: phase.name,
        transitionProgress: elapsed / WIZARD_TO_HAT_TRANSITION.totalDuration,
      }));
      onTransitionPhase?.(phase.name, elapsed / WIZARD_TO_HAT_TRANSITION.totalDuration);

      await new Promise<void>((resolve) => {
        transitionTimeoutRef.current = setTimeout(() => resolve(), phase.duration);
      });
      elapsed += phase.duration;
    }

    setState((prev) => ({
      ...prev,
      visualForm: 'hat',
      coreState: 'dormant',
      isTransitioning: false,
      transitionPhase: null,
      transitionProgress: 1,
    }));
    onFormChange?.('hat');
    onTransitionEnd?.('dismiss');
  }, [state.visualForm, state.isTransitioning, onTransitionStart, onTransitionEnd, onTransitionPhase, onFormChange]);

  /**
   * Set gesture
   */
  const setGesture = useCallback(
    (gesture: GestureType) => {
      setState((prev) => ({ ...prev, gesture }));
      onGestureChange?.(gesture);
    },
    [onGestureChange]
  );

  /**
   * Speak dialogue (sets responding state and gesture)
   */
  const speakDialogue = useCallback(
    (dialogue: DialogueLine) => {
      if (state.coreState !== 'responding') {
        transitionTo('responding');
      }

      if (dialogue.gesture) {
        setGesture(dialogue.gesture as GestureType);
      }
    },
    [state.coreState, transitionTo, setGesture]
  );

  /**
   * Check if can transition to state
   */
  const canTransitionToState = useCallback(
    (targetState: AvatarCoreState): boolean => {
      return canTransitionState(state.coreState, targetState);
    },
    [state.coreState]
  );

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    clearAllTimeouts();
    setState({
      coreState: initialState,
      visualForm: AVATAR_CORE_STATES[initialState].form,
      gesture: 'idle',
      isTransitioning: false,
      transitionPhase: null,
      transitionProgress: 0,
    });
  }, [clearAllTimeouts, initialState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return {
    // State
    state,
    coreState: state.coreState,
    visualForm: state.visualForm,
    gesture: state.gesture,
    isTransitioning: state.isTransitioning,

    // State transitions
    trigger,
    transitionTo,

    // Form transitions
    summonWizard,
    dismissWizard,

    // Gesture control
    setGesture,

    // Dialogue integration
    speakDialogue,

    // Utility
    reset,
    canTransitionTo: canTransitionToState,
  };
}
