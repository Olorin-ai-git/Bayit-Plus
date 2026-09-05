/**
 * Avatar Animation Controller Tests
 */

import { AvatarAnimationController, ANIMATION_SEQUENCES } from '../AvatarAnimationController';
import type { AnimationConfig, AnimationSequence } from '../types';

describe('AvatarAnimationController', () => {
  let controller: AvatarAnimationController;

  beforeEach(() => {
    controller = new AvatarAnimationController();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('playAnimation', () => {
    it('should start animation transition', () => {
      const config: AnimationConfig = {
        type: 'waving',
        intensity: 'normal',
        blendTime: 300
      };

      controller.playAnimation(config);
      const state = controller.getState();

      expect(state.isTransitioning).toBe(true);
      expect(state.next).toBe('waving');
    });

    it('should complete animation after blend time', () => {
      const config: AnimationConfig = {
        type: 'celebrating',
        intensity: 'intense',
        blendTime: 500
      };

      controller.playAnimation(config);

      jest.advanceTimersByTime(600);

      const state = controller.getState();
      expect(state.isTransitioning).toBe(false);
      expect(state.current).toBe('celebrating');
      expect(state.intensity).toBe('intense');
    });

    it('should cancel active sequence when playing new animation', () => {
      controller.playSequence(ANIMATION_SEQUENCES.greeting);
      controller.playAnimation({
        type: 'idle',
        intensity: 'subtle',
        blendTime: 300
      });

      const state = controller.getState();
      expect(state.current).toBe('idle');
    });
  });

  describe('playAnimationForEmotion', () => {
    it('should play correct animation for excited emotion', () => {
      controller.playAnimationForEmotion('excited');

      jest.advanceTimersByTime(350);

      const state = controller.getState();
      expect(state.current).toBe('celebrating');
      expect(state.intensity).toBe('intense');
    });

    it('should play empathetic animation for empathetic emotion', () => {
      controller.playAnimationForEmotion('empathetic');

      jest.advanceTimersByTime(350);

      const state = controller.getState();
      expect(state.current).toBe('empathetic');
      expect(state.intensity).toBe('subtle');
    });

    it('should handle unknown emotion gracefully', () => {
      const initialState = controller.getState();
      controller.playAnimationForEmotion('unknown-emotion');

      const newState = controller.getState();
      expect(newState).toEqual(initialState);
    });
  });

  describe('playSequence', () => {
    it('should play greeting sequence', async () => {
      const listener = jest.fn();
      controller.addListener(listener);

      controller.playSequence(ANIMATION_SEQUENCES.greeting);

      // First step: waving
      jest.advanceTimersByTime(500);
      expect(listener).toHaveBeenCalled();

      jest.advanceTimersByTime(1500);
      const state = controller.getState();
      expect(state.current).toBe('idle');
    });

    it('should loop sequence when loop is true', () => {
      controller.playSequence(ANIMATION_SEQUENCES.thinking);

      // First iteration
      jest.advanceTimersByTime(2500);

      // Should restart
      jest.advanceTimersByTime(1500);

      const state = controller.getState();
      expect(state.current).toBe('thinking');
    });

    it('should not loop when loop is false', () => {
      controller.playSequence(ANIMATION_SEQUENCES.celebration);

      // Complete all steps
      jest.advanceTimersByTime(6000);

      const state = controller.getState();
      expect(state.current).toBe('idle');
    });
  });

  describe('stopAnimation', () => {
    it('should return to idle state', () => {
      controller.playAnimation({
        type: 'celebrating',
        intensity: 'intense',
        blendTime: 300
      });

      controller.stopAnimation();

      jest.advanceTimersByTime(600);

      const state = controller.getState();
      expect(state.current).toBe('idle');
      expect(state.intensity).toBe('subtle');
    });

    it('should cancel active sequence', () => {
      controller.playSequence(ANIMATION_SEQUENCES.celebration);
      controller.stopAnimation();

      jest.advanceTimersByTime(600);

      const state = controller.getState();
      expect(state.current).toBe('idle');
    });
  });

  describe('listeners', () => {
    it('should notify listeners of state changes', () => {
      const listener = jest.fn();
      controller.addListener(listener);

      controller.playAnimation({
        type: 'waving',
        intensity: 'normal',
        blendTime: 300
      });

      expect(listener).toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      controller.addListener(listener1);
      controller.addListener(listener2);

      controller.playAnimation({
        type: 'nodding',
        intensity: 'subtle',
        blendTime: 300
      });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should support unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = controller.addListener(listener);

      unsubscribe();

      controller.playAnimation({
        type: 'greeting',
        intensity: 'normal',
        blendTime: 300
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      controller.addListener(errorListener);
      controller.addListener(goodListener);

      controller.playAnimation({
        type: 'waving',
        intensity: 'normal',
        blendTime: 300
      });

      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = controller.getState();

      expect(state).toBeDefined();
      expect(state.current).toBe('idle');
      expect(state.intensity).toBe('subtle');
      expect(state.progress).toBe(0);
      expect(state.isTransitioning).toBe(false);
    });

    it('should return copy of state', () => {
      const state1 = controller.getState();
      const state2 = controller.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('ANIMATION_SEQUENCES', () => {
    it('should have greeting sequence', () => {
      expect(ANIMATION_SEQUENCES.greeting).toBeDefined();
      expect(ANIMATION_SEQUENCES.greeting.steps.length).toBe(2);
      expect(ANIMATION_SEQUENCES.greeting.loop).toBe(false);
    });

    it('should have celebration sequence', () => {
      expect(ANIMATION_SEQUENCES.celebration).toBeDefined();
      expect(ANIMATION_SEQUENCES.celebration.steps.length).toBe(4);
      expect(ANIMATION_SEQUENCES.celebration.loop).toBe(false);
    });

    it('should have thinking sequence with loop', () => {
      expect(ANIMATION_SEQUENCES.thinking).toBeDefined();
      expect(ANIMATION_SEQUENCES.thinking.steps.length).toBe(3);
      expect(ANIMATION_SEQUENCES.thinking.loop).toBe(true);
    });

    it('should have empathy sequence', () => {
      expect(ANIMATION_SEQUENCES.empathy).toBeDefined();
      expect(ANIMATION_SEQUENCES.empathy.steps.length).toBe(3);
      expect(ANIMATION_SEQUENCES.empathy.loop).toBe(false);
    });
  });
});
