/**
 * Avatar Preferences Manager Tests
 */

import { AvatarPreferencesManager } from '../avatarPreferences/AvatarPreferencesManager';
import type {
  AvatarPreferences,
  PreferencesStorageAdapter
} from '../avatarPreferences/types';

// Mock storage adapter
class MockStorageAdapter implements PreferencesStorageAdapter {
  private storage: AvatarPreferences | null = null;

  async save(preferences: AvatarPreferences): Promise<void> {
    this.storage = { ...preferences };
  }

  async load(): Promise<AvatarPreferences | null> {
    return this.storage ? { ...this.storage } : null;
  }

  async clear(): Promise<void> {
    this.storage = null;
  }

  // Test helper
  getStorage(): AvatarPreferences | null {
    return this.storage;
  }
}

describe('AvatarPreferencesManager', () => {
  let manager: AvatarPreferencesManager;
  let storageAdapter: MockStorageAdapter;

  beforeEach(() => {
    storageAdapter = new MockStorageAdapter();
    manager = new AvatarPreferencesManager({}, storageAdapter);
  });

  describe('initialization', () => {
    it('should initialize with default preferences', () => {
      const prefs = manager.getPreferences();

      expect(prefs.enabled).toBe(false);
      expect(prefs.style).toBe('realistic');
      expect(prefs.quality).toBe('high');
      expect(prefs.showOnStartup).toBe(false);
      expect(prefs.autoHideAfterResponse).toBe(false);
      expect(prefs.autoHideDelay).toBe(5000);
      expect(prefs.position).toBe('bottom-right');
      expect(prefs.size).toBe('medium');
      expect(prefs.voiceEnabled).toBe(true);
      expect(prefs.animationsEnabled).toBe(true);
      expect(prefs.emotionsEnabled).toBe(true);
    });

    it('should initialize with custom preferences', () => {
      const customManager = new AvatarPreferencesManager({
        enabled: true,
        position: 'top-left',
        size: 'large'
      });

      const prefs = customManager.getPreferences();
      expect(prefs.enabled).toBe(true);
      expect(prefs.position).toBe('top-left');
      expect(prefs.size).toBe('large');
    });

    it('should load from storage on initialize', async () => {
      await storageAdapter.save({
        enabled: true,
        avatarId: 'avatar-123',
        style: 'animated',
        quality: 'ultra',
        showOnStartup: true,
        autoHideAfterResponse: true,
        autoHideDelay: 3000,
        position: 'center',
        size: 'small',
        voiceEnabled: false,
        animationsEnabled: false,
        emotionsEnabled: false
      });

      await manager.initialize();

      const prefs = manager.getPreferences();
      expect(prefs.enabled).toBe(true);
      expect(prefs.avatarId).toBe('avatar-123');
      expect(prefs.style).toBe('animated');
      expect(prefs.quality).toBe('ultra');
      expect(prefs.position).toBe('center');
    });
  });

  describe('preferences updates', () => {
    it('should update preferences', async () => {
      await manager.updatePreferences({
        enabled: true,
        position: 'top-right',
        size: 'large'
      });

      const prefs = manager.getPreferences();
      expect(prefs.enabled).toBe(true);
      expect(prefs.position).toBe('top-right');
      expect(prefs.size).toBe('large');
    });

    it('should persist to storage', async () => {
      await manager.updatePreferences({
        enabled: true,
        avatarId: 'avatar-456'
      });

      const stored = storageAdapter.getStorage();
      expect(stored?.enabled).toBe(true);
      expect(stored?.avatarId).toBe('avatar-456');
    });

    it('should notify listeners', async () => {
      const listener = jest.fn();
      manager.addListener(listener);

      await manager.updatePreferences({ enabled: true });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });
  });

  describe('enable and disable', () => {
    it('should enable avatar', async () => {
      await manager.enable();
      expect(manager.getPreferences().enabled).toBe(true);
    });

    it('should disable avatar', async () => {
      await manager.enable();
      await manager.disable();
      expect(manager.getPreferences().enabled).toBe(false);
    });
  });

  describe('avatar settings', () => {
    it('should set avatar ID', async () => {
      await manager.setAvatarId('avatar-789');
      expect(manager.getPreferences().avatarId).toBe('avatar-789');
    });

    it('should set position', async () => {
      await manager.setPosition('top-left');
      expect(manager.getPreferences().position).toBe('top-left');
    });

    it('should set size', async () => {
      await manager.setSize('small');
      expect(manager.getPreferences().size).toBe('small');
    });

    it('should set style', async () => {
      await manager.setStyle('animated');
      expect(manager.getPreferences().style).toBe('animated');
    });

    it('should set quality', async () => {
      await manager.setQuality('low');
      expect(manager.getPreferences().quality).toBe('low');
    });
  });

  describe('feature toggles', () => {
    it('should enable and disable voice', async () => {
      await manager.disableVoice();
      expect(manager.getPreferences().voiceEnabled).toBe(false);

      await manager.enableVoice();
      expect(manager.getPreferences().voiceEnabled).toBe(true);
    });

    it('should enable and disable animations', async () => {
      await manager.disableAnimations();
      expect(manager.getPreferences().animationsEnabled).toBe(false);

      await manager.enableAnimations();
      expect(manager.getPreferences().animationsEnabled).toBe(true);
    });

    it('should enable and disable emotions', async () => {
      await manager.disableEmotions();
      expect(manager.getPreferences().emotionsEnabled).toBe(false);

      await manager.enableEmotions();
      expect(manager.getPreferences().emotionsEnabled).toBe(true);
    });
  });

  describe('reset and clear', () => {
    it('should reset to defaults', async () => {
      await manager.updatePreferences({
        enabled: true,
        avatarId: 'avatar-123',
        position: 'top-left',
        size: 'large'
      });

      await manager.reset();

      const prefs = manager.getPreferences();
      expect(prefs.enabled).toBe(false);
      expect(prefs.avatarId).toBeUndefined();
      expect(prefs.position).toBe('bottom-right');
      expect(prefs.size).toBe('medium');
    });

    it('should clear storage and reset', async () => {
      await manager.updatePreferences({ enabled: true });
      await manager.clear();

      expect(storageAdapter.getStorage()).toBeNull();
      expect(manager.getPreferences().enabled).toBe(false);
    });
  });

  describe('listeners', () => {
    it('should add and notify listeners', async () => {
      const listener = jest.fn();
      manager.addListener(listener);

      await manager.updatePreferences({ enabled: true });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });

    it('should remove listeners', async () => {
      const listener = jest.fn();
      manager.addListener(listener);
      manager.removeListener(listener);

      await manager.updatePreferences({ enabled: true });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      const listener = jest.fn();
      const unsubscribe = manager.addListener(listener);

      unsubscribe();
      await manager.updatePreferences({ enabled: true });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.addListener(listener1);
      manager.addListener(listener2);

      await manager.updatePreferences({ enabled: true });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should clear all listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.addListener(listener1);
      manager.addListener(listener2);
      manager.clearListeners();

      await manager.updatePreferences({ enabled: true });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      manager.addListener(errorListener);
      manager.addListener(normalListener);

      await expect(
        manager.updatePreferences({ enabled: true })
      ).resolves.not.toThrow();

      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('without storage adapter', () => {
    it('should work without storage adapter', async () => {
      const noStorageManager = new AvatarPreferencesManager();

      await noStorageManager.updatePreferences({ enabled: true });

      expect(noStorageManager.getPreferences().enabled).toBe(true);
    });

    it('should not persist without storage adapter', async () => {
      const noStorageManager = new AvatarPreferencesManager();

      await noStorageManager.updatePreferences({ enabled: true });
      await noStorageManager.initialize();

      // Should still have the in-memory value
      expect(noStorageManager.getPreferences().enabled).toBe(true);
    });
  });

  describe('preferences immutability', () => {
    it('should return new preferences object', () => {
      const prefs1 = manager.getPreferences();
      const prefs2 = manager.getPreferences();

      expect(prefs1).not.toBe(prefs2);
      expect(prefs1).toEqual(prefs2);
    });

    it('should not allow external mutation', async () => {
      const prefs = manager.getPreferences();
      prefs.enabled = true;

      const newPrefs = manager.getPreferences();
      expect(newPrefs.enabled).toBe(false);
    });
  });
});
