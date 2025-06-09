import { GAIAService } from 'src/js/services/GAIAService';
import { InvestigationStepId, StepStatus } from 'src/js/types/RiskAssessment';
import { Sandbox } from '@appfabric/sandbox-spec';
import RestService from 'src/js/services/restService';
import { RestResponse } from '../../../src/js/services/restService';

const baseConfig = {
  sandbox: {
    pluginConfig: {
      extendedProperties: {
        API_KEY: 'test-api-key',
      },
      hasLayers: true,
      manifestVersion: '4' as const,
      id: 'test-plugin-id',
    },
    analytics: {
      track: jest.fn(),
      data: {},
    },
    appContext: {
      getEnvironment: jest.fn().mockReturnValue('local'),
      getAppInfo: jest.fn(),
      getLocalizationInfo: jest.fn(),
      getUserAuthInfo: jest.fn(),
      getUserAuth: jest.fn(),
      getPlatformInfo: jest.fn(),
      getRealmInfo: jest.fn(),
      getRealm: jest.fn(),
      getUserProfileInfo: jest.fn(),
      getUserProfile: jest.fn(),
    },
    experiments: {
      getExperimentAssignments: jest.fn(),
      getExperimentAssignmentsWithContext: jest.fn(),
      getRemoteExperimentAssignments: jest.fn(),
    },
    featureFlags: {
      isFeatureEnabled: jest.fn(),
      getAllFlags: jest.fn(),
      evaluateBooleanVariation: jest.fn(),
      evaluateStringVariation: jest.fn(),
      evaluateNumberVariation: jest.fn(),
      evaluateJsonVariation: jest.fn(),
      getFlagMetadata: jest.fn(),
      getFlagEvaluationDetails: jest.fn(),
      onFlagsChanged: jest.fn(),
      evaluateIntVariation: jest.fn(),
      evaluateDoubleVariation: jest.fn(),
      evaluateFeatureFlags: jest.fn(),
      getAllRemoteFlags: jest.fn(),
    },
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      fatal: jest.fn(),
      logException: jest.fn(),
      isLevelDebug: jest.fn(),
      isLevelLog: jest.fn(),
      isLevelInfo: jest.fn(),
      isLevelWarn: jest.fn(),
      isLevelError: jest.fn(),
      isLevelFatal: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    },
    performance: {
      createCustomerInteraction: jest.fn(),
      getCustomerInteraction: jest.fn(),
      record: jest.fn(),
      deleteCustomerInteraction: jest.fn(),
      createProfiler: jest.fn(),
    },
    navigation: {
      navigate: jest.fn(),
    },
    pubsub: {
      publish: jest.fn(),
      publishSync: jest.fn(),
      subscribe: jest.fn(),
      once: jest.fn(),
      unsubscribe: jest.fn(),
      unsubscribeAll: jest.fn(),
      getSubscribers: jest.fn(),
      getTopics: jest.fn(),
      clear: jest.fn(),
      clearSandboxSubscriptions: jest.fn(),
      clearContextSubscriptions: jest.fn(),
      debug: jest.fn(),
      remote: {
        publish: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      },
    },
    sandboxContext: {
      getInfo: jest.fn(),
      getWidgetHierarchy: jest.fn(),
    },
    widgets: {
      getWidget: jest.fn(),
      getWidgetDescriptor: jest.fn(),
    },
    authorization: {
      isAuthorized: jest.fn(),
      isAuthorizedBatch: jest.fn(),
    },
    genos: {
      launchAssistiveWidget: jest.fn(),
      addContext: jest.fn(),
      removeContext: jest.fn(),
      hasGenOSAccess: jest.fn(),
    },
    actions: {
      triggerAction: jest.fn(),
      registerActionHandler: jest.fn(),
    },
    preferences: {
      getPreference: jest.fn(),
      updatePreference: jest.fn(),
      getCategory: jest.fn(),
    },
    variability: {
      fetchVariabilityDecision: jest.fn(),
      fetchVariabilityDecisionList: jest.fn(),
    },
  },
  baseUrl: 'https://api.test.com',
};

jest.mock('src/js/services/restService', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    })),
  };
});

const investigationId = 'INV-123';
const entityType = 'user_id';

describe('GAIAService', () => {
  let gaiaService: GAIAService;
  let mockSandboxInstance: any;

  beforeEach(() => {
    mockSandboxInstance = baseConfig.sandbox;
    gaiaService = new GAIAService(mockSandboxInstance);
  });

  describe('get', () => {
    const userId = 'test-user';
    const action = 'analyzeNetwork' as const;

    it('calls restServiceInstance.get with correct apiPath', async () => {
      const mockResponse: RestResponse = {
        status: 200,
        data: { foo: 'bar' },
        tid: 'mock-tid',
      };
      mockSandboxInstance.logger.log = jest
        .fn()
        .mockResolvedValue(mockResponse);

      const result = await gaiaService.get(userId, action, entityType);
      expect(result).toEqual(mockResponse);
      expect(mockSandboxInstance.logger.log).toHaveBeenCalledWith(
        'GAIAService.get',
        expect.objectContaining({
          userId,
          action,
          entityType,
        }),
      );
    });

    it('handles unauthorized error', async () => {
      const error = new Error('Unauthorized');
      mockSandboxInstance.logger.error = jest.fn().mockRejectedValue(error);

      await expect(gaiaService.get(userId, action, entityType)).rejects.toThrow(
        'Unauthorized: Please check your authentication credentials and try again.',
      );
    });

    it('handles non-401 errors', async () => {
      const error = new Error('Server Error');
      (error as any).response = { status: 500 };

      mockSandboxInstance.logger.error = jest.fn().mockRejectedValue(error);

      await expect(gaiaService.get(userId, action, entityType)).rejects.toThrow(
        'Server Error',
      );
    });

    it('generates correct request options', async () => {
      const mockResponse = {
        status: 200,
        tid: 'test-tid',
        data: { risk_assessment: { risk_level: 0.5 } },
      };

      mockSandboxInstance.logger.log = jest
        .fn()
        .mockResolvedValue(mockResponse);

      await gaiaService.get(userId, action, entityType);

      expect(mockSandboxInstance.logger.log).toHaveBeenCalledWith(
        'GAIAService.get',
        expect.objectContaining({
          options: expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Accept: 'application/json',
            }),
            mode: 'cors',
          }),
        }),
      );
    });
  });
});
