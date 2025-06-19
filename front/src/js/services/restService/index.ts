import type { RestClientConfig } from '../envConstants';
import WithRUMInteractionName from './WithRUMInteractionName';
import onRequestStart from './onRequestStart';
import onRequestEnd from './onRequestEnd';

export type FetchOptions = {
  headers?: Record<string, string>;
  method?: string;
  body?: any;
  rumPath?: string;
};

export interface InternalRestResponse<T = any> {
  data: T;
  status: number;
  tid: string | null;
  error?: {
    payload?: string;
    message: string;
  };
}

export type RestResponse<T = any> = InternalRestResponse<T | null>;

interface BaseApiMethodArgs {
  apiPath: string;
  version: string;
  noRetry?: boolean;
  options?: FetchOptions;
  isJsonResponse?: boolean;
}

interface PostApiMethodArgs extends BaseApiMethodArgs {
  body: any;
}

export type ApiMethod = BaseApiMethodArgs | PostApiMethodArgs;

/**
 * Simplified RestClient for making HTTP requests
 */
class RestClient {
  private config: RestClientConfig;

  constructor(config: RestClientConfig) {
    this.config = config;
  }

  async get(endpoint: string, options: FetchOptions = {}): Promise<Response> {
    const url = `${this.config.baseUrl}/${endpoint}`;
    return fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  }

  async post(endpoint: string, data: any, options: FetchOptions = {}): Promise<Response> {
    const url = `${this.config.baseUrl}/${endpoint}`;
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
  }

  static AuthConstants = {
    BROWSER_AUTH: 'browser_auth',
  };
}

/**
 * RestService general utility service for making REST calls
 */
export class RestService extends WithRUMInteractionName {
  private readonly config: RestClientConfig;

  /**
   *
   * @param {RestClientConfig} config : configuration specifics for environment, baseUrl, etc.
   * @param {string} name : the name of the outbound REST service that we are calling out to
   */
  constructor(config: RestClientConfig, name: string) {
    super(name);
    this.config = config;
    this.config.authType = this.config.authType || RestClient.AuthConstants.BROWSER_AUTH;

    if (!this.config.onRequestStart) {
      this.config.onRequestStart = onRequestStart().bind(this);
    }

    if (!this.config.onRequestEnd) {
      this.config.onRequestEnd = onRequestEnd().bind(this);
    }
  }

  /**
   * get ui-data-layer rest client
   * @param {boolean} noRetry: indicate whether the request should be retried when it is failed
   * @returns {RestClient} restClient: ui-data-layer rest client
   */
  getRestClient = (noRetry?: boolean): RestClient => {
    this.config.noRetry = noRetry;
    return new RestClient({
      ...this.config,
    });
  };

  /**
   * post
   * @param {String} apiPath : api path
   * @param {String} version : api version
   * @param {any} body : request body
   * @param {boolean} noRetry: indicate whether the request should be retried when it is failed
   * @param {any} options : additional options
   * @param {boolean} isJsonResponse : indicate if JSON response is expected
   * @returns {Promise} response
   */
  async post<T = any>({
    version,
    apiPath,
    body,
    noRetry = false,
    options = {},
    isJsonResponse = true,
  }: PostApiMethodArgs): Promise<RestResponse<T>> {
    const apiEndpoint: string = `${version}/${apiPath}`;
    const data = { ...body };
    return this.makeRequest<T>(
      this.getRestClient(noRetry).post(apiEndpoint, data, {
        ...options,
        rumPath: options?.rumPath || `POST ${apiEndpoint}`,
      }),
      isJsonResponse,
    );
  }

  /**
   * get
   * @param {String} apiPath : api path
   * @param {String} version : api version
   * @param {FetchOptions} options : additional options
   * @param {boolean} isJsonResponse : indicate if JSON response is expected
   * @returns {Promise} response
   */
  async get<T = any>({
    version,
    apiPath,
    options = {},
    noRetry = false,
    isJsonResponse = true,
  }: BaseApiMethodArgs): Promise<RestResponse<T>> {
    const apiEndpoint = `${version}/${apiPath}`;
    return this.makeRequest<T>(
      this.getRestClient(noRetry).get(apiEndpoint, {
        ...options,
        rumPath: options?.rumPath || `GET ${apiEndpoint}`,
      }),
      isJsonResponse,
    );
  }

  /**
   * A generic wrapper around all API calls for a REST service
   * @param {Promise<any>} request
   * @param {boolean} isJsonResponse
   * @returns {Promise<any>}
   */
  /* eslint-disable require-jsdoc */
  // eslint-disable-next-line class-methods-use-this
  private async makeRequest<T>(
    request: Promise<Response>,
    isJsonResponse: boolean,
  ): Promise<RestResponse<T>> {
    try {
      const response = await request;
      const tid = response.headers && response.headers.get('intuit_tid');
      const status = response && response.status;
      if (response.ok) {
        if (isJsonResponse) {
          const data = (await response.json()) as unknown as T;
          return { data, tid, status };
        }
      }

      const data = await response.text();
      const resp: RestResponse<T> = {
        data: response.ok ? (data as unknown as T) : null,
        tid,
        status,
      };

      if (!response.ok) {
        resp.error = { payload: data, message: response.statusText };
      }

      return resp;
    } catch (err: any) {
      /* istanbul ignore next */
      const tid = err.headers && err.headers.get('intuit_tid');
      /* istanbul ignore next */
      const status = err && err.status;
      /* istanbul ignore next */
      return { data: null, tid, status, error: { message: err.message } };
    }
  }
  /* eslint-enable require-jsdoc */
}

export default RestService;
