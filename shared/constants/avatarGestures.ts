/**
 * Avatar Gesture Library - Olorin Wizard Character
 *
 * Defines visual behaviors for each avatar state and moment
 */

export type GestureType =
  | 'idle'
  | 'greeting'
  | 'listening'
  | 'attentive'
  | 'thinking'
  | 'presenting'
  | 'conjuring'
  | 'browsing'
  | 'confused'
  | 'shrugging'
  | 'farewell'
  | 'cheering'
  | 'clapping'
  | 'crying'
  | 'facepalm'
  | 'emphatic'
  | 'reading'
  | 'confirmation';

export interface GestureDefinition {
  name: GestureType;
  description: string;
  duration: number;
  hasAnimation: boolean;
  spritesheet?: string;
  frameCount?: number;
  frameRate?: number;
  looping: boolean;
  transitionTo?: GestureType;
}

export interface IdleBehavior {
  action: string;
  probability: number;
  duration: number;
}

/**
 * Complete Gesture Library
 */
export const GESTURE_LIBRARY: Record<GestureType, GestureDefinition> = {
  idle: {
    name: 'idle',
    description: 'Neutral, relaxed stance',
    duration: 0,
    hasAnimation: false,
    looping: true,
  },
  greeting: {
    name: 'greeting',
    description: 'Slight bow, hand to chest',
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'greeting',
    frameCount: 12,
    frameRate: 12,
    looping: false,
    transitionTo: 'idle',
  },
  listening: {
    name: 'listening',
    description: 'Leaning in slightly, attentive eyes, perhaps stroking beard',
    duration: 0,
    hasAnimation: true,
    spritesheet: 'listening',
    frameCount: 8,
    frameRate: 8,
    looping: true,
  },
  attentive: {
    name: 'attentive',
    description: 'Head tilt, eyebrows raised, ready for input',
    duration: 0,
    hasAnimation: false,
    looping: true,
  },
  thinking: {
    name: 'thinking',
    description: 'Strokes beard, looks upward',
    duration: 2000,
    hasAnimation: true,
    spritesheet: 'thinking',
    frameCount: 16,
    frameRate: 8,
    looping: true,
  },
  presenting: {
    name: 'presenting',
    description: 'Open palm toward content, like unveiling',
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'presenting',
    frameCount: 12,
    frameRate: 12,
    looping: false,
    transitionTo: 'idle',
  },
  conjuring: {
    name: 'conjuring',
    description: 'Runes swirl around, staff glows, magical particles',
    duration: 2500,
    hasAnimation: true,
    spritesheet: 'conjuring',
    frameCount: 24,
    frameRate: 12,
    looping: false,
    transitionTo: 'presenting',
  },
  browsing: {
    name: 'browsing',
    description: 'Gazing into crystal ball, scrolling through archives',
    duration: 0,
    hasAnimation: true,
    spritesheet: 'browsing',
    frameCount: 16,
    frameRate: 8,
    looping: true,
  },
  confused: {
    name: 'confused',
    description: 'Quizzical expression, head tilt, raised eyebrow',
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'confused',
    frameCount: 8,
    frameRate: 8,
    looping: false,
    transitionTo: 'attentive',
  },
  shrugging: {
    name: 'shrugging',
    description: 'Palms up, slight shrug, apologetic',
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'shrugging',
    frameCount: 8,
    frameRate: 8,
    looping: false,
    transitionTo: 'idle',
  },
  farewell: {
    name: 'farewell',
    description: 'Tips hat, nod, begins to fade',
    duration: 2000,
    hasAnimation: true,
    spritesheet: 'farewell',
    frameCount: 16,
    frameRate: 12,
    looping: false,
  },
  cheering: {
    name: 'cheering',
    description: 'Celebration gesture, staff raised',
    duration: 2000,
    hasAnimation: true,
    spritesheet: 'cheering',
    frameCount: 16,
    frameRate: 12,
    looping: false,
    transitionTo: 'idle',
  },
  clapping: {
    name: 'clapping',
    description: 'Applause gesture',
    duration: 2000,
    hasAnimation: true,
    spritesheet: 'clapping',
    frameCount: 16,
    frameRate: 12,
    looping: false,
    transitionTo: 'idle',
  },
  crying: {
    name: 'crying',
    description: 'Sad/emotional expression',
    duration: 2000,
    hasAnimation: true,
    spritesheet: 'crying',
    frameCount: 12,
    frameRate: 8,
    looping: false,
    transitionTo: 'idle',
  },
  facepalm: {
    name: 'facepalm',
    description: 'Hand to face, exasperated',
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'facepalm',
    frameCount: 12,
    frameRate: 12,
    looping: false,
    transitionTo: 'idle',
  },
  emphatic: {
    name: 'emphatic',
    description: 'Hand raised slightly for emphasis',
    duration: 1000,
    hasAnimation: true,
    spritesheet: 'emphatic',
    frameCount: 8,
    frameRate: 12,
    looping: false,
    transitionTo: 'idle',
  },
  reading: {
    name: 'reading',
    description: 'Looks at content, then back to user',
    duration: 2000,
    hasAnimation: true,
    spritesheet: 'reading',
    frameCount: 16,
    frameRate: 8,
    looping: false,
    transitionTo: 'idle',
  },
  confirmation: {
    name: 'confirmation',
    description: 'Slight nod, awaiting response',
    duration: 1000,
    hasAnimation: true,
    spritesheet: 'confirmation',
    frameCount: 8,
    frameRate: 8,
    looping: false,
    transitionTo: 'attentive',
  },
};

/**
 * Idle behaviors when wizard stays visible but user pauses
 */
export const IDLE_BEHAVIORS: IdleBehavior[] = [
  { action: 'shifts_weight', probability: 0.3, duration: 2000 },
  { action: 'adjusts_hat', probability: 0.2, duration: 1500 },
  { action: 'looks_around', probability: 0.25, duration: 2500 },
  { action: 'strokes_beard', probability: 0.15, duration: 2000 },
  { action: 'sighs_patiently', probability: 0.1, duration: 1000 },
];

/**
 * Get random idle behavior
 */
export function getRandomIdleBehavior(): IdleBehavior {
  const rand = Math.random();
  let cumulative = 0;

  for (const behavior of IDLE_BEHAVIORS) {
    cumulative += behavior.probability;
    if (rand <= cumulative) {
      return behavior;
    }
  }

  return IDLE_BEHAVIORS[0];
}

/**
 * Gesture state machine - valid transitions
 */
export const GESTURE_TRANSITIONS: Record<GestureType, GestureType[]> = {
  idle: ['greeting', 'listening', 'thinking', 'browsing', 'conjuring', 'farewell'],
  greeting: ['idle', 'listening', 'attentive'],
  listening: ['idle', 'thinking', 'attentive', 'confused'],
  attentive: ['idle', 'listening', 'presenting', 'thinking'],
  thinking: ['idle', 'presenting', 'browsing', 'confused', 'shrugging'],
  presenting: ['idle', 'attentive', 'reading', 'confirmation'],
  conjuring: ['presenting', 'idle'],
  browsing: ['presenting', 'thinking', 'shrugging', 'idle'],
  confused: ['attentive', 'listening', 'idle'],
  shrugging: ['idle', 'attentive'],
  farewell: ['idle'],
  cheering: ['idle', 'presenting'],
  clapping: ['idle'],
  crying: ['idle'],
  facepalm: ['idle', 'thinking'],
  emphatic: ['idle', 'presenting'],
  reading: ['idle', 'presenting', 'attentive'],
  confirmation: ['idle', 'attentive', 'listening'],
};

/**
 * Check if gesture transition is valid
 */
export function canTransition(from: GestureType, to: GestureType): boolean {
  return GESTURE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get gesture for voice state
 */
export function getGestureForVoiceState(
  voiceState: 'idle' | 'listening' | 'processing' | 'speaking' | 'error'
): GestureType {
  switch (voiceState) {
    case 'idle':
      return 'idle';
    case 'listening':
      return 'listening';
    case 'processing':
      return 'thinking';
    case 'speaking':
      return 'presenting';
    case 'error':
      return 'confused';
    default:
      return 'idle';
  }
}

/**
 * Gesture timing configurations
 */
export const GESTURE_TIMING = {
  // Time to wait before idle behavior starts (ms)
  idleBehaviorDelay: 10000,

  // Time between idle behaviors (ms)
  idleBehaviorInterval: 8000,

  // Time before auto-dismissal prompt (ms)
  idleTimeoutPrompt: 15000,

  // Gesture transition duration (ms)
  transitionDuration: 300,

  // Minimum gesture duration before interrupt allowed (ms)
  minGestureDuration: 500,
};

/**
 * Platform-specific gesture adjustments
 */
export const PLATFORM_GESTURE_CONFIG = {
  web: {
    scale: 1.0,
    frameRateMultiplier: 1.0,
  },
  mobile: {
    scale: 0.85,
    frameRateMultiplier: 1.0,
  },
  tv: {
    scale: 1.25,
    frameRateMultiplier: 1.0,
  },
};
