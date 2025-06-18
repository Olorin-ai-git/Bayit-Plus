// Simple REST service without AppFabric dependencies

export interface ApiMethod {
  version: string;
  apiPath: string;
  noRetry: boolean;
  isJsonResponse: boolean;
}

export interface RestResponse {
  status: number;
  data: any;
  headers?: Record<string, string>;
}

export interface RestConfig {
  baseUrl: string;
  timeout?: number;
}

/**
 * Simple REST service for API calls
 */
class RestService {
  private baseUrl: string;
  private timeout: number;
  private serviceName: string;

  constructor(config: RestConfig, serviceName: string = 'API') {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    this.serviceName = serviceName;
  }

  /**
   * Make a GET request
   * @param config API configuration
   * @returns Promise<RestResponse>
   */
  async get(config: ApiMethod & { options?: RequestInit }): Promise<RestResponse> {
    const url = `${this.baseUrl}/${config.apiPath}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        ...config.options,
        signal: AbortSignal.timeout(this.timeout),
      });

      let data;
      if (config.isJsonResponse) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      console.error(`[${this.serviceName}] API call failed:`, error.message);
      throw error;
    }
  }

  /**
   * Make a POST request
   * @param config API configuration
   * @param body Request body
   * @returns Promise<RestResponse>
   */
  async post(config: ApiMethod & { options?: RequestInit }, body?: any): Promise<RestResponse> {
    const url = `${this.baseUrl}/${config.apiPath}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
        ...config.options,
        signal: AbortSignal.timeout(this.timeout),
      });

      let data;
      if (config.isJsonResponse) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      console.error(`[${this.serviceName}] API call failed:`, error.message);
      throw error;
    }
  }
}

export default RestService;
