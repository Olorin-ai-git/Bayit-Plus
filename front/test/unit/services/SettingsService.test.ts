import {
  Settings,
  SettingsResponse,
  loadSettingsFromServer,
  saveSettingsToServer,
  getDefaultSettings,
  getSessionOverrides,
  setSessionOverrides,
  clearSessionOverrides,
  mergeSettingsWithOverrides,
  getEffectiveSettings,
  updateSettingWithOverride,
  resetToServerSettings,
  commitSessionOverridesToServer,
} from '../../../src/js/services/SettingsService';

// Mock fetch
global.fetch = jest.fn();

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('SettingsService', () => {
  const mockSettings: Settings = {
    defaultEntityType: 'device_id',
    selectedAgents: ['Network Analysis Agent'],
    commentPrefix: 'Test: ',
    agentToolsMapping: {
      'Network Analysis Agent': ['Splunk', 'OII'],
    },
  };

  const mockApiResponse: SettingsResponse = {
    success: true,
    message: 'Settings retrieved successfully',
    settings: {
      default_entity_type: 'device_id',
      selected_agents: ['Network Analysis Agent'],
      comment_prefix: 'Test: ',
      agent_tools_mapping: {
        'Network Analysis Agent': ['Splunk', 'OII'],
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('getDefaultSettings', () => {
    it('should return default settings with all agents selected', () => {
      const defaults = getDefaultSettings();
      expect(defaults).toEqual({
        defaultEntityType: 'user_id',
        selectedAgents: ['Network Agent', 'Location Agent', 'Device Agent', 'Log Agent'],
        commentPrefix: '',
        agentToolsMapping: {},
      });
    });
  });

  describe('loadSettingsFromServer', () => {
    it('should load settings from server successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const settings = await loadSettingsFromServer();

      expect(fetch).toHaveBeenCalledWith('/api/settings/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'default_user',
        },
      });

      expect(settings).toEqual(mockSettings);
    });

    it('should return default settings on server error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const settings = await loadSettingsFromServer();

      expect(settings).toEqual(getDefaultSettings());
    });

    it('should return default settings on unsuccessful response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          message: 'Settings not found',
        }),
      });

      const settings = await loadSettingsFromServer();

      expect(settings).toEqual(getDefaultSettings());
    });
  });

  describe('saveSettingsToServer', () => {
    it('should save settings to server successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Settings saved successfully',
        }),
      });

      await saveSettingsToServer(mockSettings);

      expect(fetch).toHaveBeenCalledWith('/api/settings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'default_user',
        },
        body: JSON.stringify({
          default_entity_type: 'device_id',
          selected_agents: ['Network Analysis Agent'],
          comment_prefix: 'Test: ',
          agent_tools_mapping: {
            'Network Analysis Agent': ['Splunk', 'OII'],
          },
        }),
      });
    });

    it('should throw error on server error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(saveSettingsToServer(mockSettings)).rejects.toThrow(
        'Failed to save settings: 500'
      );
    });
  });

  describe('session storage functions', () => {
    it('should get session overrides', () => {
      const overrides = { defaultEntityType: 'device_id' as const };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(overrides));

      const result = getSessionOverrides();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('olorin_session_settings_override');
      expect(result).toEqual(overrides);
    });

    it('should return null for invalid session storage data', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid json');

      const result = getSessionOverrides();

      expect(result).toBeNull();
    });

    it('should set session overrides', () => {
      const overrides = { defaultEntityType: 'device_id' as const };

      setSessionOverrides(overrides);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'olorin_session_settings_override',
        JSON.stringify(overrides)
      );
    });

    it('should clear session overrides', () => {
      clearSessionOverrides();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('olorin_session_settings_override');
    });
  });

  describe('mergeSettingsWithOverrides', () => {
    it('should merge server settings with session overrides', () => {
      const serverSettings = getDefaultSettings();
      const sessionOverrides = { defaultEntityType: 'device_id' as const };

      const result = mergeSettingsWithOverrides(serverSettings, sessionOverrides);

      expect(result).toEqual({
        ...serverSettings,
        defaultEntityType: 'device_id',
      });
    });

    it('should return server settings when no overrides', () => {
      const serverSettings = getDefaultSettings();

      const result = mergeSettingsWithOverrides(serverSettings, null);

      expect(result).toEqual(serverSettings);
    });
  });

  describe('getEffectiveSettings', () => {
    it('should get effective settings with session overrides', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Settings retrieved successfully',
          settings: {
            default_entity_type: 'user_id',
            selected_agents: [],
            comment_prefix: '',
            agent_tools_mapping: {},
          },
        }),
      });

      const sessionOverrides = { defaultEntityType: 'device_id' as const };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionOverrides));

      const result = await getEffectiveSettings();

      expect(result.defaultEntityType).toBe('device_id');
    });
  });

  describe('updateSettingWithOverride', () => {
    it('should update a specific setting with session override', () => {
      updateSettingWithOverride('defaultEntityType', 'device_id');

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'olorin_session_settings_override',
        JSON.stringify({ defaultEntityType: 'device_id' })
      );
    });

    it('should merge with existing session overrides', () => {
      const existingOverrides = { commentPrefix: 'Test: ' };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingOverrides));

      updateSettingWithOverride('defaultEntityType', 'device_id');

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'olorin_session_settings_override',
        JSON.stringify({
          commentPrefix: 'Test: ',
          defaultEntityType: 'device_id',
        })
      );
    });
  });

  describe('resetToServerSettings', () => {
    it('should clear session overrides', () => {
      resetToServerSettings();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('olorin_session_settings_override');
    });
  });

  describe('commitSessionOverridesToServer', () => {
    it('should save effective settings to server and clear session overrides', async () => {
      // Mock server settings
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Settings retrieved successfully',
            settings: {
              default_entity_type: 'user_id',
              selected_agents: [],
              comment_prefix: '',
              agent_tools_mapping: {},
            },
          }),
        })
        // Mock save settings
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Settings saved successfully',
          }),
        });

      // Mock session overrides
      const sessionOverrides = { defaultEntityType: 'device_id' as const };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionOverrides));

      await commitSessionOverridesToServer();

      // Should save the merged settings
      expect(fetch).toHaveBeenCalledWith('/api/settings/', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"default_entity_type":"device_id"'),
      }));

      // Should clear session overrides
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('olorin_session_settings_override');
    });
  });
}); 