import { Sandbox } from '@appfabric/sandbox-spec';
import RestService, {
  ApiMethod,
  RestResponse,
} from 'src/js/services/restService';
import { getEnvConfig } from './envConstants';
import locationMock from '../../mock/location.json';

/**
 * The available Gaia API endpoints.
 */
type GaiaApi =
  | 'getOii'
  | 'assessRisk'
  | 'analyzeNetwork'
  | 'analyzeLocation'
  | 'analyzeDevice'
  | 'analyzeLogs';

/**
 * Configuration for each Gaia API endpoint.
 */
const GAIA_CONFIG: Record<GaiaApi, ApiMethod> = {
  getOii: {
    version: '',
    apiPath: 'api/oii',
    noRetry: false,
    isJsonResponse: true,
  },
  assessRisk: {
    version: '',
    apiPath: 'api/risk-assessment',
    noRetry: false,
    isJsonResponse: true,
  },
  analyzeNetwork: {
    version: '',
    apiPath: 'api/network',
    noRetry: false,
    isJsonResponse: true,
  },
  analyzeLocation: {
    version: '',
    apiPath: 'api/location',
    noRetry: false,
    isJsonResponse: true,
  },
  analyzeDevice: {
    version: '',
    apiPath: 'api/device',
    noRetry: false,
    isJsonResponse: true,
  },
  analyzeLogs: {
    version: '',
    apiPath: 'api/logs',
    noRetry: false,
    isJsonResponse: true,
  },
};

/**
 * Generate required request options for Gaia API calls.
 * @param {string} [originatingIp] - The originating IP address.
 * @returns {any} All options for the request.
 */
export const generateRequestOptions = (originatingIp?: string): any => ({
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    intuit_originatingip: originatingIp,
  },
  mode: 'cors',
});

/**
 * Get config for specified Gaia API.
 * @param {GaiaApi} key - Key of config.
 * @returns {ApiMethod} API config.
 */
export const getApiConfig = (key: GaiaApi): ApiMethod => GAIA_CONFIG[key];

/**
 * Gaia service to call Gaia APIs.
 */
export class GAIAService {
  private sandbox: Sandbox;

  private restService: RestService;

  private useMock: boolean;

  /**
   * Create a new GAIAService.
   * @param {Sandbox} sandbox - The web-shell sandbox.
   * @param {boolean} [useMock=false] - Whether to use mock data instead of real API calls
   */
  constructor(sandbox: Sandbox, useMock = false) {
    this.sandbox = sandbox;
    this.useMock = useMock;
    const config = getEnvConfig(sandbox, 'gaia');
    this.restService = new RestService(config, 'GAIA');
  }

  /**
   * Generic GET request to a Gaia API endpoint.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {GaiaApi} action - The Gaia API action.
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {Record<string, string>} [queryParams] - Optional query parameters to append to the path.
   * @returns {Promise<RestResponse>} The REST response.
   */
  async get(
    entityId: string,
    action: GaiaApi,
    entityType: string,
    queryParams?: Record<string, string>,
  ): Promise<RestResponse> {
    this.sandbox.logger.log(
      `feature=GaiaService, action=${action}, entityId=${entityId}, entityType=${entityType}`,
    );
    const options = generateRequestOptions();
    const apiConfig = getApiConfig(action);
    let apiPath = `${apiConfig.apiPath}/${entityId}`;

    // Always add entity_type parameter
    const allParams = { entity_type: entityType, ...(queryParams || {}) };
    if (Object.keys(allParams).length > 0) {
      const query = Object.entries(allParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      apiPath += `?${query}`;
    }
    const config = {
      ...apiConfig,
      apiPath,
    };
    try {
      return await this.restService.get({
        ...config,
        options,
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error(
          'Unauthorized: Please check your authentication credentials and try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Assess risk for an entity.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {string} investigationId - The investigation ID (mandatory).
   * @param {string} [timeRange='30d'] - The time range for the analysis.
   * @returns {Promise<RestResponse>} Gaia state response.
   */
  async assessRisk(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock) {
      return GAIAService.getMockResponse('network'); // or mock risk
    }
    const params: Record<string, string> = {
      investigation_id: investigationId,
      time_range: timeRange,
    };
    return this.get(entityId, 'assessRisk', entityType, params);
  }

  /**
   * Get OII data for an entity.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @returns {Promise<RestResponse>} Gaia state response.
   */
  async getOii(entityId: string, entityType: string): Promise<RestResponse> {
    if (this.useMock) {
      return GAIAService.getMockResponse('oii');
    }
    return this.get(entityId, 'getOii', entityType);
  }

  /**
   * Analyze network data for an entity.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {string} investigationId - The investigation ID (mandatory).
   * @param {string} [timeRange='30d'] - The time range for the analysis.
   * @returns {Promise<RestResponse>} Gaia state response.
   */
  async analyzeNetwork(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock) {
      return GAIAService.getMockResponse('network');
    }
    const params: Record<string, string> = {
      investigation_id: investigationId,
      time_range: timeRange,
    };
    return this.get(entityId, 'analyzeNetwork', entityType, params);
  }

  /**
   * Analyze location data for an entity.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {string} investigationId - The investigation ID (mandatory).
   * @param {string} [timeRange='30d'] - The time range for the analysis.
   * @returns {Promise<RestResponse>} Gaia state response.
   */
  async analyzeLocation(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock) {
      return GAIAService.getMockResponse('location');
    }
    const params: Record<string, string> = {
      investigation_id: investigationId,
      time_range: timeRange,
    };
    return this.get(entityId, 'analyzeLocation', entityType, params);
  }

  /**
   * Analyze device data for an entity.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {string} investigationId - The investigation ID (mandatory).
   * @param {string} [timeRange='30d'] - The time range for the analysis.
   * @returns {Promise<RestResponse>} Gaia state response.
   */
  async analyzeDevice(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock) {
      return GAIAService.getMockResponse('device');
    }
    const params: Record<string, string> = {
      investigation_id: investigationId,
      time_range: timeRange,
    };
    return this.get(entityId, 'analyzeDevice', entityType, params);
  }

  /**
   * Analyze logs for an entity.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {string} investigationId - The investigation ID (mandatory).
   * @param {string} [timeRange='30d'] - The time range for the analysis.
   * @returns {Promise<RestResponse>} Gaia state response.
   */
  async analyzeLogs(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock) {
      return GAIAService.getMockResponse('logs');
    }
    const params: Record<string, string> = {
      investigation_id: investigationId,
      time_range: timeRange,
    };
    return this.get(entityId, 'analyzeLogs', entityType, params);
  }

  /**
   * Get investigation with headers.
   * @param {string} investigationId - The investigation ID.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @returns {Promise<RestResponse>} The REST response.
   */
  async getInvestigationWithHeaders(
    investigationId: string,
    entityId: string,
    entityType: string,
  ): Promise<RestResponse> {
    const options = generateRequestOptions();
    const apiConfig = getApiConfig('assessRisk');
    const apiPath = `${apiConfig.apiPath}/${entityId}?investigation_id=${investigationId}&entity_type=${entityType}`;
    const config = {
      ...apiConfig,
      apiPath,
    };
    try {
      return await this.restService.get({
        ...config,
        options,
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error(
          'Unauthorized: Please check your authentication credentials and try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Returns mock RestResponse data for the specified agent type.
   * @param {'oii' | 'network' | 'location' | 'device' | 'logs'} type - The type of agent.
   * @returns {RestResponse} Mocked response data.
   */
  public static getMockResponse(
    type: 'oii' | 'network' | 'location' | 'device' | 'logs',
  ): RestResponse {
    const mockData: Record<string, RestResponse> = {
      network: {
        status: 200,
        tid: 'mock-tid',
        data: {
          user_id: '4621097846089147992',
          raw_splunk_results_count: 23,
          extracted_network_signals: [
            {
              ip_address: '223.185.128.58',
              isp: 'bharti airtel ltd.',
              organization: 'bharti',
              tm_sessionid: 'f002651918d540e374a0f1861bd779bb',
              _time: '2025-05-15T06:24:23.466-07:00',
              countries: [],
            },
            {
              _time: '2025-05-15T06:24:29.906-07:00',
              countries: [],
            },
            {
              ip_address: '207.207.181.8',
              isp: 'intuit inc.',
              organization: 'intuit inc.',
              tm_sessionid: '1a977456cfcd4778f2670e3e0cd56efb',
              _time: '2025-05-15T06:31:46.027-07:00',
              countries: [],
            },
          ],
          network_risk_assessment: {
            risk_level: 0.85,
            risk_factors: [
              'Geographic inconsistency / possible impossible travel',
              'Multiple distinct ISPs in short timeframe (Bharti Airtel in India and Intuit in the US)',
            ],
            anomaly_details: [
              'Logged from IP 223.185.128.58 (Bharti Airtel) at 2025-05-15T06:24:23.466-07:00 and then from IP 207.207.181.8 (Intuit) at 2025-05-15T06:31:40.056-07:00, indicating potential impossible travel.',
            ],
            confidence: 0.9,
            summary:
              'User demonstrates suspicious cross-country ISP usage within minutes, suggesting elevated network risk.',
            thoughts:
              'Two IPs—one likely in India, the other in the US—were accessed within a short interval, which raises concerns around possible proxy usage or account takeover. Session IDs reveal separate access points at close times, reinforcing the suspicion of anomalous activity.',
            timestamp: '2025-05-27T10:56:06.965-07:00',
          },
          llm_thoughts:
            'Two IPs—one likely in India, the other in the US—were accessed within a short interval, which raises concerns around possible proxy usage or account takeover. Session IDs reveal separate access points at close times, reinforcing the suspicion of anomalous activity.',
        },
      },
      location: {
        status: 200,
        tid: 'mock-tid',
        data: locationMock,
      },
      device: {
        status: 200,
        tid: 'mock-tid',
        data: {
          user_id: '4621097846089147992',
          raw_splunk_results: [
            {
              _time: '2025-05-27T10:56:06.965-07:00',
              device_id: null,
              fuzzy_device_id: null,
              smartId: null,
              tm_smartid: null,
              tm_sessionid: null,
              intuit_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
              true_ip: null,
              true_ip_city: null,
              true_ip_country: null,
              true_ip_region: null,
              true_ip_latitude: null,
              true_ip_longitude: null,
            },
            {
              _time: '2025-05-15T07:08:39.584-07:00',
              device_id: '6c0998a4c9f0437abbc59706471aaedb',
              fuzzy_device_id: 'f394742f39214c908476c01623bf4bcd',
              smartId: '6c0998a4c9f0437abbc59706471aaedb',
              tm_smartid: '6c0998a4c9f0437abbc59706471aaedb',
              tm_sessionid: '1a977456cfcd4778f2670e3e0cd56efb',
              intuit_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
              true_ip: '207.207.181.8',
              true_ip_city: 'Mountain View',
              true_ip_country: 'US',
              true_ip_region: 'CA',
              true_ip_latitude: 37.3861,
              true_ip_longitude: -122.0839,
            },
          ],
          device_risk_assessment: {
            risk_level: 0.75,
            risk_factors: [
              'Multiple device IDs associated with the same user',
              'Inconsistent device fingerprinting',
            ],
            anomaly_details: [
              'User accessed from multiple devices within a short timeframe',
              'Device fingerprinting shows inconsistencies in browser and OS versions',
            ],
            confidence: 0.85,
            summary:
              'User demonstrates suspicious device usage patterns, suggesting potential account sharing or compromise.',
            thoughts:
              'Multiple device IDs and inconsistent device fingerprinting suggest potential account sharing or compromise. The user accessed from different devices within a short timeframe, which is unusual for normal user behavior.',
            timestamp: '2025-05-27T10:56:06.965-07:00',
          },
          llm_thoughts:
            'Multiple device IDs and inconsistent device fingerprinting suggest potential account sharing or compromise. The user accessed from different devices within a short timeframe, which is unusual for normal user behavior.',
        },
      },
      logs: {
        status: 200,
        tid: 'mock-tid',
        data: {
          user_id: '4621097846089147992',
          raw_splunk_results: [
            {
              _time: '2025-05-27T10:56:06.965-07:00',
              event_type: 'login',
              event_subtype: 'success',
              intuit_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
              true_ip: '207.207.181.8',
              true_ip_city: 'Mountain View',
              true_ip_country: 'US',
              true_ip_region: 'CA',
              true_ip_latitude: 37.3861,
              true_ip_longitude: -122.0839,
            },
            {
              _time: '2025-05-15T07:08:39.584-07:00',
              event_type: 'login',
              event_subtype: 'success',
              intuit_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
              true_ip: '207.207.181.8',
              true_ip_city: 'Mountain View',
              true_ip_country: 'US',
              true_ip_region: 'CA',
              true_ip_latitude: 37.3861,
              true_ip_longitude: -122.0839,
            },
          ],
          logs_risk_assessment: {
            risk_level: 0.65,
            risk_factors: [
              'Multiple successful logins from different locations',
              'Unusual login patterns',
            ],
            anomaly_details: [
              'User logged in from multiple locations within a short timeframe',
              'Login patterns show unusual timing and frequency',
            ],
            confidence: 0.8,
            summary:
              'User demonstrates suspicious login patterns, suggesting potential account compromise.',
            thoughts:
              'Multiple successful logins from different locations within a short timeframe suggest potential account compromise. The login patterns show unusual timing and frequency, which is not typical for normal user behavior.',
            timestamp: '2025-05-27T10:56:06.965-07:00',
          },
          llm_thoughts:
            'Multiple successful logins from different locations within a short timeframe suggest potential account compromise. The login patterns show unusual timing and frequency, which is not typical for normal user behavior.',
        },
      },
      oii: {
        status: 200,
        tid: 'mock-tid',
        data: {
          user_id: '4621097846089147992',
          raw_splunk_results: [
            {
              _time: '2025-05-27T10:56:06.965-07:00',
              event_type: 'login',
              event_subtype: 'success',
              intuit_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
              true_ip: '207.207.181.8',
              true_ip_city: 'Mountain View',
              true_ip_country: 'US',
              true_ip_region: 'CA',
              true_ip_latitude: 37.3861,
              true_ip_longitude: -122.0839,
            },
          ],
          oii_risk_assessment: {
            risk_level: 0.55,
            risk_factors: [
              'Unusual login patterns',
              'Inconsistent user behavior',
            ],
            anomaly_details: [
              'User logged in from an unusual location',
              'Login patterns show inconsistencies with historical behavior',
            ],
            confidence: 0.75,
            summary:
              'User demonstrates suspicious login patterns, suggesting potential account compromise.',
            thoughts:
              'Unusual login patterns and inconsistent user behavior suggest potential account compromise. The user logged in from an unusual location, and the login patterns show inconsistencies with historical behavior.',
            timestamp: '2025-05-27T10:56:06.965-07:00',
          },
          llm_thoughts:
            'Unusual login patterns and inconsistent user behavior suggest potential account compromise. The user logged in from an unusual location, and the login patterns show inconsistencies with historical behavior.',
        },
      },
    };
    return mockData[type] || { status: 404, tid: 'mock-tid', data: null };
  }
}
