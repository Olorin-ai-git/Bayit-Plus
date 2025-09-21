import RestService, { ApiMethod, RestResponse } from './restService';
import { getEnvConfig } from './envConstants';
import locationMock from '../../mock/location.json';
import { isDemoModeActive } from '../hooks/useDemoMode';
import type { Sandbox } from './envConstants';

/**
 * The available Olorin API endpoints.
 */
type OlorinApi =
  | 'getOii'
  | 'assessRisk'
  | 'analyzeNetwork'
  | 'analyzeLocation'
  | 'analyzeDevice'
  | 'analyzeLogs'
  | 'investigation'
  | 'investigations'
  | 'locationRiskAnalysis'
  | 'oiiLocationSource'
  | 'businessLocationSource'
  | 'phoneLocationSource'
  | 'agentInvoke'
  | 'splunkJobCancel'
  | 'demoDisable'
  | 'demoAll';

/**
 * Configuration for each Olorin API endpoint.
 */
const OLORIN_CONFIG: Record<OlorinApi, ApiMethod> = {
  getOii: {
    version: 'api',
    apiPath: 'oii',
    noRetry: false,
    isJsonResponse: true,
  },
  assessRisk: {
    version: 'api',
    apiPath: 'risk-assessment',
    noRetry: false,
    isJsonResponse: true,
  },
  analyzeNetwork: {
    version: 'api',
    apiPath: 'network',
    noRetry: false,
    isJsonResponse: true,
  },
  analyzeLocation: {
    version: 'api',
    apiPath: 'location',
    noRetry: false,
    isJsonResponse: true,
  },
  analyzeDevice: {
    version: 'api',
    apiPath: 'device',
    noRetry: false,
    isJsonResponse: true,
  },
  analyzeLogs: {
    version: 'api',
    apiPath: 'logs',
    noRetry: false,
    isJsonResponse: true,
  },
  investigation: {
    version: 'api',
    apiPath: 'investigation',
    noRetry: false,
    isJsonResponse: true,
  },
  investigations: {
    version: 'api',
    apiPath: 'investigations',
    noRetry: false,
    isJsonResponse: true,
  },
  locationRiskAnalysis: {
    version: 'api',
    apiPath: 'location/risk-analysis',
    noRetry: false,
    isJsonResponse: true,
  },
  oiiLocationSource: {
    version: 'api',
    apiPath: 'location/source/oii',
    noRetry: false,
    isJsonResponse: true,
  },
  businessLocationSource: {
    version: 'api',
    apiPath: 'location/source/business',
    noRetry: false,
    isJsonResponse: true,
  },
  phoneLocationSource: {
    version: 'api',
    apiPath: 'location/source/phone',
    noRetry: false,
    isJsonResponse: true,
  },
  agentInvoke: {
    version: 'api/v1',
    apiPath: 'agent/invoke',
    noRetry: false,
    isJsonResponse: true,
  },
  splunkJobCancel: {
    version: 'api',
    apiPath: 'splunk/job/cancel',
    noRetry: false,
    isJsonResponse: true,
  },
  demoDisable: {
    version: 'api',
    apiPath: 'demo',
    noRetry: false,
    isJsonResponse: true,
  },
  demoAll: {
    version: 'api',
    apiPath: 'demo',
    noRetry: false,
    isJsonResponse: true,
  },
};

/**
 * Generate required request options for Olorin API calls.
 * @param {string} [originatingIp] - The originating IP address.
 * @returns {any} All options for the request.
 */
export const generateRequestOptions = (originatingIp?: string): any => ({
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // ✅ Safe - allowed by server CORS policy
    'Cache-Control': 'no-cache', // ✅ Safe - allowed by server CORS policy
    Pragma: 'no-cache', // ✅ Safe - allowed by server CORS policy
    olorin_originatingip: originatingIp, // ✅ Safe - conditional header
  },
  mode: 'cors',
  credentials: 'include', // Include cookies for authentication
});

/**
 * Get config for specified Olorin API.
 * @param {OlorinApi} key - Key of config.
 * @returns {ApiMethod} API config.
 */
export const getApiConfig = (key: OlorinApi): ApiMethod => OLORIN_CONFIG[key];

// generateEnhancedRequestOptions removed - caused CORS preflight failures
// The additional headers were not in the server's CORS allow-list

/**
 * OlorinService - Service for making API calls to the Olorin backend
 */
export class OlorinService {
  private restService: RestService;
  private useMock: boolean;
  private sandbox: Sandbox;

  constructor(sandbox: Sandbox, useMock: boolean = false) {
    this.sandbox = sandbox;
    this.useMock = useMock;
    const config = getEnvConfig(sandbox, 'olorin');
    this.restService = new RestService(config, 'OLORIN');
  }

  /**
   * Get investigation data for a given entity
   * @param entityId - The entity ID (user ID or device ID)
   * @param entityType - The entity type ('user_id' or 'device_id')
   * @returns Promise with investigation data
   */
  async getInvestigationData(
    entityId: string,
    entityType: string = 'user_id',
  ): Promise<RestResponse<any>> {
    const url = `investigation/${entityId}?entity_type=${entityType}`;
    const requestOptions = generateRequestOptions();

    return this.restService.get({
      version: 'api',
      apiPath: url,
      options: requestOptions,
      isJsonResponse: true,
    });
  }

  /**
   * Start an investigation for a given entity
   * @param entityId - The entity ID (user ID or device ID)
   * @param entityType - The entity type ('user_id' or 'device_id')
   * @returns Promise with investigation start response
   */
  async startInvestigation(
    entityId: string,
    entityType: string = 'user_id',
  ): Promise<RestResponse<any>> {
    const url = `investigation/${entityId}/start`;
    const body = { entity_type: entityType };
    const requestOptions = generateRequestOptions();

    return this.restService.post({
      version: 'api',
      apiPath: url,
      body,
      options: requestOptions,
      isJsonResponse: true,
    });
  }

  /**
   * Get investigation status
   * @param investigationId - The investigation ID
   * @returns Promise with investigation status
   */
  async getInvestigationStatus(
    investigationId: string,
  ): Promise<RestResponse<any>> {
    const url = `investigation/${investigationId}/status`;
    const requestOptions = generateRequestOptions();

    return this.restService.get({
      version: 'api',
      apiPath: url,
      options: requestOptions,
      isJsonResponse: true,
    });
  }

  /**
   * Get investigation results
   * @param investigationId - The investigation ID
   * @returns Promise with investigation results
   */
  async getInvestigationResults(
    investigationId: string,
  ): Promise<RestResponse<any>> {
    const url = `investigation/${investigationId}/results`;
    const requestOptions = generateRequestOptions();

    return this.restService.get({
      version: 'api',
      apiPath: url,
      options: requestOptions,
      isJsonResponse: true,
    });
  }

  /**
   * Generic GET request to an Olorin API endpoint.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {OlorinApi} action - The Olorin API action.
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {Record<string, string>} [queryParams] - Optional query parameters to append to the path.
   * @param {any} [options] - Additional options for the request.
   * @returns {Promise<RestResponse>} The REST response.
   */
  async get(
    entityId: string,
    action: OlorinApi,
    entityType: string,
    queryParams?: Record<string, string>,
    options?: any,
  ): Promise<RestResponse> {
    const config = getApiConfig(action);

    // For certain endpoints, entity_id is part of the path
    const pathBasedEndpoints = [
      'analyzeNetwork',
      'analyzeLocation',
      'analyzeDevice',
      'analyzeLogs',
      'getOii',
      'oiiLocationSource',
      'businessLocationSource',
      'phoneLocationSource',
      'locationRiskAnalysis',
      'assessRisk',
    ];
    let url: string;

    if (pathBasedEndpoints.includes(action)) {
      // Entity ID is part of the path for these endpoints
      const params = new URLSearchParams({
        entity_type: entityType,
        ...queryParams,
      });
      url = `${config.apiPath}/${entityId}?${params.toString()}`;
    } else {
      // Entity ID is a query parameter for other endpoints
      const params = new URLSearchParams({
        ...(entityType === 'user_id'
          ? { user_id: entityId }
          : { device_id: entityId }),
        ...queryParams,
      });
      url = `${config.apiPath}?${params.toString()}`;
    }

    const requestOptions = {
      ...generateRequestOptions(),
      ...options,
    };

    this.sandbox.logger?.log(
      `feature=OlorinService, action=${action}, entityId=${entityId}, entityType=${entityType}`,
    );

    return this.restService.get({
      version: config.version,
      apiPath: url,
      options: requestOptions,
      isJsonResponse: true,
    });
  }

  /**
   * Generic POST request to an Olorin API endpoint.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {OlorinApi} action - The Olorin API action.
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {any} [body] - The request body.
   * @param {Record<string, string>} [queryParams] - Optional query parameters to append to the path.
   * @param {any} [options] - Additional options for the request.
   * @returns {Promise<RestResponse>} The REST response.
   */
  async post(
    entityId: string,
    action: OlorinApi,
    entityType: string,
    body?: any,
    queryParams?: Record<string, string>,
    options?: any,
  ): Promise<RestResponse> {
    const config = getApiConfig(action);
    const params = new URLSearchParams({
      ...(entityType === 'user_id'
        ? { user_id: entityId }
        : { device_id: entityId }),
      ...queryParams,
    });

    const url = `${config.apiPath}?${params.toString()}`;
    const requestOptions = {
      ...generateRequestOptions(),
      ...options,
    };

    this.sandbox.logger?.log(
      `feature=OlorinService, action=${action}, entityId=${entityId}, entityType=${entityType}`,
    );

    return this.restService.post({
      version: config.version,
      apiPath: url,
      body,
      options: requestOptions,
      isJsonResponse: true,
    });
  }

  /**
   * Assess risk for an entity.
   * @param {string} entityId - The entity ID.
   * @param {string} entityType - The entity type.
   * @param {string} investigationId - The investigation ID.
   * @param {string} [timeRange='30d'] - The time range for analysis.
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async assessRisk(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock || isDemoModeActive()) {
      return OlorinService.getMockResponse('network'); // or mock risk
    }
    return this.get(entityId, 'assessRisk', entityType, {
      investigation_id: investigationId,
      time_range: timeRange,
    });
  }

  /**
   * Get OII data for an entity.
   * @param {string} entityId - The entity ID.
   * @param {string} entityType - The entity type.
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async getOii(entityId: string, entityType: string): Promise<RestResponse> {
    if (this.useMock || isDemoModeActive()) {
      return OlorinService.getMockResponse('oii');
    }
    return this.get(entityId, 'getOii', entityType);
  }

  /**
   * Analyze network data for an entity.
   * @param {string} entityId - The entity ID.
   * @param {string} entityType - The entity type.
   * @param {string} investigationId - The investigation ID.
   * @param {string} [timeRange='30d'] - The time range for analysis.
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async analyzeNetwork(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock || isDemoModeActive()) {
      return OlorinService.getMockResponse('network');
    }
    return this.get(entityId, 'analyzeNetwork', entityType, {
      investigation_id: investigationId,
      time_range: timeRange,
    });
  }

  /**
   * Analyze location data for an entity.
   * @param {string} entityId - The entity ID.
   * @param {string} entityType - The entity type.
   * @param {string} investigationId - The investigation ID.
   * @param {string} [timeRange='30d'] - The time range for analysis.
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async analyzeLocation(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock || isDemoModeActive()) {
      return OlorinService.getMockResponse('location');
    }
    return this.get(entityId, 'analyzeLocation', entityType, {
      investigation_id: investigationId,
      time_range: timeRange,
    });
  }

  /**
   * Analyze device data for an entity.
   * @param {string} entityId - The entity ID.
   * @param {string} entityType - The entity type.
   * @param {string} investigationId - The investigation ID.
   * @param {string} [timeRange='30d'] - The time range for analysis.
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async analyzeDevice(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock || isDemoModeActive()) {
      return OlorinService.getMockResponse('device');
    }
    return this.get(entityId, 'analyzeDevice', entityType, {
      investigation_id: investigationId,
      time_range: timeRange,
    });
  }

  /**
   * Analyze logs for an entity.
   * @param {string} entityId - The entity ID.
   * @param {string} entityType - The entity type.
   * @param {string} investigationId - The investigation ID.
   * @param {string} [timeRange='30d'] - The time range for analysis.
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async analyzeLogs(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock || isDemoModeActive()) {
      return OlorinService.getMockResponse('logs');
    }
    return this.get(entityId, 'analyzeLogs', entityType, {
      investigation_id: investigationId,
      time_range: timeRange,
    });
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
    const apiPath = `investigation/${encodeURIComponent(
      investigationId,
    )}?entity_id=${encodeURIComponent(entityId)}&entity_type=${entityType}`;
    const config = {
      version: 'api',
      apiPath,
    };
    try {
      return await this.restService.get({
        ...config,
        options,
        isJsonResponse: true,
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
   * Create a new investigation.
   * @param {string} investigationId - The investigation ID.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @returns {Promise<RestResponse>} The REST response.
   */
  async createInvestigation(
    investigationId: string,
    entityId: string,
    entityType: string,
  ): Promise<RestResponse> {
    const config = getApiConfig('investigation');
    const options = generateRequestOptions();
    const body = {
      id: investigationId,
      entity_id: entityId,
      entity_type: entityType,
    };

    try {
      return await this.restService.post({
        ...config,
        options,
        body,
        isJsonResponse: true,
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
   * Get all investigations.
   * @returns {Promise<RestResponse>} The REST response.
   */
  async getInvestigations(): Promise<RestResponse> {
    const config = getApiConfig('investigations');
    const options = generateRequestOptions();

    try {
      return await this.restService.get({
        ...config,
        options,
        isJsonResponse: true,
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
   * Get location risk analysis (consolidated format).
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {string} investigationId - The investigation ID (mandatory).
   * @param {string} [timeRange='30d'] - The time range for the analysis.
   * @param {string} [splunkHost] - Optional Splunk host override.
   * @returns {Promise<RestResponse>} Location risk analysis response.
   */
  async getLocationRiskAnalysis(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
    splunkHost?: string,
  ): Promise<RestResponse> {
    const params: Record<string, string> = {
      investigation_id: investigationId,
      time_range: timeRange,
    };
    if (splunkHost) {
      params.splunk_host = splunkHost;
    }
    return this.get(entityId, 'locationRiskAnalysis', entityType, params);
  }

  /**
   * Update investigation status and details.
   * @param {string} investigationId - The investigation ID.
   * @param {any} updateData - The data to update.
   * @returns {Promise<RestResponse>} Investigation update response.
   */
  async updateInvestigation(
    investigationId: string,
    updateData: any,
  ): Promise<RestResponse> {
    const config = {
      ...getApiConfig('investigation'),
      apiPath: `${getApiConfig('investigation').apiPath}/${investigationId}`,
    };

    try {
      return await this.restService.post({
        ...config,
        body: updateData,
        options: {
          headers: {
            ...generateRequestOptions().headers,
            'X-HTTP-Method-Override': 'PUT',
          },
        },
        isJsonResponse: true,
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
   * Delete an investigation.
   * @param {string} investigationId - The investigation ID to delete.
   * @returns {Promise<RestResponse>} Investigation delete response.
   */
  async deleteInvestigation(investigationId: string): Promise<RestResponse> {
    const config = {
      ...getApiConfig('investigation'),
      apiPath: `${getApiConfig('investigation').apiPath}/${investigationId}`,
    };

    try {
      return await this.restService.post({
        ...config,
        body: {},
        options: {
          headers: {
            ...generateRequestOptions().headers,
            'X-HTTP-Method-Override': 'DELETE',
          },
        },
        isJsonResponse: true,
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
              ip: '223.185.128.58',
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
              ip: '207.207.181.8',
              isp: 'olorin inc.',
              organization: 'olorin inc.',
              tm_sessionid: '1a977456cfcd4778f2670e3e0cd56efb',
              _time: '2025-05-15T06:31:46.027-07:00',
              countries: [],
            },
          ],
          network_risk_assessment: {
            risk_level: 0.85,
            risk_factors: [
              'Geographic inconsistency / possible impossible travel',
              'Multiple distinct ISPs in short timeframe (Bharti Airtel in India and olorin in the US)',
            ],
            anomaly_details: [
              'Logged from IP 223.185.128.58 (Bharti Airtel) at 2025-05-15T06:24:23.466-07:00 and then from IP 207.207.181.8 (olorin) at 2025-05-15T06:31:40.056-07:00, indicating potential impossible travel.',
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
              olorin_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
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
              olorin_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
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
              olorin_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
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
              olorin_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
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
              olorin_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
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
