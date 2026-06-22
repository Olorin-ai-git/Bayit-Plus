/**
 * Animation Sequencing Utilities
 * Defines multi-gesture animation flows and their timing
 */

import { SpritesheetType, calculateRemotionDuration } from '../sprites/SpritesheetConfig';
import { EasingType } from './easing';

export type AnimationSequence =
  | 'summon_wizard'
  | 'dismiss_wizard'
  | 'process_command'
  | 'magical_reveal'
  | 'error_shake'
  | 'success'
  | 'acknowledge_new';

export type TransitionType = 'crossfade' | 'zoom' | 'slide';

export interface SequenceStep {
  /** Spritesheet gesture to play */
  gesture: SpritesheetType;
  /** Duration in Remotion frames (60fps) */
  durationInFrames: number;
  /** Transition to next step */
  transition?: {
    type: TransitionType;
    durationInFrames: number;
    easing?: EasingType;
  };
}

export interface SequenceDefinition {
  id: AnimationSequence;
  steps: SequenceStep[];
  totalFrames: number;
}

/**
 * Create a sequence step with automatic duration calculation
 */
function createStep(
  gesture: SpritesheetType,
  transition?: SequenceStep['transition']
): SequenceStep {
  return {
    gesture,
    durationInFrames: calculateRemotionDuration(gesture),
    transition,
  };
}

/**
 * Create a crossfade transition (default 200-300ms)
 */
function crossfade(durationMs: number = 250, easing: EasingType = 'easeInOutCubic'): SequenceStep['transition'] {
  return {
    type: 'crossfade',
    durationInFrames: Math.ceil((durationMs / 1000) * 60),
    easing,
  };
}

/**
 * Create a zoom transition
 */
function zoom(durationMs: number = 300, easing: EasingType = 'easeInOutBack'): SequenceStep['transition'] {
  return {
    type: 'zoom',
    durationInFrames: Math.ceil((durationMs / 1000) * 60),
    easing,
  };
}

/**
 * Create a slide transition
 */
function slide(durationMs: number = 200, easing: EasingType = 'easeInOutQuad'): SequenceStep['transition'] {
  return {
    type: 'slide',
    durationInFrames: Math.ceil((durationMs / 1000) * 60),
    easing,
  };
}

/**
 * All animation sequences with their steps and transitions
 */
export const ANIMATION_SEQUENCES: Record<AnimationSequence, SequenceDefinition> = {
  // 1. Summon wizard: conjuring → greeting → listening (3.5s)
  // Updated: puffs_in→conjuring, attentive→listening (using available sprites)
  summon_wizard: {
    id: 'summon_wizard',
    steps: [
      createStep('conjuring', crossfade(200)), // Magical appearance
      createStep('greeting', crossfade(150)), // Waves hello
      createStep('listening'), // Attentive listening pose
    ],
    totalFrames: 0, // Will be calculated
  },

  // 2. Dismiss wizard: farewell → conjuring (3s)
  // Updated: puffs_out→conjuring (using available sprites)
  dismiss_wizard: {
    id: 'dismiss_wizard',
    steps: [
      createStep('farewell', crossfade(200)), // Waves goodbye
      createStep('conjuring'), // Magical exit
    ],
    totalFrames: 0,
  },

  // 3. Process command: thinking → conjuring → presenting (6s)
  // FULLY WORKING - All sprites available
  process_command: {
    id: 'process_command',
    steps: [
      createStep('thinking', crossfade(250)),
      createStep('conjuring', crossfade(250)),
      createStep('presenting'),
    ],
    totalFrames: 0,
  },

  // 4. Magical reveal: conjuring → clapping → presenting (6s)
  // Updated: magical_reveal→clapping (celebratory reveal)
  magical_reveal: {
    id: 'magical_reveal',
    steps: [
      createStep('conjuring', zoom(300)),
      createStep('clapping', crossfade(200)), // Excited reveal
      createStep('presenting'),
    ],
    totalFrames: 0,
  },

  // 5. Error shake: confused → shrugging (3s)
  // FULLY WORKING - All sprites available
  error_shake: {
    id: 'error_shake',
    steps: [
      createStep('confused', crossfade(200)),
      createStep('shrugging'),
    ],
    totalFrames: 0,
  },

  // 6. Success: conjuring → cheering → clapping (5.5s)
  // Updated: success→conjuring (magical success)
  success: {
    id: 'success',
    steps: [
      createStep('conjuring', zoom(250)), // Magical success moment
      createStep('cheering', crossfade(200)),
      createStep('clapping'),
    ],
    totalFrames: 0,
  },

  // 7. Acknowledge new: listening → confirmation (2s)
  // Updated: attentive→listening (using available sprites)
  acknowledge_new: {
    id: 'acknowledge_new',
    steps: [
      createStep('listening', crossfade(150)), // Attentive listening
      createStep('confirmation'),
    ],
    totalFrames: 0,
  },
};

/**
 * Calculate total frames for a sequence including transition overlaps
 */
function calculateTotalFrames(sequence: SequenceDefinition): number {
  let total = 0;

  for (let i = 0; i < sequence.steps.length; i++) {
    const step = sequence.steps[i];
    total += step.durationInFrames;

    // Subtract transition duration from total since transitions overlap
    if (step.transition && i < sequence.steps.length - 1) {
      total -= step.transition.durationInFrames;
    }
  }

  return total;
}

// Calculate and set total frames for all sequences
Object.values(ANIMATION_SEQUENCES).forEach((sequence) => {
  sequence.totalFrames = calculateTotalFrames(sequence);
});

/**
 * Get sequence definition by ID
 */
export function getSequenceDefinition(sequence: AnimationSequence): SequenceDefinition {
  return ANIMATION_SEQUENCES[sequence];
}

/**
 * Get the frame offset for a specific step in a sequence
 */
export function getStepFrameOffset(sequence: AnimationSequence, stepIndex: number): number {
  const definition = getSequenceDefinition(sequence);
  let offset = 0;

  for (let i = 0; i < stepIndex && i < definition.steps.length; i++) {
    const step = definition.steps[i];
    offset += step.durationInFrames;

    // Subtract transition duration since transitions overlap
    if (step.transition) {
      offset -= step.transition.durationInFrames;
    }
  }

  return offset;
}

/**
 * Calculate frame count for a sequence (for use in Remotion Composition)
 */
export function calculateFrameCount(sequence: AnimationSequence): number {
  return getSequenceDefinition(sequence).totalFrames;
}
