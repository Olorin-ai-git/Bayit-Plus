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
 * Only includes spritesheets that are available in the assets
 */
export type SpritesheetType =
  | 'clapping'
  | 'conjuring'
  | 'crying'
  | 'listening'
  | 'smacking'
  | 'speaking'
  | 'thinking';

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
 * Each gesture maps to either a static image or spritesheet
 */
export const GESTURE_AVATARS: Record<GestureState, unknown> = {
  browsing: require('../assets/images/characters/wizard/browsing/256x256.png'),
  cheering: require('../assets/images/characters/wizard/cheering/256x256.png'),
  clapping: require('../assets/images/characters/wizard/clapping/256x256.png'),
  conjuring: require('../assets/images/characters/wizard/conjuring/256x256.png'),
  crying: require('../assets/images/characters/wizard/crying/256x256.png'),
  shrugging: require('../assets/images/characters/wizard/shrugging/256x256.png'),
  facepalm: require('../assets/images/characters/wizard/facepalm/256x256.png'),
  greeting: require('../assets/images/characters/wizard/greeting/256x256.png'),
  attentive: require('../assets/images/characters/wizard/attentive/256x256.png'),
  thinking: require('../assets/images/characters/wizard/thinking/256x256.png'),
  presenting: require('../assets/images/characters/wizard/presenting/256x256.png'),
  confused: require('../assets/images/characters/wizard/confused/256x256.png'),
  farewell: require('../assets/images/characters/wizard/farewell/256x256.png'),
  emphatic: require('../assets/images/characters/wizard/emphatic/256x256.png'),
  reading: require('../assets/images/characters/wizard/reading/256x256.png'),
  confirmation: require('../assets/images/characters/wizard/confirmation/256x256.png'),
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
};

/**
 * Animated gestures that have spritesheets available
 * Only includes gestures with verified spritesheet files
 * Other gestures defined in GESTURE_LIBRARY will use static images
 */
export const ANIMATED_GESTURES = new Set<GestureType>([
  'clapping',
  'conjuring',
  'crying',
  'facepalm', // Uses 'smacking' spritesheet
  'listening',
  'thinking',
]);

/**
 * Spritesheet paths for animated gestures
 * Maps gesture types to their spritesheet asset paths
 *
 * Available spritesheets: clapping, conjuring, crying, facepalm (smacking), listening, thinking
 * Gestures without spritesheets will use static images via getGestureAvatar()
 */
export const GESTURE_SPRITESHEETS: Partial<Record<GestureType, unknown>> = {
  // Available spritesheets (verified in filesystem)
  clapping: require('../assets/images/characters/wizard/spritesheets/clapping/spritesheet.png'),
  conjuring: require('../assets/images/characters/wizard/spritesheets/conjuring/spritesheet.png'),
  crying: require('../assets/images/characters/wizard/spritesheets/crying/spritesheet.png'),
  facepalm: require('../assets/images/characters/wizard/spritesheets/smacking/spritesheet.png'),
  listening: require('../assets/images/characters/wizard/spritesheets/listening/spritesheet.png'),
  thinking: require('../assets/images/characters/wizard/spritesheets/thinking/spritesheet.png'),
  // Note: 'speaking' spritesheet exists but is used for voice state, not gesture
  // Note: greeting, presenting, browsing, confused, shrugging, farewell,
  // cheering, emphatic, reading, confirmation spritesheets
  // are pending creation. Use static images via getGestureAvatar() for these.
};

/**
 * Map gesture type to spritesheet type for animation system
 * Only includes gestures with available spritesheets
 */
export const GESTURE_TO_SPRITESHEET: Partial<Record<GestureType, SpritesheetType>> = {
  clapping: 'clapping',
  conjuring: 'conjuring',
  crying: 'crying',
  facepalm: 'smacking',
  listening: 'listening',
  thinking: 'thinking',
};

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
