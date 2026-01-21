/**
 * APITestCase entity model
 * Represents individual backend API validation scenarios with curl commands and expected responses.
  */

export interface ResponseAssertion {
  type: 'status' | 'header' | 'body' | 'schema' | 'performance' | 'custom';
  field?: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'gte' | 'lte' | 'exists' | 'not_exists';
  expectedValue: any;
  tolerance?: number;
  description: string;
}

export interface AuthConfig {
  type: 'none' | 'apikey' | 'bearer' | 'basic' | 'oauth';
  credentials: Record<string, string>;
  headers?: Record<string, string>;
  refreshUrl?: string;
  expiresAt?: Date;
}

export interface APIResult {
  status: 'passed' | 'failed' | 'error' | 'timeout';
  actualStatus: number;
  actualResponse: any;
  actualHeaders: Record<string, string>;
  responseTime: number;
  errors: string[];
  assertionResults: AssertionResult[];
  curlCommand: string;
  timestamp: Date;
}

export interface AssertionResult {
  assertion: ResponseAssertion;
  passed: boolean;
  actualValue: any;
  error?: string;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface APITestCase {
  id: string;
  name: string;
  endpoint: string;
  method: HTTPMethod;
  headers: Record<string, string>;
  body: any;
  expectedStatus: number;
  expectedResponse: any;
  curlCommand: string;
  timeout: number;
  authentication: AuthConfig;
  assertions: ResponseAssertion[];
  tags: string[];
}

export class APITestCaseModel implements APITestCase {
  public readonly id: string;
  public name: string;
  public endpoint: string;
  public method: HTTPMethod;
  public headers: Record<string, string>;
  public body: any;
  public expectedStatus: number;
  public expectedResponse: any;
  public curlCommand: string;
  public timeout: number;
  public authentication: AuthConfig;
  public assertions: ResponseAssertion[];
  public tags: string[];

  constructor(data: Omit<APITestCase, 'curlCommand'>) {
    this.id = data.id;
    this.name = data.name;
    this.endpoint = data.endpoint;
    this.method = data.method;
    this.headers = data.headers;
    this.body = data.body;
    this.expectedStatus = data.expectedStatus;
    this.expectedResponse = data.expectedResponse;
    this.timeout = data.timeout;
    this.authentication = data.authentication;
    this.assertions = data.assertions;
    this.tags = data.tags;

    // Generate curl command
    this.curlCommand = this.generateCurlCommand();

    this.validate();
  }

  public validate(): void {
    if (!this.name?.trim()) {
      throw new Error('APITestCase name is required');
    }

    if (!this.isValidEndpoint(this.endpoint)) {
      throw new Error('Endpoint must be valid URL path');
    }

    if (!this.isValidHTTPMethod(this.method)) {
      throw new Error('Method must be supported HTTP verb');
    }

    if (!this.isValidHTTPStatusCode(this.expectedStatus)) {
      throw new Error('Expected status must be valid HTTP code');
    }

    if (this.timeout <= 0 || this.timeout > 300000) { // Max 5 minutes
      throw new Error('Timeout must be between 1ms and 5 minutes');
    }

    // Validate assertions
    for (const assertion of this.assertions) {
      if (!this.isValidAssertion(assertion)) {
        throw new Error(`Invalid assertion: ${assertion.description}`);
      }
    }

    // Validate authentication configuration
    if (this.authentication.type !== 'none' && !this.authentication.credentials) {
      throw new Error('Authentication credentials required when auth type is not none');
    }

    // Check for expired authentication
    if (this.authentication.expiresAt && this.authentication.expiresAt <= new Date()) {
      throw new Error('Authentication credentials have expired');
    }
  }

  private isValidEndpoint(endpoint: string): boolean {
    // Must start with / and be a valid URL path
    if (!endpoint.startsWith('/')) return false;

    try {
      new URL(`https://example.com${endpoint}`);
      return true;
    } catch {
      return false;
    }
  }

  private isValidHTTPMethod(method: string): boolean {
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method);
  }

  private isValidHTTPStatusCode(status: number): boolean {
    return status >= 100 && status <= 599;
  }

  private isValidAssertion(assertion: ResponseAssertion): boolean {
    const validTypes = ['status', 'header', 'body', 'schema', 'performance', 'custom'];
    const validOperators = ['equals', 'contains', 'matches', 'gt', 'lt', 'gte', 'lte', 'exists', 'not_exists'];

    if (!validTypes.includes(assertion.type)) return false;
    if (!validOperators.includes(assertion.operator)) return false;
    if (!assertion.description?.trim()) return false;

    // Type-specific validations
    if (assertion.type === 'performance' && assertion.tolerance === undefined) {
      return false; // Performance assertions need tolerance
    }

    return true;
  }

  private generateCurlCommand(): string {
    let curlCmd = `curl -X ${this.method}`;

    // Add headers
    const allHeaders = { ...this.headers };

    // Add authentication headers
    switch (this.authentication.type) {
      case 'bearer':
        allHeaders['Authorization'] = `Bearer ${this.authentication.credentials.token}`;
        break;
      case 'apikey':
        if (this.authentication.credentials.headerName) {
          allHeaders[this.authentication.credentials.headerName] = this.authentication.credentials.key;
        } else {
          allHeaders['X-API-Key'] = this.authentication.credentials.key;
        }
        break;
      case 'basic':
        const basicAuth = Buffer.from(
          `${this.authentication.credentials.username}:${this.authentication.credentials.password}`
        ).toString('base64');
        allHeaders['Authorization'] = `Basic ${basicAuth}`;
        break;
    }

    // Add custom auth headers
    if (this.authentication.headers) {
      Object.assign(allHeaders, this.authentication.headers);
    }

    // Add all headers to curl command
    for (const [key, value] of Object.entries(allHeaders)) {
      curlCmd += ` -H "${key}: ${value}"`;
    }

    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(this.method) && this.body) {
      const bodyStr = typeof this.body === 'string'
        ? this.body
        : JSON.stringify(this.body);
      curlCmd += ` -d '${bodyStr}'`;

      // Add content-type header if not already present
      if (!allHeaders['Content-Type'] && !allHeaders['content-type']) {
        curlCmd += ` -H "Content-Type: application/json"`;
      }
    }

    // Add timeout
    curlCmd += ` --max-time ${Math.ceil(this.timeout / 1000)}`;

    // Add endpoint (will be replaced with actual base URL during execution)
    curlCmd += ` "\${BASE_URL}${this.endpoint}"`;

    return curlCmd;
  }

  public execute(baseUrl: string): Promise<APIResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const actualCurlCommand = this.curlCommand.replace('${BASE_URL}', baseUrl);

      // In a real implementation, this would execute the actual HTTP request
      // For now, we'll return a mock result
      const result: APIResult = {
        status: 'passed',
        actualStatus: this.expectedStatus,
        actualResponse: this.expectedResponse,
        actualHeaders: { 'content-type': 'application/json' },
        responseTime: Date.now() - startTime,
        errors: [],
        assertionResults: this.assertions.map(assertion => ({
          assertion,
          passed: true,
          actualValue: assertion.expectedValue
        })),
        curlCommand: actualCurlCommand,
        timestamp: new Date()
      };

      resolve(result);
    });
  }

  public addAssertion(assertion: ResponseAssertion): void {
    if (!this.isValidAssertion(assertion)) {
      throw new Error(`Invalid assertion: ${assertion.description}`);
    }

    this.assertions.push(assertion);
    this.curlCommand = this.generateCurlCommand(); // Regenerate curl command
  }

  public removeAssertion(description: string): void {
    const initialLength = this.assertions.length;
    this.assertions = this.assertions.filter(assertion => assertion.description !== description);

    if (this.assertions.length === initialLength) {
      throw new Error(`Assertion with description "${description}" not found`);
    }

    this.curlCommand = this.generateCurlCommand(); // Regenerate curl command
  }

  public updateHeader(key: string, value: string): void {
    this.headers[key] = value;
    this.curlCommand = this.generateCurlCommand(); // Regenerate curl command
  }

  public removeHeader(key: string): void {
    delete this.headers[key];
    this.curlCommand = this.generateCurlCommand(); // Regenerate curl command
  }

  public addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  public removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
    }
  }

  public clone(newId: string, newName?: string): APITestCaseModel {
    return new APITestCaseModel({
      id: newId,
      name: newName || `${this.name} (Copy)`,
      endpoint: this.endpoint,
      method: this.method,
      headers: { ...this.headers },
      body: JSON.parse(JSON.stringify(this.body)),
      expectedStatus: this.expectedStatus,
      expectedResponse: JSON.parse(JSON.stringify(this.expectedResponse)),
      timeout: this.timeout,
      authentication: JSON.parse(JSON.stringify(this.authentication)),
      assertions: JSON.parse(JSON.stringify(this.assertions)),
      tags: [...this.tags]
    });
  }

  public toJSON(): APITestCase {
    return {
      id: this.id,
      name: this.name,
      endpoint: this.endpoint,
      method: this.method,
      headers: this.headers,
      body: this.body,
      expectedStatus: this.expectedStatus,
      expectedResponse: this.expectedResponse,
      curlCommand: this.curlCommand,
      timeout: this.timeout,
      authentication: this.authentication,
      assertions: this.assertions,
      tags: this.tags
    };
  }

  public static fromJSON(data: any): APITestCaseModel {
    const testCase = new APITestCaseModel({
      id: data.id,
      name: data.name,
      endpoint: data.endpoint,
      method: data.method,
      headers: data.headers,
      body: data.body,
      expectedStatus: data.expectedStatus,
      expectedResponse: data.expectedResponse,
      timeout: data.timeout,
      authentication: {
        ...data.authentication,
        expiresAt: data.authentication.expiresAt
          ? new Date(data.authentication.expiresAt)
          : undefined
      },
      assertions: data.assertions,
      tags: data.tags
    });

    return testCase;
  }
}

export default APITestCaseModel;