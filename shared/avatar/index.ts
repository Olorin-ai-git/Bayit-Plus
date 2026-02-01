/**
 * Avatar System - Barrel Export
 *
 * Unified export for the Olorin Wizard Avatar system.
 * Includes dialogue, gestures, states, hooks, and services.
 */

// Constants
export {
  // Dialogue Types
  type DialogueCategory,
  type DialogueContext,
  type DialogueLine,
  type DialogueSet,
  // Dialogue Functions
  getRandomDialogue,
  getTimeBasedGreeting,
  formatDialogue,
  getDismissalDialogue,
  shouldUsePersonalityMoment,
  getSearchResultDialogue,
  // Dialogue Data
  AVATAR_DIALOGUES,
} from '../constants/avatarDialogues';

export {
  // Gesture Types
  type GestureType,
  type GestureDefinition,
  type IdleBehavior,
  type IdleBehaviorType,
  // Gesture Data
  GESTURE_LIBRARY,
  IDLE_BEHAVIORS,
  GESTURE_TRANSITIONS,
  GESTURE_TIMING,
  PLATFORM_GESTURE_CONFIG,
  // Gesture Functions
  getRandomIdleBehavior,
  canTransition,
  getGestureForVoiceState,
} from '../constants/avatarGestures';

export {
  // State Types
  type AvatarCoreState,
  type AvatarVisualForm,
  type AvatarStateDefinition,
  type StateTrigger,
  // State Data
  AVATAR_CORE_STATES,
  AVATAR_STATE_TRANSITIONS,
  HAT_TO_WIZARD_TRANSITION,
  WIZARD_TO_HAT_TRANSITION,
  STATE_TRIGGERS,
  INTERRUPTION_PATTERNS,
  STATE_TIMING,
  // State Functions
  canTransitionState,
  getNextState,
  isInterruption,
} from '../constants/avatarStates';

export {
  // Wizard Avatar Types
  type SpritesheetType,
  type SpritesheetConfig,
  // Wizard Avatar Data
  WIZARD_AVATARS,
  GESTURE_AVATARS,
  GESTURE_TYPE_AVATARS,
  ANIMATED_GESTURES,
  GESTURE_SPRITESHEETS,
  GESTURE_TO_SPRITESHEET,
  SPRITESHEET_CONFIGS,
  IDLE_BEHAVIOR_SPRITESHEETS,
  // Wizard Avatar Functions
  getGestureAvatar,
  isAnimatedGesture,
  getGestureSpritesheet,
  getSpritesheetConfig,
  getIdleBehaviorSpritesheet,
  getIdleBehaviorConfig,
} from '../constants/wizardAvatars';

// Hooks
export {
  useAvatarDialogue,
  type DialogueState,
  type UseAvatarDialogueOptions,
  type UseAvatarDialogueReturn,
} from '../hooks/useAvatarDialogue';

export {
  useAvatarStateMachine,
  type AvatarStateMachineState,
  type UseAvatarStateMachineOptions,
  type UseAvatarStateMachineReturn,
} from '../hooks/useAvatarStateMachine';

// tvOS Focus Hook
export {
  useTVAvatarFocus,
  type AvatarFocusZone,
  AVATAR_FOCUS_ZONES,
  getTVOSAvatarSize,
  getTVOSFocusRingStyle,
} from '../hooks/useTVAvatarFocus';

// Services
export {
  AvatarInterruptionService,
  useAvatarInterruption,
  type InterruptionEvent,
  type InterruptionState,
  type InterruptionCallbacks,
} from '../services/avatarInterruptionService';
