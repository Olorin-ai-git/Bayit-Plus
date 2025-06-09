import { mock, instance, when } from 'ts-mockito';
import { Sandbox, Environment } from '@appfabric/sandbox-spec';
import { getEnvConfig, getEnvConfigData } from 'src/js/services/envConstants';

describe('envConstants', () => {
  let mockSandbox: Sandbox;

  beforeEach(() => {
    mockSandbox = {} as any;
    mockSandbox.appContext = {
      getEnvironment: jest.fn(() => Environment.E2E),
      getAppInfo: jest.fn(),
      getLocalizationInfo: jest.fn(),
      getUserAuthInfo: jest.fn(),
      getUserAuth: jest.fn(),
      getPlatformInfo: jest.fn(),
      getRealmInfo: jest.fn(),
      getRealm: jest.fn(),
      getUserProfileInfo: jest.fn(),
      getUserProfile: jest.fn(),
    };
    mockSandbox.pluginConfig = {
      id: 'test-plugin-id',
      hasLayers: false,
      manifestVersion: '4',
      extendedProperties: {
        API_KEY: 'test-api-key',
      },
    };
  });

  describe('getEnvConfigData', () => {
    it('returns correct config for local environment', () => {
      const config = getEnvConfigData('local');
      expect(config.gaia).toEqual({
        baseUrl: 'https://gaia-e2e.api.intuit.com',
      });
    });

    it('returns correct config for qa environment', () => {
      const config = getEnvConfigData('qa');
      expect(config.gaia).toEqual({
        baseUrl: 'https://gaia-qal.api.intuit.com',
      });
    });

    it('returns correct config for e2e environment', () => {
      const config = getEnvConfigData('e2e');
      expect(config.gaia).toEqual({
        baseUrl: 'https://gaia-e2e.api.intuit.com',
      });
    });

    it('returns correct config for prod environment', () => {
      const config = getEnvConfigData('prod');
      expect(config.gaia).toEqual({
        baseUrl: 'https://gaia.api.intuit.com',
      });
    });

    it('returns undefined for unknown environment', () => {
      const config = getEnvConfigData('unknown');
      expect(config).toBeUndefined();
    });
  });

  describe('getEnvConfig', () => {
    it('returns complete config with sandbox and pluginId', () => {
      const config = getEnvConfig(mockSandbox, 'gaia');

      expect(config).toMatchObject({
        baseUrl: 'https://gaia-e2e.api.intuit.com',
        sandbox: expect.anything(),
        pluginId: expect.any(String),
      });
    });

    it('uses environment from sandbox appContext', () => {
      // Mock different environment
      mockSandbox.appContext.getEnvironment = jest.fn(() => Environment.PROD);
      const config = getEnvConfig(mockSandbox, 'gaia');
      expect(config.baseUrl).toBe('https://gaia.api.intuit.com');
    });

    it('handles missing appContext', () => {
      // appContext is undefined
      mockSandbox.appContext = undefined as any;
      // Should not throw, but pluginConfig.id is still present
      expect(() => getEnvConfig(mockSandbox, 'gaia')).toThrow();
    });

    it('handles missing pluginConfig', () => {
      mockSandbox.pluginConfig = undefined as any;
      const config = getEnvConfig(mockSandbox, 'gaia');
      expect(config).toMatchObject({
        baseUrl: 'https://gaia-e2e.api.intuit.com',
        sandbox: expect.anything(),
        pluginId: undefined,
      });
    });

    it('handles missing pluginConfig.id', () => {
      mockSandbox.pluginConfig = {
        id: undefined,
        hasLayers: false,
        manifestVersion: '4',
        extendedProperties: { API_KEY: 'test-api-key' },
      } as any;
      const config = getEnvConfig(mockSandbox, 'gaia');
      expect(config).toMatchObject({
        baseUrl: 'https://gaia-e2e.api.intuit.com',
        sandbox: expect.anything(),
        pluginId: undefined,
      });
    });

    it('handles getEnvironment returning undefined', () => {
      mockSandbox.appContext.getEnvironment = jest.fn(
        () => undefined,
      ) as () => any;
      expect(() => getEnvConfig(mockSandbox, 'gaia')).toThrow();
    });
  });
});
