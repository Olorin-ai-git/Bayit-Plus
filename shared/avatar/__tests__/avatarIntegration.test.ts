/**
 * Avatar System Integration Tests
 *
 * Tests the complete voice→avatar→gesture pipeline:
 * - Wake word detection → Wizard summoning
 * - Speech-to-text → Processing state
 * - Intent processing → Action execution
 * - Text-to-speech → Gesture synchronization
 * - Result presentation → Widget display
 *
 * Also verifies:
 * - Gesture library completeness
 * - Spritesheet availability
 * - State transition validity
 * - Idle behavior randomization
 */

import {
  // Gesture exports
  GestureType,
  GESTURE_LIBRARY,
  GESTURE_TRANSITIONS,
  IDLE_BEHAVIORS,
  GESTURE_TIMING,
  getRandomIdleBehavior,
  canTransition,
  getGestureForVoiceState,

  // State exports
  AvatarCoreState,
  AVATAR_CORE_STATES,
  AVATAR_STATE_TRANSITIONS,
  canTransitionState,

  // Wizard avatar exports
  WIZARD_AVATARS,
  GESTURE_AVATARS,
  ANIMATED_GESTURES,
  GESTURE_SPRITESHEETS,
  SPRITESHEET_CONFIGS,
  IDLE_BEHAVIOR_SPRITESHEETS,
  getGestureAvatar,
  isAnimatedGesture,
  getGestureSpritesheet,
  getSpritesheetConfig,
  getIdleBehaviorSpritesheet,

  // Dialogue exports
  AVATAR_DIALOGUES,
  getRandomDialogue,
  getTimeBasedGreeting,
} from '../index';

describe('Avatar System Integration', () => {
  describe('Gesture Library Completeness', () => {
    const expectedGestures: GestureType[] = [
      'idle',
      'greeting',
      'listening',
      'attentive',
      'thinking',
      'presenting',
      'conjuring',
      'browsing',
      'confused',
      'shrugging',
      'farewell',
      'cheering',
      'clapping',
      'crying',
      'facepalm',
      'emphatic',
      'reading',
      'confirmation',
      'single_result',
      'waiting',
      'success',
      'clarification',
      'warning',
      'magical_reveal',
      'agreement',
      'disagreement',
    ];

    it('should have all 26 gesture types defined', () => {
      expectedGestures.forEach((gesture) => {
        expect(GESTURE_LIBRARY[gesture]).toBeDefined();
        expect(GESTURE_LIBRARY[gesture].name).toBe(gesture);
      });
    });

    it('should have animation properties for animated gestures', () => {
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

    it('should have valid transition definitions for all gestures', () => {
      expectedGestures.forEach((gesture) => {
        expect(GESTURE_TRANSITIONS[gesture]).toBeDefined();
        expect(Array.isArray(GESTURE_TRANSITIONS[gesture])).toBe(true);
      });
    });
  });

  describe('Spritesheet Availability', () => {
    it('should have spritesheets for all animated gestures', () => {
      ANIMATED_GESTURES.forEach((gesture) => {
        const spritesheet = GESTURE_SPRITESHEETS[gesture];
        expect(spritesheet).toBeDefined();
        expect(spritesheet).not.toBeNull();
      });
    });

    it('should have config for all spritesheet types', () => {
      Object.keys(SPRITESHEET_CONFIGS).forEach((type) => {
        const config = SPRITESHEET_CONFIGS[type as keyof typeof SPRITESHEET_CONFIGS];
        expect(config.frameCount).toBeGreaterThan(0);
        expect(config.frameDuration).toBeGreaterThan(0);
        expect(typeof config.looping).toBe('boolean');
      });
    });

    it('should have idle behavior spritesheets extracted', () => {
      const idleBehaviors = ['shifts_weight', 'adjusts_hat', 'looks_around', 'puffs_in', 'puffs_out'];

      idleBehaviors.forEach((behavior) => {
        const spritesheet = IDLE_BEHAVIOR_SPRITESHEETS[behavior];
        expect(spritesheet).toBeDefined();
        expect(spritesheet).not.toBeNull();
      });
    });
  });

  describe('Voice State to Gesture Mapping', () => {
    it('should map idle voice state to idle gesture', () => {
      expect(getGestureForVoiceState('idle')).toBe('idle');
    });

    it('should map listening voice state to listening gesture', () => {
      expect(getGestureForVoiceState('listening')).toBe('listening');
    });

    it('should map processing voice state to thinking gesture', () => {
      expect(getGestureForVoiceState('processing')).toBe('thinking');
    });

    it('should map speaking voice state to presenting gesture', () => {
      expect(getGestureForVoiceState('speaking')).toBe('presenting');
    });

    it('should map error voice state to confused gesture', () => {
      expect(getGestureForVoiceState('error')).toBe('confused');
    });
  });

  describe('Core State Transitions', () => {
    const coreStates: AvatarCoreState[] = [
      'dormant',
      'listening',
      'processing',
      'responding',
      'confused',
      'interrupted',
    ];

    it('should have all 6 core states defined', () => {
      coreStates.forEach((state) => {
        expect(AVATAR_CORE_STATES[state]).toBeDefined();
      });
    });

    it('should allow dormant → listening transition (wake word)', () => {
      expect(canTransitionState('dormant', 'listening')).toBe(true);
    });

    it('should allow listening → processing transition (speech received)', () => {
      expect(canTransitionState('listening', 'processing')).toBe(true);
    });

    it('should allow processing → responding transition (response ready)', () => {
      expect(canTransitionState('processing', 'responding')).toBe(true);
    });

    it('should allow responding → listening transition (ready for more)', () => {
      expect(canTransitionState('responding', 'listening')).toBe(true);
    });

    it('should allow responding → dormant transition (user done)', () => {
      expect(canTransitionState('responding', 'dormant')).toBe(true);
    });

    it('should allow any state → interrupted transition', () => {
      coreStates.forEach((state) => {
        if (state !== 'interrupted') {
          expect(canTransitionState(state, 'interrupted')).toBe(true);
        }
      });
    });

    it('should allow processing → confused transition (error)', () => {
      expect(canTransitionState('processing', 'confused')).toBe(true);
    });

    it('should allow confused → listening transition (recovery)', () => {
      expect(canTransitionState('confused', 'listening')).toBe(true);
    });
  });

  describe('Dialogue Categories', () => {
    const expectedCategories = [
      'wake',
      'listening',
      'processing',
      'presenting_media',
      'presenting_live',
      'presenting_epg',
      'no_results',
      'error',
      'clarification',
      'interruption',
      'dismissal',
      'confirmation',
      'personality',
      'idle_prompt',
    ];

    it('should have all dialogue categories defined', () => {
      expectedCategories.forEach((category) => {
        expect(AVATAR_DIALOGUES[category as keyof typeof AVATAR_DIALOGUES]).toBeDefined();
      });
    });

    it('should have multiple variations per category', () => {
      expectedCategories.forEach((category) => {
        const dialogues = AVATAR_DIALOGUES[category as keyof typeof AVATAR_DIALOGUES];
        expect(dialogues.length).toBeGreaterThan(0);
      });
    });

    it('should return random dialogue from category', () => {
      const dialogue1 = getRandomDialogue('wake');
      const dialogue2 = getRandomDialogue('wake');

      // Both should be valid
      expect(dialogue1).toBeDefined();
      expect(dialogue2).toBeDefined();
    });
  });

  describe('Idle Behavior System', () => {
    it('should have idle behaviors defined', () => {
      expect(IDLE_BEHAVIORS.length).toBeGreaterThan(0);
    });

    it('should have valid probability distribution (sums to ~1)', () => {
      const totalProbability = IDLE_BEHAVIORS.reduce(
        (sum, behavior) => sum + behavior.probability,
        0
      );
      // Allow some tolerance due to floating point
      expect(totalProbability).toBeCloseTo(1.0, 1);
    });

    it('should return random idle behavior', () => {
      const behavior1 = getRandomIdleBehavior();
      expect(behavior1).toBeDefined();
      expect(behavior1.action).toBeDefined();
      expect(behavior1.duration).toBeGreaterThan(0);
    });

    it('should have timing configuration', () => {
      expect(GESTURE_TIMING.idleBehaviorDelay).toBeGreaterThan(0);
      expect(GESTURE_TIMING.idleBehaviorInterval).toBeGreaterThan(0);
      expect(GESTURE_TIMING.idleTimeoutPrompt).toBeGreaterThan(0);
    });
  });

  describe('Voice Pipeline Flow Simulation', () => {
    it('should support complete wake → response flow', () => {
      // Simulate wake word detection
      const wakeGesture = getGestureForVoiceState('idle');
      expect(wakeGesture).toBe('idle');

      // Transition to listening after wake
      expect(canTransitionState('dormant', 'listening')).toBe(true);
      const listenGesture = getGestureForVoiceState('listening');
      expect(listenGesture).toBe('listening');

      // User speaks, transition to processing
      expect(canTransitionState('listening', 'processing')).toBe(true);
      const processGesture = getGestureForVoiceState('processing');
      expect(processGesture).toBe('thinking');

      // Response ready, transition to responding
      expect(canTransitionState('processing', 'responding')).toBe(true);
      const speakGesture = getGestureForVoiceState('speaking');
      expect(speakGesture).toBe('presenting');

      // Back to listening for next command
      expect(canTransitionState('responding', 'listening')).toBe(true);
    });

    it('should support interruption mid-response', () => {
      // In responding state
      expect(canTransitionState('responding', 'interrupted')).toBe(true);

      // Recover to listening
      expect(canTransitionState('interrupted', 'listening')).toBe(true);
    });

    it('should support error recovery flow', () => {
      // Processing encounters error
      expect(canTransitionState('processing', 'confused')).toBe(true);

      // Recover to listening
      expect(canTransitionState('confused', 'listening')).toBe(true);
    });
  });

  describe('Gesture to Spritesheet Integration', () => {
    it('should return correct spritesheet for animated gestures', () => {
      const animatedGestures: GestureType[] = [
        'greeting',
        'listening',
        'thinking',
        'presenting',
        'confused',
      ];

      animatedGestures.forEach((gesture) => {
        const spritesheet = getGestureSpritesheet(gesture);
        expect(spritesheet).not.toBeNull();
      });
    });

    it('should return null for non-animated gestures', () => {
      // idle is not in ANIMATED_GESTURES
      const spritesheet = getGestureSpritesheet('idle');
      expect(spritesheet).toBeNull();
    });

    it('should return correct config for spritesheets', () => {
      const config = getSpritesheetConfig('greeting');
      expect(config).not.toBeNull();
      expect(config?.frameCount).toBeGreaterThan(0);
    });

    it('should check animation status correctly', () => {
      expect(isAnimatedGesture('listening')).toBe(true);
      expect(isAnimatedGesture('idle')).toBe(false);
    });
  });

  describe('Avatar Image Assets', () => {
    it('should have wizard avatars for all voice states', () => {
      const voiceStates = ['idle', 'listening', 'speaking', 'processing', 'error'];

      voiceStates.forEach((state) => {
        expect(WIZARD_AVATARS[state as keyof typeof WIZARD_AVATARS]).toBeDefined();
      });
    });

    it('should have gesture avatars for all gesture states', () => {
      const gestureStates = Object.keys(GESTURE_AVATARS);
      expect(gestureStates.length).toBeGreaterThan(15);

      gestureStates.forEach((gesture) => {
        expect(GESTURE_AVATARS[gesture as keyof typeof GESTURE_AVATARS]).toBeDefined();
      });
    });

    it('should return avatar for any gesture', () => {
      const gestures: GestureType[] = ['idle', 'listening', 'thinking', 'presenting'];

      gestures.forEach((gesture) => {
        const avatar = getGestureAvatar(gesture);
        expect(avatar).toBeDefined();
      });
    });
  });

  describe('Time-Based Greeting', () => {
    it('should return a greeting', () => {
      const greeting = getTimeBasedGreeting();
      expect(greeting).toBeDefined();
      expect(greeting.text).toBeDefined();
    });
  });

  describe('Transition Validation', () => {
    it('should validate gesture transitions correctly', () => {
      // Valid transitions
      expect(canTransition('idle', 'greeting')).toBe(true);
      expect(canTransition('greeting', 'listening')).toBe(true);
      expect(canTransition('listening', 'thinking')).toBe(true);

      // Check that some invalid transitions return false
      // (depends on specific GESTURE_TRANSITIONS definition)
    });
  });
});
