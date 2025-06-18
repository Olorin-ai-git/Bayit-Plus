// Standalone Olorin API service without AppFabric dependencies

import locationMock from '../../mock/location.json';

/**
 * Response interface for API calls
 */
export interface RestResponse {
  status: number;
  data: any;
  headers?: Record<string, string>;
}

/**
 * The available Olorin API endpoints.
 */
type OlorinApi =
  | 'getOii'
  | 'assessRisk'
  | 'analyzeNetwork'
  | 'analyzeLocation'
  | 'analyzeDevice'
  | 'analyzeLogs';

/**
 * Configuration for each Olorin API endpoint.
 */
interface ApiMethod {
  version: string;
  apiPath: string;
  noRetry: boolean;
  isJsonResponse: boolean;
}

const OLORIN_CONFIG: Record<OlorinApi, ApiMethod> = {
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
 * Simple logger interface
 */
interface Logger {
  log: (message: string) => void;
  error: (message: string) => void;
}

/**
 * Simple console logger implementation
 */
const logger: Logger = {
  log: (message: string) => console.log(`[OlorinService] ${message}`),
  error: (message: string) => console.error(`[OlorinService] ${message}`),
};

/**
 * Generate required request options for Olorin API calls.
 * @param {string} [originatingIp] - The originating IP address.
 * @returns {any} All options for the request.
 */
export const generateRequestOptions = (originatingIp?: string): RequestInit => ({
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'olorin_originatingip': originatingIp || '',
  },
  mode: 'cors',
});

/**
 * Get config for specified Olorin API.
 * @param {OlorinApi} key - Key of config.
 * @returns {ApiMethod} API config.
 */
export const getApiConfig = (key: OlorinApi): ApiMethod => OLORIN_CONFIG[key];

/**
 * Olorin service to call Olorin APIs.
 */
export class OlorinService {
  private baseUrl: string;
  private useMock: boolean;

  /**
   * Create a new OlorinService.
   * @param {string} [baseUrl] - The base URL for the Olorin API
   * @param {boolean} [useMock=false] - Whether to use mock data instead of real API calls
   */
  constructor(baseUrl?: string, useMock = false) {
    this.baseUrl = baseUrl || process.env.REACT_APP_OLORIN_API_URL || 'http://localhost:8000';
    this.useMock = useMock;
  }

  /**
   * Generic GET request to an Olorin API endpoint.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {OlorinApi} action - The Olorin API action.
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {Record<string, string>} [queryParams] - Optional query parameters to append to the path.
   * @returns {Promise<RestResponse>} The REST response.
   */
  async get(
    entityId: string,
    action: OlorinApi,
    entityType: string,
    queryParams?: Record<string, string>,
  ): Promise<RestResponse> {
    logger.log(
      `action=${action}, entityId=${entityId}, entityType=${entityType}`,
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

    const url = `${this.baseUrl}/${apiPath}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        ...options,
      });

      const data = await response.json();
      
      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      logger.error(`API call failed: ${error.message}`);
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
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async assessRisk(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock) {
      return OlorinService.getMockResponse('network'); // or mock risk
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
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async getOii(entityId: string, entityType: string): Promise<RestResponse> {
    if (this.useMock) {
      return OlorinService.getMockResponse('oii');
    }
    return this.get(entityId, 'getOii', entityType);
  }

  /**
   * Analyze network data for an entity.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {string} investigationId - The investigation ID (mandatory).
   * @param {string} [timeRange='30d'] - The time range for the analysis.
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async analyzeNetwork(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock) {
      return OlorinService.getMockResponse('network');
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
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async analyzeLocation(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock) {
      return OlorinService.getMockResponse('location');
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
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async analyzeDevice(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock) {
      return OlorinService.getMockResponse('device');
    }
    const params: Record<string, string> = {
      investigation_id: investigationId,
      time_range: timeRange,
    };
    return this.get(entityId, 'analyzeDevice', entityType, params);
  }

  /**
   * Analyze log data for an entity.
   * @param {string} entityId - The entity ID (user ID or device ID).
   * @param {string} entityType - The entity type ('user_id' or 'device_id').
   * @param {string} investigationId - The investigation ID (mandatory).
   * @param {string} [timeRange='30d'] - The time range for the analysis.
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async analyzeLogs(
    entityId: string,
    entityType: string,
    investigationId: string,
    timeRange: string = '30d',
  ): Promise<RestResponse> {
    if (this.useMock) {
      return OlorinService.getMockResponse('logs');
    }
    const params: Record<string, string> = {
      investigation_id: investigationId,
      time_range: timeRange,
    };
    return this.get(entityId, 'analyzeLogs', entityType, params);
  }

  /**
   * Get investigation data with headers.
   * @param {string} investigationId - The investigation ID.
   * @param {string} entityId - The entity ID.
   * @param {string} entityType - The entity type.
   * @returns {Promise<RestResponse>} Olorin state response.
   */
  async getInvestigationWithHeaders(
    investigationId: string,
    entityId: string,
    entityType: string,
  ): Promise<RestResponse> {
    if (this.useMock) {
      return OlorinService.getMockResponse('network');
    }
    
    const url = `${this.baseUrl}/api/investigation/${investigationId}`;
    const options = generateRequestOptions();
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        ...options,
      });

      const data = await response.json();
      
      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      logger.error(`Investigation API call failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get mock response for testing.
   * @param {string} type - The type of mock response.
   * @returns {RestResponse} Mock response.
   */
  public static getMockResponse(
    type: 'oii' | 'network' | 'location' | 'device' | 'logs',
  ): RestResponse {
    const mockData = {
      oii: {
        status: 'success',
        tid: '12345',
        data: {
          oii_score: 0.85,
          risk_level: 'medium',
          analysis: 'Mock OII analysis data',
        },
      },
      network: {
        status: 'success',
        data: {
          network_analysis: 'Mock network analysis',
          risk_score: 0.7,
          ip_addresses: ['192.168.1.1', '10.0.0.1'],
        },
      },
      location: locationMock,
      device: {
        status: 'success',
        data: {
          device_analysis: 'Mock device analysis',
          device_fingerprint: 'abc123',
          risk_indicators: ['suspicious_device', 'new_device'],
        },
      },
      logs: {
        status: 'success',
        data: {
          log_analysis: 'Mock log analysis',
          anomalies: ['unusual_login_time', 'multiple_failed_attempts'],
          behavior_patterns: {
            login_frequency: 'high',
            access_patterns: 'irregular',
          },
        },
      },
    };

    return {
      status: 200,
      data: mockData[type],
    };
  }
}

export default OlorinService;
