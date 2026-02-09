/**
 * Test suite for profileStore (Zustand)
 * Tests CRUD operations, auto-selection, kids mode, and profile sync.
 */

import { useProfileStore } from '../profileStore';

// Mock the shared api services
jest.mock('@/services/api', () => ({
  profilesService: {
    getProfiles: jest.fn(),
    selectProfile: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
  },
}));

jest.mock('../authStore', () => ({
  useAuthStore: (selector?: (s: any) => any) => {
    const state = { isAuthenticated: true, user: { id: 'u1' } };
    if (typeof selector === 'function') return selector(state);
    return state;
  },
}));

const { profilesService } = require('@/services/api');

function resetStore() {
  useProfileStore.setState({
    profiles: [],
    activeProfile: null,
    isLoading: false,
    error: null,
    needsProfileSelection: false,
  });
}

describe('profileStore', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  // MARK: - Initial State

  describe('initial state', () => {
    it('starts with empty profiles', () => {
      expect(useProfileStore.getState().profiles).toEqual([]);
    });

    it('starts with no active profile', () => {
      expect(useProfileStore.getState().activeProfile).toBeNull();
    });

    it('starts not loading', () => {
      expect(useProfileStore.getState().isLoading).toBe(false);
    });

    it('starts with no selection needed', () => {
      expect(useProfileStore.getState().needsProfileSelection).toBe(false);
    });
  });

  // MARK: - fetchProfiles

  describe('fetchProfiles', () => {
    it('fetches and stores profiles', async () => {
      const profiles = [
        { id: 'p1', name: 'Main', is_kids_profile: false },
        { id: 'p2', name: 'Kids', is_kids_profile: true },
      ];
      profilesService.getProfiles.mockResolvedValue(profiles);

      await useProfileStore.getState().fetchProfiles();

      expect(useProfileStore.getState().profiles).toEqual(profiles);
      expect(useProfileStore.getState().isLoading).toBe(false);
    });

    it('auto-selects when only one profile without PIN', async () => {
      const profiles = [{ id: 'p1', name: 'Solo', has_pin: false }];
      profilesService.getProfiles.mockResolvedValue(profiles);

      await useProfileStore.getState().fetchProfiles();

      expect(useProfileStore.getState().activeProfile).toEqual(profiles[0]);
      expect(useProfileStore.getState().needsProfileSelection).toBe(false);
    });

    it('requests selection when multiple profiles', async () => {
      const profiles = [
        { id: 'p1', name: 'Main' },
        { id: 'p2', name: 'Kids' },
      ];
      profilesService.getProfiles.mockResolvedValue(profiles);

      await useProfileStore.getState().fetchProfiles();

      expect(useProfileStore.getState().needsProfileSelection).toBe(true);
      expect(useProfileStore.getState().activeProfile).toBeNull();
    });

    it('sets error on failure', async () => {
      profilesService.getProfiles.mockRejectedValue({
        message: 'Network error',
      });

      await useProfileStore.getState().fetchProfiles();

      expect(useProfileStore.getState().error).toBe('Network error');
      expect(useProfileStore.getState().isLoading).toBe(false);
    });
  });

  // MARK: - selectProfile

  describe('selectProfile', () => {
    it('sets active profile', async () => {
      const profile = { id: 'p1', name: 'Main' };
      profilesService.selectProfile.mockResolvedValue(profile);

      await useProfileStore.getState().selectProfile('p1', undefined);

      expect(useProfileStore.getState().activeProfile).toEqual(profile);
      expect(useProfileStore.getState().needsProfileSelection).toBe(false);
    });

    it('passes PIN to service', async () => {
      profilesService.selectProfile.mockResolvedValue({ id: 'p1', name: 'Protected' });

      await useProfileStore.getState().selectProfile('p1', '1234');

      expect(profilesService.selectProfile).toHaveBeenCalledWith('p1', '1234');
    });

    it('throws on invalid PIN', async () => {
      profilesService.selectProfile.mockRejectedValue({
        detail: 'Invalid PIN',
      });

      await expect(
        useProfileStore.getState().selectProfile('p1', '0000')
      ).rejects.toBeDefined();

      expect(useProfileStore.getState().error).toBe('Invalid PIN');
    });
  });

  // MARK: - createProfile

  describe('createProfile', () => {
    it('adds new profile to list', async () => {
      useProfileStore.setState({
        profiles: [{ id: 'p1', name: 'Main' }],
      });

      const newProfile = { id: 'p2', name: 'Kids' };
      profilesService.createProfile.mockResolvedValue(newProfile);

      await useProfileStore.getState().createProfile({ name: 'Kids' });

      expect(useProfileStore.getState().profiles).toHaveLength(2);
      expect(useProfileStore.getState().profiles[1]).toEqual(newProfile);
    });
  });

  // MARK: - updateProfile

  describe('updateProfile', () => {
    it('updates profile in list', async () => {
      useProfileStore.setState({
        profiles: [
          { id: 'p1', name: 'Old Name' },
          { id: 'p2', name: 'Other' },
        ],
      });

      const updated = { id: 'p1', name: 'New Name' };
      profilesService.updateProfile.mockResolvedValue(updated);

      await useProfileStore.getState().updateProfile('p1', { name: 'New Name' });

      expect(useProfileStore.getState().profiles[0].name).toBe('New Name');
      expect(useProfileStore.getState().profiles[1].name).toBe('Other');
    });

    it('updates active profile if matching', async () => {
      const activeProfile = { id: 'p1', name: 'Active' };
      useProfileStore.setState({
        profiles: [activeProfile],
        activeProfile,
      });

      const updated = { id: 'p1', name: 'Updated Active' };
      profilesService.updateProfile.mockResolvedValue(updated);

      await useProfileStore.getState().updateProfile('p1', { name: 'Updated Active' });

      expect(useProfileStore.getState().activeProfile.name).toBe('Updated Active');
    });
  });

  // MARK: - deleteProfile

  describe('deleteProfile', () => {
    it('removes profile from list', async () => {
      useProfileStore.setState({
        profiles: [
          { id: 'p1', name: 'Main' },
          { id: 'p2', name: 'Other' },
        ],
      });

      profilesService.deleteProfile.mockResolvedValue(undefined);

      await useProfileStore.getState().deleteProfile('p2');

      expect(useProfileStore.getState().profiles).toHaveLength(1);
      expect(useProfileStore.getState().profiles[0].id).toBe('p1');
    });

    it('clears active profile if deleted', async () => {
      useProfileStore.setState({
        profiles: [
          { id: 'p1', name: 'Active' },
          { id: 'p2', name: 'Other' },
          { id: 'p3', name: 'Third' },
        ],
        activeProfile: { id: 'p1', name: 'Active' },
      });

      profilesService.deleteProfile.mockResolvedValue(undefined);

      await useProfileStore.getState().deleteProfile('p1');

      expect(useProfileStore.getState().activeProfile).toBeNull();
      expect(useProfileStore.getState().needsProfileSelection).toBe(true);
    });

    it('auto-selects remaining when only one left after delete', async () => {
      useProfileStore.setState({
        profiles: [
          { id: 'p1', name: 'Active' },
          { id: 'p2', name: 'Remaining' },
        ],
        activeProfile: { id: 'p1', name: 'Active' },
      });

      profilesService.deleteProfile.mockResolvedValue(undefined);

      await useProfileStore.getState().deleteProfile('p1');

      expect(useProfileStore.getState().activeProfile).toEqual({ id: 'p2', name: 'Remaining' });
    });
  });

  // MARK: - Helper Methods

  describe('helper methods', () => {
    it('isKidsMode returns true for kids profile', () => {
      useProfileStore.setState({
        activeProfile: { id: 'p1', name: 'Kids', is_kids_profile: true },
      });
      expect(useProfileStore.getState().isKidsMode()).toBe(true);
    });

    it('isKidsMode returns false for non-kids profile', () => {
      useProfileStore.setState({
        activeProfile: { id: 'p1', name: 'Main', is_kids_profile: false },
      });
      expect(useProfileStore.getState().isKidsMode()).toBe(false);
    });

    it('isKidsMode returns false when no active profile', () => {
      expect(useProfileStore.getState().isKidsMode()).toBe(false);
    });

    it('switchProfile sets needsProfileSelection', () => {
      useProfileStore.getState().switchProfile();
      expect(useProfileStore.getState().needsProfileSelection).toBe(true);
    });

    it('clearProfiles resets all profile state', () => {
      useProfileStore.setState({
        profiles: [{ id: 'p1', name: 'Test' }],
        activeProfile: { id: 'p1', name: 'Test' },
        needsProfileSelection: true,
        error: 'some error',
      });

      useProfileStore.getState().clearProfiles();

      const state = useProfileStore.getState();
      expect(state.profiles).toEqual([]);
      expect(state.activeProfile).toBeNull();
      expect(state.needsProfileSelection).toBe(false);
      expect(state.error).toBeNull();
    });

    it('clearError clears only error', () => {
      useProfileStore.setState({ error: 'Some error', profiles: [{ id: 'p1' }] });
      useProfileStore.getState().clearError();

      expect(useProfileStore.getState().error).toBeNull();
      expect(useProfileStore.getState().profiles).toHaveLength(1);
    });
  });
});
