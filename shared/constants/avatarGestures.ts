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
  | 'confirmation'
  | 'single_result'
  | 'waiting'
  | 'success'
  | 'clarification'
  | 'warning'
  | 'magical_reveal'
  | 'agreement'
  | 'disagreement';

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
  action: IdleBehaviorType;
  probability: number;
  duration: number;
  hasAnimation: boolean;
  spritesheet?: string;
  frameCount?: number;
  frameRate?: number;
}

/**
 * Idle behavior action types
 */
export type IdleBehaviorType =
  | 'shifts_weight'
  | 'adjusts_hat'
  | 'looks_around'
  | 'strokes_beard'
  | 'sighs_patiently'
  | 'puffs_in'
  | 'puffs_out';

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
  single_result: {
    name: 'single_result',
    description: 'Points with staff or finger at single item',
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'single_result',
    frameCount: 4,
    frameRate: 8,
    looping: false,
    transitionTo: 'idle',
  },
  waiting: {
    name: 'waiting',
    description: 'Taps staff gently on the ground, looks patiently to the side',
    duration: 0,
    hasAnimation: true,
    spritesheet: 'waiting',
    frameCount: 4,
    frameRate: 6,
    looping: true,
  },
  success: {
    name: 'success',
    description: 'Snaps fingers, points upward with a knowing smile',
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'success',
    frameCount: 4,
    frameRate: 10,
    looping: false,
    transitionTo: 'idle',
  },
  clarification: {
    name: 'clarification',
    description: 'Leans forward slightly, cups one hand to his ear',
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'clarification',
    frameCount: 4,
    frameRate: 8,
    looping: false,
    transitionTo: 'listening',
  },
  warning: {
    name: 'warning',
    description: 'Holds open palm outward in a stop or wait motion',
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'warning',
    frameCount: 4,
    frameRate: 8,
    looping: false,
    transitionTo: 'idle',
  },
  magical_reveal: {
    name: 'magical_reveal',
    description: 'Swirls staff or hand, creating a small magical flourish before pointing',
    duration: 2500,
    hasAnimation: true,
    spritesheet: 'magical_reveal',
    frameCount: 6,
    frameRate: 10,
    looping: false,
    transitionTo: 'presenting',
  },
  agreement: {
    name: 'agreement',
    description: 'Firm nod, perhaps a small tap of the staff',
    duration: 1200,
    hasAnimation: true,
    spritesheet: 'agreement',
    frameCount: 4,
    frameRate: 8,
    looping: false,
    transitionTo: 'idle',
  },
  disagreement: {
    name: 'disagreement',
    description: 'Slow head shake, crosses arms slightly',
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'disagreement',
    frameCount: 4,
    frameRate: 6,
    looping: false,
    transitionTo: 'idle',
  },
};

/**
 * Idle behaviors when wizard stays visible but user pauses
 */
export const IDLE_BEHAVIORS: IdleBehavior[] = [
  {
    action: 'shifts_weight',
    probability: 0.3,
    duration: 2000,
    hasAnimation: true,
    spritesheet: 'shifts_weight',
    frameCount: 3,
    frameRate: 6,
  },
  {
    action: 'adjusts_hat',
    probability: 0.2,
    duration: 1500,
    hasAnimation: true,
    spritesheet: 'adjusts_hat',
    frameCount: 4,
    frameRate: 8,
  },
  {
    action: 'looks_around',
    probability: 0.25,
    duration: 2500,
    hasAnimation: true,
    spritesheet: 'looks_around',
    frameCount: 5,
    frameRate: 6,
  },
  {
    action: 'strokes_beard',
    probability: 0.15,
    duration: 2000,
    hasAnimation: false,
  },
  {
    action: 'sighs_patiently',
    probability: 0.05,
    duration: 1000,
    hasAnimation: false,
  },
  {
    action: 'puffs_in',
    probability: 0.08,
    duration: 2000,
    hasAnimation: true,
    spritesheet: 'puffs_in',
    frameCount: 5,
    frameRate: 8,
  },
  {
    action: 'puffs_out',
    probability: 0.07,
    duration: 2000,
    hasAnimation: true,
    spritesheet: 'puffs_out',
    frameCount: 5,
    frameRate: 8,
  },
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
  idle: ['greeting', 'listening', 'thinking', 'browsing', 'conjuring', 'farewell', 'waiting', 'magical_reveal'],
  greeting: ['idle', 'listening', 'attentive'],
  listening: ['idle', 'thinking', 'attentive', 'confused', 'clarification'],
  attentive: ['idle', 'listening', 'presenting', 'thinking'],
  thinking: ['idle', 'presenting', 'browsing', 'confused', 'shrugging', 'success'],
  presenting: ['idle', 'attentive', 'reading', 'confirmation', 'single_result'],
  conjuring: ['presenting', 'idle', 'magical_reveal'],
  browsing: ['presenting', 'thinking', 'shrugging', 'idle'],
  confused: ['attentive', 'listening', 'idle', 'clarification'],
  shrugging: ['idle', 'attentive'],
  farewell: ['idle'],
  cheering: ['idle', 'presenting'],
  clapping: ['idle'],
  crying: ['idle'],
  facepalm: ['idle', 'thinking'],
  emphatic: ['idle', 'presenting'],
  reading: ['idle', 'presenting', 'attentive'],
  confirmation: ['idle', 'attentive', 'listening', 'agreement', 'disagreement'],
  single_result: ['idle', 'presenting', 'reading'],
  waiting: ['idle', 'thinking', 'presenting', 'success'],
  success: ['idle', 'presenting', 'cheering'],
  clarification: ['listening', 'attentive', 'idle'],
  warning: ['idle', 'attentive', 'waiting'],
  magical_reveal: ['presenting', 'single_result', 'idle'],
  agreement: ['idle', 'presenting', 'success'],
  disagreement: ['idle', 'shrugging', 'clarification'],
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
