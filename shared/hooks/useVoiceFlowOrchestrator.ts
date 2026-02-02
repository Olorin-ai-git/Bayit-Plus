/**
 * Voice Flow Orchestrator Hook
 * Automatically triggers Remotion animation sequences based on voice state changes
 * Orchestrates complete animation flows for user interactions
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSupportStore, VoiceState } from '../stores/supportStore';
import { useRemotionWizard } from './useRemotionWizard';
import {
  getWakeUpSequence,
  getDismissSequence,
  getAnimationSequenceForIntent,
  getErrorSequence,
  ResultContext,
} from '../services/voiceOrchestratorHelpers';
import { VoiceIntent } from '../types/voiceAvatar';

export interface VoiceFlowOrchestratorOptions {
  /** Enable automatic sequence triggering (default: true) */
  enabled?: boolean;
  /** Callback when a sequence starts */
  onSequenceStart?: (sequenceId: string) => void;
  /** Callback when a sequence completes */
  onSequenceComplete?: (sequenceId: string) => void;
}

/**
 * Voice Flow Orchestrator Hook
 *
 * Automatically orchestrates Remotion animation sequences based on voice interactions.
 * Listens to voice state changes and triggers appropriate multi-gesture animations.
 *
 * Features:
 * - Automatic sequence triggering on state changes
 * - Intent-based animation selection
 * - Error recovery sequences
 * - Success celebration sequences
 * - Wake/dismiss animations
 *
 * @example
 * ```tsx
 * function VoiceChatModal() {
 *   useVoiceFlowOrchestrator({
 *     enabled: true,
 *     onSequenceComplete: (id) => console.log(`${id} finished`),
 *   });
 *
 *   return <WizardRenderer />;
 * }
 * ```
 */
export function useVoiceFlowOrchestrator(
  options: VoiceFlowOrchestratorOptions = {}
): void {
  const {
    enabled = true,
    onSequenceStart,
    onSequenceComplete,
  } = options;

  const {
    voiceState,
    isVoiceModalOpen,
    currentInteractionType,
    lastResponse,
  } = useSupportStore();

  const {
    playSequence,
    stopSequence,
    currentSequence,
    isEnabled: remotionEnabled,
  } = useRemotionWizard();

  // Track previous voice state to detect transitions
  const prevVoiceStateRef = useRef<VoiceState>(voiceState);
  const prevModalOpenRef = useRef<boolean>(isVoiceModalOpen);

  // Track if we've triggered initial wake sequence
  const hasTriggeredWakeRef = useRef<boolean>(false);

  /**
   * Trigger a sequence with callbacks
   */
  const triggerSequence = useCallback((sequenceId: string) => {
    if (!enabled || !remotionEnabled) {
      return;
    }

    playSequence(sequenceId as any);

    if (onSequenceStart) {
      onSequenceStart(sequenceId);
    }
  }, [enabled, remotionEnabled, playSequence, onSequenceStart]);

  /**
   * Handle sequence completion
   */
  const handleSequenceComplete = useCallback(() => {
    if (currentSequence && onSequenceComplete) {
      onSequenceComplete(currentSequence);
    }
  }, [currentSequence, onSequenceComplete]);

  /**
   * Modal open/close flow
   */
  useEffect(() => {
    if (!enabled || !remotionEnabled) {
      return;
    }

    // Modal opened → trigger summon_wizard
    if (isVoiceModalOpen && !prevModalOpenRef.current) {
      const wakeSequence = getWakeUpSequence();
      triggerSequence(wakeSequence);
      hasTriggeredWakeRef.current = true;
    }

    // Modal closed → trigger dismiss_wizard
    if (!isVoiceModalOpen && prevModalOpenRef.current) {
      const dismissSequence = getDismissSequence();
      triggerSequence(dismissSequence);
      hasTriggeredWakeRef.current = false;
    }

    prevModalOpenRef.current = isVoiceModalOpen;
  }, [isVoiceModalOpen, enabled, remotionEnabled, triggerSequence]);

  /**
   * Voice state transition flow
   */
  useEffect(() => {
    if (!enabled || !remotionEnabled || !isVoiceModalOpen) {
      return;
    }

    const prevState = prevVoiceStateRef.current;
    const currentState = voiceState;

    // Skip if state hasn't changed
    if (prevState === currentState) {
      return;
    }

    // Transition: processing → speaking (successful processing)
    if (prevState === 'processing' && currentState === 'speaking') {
      // Determine animation based on interaction type and result
      const intent = currentInteractionType || 'SEARCH';
      const resultContext = analyzeResultContext(lastResponse);

      const sequence = getAnimationSequenceForIntent(intent, resultContext);
      triggerSequence(sequence);
    }

    // Transition: * → error (error occurred)
    if (currentState === 'error') {
      const errorSequence = getErrorSequence('unknown');
      triggerSequence(errorSequence);
    }

    prevVoiceStateRef.current = currentState;
  }, [
    voiceState,
    isVoiceModalOpen,
    currentInteractionType,
    lastResponse,
    enabled,
    remotionEnabled,
    triggerSequence,
  ]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopSequence();
    };
  }, [stopSequence]);
}

/**
 * Analyze response text to determine result context
 * Used to select appropriate animation (success, error, etc.)
 */
function analyzeResultContext(response: string | null): ResultContext {
  if (!response) {
    return { count: 0, success: false };
  }

  const lowerResponse = response.toLowerCase();

  // Error patterns
  if (
    lowerResponse.includes('error') ||
    lowerResponse.includes('went wrong') ||
    lowerResponse.includes('failed')
  ) {
    return {
      count: 0,
      success: false,
      errorType: 'unknown',
    };
  }

  // No results patterns
  if (
    lowerResponse.includes('no results') ||
    lowerResponse.includes('nothing found') ||
    lowerResponse.includes("couldn't find") ||
    lowerResponse.includes('sorry')
  ) {
    return {
      count: 0,
      success: false,
      errorType: 'not_found',
    };
  }

  // Single result patterns
  if (
    lowerResponse.includes('found 1') ||
    lowerResponse.includes('here is') ||
    lowerResponse.includes('here\'s')
  ) {
    return {
      count: 1,
      success: true,
    };
  }

  // Multiple results pattern
  const countMatch = lowerResponse.match(/found (\d+)/);
  if (countMatch) {
    return {
      count: parseInt(countMatch[1], 10),
      success: true,
    };
  }

  // Default: assume success with unknown count
  return {
    count: 1,
    success: true,
  };
}

export default useVoiceFlowOrchestrator;
