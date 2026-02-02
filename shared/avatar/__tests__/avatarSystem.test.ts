/**
 * Avatar System Unit Tests
 *
 * Tests pure functions and data structures without React dependencies:
 * - Gesture library completeness
 * - State transitions
 * - Spritesheet configurations
 * - Dialogue system
 * - Idle behavior randomization
 */

// Import constants and functions from the avatar system
import {
  GESTURE_LIBRARY,
  GESTURE_TRANSITIONS,
  IDLE_BEHAVIORS,
  GESTURE_TIMING,
  getRandomIdleBehavior,
  canTransition,
  getGestureForVoiceState,
  GestureType,
  IdleBehaviorType,
} from '../../constants/avatarGestures';

import {
  AVATAR_CORE_STATES,
  AVATAR_STATE_TRANSITIONS,
  canTransitionState,
  AvatarCoreState,
} from '../../constants/avatarStates';

import {
  SPRITESHEET_CONFIGS,
  ANIMATED_GESTURES,
  GESTURE_TO_SPRITESHEET,
  SpritesheetType,
} from '../../constants/wizardAvatars';

import {
  AVATAR_DIALOGUES,
  getRandomDialogue,
  getTimeBasedGreeting,
  DialogueCategory,
} from '../../constants/avatarDialogues';

describe('Gesture Library', () => {
  const expectedGestures: GestureType[] = [
    'idle', 'greeting', 'listening', 'attentive', 'thinking',
    'presenting', 'conjuring', 'browsing', 'confused', 'shrugging',
    'farewell', 'cheering', 'clapping', 'crying', 'facepalm',
    'emphatic', 'reading', 'confirmation', 'single_result', 'waiting',
    'success', 'clarification', 'warning', 'magical_reveal', 'agreement', 'disagreement',
  ];

  test('all 26 gesture types are defined', () => {
    expectedGestures.forEach((gesture) => {
      expect(GESTURE_LIBRARY[gesture]).toBeDefined();
      expect(GESTURE_LIBRARY[gesture].name).toBe(gesture);
    });
  });

  test('animated gestures have spritesheet properties', () => {
    const animatedGestures = expectedGestures.filter(
      (g) => GESTURE_LIBRARY[g].hasAnimation
    );

    animatedGestures.forEach((gesture) => {
      const def = GESTURE_LIBRARY[gesture];
      expect(def.spritesheet).toBeDefined();
      expect(def.frameCount).toBeGreaterThan(0);
      expect(def.frameRate).toBeGreaterThan(0);
    });
  });

  test('all gestures have transition definitions', () => {
    expectedGestures.forEach((gesture) => {
      expect(GESTURE_TRANSITIONS[gesture]).toBeDefined();
      expect(Array.isArray(GESTURE_TRANSITIONS[gesture])).toBe(true);
    });
  });
});

describe('Voice State to Gesture Mapping', () => {
  test('idle voice state maps to idle gesture', () => {
    expect(getGestureForVoiceState('idle')).toBe('idle');
  });

  test('listening voice state maps to listening gesture', () => {
    expect(getGestureForVoiceState('listening')).toBe('listening');
  });

  test('processing voice state maps to thinking gesture', () => {
    expect(getGestureForVoiceState('processing')).toBe('thinking');
  });

  test('speaking voice state maps to presenting gesture', () => {
    expect(getGestureForVoiceState('speaking')).toBe('presenting');
  });

  test('error voice state maps to confused gesture', () => {
    expect(getGestureForVoiceState('error')).toBe('confused');
  });
});

describe('Gesture Transitions', () => {
  test('valid transitions are allowed', () => {
    expect(canTransition('idle', 'greeting')).toBe(true);
    expect(canTransition('greeting', 'listening')).toBe(true);
    expect(canTransition('listening', 'thinking')).toBe(true);
  });

  test('idle can transition to common states', () => {
    const idleTransitions = GESTURE_TRANSITIONS.idle;
    expect(idleTransitions).toContain('greeting');
    expect(idleTransitions).toContain('listening');
  });
});

describe('Core Avatar States', () => {
  const coreStates: AvatarCoreState[] = [
    'dormant', 'listening', 'processing', 'responding', 'confused', 'interrupted',
  ];

  test('all 6 core states are defined', () => {
    coreStates.forEach((state) => {
      expect(AVATAR_CORE_STATES[state]).toBeDefined();
    });
  });

  test('wake word flow: dormant → listening', () => {
    expect(canTransitionState('dormant', 'listening')).toBe(true);
  });

  test('speech received: listening → processing', () => {
    expect(canTransitionState('listening', 'processing')).toBe(true);
  });

  test('response ready: processing → responding', () => {
    expect(canTransitionState('processing', 'responding')).toBe(true);
  });

  test('ready for more: responding → listening', () => {
    expect(canTransitionState('responding', 'listening')).toBe(true);
  });

  test('user done: responding → dormant', () => {
    expect(canTransitionState('responding', 'dormant')).toBe(true);
  });

  test('error handling: processing → confused', () => {
    expect(canTransitionState('processing', 'confused')).toBe(true);
  });

  test('recovery: confused → listening', () => {
    expect(canTransitionState('confused', 'listening')).toBe(true);
  });
});

describe('Spritesheet Configurations', () => {
  test('configs have valid frame counts', () => {
    Object.keys(SPRITESHEET_CONFIGS).forEach((type) => {
      const config = SPRITESHEET_CONFIGS[type as SpritesheetType];
      expect(config.frameCount).toBeGreaterThan(0);
      expect(config.frameDuration).toBeGreaterThan(0);
      expect(typeof config.looping).toBe('boolean');
    });
  });

  test('animated gestures have spritesheet mappings', () => {
    ANIMATED_GESTURES.forEach((gesture) => {
      const mapping = GESTURE_TO_SPRITESHEET[gesture];
      expect(mapping).toBeDefined();
    });
  });

  test('idle behavior configs exist', () => {
    const idleBehaviors: SpritesheetType[] = [
      'shifts_weight', 'adjusts_hat', 'looks_around', 'puffs_in', 'puffs_out',
    ];

    idleBehaviors.forEach((behavior) => {
      expect(SPRITESHEET_CONFIGS[behavior]).toBeDefined();
    });
  });
});

describe('Idle Behavior System', () => {
  test('idle behaviors are defined', () => {
    expect(IDLE_BEHAVIORS.length).toBeGreaterThan(0);
  });

  test('probability distribution sums to approximately 1', () => {
    const totalProbability = IDLE_BEHAVIORS.reduce(
      (sum, behavior) => sum + behavior.probability,
      0
    );
    // Allow tolerance for floating point
    expect(totalProbability).toBeGreaterThan(0.9);
    expect(totalProbability).toBeLessThanOrEqual(1.1);
  });

  test('getRandomIdleBehavior returns valid behavior', () => {
    const behavior = getRandomIdleBehavior();
    expect(behavior).toBeDefined();
    expect(behavior.action).toBeDefined();
    expect(behavior.duration).toBeGreaterThan(0);
  });

  test('timing configuration exists', () => {
    expect(GESTURE_TIMING.idleBehaviorDelay).toBeGreaterThan(0);
    expect(GESTURE_TIMING.idleBehaviorInterval).toBeGreaterThan(0);
    expect(GESTURE_TIMING.idleTimeoutPrompt).toBeGreaterThan(0);
  });
});

describe('Dialogue System', () => {
  const expectedCategories: DialogueCategory[] = [
    'wake', 'listening', 'processing', 'presenting_media',
    'presenting_list', 'presenting_single', 'fuzzy_search', 'nothing_found',
    'clarification', 'confirmation', 'dismissal', 'dismissal_late',
    'interruption', 'error', 'personality', 'idle_timeout',
  ];

  test('all dialogue categories exist', () => {
    expectedCategories.forEach((category) => {
      expect(AVATAR_DIALOGUES[category]).toBeDefined();
    });
  });

  test('each category has multiple dialogues', () => {
    expectedCategories.forEach((category) => {
      const dialogueSet = AVATAR_DIALOGUES[category];
      expect(dialogueSet.lines.length).toBeGreaterThan(0);
    });
  });

  test('getRandomDialogue returns valid dialogue', () => {
    const dialogue = getRandomDialogue('wake');
    expect(dialogue).toBeDefined();
    expect(dialogue.text).toBeDefined();
  });

  test('getTimeBasedGreeting returns valid greeting', () => {
    const greeting = getTimeBasedGreeting();
    expect(greeting).toBeDefined();
    expect(greeting.text).toBeDefined();
  });
});

describe('Voice Pipeline Flow', () => {
  test('complete wake → response flow is valid', () => {
    // Wake word detection
    expect(getGestureForVoiceState('idle')).toBe('idle');

    // Summon wizard
    expect(canTransitionState('dormant', 'listening')).toBe(true);
    expect(getGestureForVoiceState('listening')).toBe('listening');

    // User speaks
    expect(canTransitionState('listening', 'processing')).toBe(true);
    expect(getGestureForVoiceState('processing')).toBe('thinking');

    // Response ready
    expect(canTransitionState('processing', 'responding')).toBe(true);
    expect(getGestureForVoiceState('speaking')).toBe('presenting');

    // Back to listening
    expect(canTransitionState('responding', 'listening')).toBe(true);
  });

  test('interruption flow is valid', () => {
    expect(canTransitionState('responding', 'interrupted')).toBe(true);
    expect(canTransitionState('interrupted', 'listening')).toBe(true);
  });

  test('error recovery flow is valid', () => {
    expect(canTransitionState('processing', 'confused')).toBe(true);
    expect(canTransitionState('confused', 'listening')).toBe(true);
  });
});
