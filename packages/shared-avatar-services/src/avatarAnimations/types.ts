/**
 * Avatar Animations Types
 * Advanced animation system for avatars
 */

export type AnimationType =
  | 'idle'
  | 'talking'
  | 'listening'
  | 'thinking'
  | 'nodding'
  | 'greeting'
  | 'waving'
  | 'celebrating'
  | 'confused'
  | 'disappointed'
  | 'excited'
  | 'empathetic';

export type AnimationIntensity = 'subtle' | 'normal' | 'intense';

export interface AnimationConfig {
  type: AnimationType;
  intensity: AnimationIntensity;
  duration?: number; // milliseconds
  loop?: boolean;
  blendTime?: number; // milliseconds for transition
}

export interface AnimationSequence {
  id: string;
  steps: AnimationStep[];
  loop?: boolean;
}

export interface AnimationStep {
  animation: AnimationType;
  duration: number;
  intensity: AnimationIntensity;
  delay?: number;
}

export interface AnimationState {
  current: AnimationType;
  intensity: AnimationIntensity;
  progress: number; // 0.0 - 1.0
  isTransitioning: boolean;
  next?: AnimationType;
}

export interface AnimationTrigger {
  emotion: string; // Maps to avatar emotion
  animation: AnimationType;
  intensity: AnimationIntensity;
  priority: number;
}

export const EMOTION_ANIMATION_MAP: Record<string, AnimationTrigger> = {
  'excited': {
    emotion: 'excited',
    animation: 'celebrating',
    intensity: 'intense',
    priority: 90
  },
  'happy': {
    emotion: 'happy',
    animation: 'waving',
    intensity: 'normal',
    priority: 80
  },
  'neutral': {
    emotion: 'neutral',
    animation: 'idle',
    intensity: 'subtle',
    priority: 50
  },
  'thinking': {
    emotion: 'thinking',
    animation: 'thinking',
    intensity: 'normal',
    priority: 70
  },
  'confused': {
    emotion: 'confused',
    animation: 'confused',
    intensity: 'normal',
    priority: 75
  },
  'empathetic': {
    emotion: 'empathetic',
    animation: 'empathetic',
    intensity: 'subtle',
    priority: 85
  },
  'apologetic': {
    emotion: 'apologetic',
    animation: 'disappointed',
    intensity: 'subtle',
    priority: 85
  }
};
