/**
 * Avatar State Manager Tests
 */

import { AvatarStateManager } from '../avatarState/AvatarStateManager';
import type { AvatarState } from '../avatarState/types';

describe('AvatarStateManager', () => {
  let manager: AvatarStateManager;

  beforeEach(() => {
    manager = new AvatarStateManager();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = manager.getState();

      expect(state.isVisible).toBe(false);
      expect(state.isActive).toBe(false);
      expect(state.currentEmotion).toBe('neutral');
      expect(state.currentAnimation).toBe('idle');
      expect(state.isSpeaking).toBe(false);
      expect(state.isListening).toBe(false);
      expect(state.scale).toBe(1.0);
      expect(state.opacity).toBe(1.0);
    });

    it('should initialize with custom state', () => {
      const customManager = new AvatarStateManager({
        isVisible: true,
        currentEmotion: 'happy',
        scale: 1.5
      });

      const state = customManager.getState();
      expect(state.isVisible).toBe(true);
      expect(state.currentEmotion).toBe('happy');
      expect(state.scale).toBe(1.5);
    });
  });

  describe('state updates', () => {
    it('should update state', () => {
      manager.updateState({
        isVisible: true,
        currentEmotion: 'excited'
      });

      const state = manager.getState();
      expect(state.isVisible).toBe(true);
      expect(state.currentEmotion).toBe('excited');
    });

    it('should automatically set animation when speaking', () => {
      manager.updateState({ isSpeaking: true });

      const state = manager.getState();
      expect(state.currentAnimation).toBe('talking');
    });

    it('should automatically set animation when listening', () => {
      manager.updateState({ isListening: true });

      const state = manager.getState();
      expect(state.currentAnimation).toBe('listening');
    });

    it('should set idle animation when not speaking or listening', () => {
      manager.updateState({ isSpeaking: true });
      manager.updateState({ isSpeaking: false, isListening: false });

      const state = manager.getState();
      expect(state.currentAnimation).toBe('idle');
    });

    it('should not notify listeners if state unchanged', () => {
      const listener = jest.fn();
      manager.addListener(listener);

      manager.updateState({ isVisible: false }); // Same as default
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('show and hide', () => {
    it('should show avatar', () => {
      manager.show();

      const state = manager.getState();
      expect(state.isVisible).toBe(true);
      expect(state.isActive).toBe(true);
    });

    it('should hide avatar', () => {
      manager.show();
      manager.hide();

      const state = manager.getState();
      expect(state.isVisible).toBe(false);
      expect(state.isActive).toBe(false);
      expect(state.isSpeaking).toBe(false);
      expect(state.isListening).toBe(false);
    });
  });

  describe('emotions', () => {
    it('should set emotion', () => {
      manager.setEmotion('happy');
      expect(manager.getState().currentEmotion).toBe('happy');

      manager.setEmotion('confused');
      expect(manager.getState().currentEmotion).toBe('confused');
    });

    it('should map frustration to emotion', () => {
      manager.setEmotionFromFrustration(0.9); // High frustration
      expect(manager.getState().currentEmotion).toBe('apologetic');

      manager.setEmotionFromFrustration(0.7); // Medium-high frustration
      expect(manager.getState().currentEmotion).toBe('empathetic');

      manager.setEmotionFromFrustration(0.5); // Medium frustration
      expect(manager.getState().currentEmotion).toBe('thinking');

      manager.setEmotionFromFrustration(0.3); // Low frustration
      expect(manager.getState().currentEmotion).toBe('happy');

      manager.setEmotionFromFrustration(0.1); // Very low frustration
      expect(manager.getState().currentEmotion).toBe('excited');
    });
  });

  describe('animations', () => {
    it('should set animation', () => {
      manager.setAnimation('waving');
      expect(manager.getState().currentAnimation).toBe('waving');

      manager.setAnimation('nodding');
      expect(manager.getState().currentAnimation).toBe('nodding');
    });
  });

  describe('speaking state', () => {
    it('should start speaking', () => {
      manager.startSpeaking();

      const state = manager.getState();
      expect(state.isSpeaking).toBe(true);
      expect(state.isListening).toBe(false);
      expect(state.currentAnimation).toBe('talking');
    });

    it('should stop speaking', () => {
      manager.startSpeaking();
      manager.stopSpeaking();

      const state = manager.getState();
      expect(state.isSpeaking).toBe(false);
      expect(state.currentAnimation).toBe('idle');
    });
  });

  describe('listening state', () => {
    it('should start listening', () => {
      manager.startListening();

      const state = manager.getState();
      expect(state.isListening).toBe(true);
      expect(state.isSpeaking).toBe(false);
      expect(state.currentAnimation).toBe('listening');
    });

    it('should stop listening', () => {
      manager.startListening();
      manager.stopListening();

      const state = manager.getState();
      expect(state.isListening).toBe(false);
      expect(state.currentAnimation).toBe('idle');
    });
  });

  describe('reset', () => {
    it('should reset to default state', () => {
      manager.show();
      manager.setEmotion('happy');
      manager.startSpeaking();

      manager.reset();

      const state = manager.getState();
      expect(state.isVisible).toBe(false);
      expect(state.isActive).toBe(false);
      expect(state.currentEmotion).toBe('neutral');
      expect(state.currentAnimation).toBe('idle');
      expect(state.isSpeaking).toBe(false);
    });
  });

  describe('listeners', () => {
    it('should add and notify listeners', () => {
      const listener = jest.fn();
      manager.addListener(listener);

      manager.show();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isVisible: true,
          isActive: true
        })
      );
    });

    it('should remove listeners', () => {
      const listener = jest.fn();
      manager.addListener(listener);
      manager.removeListener(listener);

      manager.show();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const listener = jest.fn();
      const unsubscribe = manager.addListener(listener);

      unsubscribe();
      manager.show();

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.addListener(listener1);
      manager.addListener(listener2);

      manager.show();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should clear all listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.addListener(listener1);
      manager.addListener(listener2);
      manager.clearListeners();

      manager.show();

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      manager.addListener(errorListener);
      manager.addListener(normalListener);

      expect(() => {
        manager.show();
      }).not.toThrow();

      expect(normalListener).toHaveBeenCalled();
    });

    it('should get listener count', () => {
      expect(manager.getListenerCount()).toBe(0);

      const unsubscribe1 = manager.addListener(() => {});
      expect(manager.getListenerCount()).toBe(1);

      manager.addListener(() => {});
      expect(manager.getListenerCount()).toBe(2);

      unsubscribe1();
      expect(manager.getListenerCount()).toBe(1);
    });
  });

  describe('state immutability', () => {
    it('should return new state object', () => {
      const state1 = manager.getState();
      const state2 = manager.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it('should not allow external mutation', () => {
      const state = manager.getState();
      state.isVisible = true;

      const newState = manager.getState();
      expect(newState.isVisible).toBe(false);
    });
  });
});
