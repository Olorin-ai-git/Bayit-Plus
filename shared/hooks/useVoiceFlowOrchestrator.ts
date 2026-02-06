/**
 * Voice Flow Orchestrator Hook
 * Thin bridge between OlorinVoiceOrchestrator animation events and Remotion wizard.
 * All animation decision logic lives in the orchestrator - this hook simply subscribes
 * to animationTrigger events and forwards them to useRemotionWizard.
 */

import { useEffect, useCallback } from 'react';
import { voiceOrchestrator } from '../services/olorinVoiceOrchestrator';
import { useRemotionWizard } from './useRemotionWizard';

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
 * Subscribes to OlorinVoiceOrchestrator animationTrigger events
 * and forwards them to the Remotion wizard for rendering.
 *
 * The orchestrator decides WHAT animation to play and WHEN.
 * This hook handles HOW to play it (via Remotion).
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
    playSequence,
    stopSequence,
    currentSequence,
    isEnabled: remotionEnabled,
  } = useRemotionWizard();

  /**
   * Trigger a sequence with callbacks
   */
  const triggerSequence = useCallback((sequenceId: string) => {
    if (!enabled || !remotionEnabled) {
      return;
    }

    // Stop any currently playing sequence to prevent animation overlaps
    stopSequence();
    playSequence(sequenceId as any);

    if (onSequenceStart) {
      onSequenceStart(sequenceId);
    }
  }, [enabled, remotionEnabled, stopSequence, playSequence, onSequenceStart]);

  /**
   * Handle sequence completion
   */
  useEffect(() => {
    if (currentSequence && onSequenceComplete) {
      onSequenceComplete(currentSequence);
    }
  }, [currentSequence, onSequenceComplete]);

  /**
   * Subscribe to orchestrator animationTrigger events
   */
  useEffect(() => {
    if (!enabled || !remotionEnabled) {
      return;
    }

    const handleAnimationTrigger = (sequenceId: string) => {
      triggerSequence(sequenceId);
    };

    voiceOrchestrator.on('animationTrigger', handleAnimationTrigger);

    return () => {
      voiceOrchestrator.off('animationTrigger', handleAnimationTrigger);
    };
  }, [enabled, remotionEnabled, triggerSequence]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopSequence();
    };
  }, [stopSequence]);
}

export default useVoiceFlowOrchestrator;
