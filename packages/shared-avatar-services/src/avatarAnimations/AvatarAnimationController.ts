/**
 * Avatar Animation Controller
 * Manages advanced avatar animations and transitions
 */

import type {
  AnimationType,
  AnimationIntensity,
  AnimationConfig,
  AnimationSequence,
  AnimationState,
  AnimationStep
} from './types';
import { EMOTION_ANIMATION_MAP } from './types';

export class AvatarAnimationController {
  private currentState: AnimationState;
  private activeSequence: AnimationSequence | null = null;
  private sequenceStep: number = 0;
  private listeners: Set<(state: AnimationState) => void> = new Set();

  constructor() {
    this.currentState = {
      current: 'idle',
      intensity: 'subtle',
      progress: 0,
      isTransitioning: false
    };
  }

  /**
   * Play an animation
   */
  playAnimation(config: AnimationConfig): void {
    // Cancel any active sequence
    this.activeSequence = null;
    this.sequenceStep = 0;

    // Start transition
    this.currentState = {
      current: this.currentState.current,
      intensity: this.currentState.intensity,
      progress: 0,
      isTransitioning: true,
      next: config.type
    };

    this.notifyListeners();

    // Transition to new animation
    setTimeout(() => {
      this.currentState = {
        current: config.type,
        intensity: config.intensity,
        progress: 0,
        isTransitioning: false
      };

      this.notifyListeners();
    }, config.blendTime || 300);
  }

  /**
   * Play animation based on emotion
   */
  playAnimationForEmotion(emotion: string): void {
    const trigger = EMOTION_ANIMATION_MAP[emotion];

    if (trigger) {
      this.playAnimation({
        type: trigger.animation,
        intensity: trigger.intensity,
        blendTime: 300
      });
    }
  }

  /**
   * Play animation sequence
   */
  playSequence(sequence: AnimationSequence): void {
    this.activeSequence = sequence;
    this.sequenceStep = 0;
    this.playSequenceStep();
  }

  /**
   * Stop current animation
   */
  stopAnimation(): void {
    this.activeSequence = null;
    this.playAnimation({
      type: 'idle',
      intensity: 'subtle',
      blendTime: 500
    });
  }

  /**
   * Get current animation state
   */
  getState(): AnimationState {
    return { ...this.currentState };
  }

  /**
   * Add state listener
   */
  addListener(listener: (state: AnimationState) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Remove listener
   */
  removeListener(listener: (state: AnimationState) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Play next step in sequence
   */
  private playSequenceStep(): void {
    if (!this.activeSequence) return;

    const step = this.activeSequence.steps[this.sequenceStep];
    if (!step) {
      // Sequence complete
      if (this.activeSequence.loop) {
        this.sequenceStep = 0;
        this.playSequenceStep();
      } else {
        this.activeSequence = null;
        this.stopAnimation();
      }
      return;
    }

    // Play animation
    this.playAnimation({
      type: step.animation,
      intensity: step.intensity,
      duration: step.duration,
      blendTime: 300
    });

    // Schedule next step
    const totalStepTime = (step.delay || 0) + step.duration;
    setTimeout(() => {
      this.sequenceStep++;
      this.playSequenceStep();
    }, totalStepTime);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    const state = { ...this.currentState };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (error) {
        // Silently catch listener errors
      }
    }
  }
}

/**
 * Predefined animation sequences
 */
export const ANIMATION_SEQUENCES = {
  greeting: {
    id: 'greeting',
    steps: [
      { animation: 'waving' as AnimationType, duration: 1500, intensity: 'normal' as AnimationIntensity },
      { animation: 'idle' as AnimationType, duration: 1000, intensity: 'subtle' as AnimationIntensity }
    ],
    loop: false
  },

  celebration: {
    id: 'celebration',
    steps: [
      { animation: 'excited' as AnimationType, duration: 1000, intensity: 'intense' as AnimationIntensity },
      { animation: 'celebrating' as AnimationType, duration: 2000, intensity: 'intense' as AnimationIntensity },
      { animation: 'waving' as AnimationType, duration: 1500, intensity: 'normal' as AnimationIntensity },
      { animation: 'idle' as AnimationType, duration: 1000, intensity: 'normal' as AnimationIntensity }
    ],
    loop: false
  },

  thinking: {
    id: 'thinking',
    steps: [
      { animation: 'thinking' as AnimationType, duration: 2000, intensity: 'normal' as AnimationIntensity },
      { animation: 'nodding' as AnimationType, duration: 1000, intensity: 'subtle' as AnimationIntensity },
      { animation: 'thinking' as AnimationType, duration: 2000, intensity: 'subtle' as AnimationIntensity }
    ],
    loop: true
  },

  empathy: {
    id: 'empathy',
    steps: [
      { animation: 'empathetic' as AnimationType, duration: 2000, intensity: 'subtle' as AnimationIntensity },
      { animation: 'nodding' as AnimationType, duration: 1500, intensity: 'subtle' as AnimationIntensity },
      { animation: 'empathetic' as AnimationType, duration: 2000, intensity: 'subtle' as AnimationIntensity }
    ],
    loop: false
  }
};

// Singleton instance
export const avatarAnimationController = new AvatarAnimationController();
