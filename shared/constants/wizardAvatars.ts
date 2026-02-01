/**
 * Wizard Avatar Constants
 * Asset references for wizard character states and gestures
 *
 * Maps to the 17 gesture types defined in avatarGestures.ts:
 * idle, greeting, listening, attentive, thinking, presenting, conjuring,
 * browsing, confused, shrugging, farewell, cheering, clapping, crying,
 * facepalm, emphatic, reading, confirmation
 */

import { VoiceState, GestureState } from '../stores/supportStore';
import { GestureType } from './avatarGestures';

/**
 * Spritesheet type mapping for animated gestures
 * All gesture types that have animation spritesheets
 */
export type SpritesheetType =
  | 'attentive'
  | 'browsing'
  | 'cheering'
  | 'clapping'
  | 'confirmation'
  | 'confused'
  | 'conjuring'
  | 'crying'
  | 'emphatic'
  | 'farewell'
  | 'greeting'
  | 'listening'
  | 'presenting'
  | 'reading'
  | 'shrugging'
  | 'smacking'
  | 'speaking'
  | 'thinking'
  | 'single_result'
  | 'waiting'
  | 'success'
  | 'clarification'
  | 'warning'
  | 'magical_reveal'
  | 'agreement'
  | 'disagreement'
  // Idle behaviors
  | 'shifts_weight'
  | 'adjusts_hat'
  | 'looks_around'
  | 'puffs_in'
  | 'puffs_out';

/**
 * Wizard avatar images for voice states
 */
export const WIZARD_AVATARS: Record<VoiceState, unknown> = {
  idle: require('../assets/images/characters/wizard/idle/512x512.png'),
  listening: require('../assets/images/characters/wizard/listening/256x256.png'),
  speaking: require('../assets/images/characters/wizard/speaking/256x256.png'),
  processing: require('../assets/images/characters/wizard/thinking/256x256.png'),
  error: require('../assets/images/characters/wizard/idle/512x512.png'),
};

/**
 * Complete gesture avatar mappings for all 17 gesture types
 * Each gesture maps to a static image (first frame of animation)
 */
export const GESTURE_AVATARS: Record<GestureState, unknown> = {
  attentive: require('../assets/images/characters/wizard/attentive/256x256.png'),
  browsing: require('../assets/images/characters/wizard/browsing/256x256.png'),
  cheering: require('../assets/images/characters/wizard/cheering/256x256.png'),
  clapping: require('../assets/images/characters/wizard/clapping/256x256.png'),
  confirmation: require('../assets/images/characters/wizard/confirmation/256x256.png'),
  confused: require('../assets/images/characters/wizard/confused/256x256.png'),
  conjuring: require('../assets/images/characters/wizard/conjuring/256x256.png'),
  crying: require('../assets/images/characters/wizard/crying/256x256.png'),
  emphatic: require('../assets/images/characters/wizard/emphatic/256x256.png'),
  facepalm: require('../assets/images/characters/wizard/facepalm/256x256.png'),
  farewell: require('../assets/images/characters/wizard/farewell/256x256.png'),
  greeting: require('../assets/images/characters/wizard/greeting/256x256.png'),
  presenting: require('../assets/images/characters/wizard/presenting/256x256.png'),
  reading: require('../assets/images/characters/wizard/reading/256x256.png'),
  shrugging: require('../assets/images/characters/wizard/shrugging/256x256.png'),
  thinking: require('../assets/images/characters/wizard/thinking/256x256.png'),
};

/**
 * Extended gesture avatars including all GestureType values
 * Used for gesture system integration
 */
export const GESTURE_TYPE_AVATARS: Record<GestureType, unknown> = {
  idle: require('../assets/images/characters/wizard/idle/512x512.png'),
  greeting: require('../assets/images/characters/wizard/greeting/256x256.png'),
  listening: require('../assets/images/characters/wizard/listening/256x256.png'),
  attentive: require('../assets/images/characters/wizard/attentive/256x256.png'),
  thinking: require('../assets/images/characters/wizard/thinking/256x256.png'),
  presenting: require('../assets/images/characters/wizard/presenting/256x256.png'),
  conjuring: require('../assets/images/characters/wizard/conjuring/256x256.png'),
  browsing: require('../assets/images/characters/wizard/browsing/256x256.png'),
  confused: require('../assets/images/characters/wizard/confused/256x256.png'),
  shrugging: require('../assets/images/characters/wizard/shrugging/256x256.png'),
  farewell: require('../assets/images/characters/wizard/farewell/256x256.png'),
  cheering: require('../assets/images/characters/wizard/cheering/256x256.png'),
  clapping: require('../assets/images/characters/wizard/clapping/256x256.png'),
  crying: require('../assets/images/characters/wizard/crying/256x256.png'),
  facepalm: require('../assets/images/characters/wizard/facepalm/256x256.png'),
  emphatic: require('../assets/images/characters/wizard/emphatic/256x256.png'),
  reading: require('../assets/images/characters/wizard/reading/256x256.png'),
  confirmation: require('../assets/images/characters/wizard/confirmation/256x256.png'),
  single_result: require('../assets/images/characters/wizard/single_result/256x256.png'),
  waiting: require('../assets/images/characters/wizard/waiting/256x256.png'),
  success: require('../assets/images/characters/wizard/success/256x256.png'),
  clarification: require('../assets/images/characters/wizard/clarification/256x256.png'),
  warning: require('../assets/images/characters/wizard/warning/256x256.png'),
  magical_reveal: require('../assets/images/characters/wizard/magical_reveal/256x256.png'),
  agreement: require('../assets/images/characters/wizard/agreement/256x256.png'),
  disagreement: require('../assets/images/characters/wizard/disagreement/256x256.png'),
};

/**
 * Animated gestures that have spritesheets available
 * All gestures with animation support from spritesheets
 */
export const ANIMATED_GESTURES = new Set<GestureType>([
  'attentive',
  'browsing',
  'cheering',
  'clapping',
  'confirmation',
  'confused',
  'conjuring',
  'crying',
  'emphatic',
  'facepalm', // Uses 'smacking' spritesheet
  'farewell',
  'greeting',
  'listening',
  'presenting',
  'reading',
  'shrugging',
  'thinking',
  'single_result',
  'waiting',
  'success',
  'clarification',
  'warning',
  'magical_reveal',
  'agreement',
  'disagreement',
]);

/**
 * Spritesheet paths for animated gestures
 * Maps gesture types to their spritesheet asset paths
 */
export const GESTURE_SPRITESHEETS: Partial<Record<GestureType, unknown>> = {
  // All gesture spritesheets
  attentive: require('../assets/images/characters/wizard/spritesheets/attentive/spritesheet.png'),
  browsing: require('../assets/images/characters/wizard/spritesheets/browsing/spritesheet.png'),
  cheering: require('../assets/images/characters/wizard/spritesheets/cheering/spritesheet.png'),
  clapping: require('../assets/images/characters/wizard/spritesheets/clapping/spritesheet.png'),
  confirmation: require('../assets/images/characters/wizard/spritesheets/confirmation/spritesheet.png'),
  confused: require('../assets/images/characters/wizard/spritesheets/confused/spritesheet.png'),
  conjuring: require('../assets/images/characters/wizard/spritesheets/conjuring/spritesheet.png'),
  crying: require('../assets/images/characters/wizard/spritesheets/crying/spritesheet.png'),
  emphatic: require('../assets/images/characters/wizard/spritesheets/emphatic/spritesheet.png'),
  facepalm: require('../assets/images/characters/wizard/spritesheets/smacking/spritesheet.png'),
  farewell: require('../assets/images/characters/wizard/spritesheets/farewell/spritesheet.png'),
  greeting: require('../assets/images/characters/wizard/spritesheets/greeting/spritesheet.png'),
  listening: require('../assets/images/characters/wizard/spritesheets/listening/spritesheet.png'),
  presenting: require('../assets/images/characters/wizard/spritesheets/presenting/spritesheet.png'),
  reading: require('../assets/images/characters/wizard/spritesheets/reading/spritesheet.png'),
  shrugging: require('../assets/images/characters/wizard/spritesheets/shrugging/spritesheet.png'),
  thinking: require('../assets/images/characters/wizard/spritesheets/thinking/spritesheet.png'),
  single_result: require('../assets/images/characters/wizard/spritesheets/single_result/spritesheet.png'),
  waiting: require('../assets/images/characters/wizard/spritesheets/waiting/spritesheet.png'),
  success: require('../assets/images/characters/wizard/spritesheets/success/spritesheet.png'),
  clarification: require('../assets/images/characters/wizard/spritesheets/clarification/spritesheet.png'),
  warning: require('../assets/images/characters/wizard/spritesheets/warning/spritesheet.png'),
  magical_reveal: require('../assets/images/characters/wizard/spritesheets/magical_reveal/spritesheet.png'),
  agreement: require('../assets/images/characters/wizard/spritesheets/agreement/spritesheet.png'),
  disagreement: require('../assets/images/characters/wizard/spritesheets/disagreement/spritesheet.png'),
};

/**
 * Idle behavior spritesheets for wizard animations during pauses
 */
export const IDLE_BEHAVIOR_SPRITESHEETS: Record<string, unknown> = {
  shifts_weight: require('../assets/images/characters/wizard/spritesheets/idle/shifts_weight/spritesheet.png'),
  adjusts_hat: require('../assets/images/characters/wizard/spritesheets/idle/adjusts_hat/spritesheet.png'),
  looks_around: require('../assets/images/characters/wizard/spritesheets/idle/looks_around/spritesheet.png'),
  puffs_in: require('../assets/images/characters/wizard/spritesheets/idle/puffs_in/spritesheet.png'),
  puffs_out: require('../assets/images/characters/wizard/spritesheets/idle/puffs_out/spritesheet.png'),
};

/**
 * Map gesture type to spritesheet type for animation system
 */
export const GESTURE_TO_SPRITESHEET: Partial<Record<GestureType, SpritesheetType>> = {
  attentive: 'attentive',
  browsing: 'browsing',
  cheering: 'cheering',
  clapping: 'clapping',
  confirmation: 'confirmation',
  confused: 'confused',
  conjuring: 'conjuring',
  crying: 'crying',
  emphatic: 'emphatic',
  facepalm: 'smacking',
  farewell: 'farewell',
  greeting: 'greeting',
  listening: 'listening',
  presenting: 'presenting',
  reading: 'reading',
  shrugging: 'shrugging',
  thinking: 'thinking',
  single_result: 'single_result',
  waiting: 'waiting',
  success: 'success',
  clarification: 'clarification',
  warning: 'warning',
  magical_reveal: 'magical_reveal',
  agreement: 'agreement',
  disagreement: 'disagreement',
};

/**
 * Animation frame configuration for each spritesheet
 * Defines number of frames and timing for gesture animations
 */
export interface SpritesheetConfig {
  frameCount: number;
  frameDuration: number; // milliseconds per frame
  looping: boolean;
}

export const SPRITESHEET_CONFIGS: Record<SpritesheetType, SpritesheetConfig> = {
  // Gesture animations - frame counts based on actual spritesheets
  browsing: { frameCount: 5, frameDuration: 150, looping: true },
  cheering: { frameCount: 3, frameDuration: 120, looping: true },
  clapping: { frameCount: 4, frameDuration: 100, looping: true },
  confirmation: { frameCount: 2, frameDuration: 200, looping: false },
  confused: { frameCount: 3, frameDuration: 180, looping: true },
  conjuring: { frameCount: 4, frameDuration: 150, looping: true },
  crying: { frameCount: 4, frameDuration: 200, looping: true },
  emphatic: { frameCount: 3, frameDuration: 120, looping: true },
  farewell: { frameCount: 4, frameDuration: 150, looping: false },
  greeting: { frameCount: 4, frameDuration: 150, looping: false },
  listening: { frameCount: 6, frameDuration: 200, looping: true },
  presenting: { frameCount: 2, frameDuration: 150, looping: true },
  reading: { frameCount: 4, frameDuration: 180, looping: true },
  shrugging: { frameCount: 3, frameDuration: 150, looping: false },
  smacking: { frameCount: 6, frameDuration: 120, looping: false },
  speaking: { frameCount: 4, frameDuration: 100, looping: true },
  thinking: { frameCount: 4, frameDuration: 200, looping: true },
  single_result: { frameCount: 6, frameDuration: 150, looping: false },
  waiting: { frameCount: 6, frameDuration: 250, looping: true },
  success: { frameCount: 6, frameDuration: 120, looping: false },
  clarification: { frameCount: 6, frameDuration: 150, looping: false },
  warning: { frameCount: 6, frameDuration: 150, looping: false },
  magical_reveal: { frameCount: 6, frameDuration: 150, looping: false },
  agreement: { frameCount: 6, frameDuration: 150, looping: false },
  disagreement: { frameCount: 6, frameDuration: 180, looping: false },
  attentive: { frameCount: 6, frameDuration: 180, looping: true },
  // Idle behavior animations
  shifts_weight: { frameCount: 3, frameDuration: 250, looping: false },
  adjusts_hat: { frameCount: 4, frameDuration: 180, looping: false },
  looks_around: { frameCount: 5, frameDuration: 200, looping: false },
  puffs_in: { frameCount: 5, frameDuration: 160, looping: false },
  puffs_out: { frameCount: 5, frameDuration: 160, looping: false },
};

/**
 * Get animation config for a gesture
 */
export function getSpritesheetConfig(gesture: GestureType): SpritesheetConfig | null {
  const spritesheetType = GESTURE_TO_SPRITESHEET[gesture];
  if (!spritesheetType) {
    return null;
  }
  return SPRITESHEET_CONFIGS[spritesheetType];
}

/**
 * Get avatar image for a gesture type
 */
export function getGestureAvatar(gesture: GestureType): unknown {
  return GESTURE_TYPE_AVATARS[gesture] || GESTURE_TYPE_AVATARS.idle;
}

/**
 * Check if a gesture has animation
 */
export function isAnimatedGesture(gesture: GestureType): boolean {
  return ANIMATED_GESTURES.has(gesture);
}

/**
 * Get spritesheet for a gesture (if animated)
 */
export function getGestureSpritesheet(gesture: GestureType): unknown | null {
  if (!isAnimatedGesture(gesture)) {
    return null;
  }
  return GESTURE_SPRITESHEETS[gesture] || null;
}

/**
 * Get spritesheet for an idle behavior
 */
export function getIdleBehaviorSpritesheet(behavior: string): unknown | null {
  return IDLE_BEHAVIOR_SPRITESHEETS[behavior] || null;
}

/**
 * Get spritesheet config for an idle behavior
 */
export function getIdleBehaviorConfig(behavior: string): SpritesheetConfig | null {
  const spritesheetType = behavior as SpritesheetType;
  return SPRITESHEET_CONFIGS[spritesheetType] || null;
}
