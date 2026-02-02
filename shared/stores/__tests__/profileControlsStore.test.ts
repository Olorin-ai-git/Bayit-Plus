/**
 * Tests for Profile Controls Store
 *
 * Tests the Zustand store for managing profile-aware family controls state.
 */

import { act, renderHook } from '@testing-library/react';
import { useProfileControlsStore, setProfileControlsApiClient } from '../profileControlsStore';
import { ProfileControlsApi } from '../../services/profileControlsApi';

// Mock API client
const mockApiClient: ProfileControlsApi = {
  getEffectiveControls: jest.fn(),
  setCustomControls: jest.fn(),
  inheritHouseholdControls: jest.fn(),
  getControlsSource: jest.fn(),
};

describe('useProfileControlsStore', () => {
  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useProfileControlsStore());
    act(() => {
      result.current.clearError();
    });

    // Initialize API client
    setProfileControlsApiClient(mockApiClient);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('loadEffectiveControls', () => {
    it('should load effective controls successfully', async () => {
      const mockControls = {
        id: 'controls-123',
        user_id: 'user-123',
        kids_enabled: true,
        kids_age_limit: 8,
        youngsters_enabled: true,
        youngsters_age_limit: 13,
        max_content_rating: 'PG-13',
        viewing_hours_enabled: true,
        viewing_start_hour: 8,
        viewing_end_hour: 20,
        has_family_pin: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (mockApiClient.getEffectiveControls as jest.Mock).mockResolvedValue(mockControls);

      const { result } = renderHook(() => useProfileControlsStore());

      await act(async () => {
        const controls = await result.current.loadEffectiveControls('profile-123');
        expect(controls).toEqual(mockControls);
      });

      expect(result.current.effectiveControls).toEqual(mockControls);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockApiClient.getEffectiveControls).toHaveBeenCalledWith('profile-123');
    });

    it('should handle errors when loading controls', async () => {
      const mockError = new Error('Failed to load controls');
      (mockApiClient.getEffectiveControls as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useProfileControlsStore());

      await act(async () => {
        try {
          await result.current.loadEffectiveControls('profile-123');
        } catch (error) {
          expect(error).toBe(mockError);
        }
      });

      expect(result.current.effectiveControls).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to load controls');
    });

    it('should set loading state while fetching', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (mockApiClient.getEffectiveControls as jest.Mock).mockReturnValue(promise);

      const { result } = renderHook(() => useProfileControlsStore());

      act(() => {
        result.current.loadEffectiveControls('profile-123');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ id: 'controls-123' });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setCustomControls', () => {
    it('should set custom controls and reload effective controls', async () => {
      const mockProfile = {
        id: 'profile-123',
        user_id: 'user-123',
        name: 'Test Profile',
        avatar: null,
        avatar_color: '#ff0000',
        is_kids_profile: true,
        has_pin: false,
        inherit_household_controls: false,
        custom_controls_id: 'controls-456',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockControls = {
        id: 'controls-456',
        user_id: 'user-123',
        kids_enabled: true,
        kids_age_limit: 10,
        youngsters_enabled: false,
        youngsters_age_limit: 13,
        max_content_rating: 'PG',
        viewing_hours_enabled: false,
        viewing_start_hour: 0,
        viewing_end_hour: 24,
        has_family_pin: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (mockApiClient.setCustomControls as jest.Mock).mockResolvedValue(mockProfile);
      (mockApiClient.getEffectiveControls as jest.Mock).mockResolvedValue(mockControls);

      const { result } = renderHook(() => useProfileControlsStore());

      await act(async () => {
        await result.current.setCustomControls('profile-123', 'controls-456');
      });

      expect(result.current.effectiveControls).toEqual(mockControls);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockApiClient.setCustomControls).toHaveBeenCalledWith('profile-123', 'controls-456');
      expect(mockApiClient.getEffectiveControls).toHaveBeenCalledWith('profile-123');
    });

    it('should handle errors when setting custom controls', async () => {
      const mockError = new Error('Failed to set custom controls');
      (mockApiClient.setCustomControls as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useProfileControlsStore());

      await act(async () => {
        try {
          await result.current.setCustomControls('profile-123', 'controls-456');
        } catch (error) {
          expect(error).toBe(mockError);
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to set custom controls');
    });
  });

  describe('inheritHouseholdControls', () => {
    it('should switch to household controls and reload effective controls', async () => {
      const mockProfile = {
        id: 'profile-123',
        user_id: 'user-123',
        name: 'Test Profile',
        avatar: null,
        avatar_color: '#ff0000',
        is_kids_profile: true,
        has_pin: false,
        inherit_household_controls: true,
        custom_controls_id: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockControls = {
        id: 'household-controls-123',
        user_id: 'user-123',
        kids_enabled: true,
        kids_age_limit: 8,
        youngsters_enabled: true,
        youngsters_age_limit: 13,
        max_content_rating: 'PG-13',
        viewing_hours_enabled: true,
        viewing_start_hour: 8,
        viewing_end_hour: 20,
        has_family_pin: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (mockApiClient.inheritHouseholdControls as jest.Mock).mockResolvedValue(mockProfile);
      (mockApiClient.getEffectiveControls as jest.Mock).mockResolvedValue(mockControls);

      const { result } = renderHook(() => useProfileControlsStore());

      await act(async () => {
        await result.current.inheritHouseholdControls('profile-123');
      });

      expect(result.current.effectiveControls).toEqual(mockControls);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockApiClient.inheritHouseholdControls).toHaveBeenCalledWith('profile-123');
      expect(mockApiClient.getEffectiveControls).toHaveBeenCalledWith('profile-123');
    });

    it('should handle errors when inheriting household controls', async () => {
      const mockError = new Error('Failed to inherit household controls');
      (mockApiClient.inheritHouseholdControls as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useProfileControlsStore());

      await act(async () => {
        try {
          await result.current.inheritHouseholdControls('profile-123');
        } catch (error) {
          expect(error).toBe(mockError);
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to inherit household controls');
    });
  });

  describe('getControlsSource', () => {
    it('should get controls source successfully', async () => {
      const mockSource = {
        source: 'custom' as const,
        controls_id: 'controls-456',
        inherit_household_controls: false,
      };

      (mockApiClient.getControlsSource as jest.Mock).mockResolvedValue(mockSource);

      const { result } = renderHook(() => useProfileControlsStore());

      await act(async () => {
        const source = await result.current.getControlsSource('profile-123');
        expect(source).toEqual(mockSource);
      });

      expect(result.current.controlsSource).toEqual(mockSource);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockApiClient.getControlsSource).toHaveBeenCalledWith('profile-123');
    });

    it('should handle household source', async () => {
      const mockSource = {
        source: 'household' as const,
        controls_id: null,
        inherit_household_controls: true,
      };

      (mockApiClient.getControlsSource as jest.Mock).mockResolvedValue(mockSource);

      const { result } = renderHook(() => useProfileControlsStore());

      await act(async () => {
        const source = await result.current.getControlsSource('profile-123');
        expect(source).toEqual(mockSource);
      });

      expect(result.current.controlsSource).toEqual(mockSource);
    });

    it('should handle errors when getting controls source', async () => {
      const mockError = new Error('Failed to get controls source');
      (mockApiClient.getControlsSource as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useProfileControlsStore());

      await act(async () => {
        try {
          await result.current.getControlsSource('profile-123');
        } catch (error) {
          expect(error).toBe(mockError);
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to get controls source');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const mockError = new Error('Test error');
      (mockApiClient.getEffectiveControls as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useProfileControlsStore());

      // Set error by triggering a failed API call
      await act(async () => {
        try {
          await result.current.loadEffectiveControls('profile-123');
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('API client initialization', () => {
    it('should throw error if API client not initialized', async () => {
      // Create a new store instance without initialized client
      const { result } = renderHook(() => useProfileControlsStore());

      // Reset API client
      setProfileControlsApiClient(null as any);

      await act(async () => {
        try {
          await result.current.loadEffectiveControls('profile-123');
          fail('Should have thrown error');
        } catch (error: any) {
          expect(error.message).toContain('API client not initialized');
        }
      });

      // Restore API client for other tests
      setProfileControlsApiClient(mockApiClient);
    });
  });
});
