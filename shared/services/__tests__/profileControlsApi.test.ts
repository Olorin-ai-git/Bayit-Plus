/**
 * Tests for Profile Controls API Service
 *
 * Tests the platform-agnostic API client for profile controls operations.
 */

import { setApiClient, profileControlsApi } from '../profileControlsApi';

// Mock HTTP client
const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
};

describe('ProfileControlsApi', () => {
  beforeEach(() => {
    // Initialize API client with mock HTTP client
    setApiClient(mockHttpClient);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getEffectiveControls', () => {
    it('should fetch effective controls for a profile', async () => {
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

      mockHttpClient.get.mockResolvedValue({ data: mockControls });

      const result = await profileControlsApi.getEffectiveControls('profile-123');

      expect(result).toEqual(mockControls);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/profile-controls/profile-123');
    });

    it('should return null if no controls exist', async () => {
      mockHttpClient.get.mockResolvedValue({ data: null });

      const result = await profileControlsApi.getEffectiveControls('profile-123');

      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      mockHttpClient.get.mockRejectedValue(mockError);

      await expect(
        profileControlsApi.getEffectiveControls('profile-123')
      ).rejects.toThrow('API Error');
    });
  });

  describe('setCustomControls', () => {
    it('should set custom controls for a profile', async () => {
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

      mockHttpClient.post.mockResolvedValue({ data: mockProfile });

      const result = await profileControlsApi.setCustomControls('profile-123', 'controls-456');

      expect(result).toEqual(mockProfile);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/profile-controls/profile-123/set-custom',
        { controls_id: 'controls-456' }
      );
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Failed to set custom controls');
      mockHttpClient.post.mockRejectedValue(mockError);

      await expect(
        profileControlsApi.setCustomControls('profile-123', 'controls-456')
      ).rejects.toThrow('Failed to set custom controls');
    });
  });

  describe('inheritHouseholdControls', () => {
    it('should set profile to inherit household controls', async () => {
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

      mockHttpClient.post.mockResolvedValue({ data: mockProfile });

      const result = await profileControlsApi.inheritHouseholdControls('profile-123');

      expect(result).toEqual(mockProfile);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/profile-controls/profile-123/inherit-household'
      );
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Failed to inherit household controls');
      mockHttpClient.post.mockRejectedValue(mockError);

      await expect(
        profileControlsApi.inheritHouseholdControls('profile-123')
      ).rejects.toThrow('Failed to inherit household controls');
    });
  });

  describe('getControlsSource', () => {
    it('should get custom controls source', async () => {
      const mockSource = {
        source: 'custom' as const,
        controls_id: 'controls-456',
        inherit_household_controls: false,
      };

      mockHttpClient.get.mockResolvedValue({ data: mockSource });

      const result = await profileControlsApi.getControlsSource('profile-123');

      expect(result).toEqual(mockSource);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/profile-controls/profile-123/source');
    });

    it('should get household controls source', async () => {
      const mockSource = {
        source: 'household' as const,
        controls_id: null,
        inherit_household_controls: true,
      };

      mockHttpClient.get.mockResolvedValue({ data: mockSource });

      const result = await profileControlsApi.getControlsSource('profile-123');

      expect(result).toEqual(mockSource);
    });

    it('should get none controls source', async () => {
      const mockSource = {
        source: 'none' as const,
        controls_id: null,
        inherit_household_controls: false,
      };

      mockHttpClient.get.mockResolvedValue({ data: mockSource });

      const result = await profileControlsApi.getControlsSource('profile-123');

      expect(result).toEqual(mockSource);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Failed to get controls source');
      mockHttpClient.get.mockRejectedValue(mockError);

      await expect(
        profileControlsApi.getControlsSource('profile-123')
      ).rejects.toThrow('Failed to get controls source');
    });
  });

  describe('API client initialization', () => {
    it('should throw error if API client not initialized', async () => {
      // Reset API client
      setApiClient(null as any);

      await expect(
        profileControlsApi.getEffectiveControls('profile-123')
      ).rejects.toThrow('ProfileControls API not initialized');

      await expect(
        profileControlsApi.setCustomControls('profile-123', 'controls-456')
      ).rejects.toThrow('ProfileControls API not initialized');

      await expect(
        profileControlsApi.inheritHouseholdControls('profile-123')
      ).rejects.toThrow('ProfileControls API not initialized');

      await expect(
        profileControlsApi.getControlsSource('profile-123')
      ).rejects.toThrow('ProfileControls API not initialized');

      // Restore API client for other tests
      setApiClient(mockHttpClient);
    });

    it('should allow re-initialization with different HTTP client', async () => {
      const newMockHttpClient = {
        get: jest.fn(),
        post: jest.fn(),
      };

      const mockControls = { id: 'controls-123' };
      newMockHttpClient.get.mockResolvedValue({ data: mockControls });

      setApiClient(newMockHttpClient);

      const result = await profileControlsApi.getEffectiveControls('profile-123');

      expect(result).toEqual(mockControls);
      expect(newMockHttpClient.get).toHaveBeenCalled();
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });
  });
});
