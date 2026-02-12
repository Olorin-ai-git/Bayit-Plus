/**
 * Voice Profile Manager Tests
 */

import { VoiceProfileManager } from '../VoiceProfileManager';
import type { LanguageVoiceProfile, UserVoiceProfile, VoiceCharacteristics } from '../types';
import type { LanguageCode } from '@olorin/shared-i18n';

describe('VoiceProfileManager', () => {
  let manager: VoiceProfileManager;
  const mockStorageAdapter = {
    save: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    manager = new VoiceProfileManager({
      enableMultiLanguage: true,
      maxProfilesPerUser: 10
    });
    manager.setStorageAdapter(mockStorageAdapter);
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    it('should create new user profile', async () => {
      const profile = await manager.createProfile('user1', 'Test User', 'en');

      expect(profile).toBeDefined();
      expect(profile.userId).toBe('user1');
      expect(profile.displayName).toBe('Test User');
      expect(profile.primaryLanguage).toBe('en');
      expect(mockStorageAdapter.save).toHaveBeenCalled();
    });

    it('should reject unsupported language', async () => {
      await expect(
        manager.createProfile('user1', 'Test User', 'unsupported' as LanguageCode)
      ).rejects.toThrow('not supported');
    });

    it('should preserve existing language profiles on update', async () => {
      await manager.createProfile('user1', 'Test User', 'en');

      const langProfile: LanguageVoiceProfile = {
        language: 'he',
        voiceId: 'test-voice',
        gender: 'neutral',
        age: 'adult',
        characteristics: {
          pitch: 1.0,
          speed: 1.0,
          volume: 0.8,
          emphasis: 0.5,
          pauseDuration: 500,
          breathiness: 0.3,
          warmth: 0.7
        },
        culturalNuances: {
          formalityLevel: 0.5,
          emotionalExpressiveness: 0.7,
          directness: 0.6
        }
      };

      await manager.setLanguageProfile('user1', langProfile);

      await manager.createProfile('user1', 'Updated User', 'en');
      const hebrewProfile = await manager.getLanguageProfile('user1', 'he');

      expect(hebrewProfile).toBeDefined();
      expect(hebrewProfile?.voiceId).toBe('test-voice');
    });
  });

  describe('getProfile', () => {
    it('should return null for non-existent profile', async () => {
      const profile = await manager.getProfile('non-existent');
      expect(profile).toBeNull();
    });

    it('should return existing profile', async () => {
      await manager.createProfile('user1', 'Test User', 'en');
      const profile = await manager.getProfile('user1');

      expect(profile).toBeDefined();
      expect(profile?.userId).toBe('user1');
    });

    it('should load from storage if not in memory', async () => {
      const storedProfile: UserVoiceProfile = {
        userId: 'user2',
        displayName: 'Stored User',
        primaryLanguage: 'he',
        languageProfiles: new Map(),
        preferences: {
          autoLanguageDetection: true,
          fallbackLanguage: 'he',
          adaptToContext: true,
          preserveEmotionalTone: true
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      mockStorageAdapter.load.mockResolvedValueOnce(storedProfile);

      const profile = await manager.getProfile('user2');
      expect(profile).toBeDefined();
      expect(profile?.displayName).toBe('Stored User');
      expect(mockStorageAdapter.load).toHaveBeenCalled();
    });
  });

  describe('language profiles', () => {
    it('should set language profile', async () => {
      await manager.createProfile('user1', 'Test User', 'en');

      const langProfile: LanguageVoiceProfile = {
        language: 'es',
        voiceId: 'spanish-voice',
        gender: 'female',
        age: 'young',
        characteristics: {
          pitch: 1.2,
          speed: 0.9,
          volume: 0.7,
          emphasis: 0.6,
          pauseDuration: 400,
          breathiness: 0.4,
          warmth: 0.8
        },
        culturalNuances: {
          formalityLevel: 0.4,
          emotionalExpressiveness: 0.9,
          directness: 0.7
        }
      };

      await manager.setLanguageProfile('user1', langProfile);

      const retrieved = await manager.getLanguageProfile('user1', 'es');
      expect(retrieved).toBeDefined();
      expect(retrieved?.voiceId).toBe('spanish-voice');
      expect(retrieved?.gender).toBe('female');
    });

    it('should throw error for non-existent user', async () => {
      const langProfile: LanguageVoiceProfile = {
        language: 'en',
        voiceId: 'test',
        gender: 'neutral',
        age: 'adult',
        characteristics: {} as VoiceCharacteristics,
        culturalNuances: {
          formalityLevel: 0.5,
          emotionalExpressiveness: 0.7,
          directness: 0.6
        }
      };

      await expect(
        manager.setLanguageProfile('non-existent', langProfile)
      ).rejects.toThrow('Profile not found');
    });

    it('should return null for non-existent language profile', async () => {
      await manager.createProfile('user1', 'Test User', 'en');
      const profile = await manager.getLanguageProfile('user1', 'fr');
      expect(profile).toBeNull();
    });
  });

  describe('characteristics', () => {
    it('should get default characteristics for non-existent profile', async () => {
      await manager.createProfile('user1', 'Test User', 'en');
      const chars = await manager.getCharacteristics('user1', 'en');

      expect(chars).toBeDefined();
      expect(chars.pitch).toBe(1.0);
      expect(chars.speed).toBe(1.0);
    });

    it('should update characteristics', async () => {
      await manager.createProfile('user1', 'Test User', 'en');

      await manager.updateCharacteristics('user1', 'en', {
        pitch: 1.5,
        speed: 0.8
      });

      const chars = await manager.getCharacteristics('user1', 'en');
      expect(chars.pitch).toBe(1.5);
      expect(chars.speed).toBe(0.8);
      expect(chars.volume).toBe(0.8); // Unchanged
    });

    it('should create profile if not exists when updating characteristics', async () => {
      await manager.createProfile('user1', 'Test User', 'en');

      await manager.updateCharacteristics('user1', 'fr', {
        pitch: 0.9
      });

      const chars = await manager.getCharacteristics('user1', 'fr');
      expect(chars.pitch).toBe(0.9);
    });
  });

  describe('switchPrimaryLanguage', () => {
    it('should switch primary language', async () => {
      await manager.createProfile('user1', 'Test User', 'en');
      await manager.switchPrimaryLanguage('user1', 'he');

      const profile = await manager.getProfile('user1');
      expect(profile?.primaryLanguage).toBe('he');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        manager.switchPrimaryLanguage('non-existent', 'en')
      ).rejects.toThrow('Profile not found');
    });

    it('should reject unsupported language', async () => {
      await manager.createProfile('user1', 'Test User', 'en');

      await expect(
        manager.switchPrimaryLanguage('user1', 'unsupported' as LanguageCode)
      ).rejects.toThrow('not supported');
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile from memory and storage', async () => {
      await manager.createProfile('user1', 'Test User', 'en');
      await manager.deleteProfile('user1');

      const profile = await manager.getProfile('user1');
      expect(profile).toBeNull();
      expect(mockStorageAdapter.delete).toHaveBeenCalledWith('user1');
    });
  });

  describe('event listeners', () => {
    it('should notify on profile creation', async () => {
      const listener = jest.fn();
      manager.addEventListener(listener);

      await manager.createProfile('user1', 'Test User', 'en');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'profile-created',
          userId: 'user1'
        })
      );
    });

    it('should notify on language switch', async () => {
      const listener = jest.fn();

      await manager.createProfile('user1', 'Test User', 'en');
      manager.addEventListener(listener);

      await manager.switchPrimaryLanguage('user1', 'he');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'language-switched',
          userId: 'user1',
          language: 'he'
        })
      );
    });

    it('should support unsubscribe', async () => {
      const listener = jest.fn();
      const unsubscribe = manager.addEventListener(listener);

      unsubscribe();

      await manager.createProfile('user1', 'Test User', 'en');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      manager.updateConfig({
        enableMultiLanguage: false,
        maxProfilesPerUser: 5
      });

      const config = manager.getConfig();
      expect(config.enableMultiLanguage).toBe(false);
      expect(config.maxProfilesPerUser).toBe(5);
    });

    it('should get current configuration', () => {
      const config = manager.getConfig();
      expect(config).toBeDefined();
      expect(config.enableMultiLanguage).toBe(true);
      expect(config.maxProfilesPerUser).toBe(10);
    });
  });
});
