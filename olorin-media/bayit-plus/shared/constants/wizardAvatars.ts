/**
 * Wizard Avatar Constants
 * Asset references for wizard character states and gestures
 */

import { VoiceState, GestureState } from '../stores/supportStore';
import { SpritesheetType } from '../components/support/WizardSprite';

// Wizard avatar images for voice states
export const WIZARD_AVATARS: Record<VoiceState, any> = {
  idle: require('../assets/images/characters/wizard/idle/512x512.png'),
  listening: require('../assets/images/characters/wizard/listening/256x256.png'),
  speaking: require('../assets/images/characters/wizard/speaking/256x256.png'),
  processing: require('../assets/images/characters/wizard/thinking/256x256.png'),
  error: require('../assets/images/characters/wizard/idle/512x512.png'),
};

// Gesture avatars
export const GESTURE_AVATARS: Record<GestureState, any> = {
  browsing: require('../assets/images/characters/wizard/browsing/256x256.png'),
  cheering: require('../assets/images/characters/wizard/cheering/256x256.png'),
  clapping: require('../assets/images/characters/wizard/clapping/256x256.png'),
  conjuring: require('../assets/images/characters/wizard/conjuring/256x256.png'),
  crying: require('../assets/images/characters/wizard/crying/256x256.png'),
  shrugging: require('../assets/images/characters/wizard/shrugging/256x256.png'),
  facepalm: require('../assets/images/characters/wizard/facepalm/256x256.png'),
};

// Animated gestures use spritesheets
export const ANIMATED_GESTURES: Set<GestureState> = new Set([
  'clapping',
  'conjuring',
  'crying',
  'facepalm',
] as GestureState[]);

export const GESTURE_TO_SPRITESHEET: Partial<Record<GestureState, SpritesheetType>> = {
  clapping: 'clapping',
  conjuring: 'conjuring',
  crying: 'crying',
  facepalm: 'facepalm',
};
