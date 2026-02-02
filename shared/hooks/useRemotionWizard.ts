/**
 * useRemotionWizard Hook
 * React hook for controlling wizard Remotion animations
 * Provides easy access to animation sequences and state
 */

import { useCallback } from 'react';
import { useSupportStore } from '../stores/supportStore';
import { AnimationSequence, getSequenceDefinition } from '../remotion/utils/sequencing';
import { getRenderingMode } from '../remotion/utils/platform-adapter';

export interface UseRemotionWizardReturn {
  /** Currently playing animation sequence (null if idle) */
  currentSequence: AnimationSequence | null;
  /** Whether an animation is currently playing */
  isPlaying: boolean;
  /** Whether Remotion animations are enabled */
  isEnabled: boolean;
  /** Current playback speed multiplier */
  playbackSpeed: number;
  /** Current particle effects intensity (0.0-1.0) */
  effectsIntensity: number;
  /** Rendering mode: 'live', 'prerendered', or 'fallback' */
  renderingMode: 'live' | 'prerendered' | 'fallback';
  /** Use pre-rendered MP4s (mobile/tvOS) vs live rendering (web) */
  usePreRendered: boolean;

  // Actions
  /** Play a multi-gesture animation sequence */
  playSequence: (sequence: AnimationSequence) => void;
  /** Stop the currently playing sequence */
  stopSequence: () => void;
  /** Enable or disable Remotion animations */
  setEnabled: (enabled: boolean) => void;
  /** Set playback speed (0.1-3.0, default 1.0) */
  setSpeed: (speed: number) => void;
  /** Set particle effects intensity (0.0-1.0, default 1.0) */
  setIntensity: (intensity: number) => void;
  /** Get sequence definition by ID */
  getSequence: (sequence: AnimationSequence) => ReturnType<typeof getSequenceDefinition>;
}

/**
 * Hook for controlling wizard Remotion animations
 *
 * @example
 * ```tsx
 * function WizardComponent() {
 *   const { playSequence, isPlaying, currentSequence } = useRemotionWizard();
 *
 *   const handleSearch = () => {
 *     playSequence('process_command');
 *   };
 *
 *   return (
 *     <button onClick={handleSearch} disabled={isPlaying}>
 *       {isPlaying ? 'Processing...' : 'Search'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useRemotionWizard(): UseRemotionWizardReturn {
  const {
    remotionAnimation,
    playAnimationSequence,
    stopAnimationSequence,
    setRemotionEnabled,
    setPlaybackSpeed,
    setEffectsIntensity,
  } = useSupportStore();

  const playSequence = useCallback(
    (sequence: AnimationSequence) => {
      playAnimationSequence(sequence);
    },
    [playAnimationSequence]
  );

  const stopSequence = useCallback(() => {
    stopAnimationSequence();
  }, [stopAnimationSequence]);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      setRemotionEnabled(enabled);
    },
    [setRemotionEnabled]
  );

  const setSpeed = useCallback(
    (speed: number) => {
      setPlaybackSpeed(speed);
    },
    [setPlaybackSpeed]
  );

  const setIntensity = useCallback(
    (intensity: number) => {
      setEffectsIntensity(intensity);
    },
    [setEffectsIntensity]
  );

  const getSequence = useCallback(
    (sequence: AnimationSequence) => {
      return getSequenceDefinition(sequence);
    },
    []
  );

  return {
    currentSequence: remotionAnimation.currentSequence,
    isPlaying: remotionAnimation.currentSequence !== null,
    isEnabled: remotionAnimation.remotionEnabled,
    playbackSpeed: remotionAnimation.playbackSpeed,
    effectsIntensity: remotionAnimation.effectsIntensity,
    renderingMode: getRenderingMode(),
    usePreRendered: remotionAnimation.usePreRendered,
    playSequence,
    stopSequence,
    setEnabled,
    setSpeed,
    setIntensity,
    getSequence,
  };
}

export default useRemotionWizard;
