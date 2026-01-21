/**
 * APITestingService - Backend API validation with curl commands
 * Handles API test execution, validation, and result aggregation
  */

import { APITestCaseModel, APITestCase, APIResult, ResponseAssertion, AssertionResult } from '../models';
// import { TestEnvironmentModel } from '../models';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface TestSuiteOptions {
  baseUrl: string;
  timeout?: number;
  retryFailures?: boolean;
  maxRetries?: number;
  parallel?: boolean;
  maxConcurrency?: number;
  saveResults?: boolean;
  validateSchema?: boolean;
}

export interface TestSuiteResult {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  results: APIResult[];
  summary: TestSummary;
}

export interface TestSummary {
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  successRate: number;
  errorRate: number;
  timeoutCount: number;
  assertionFailures: number;
}

export interface EndpointGroup {
  name: string;
  baseUrl?: string;
  commonHeaders?: Record<string, string>;
  commonAuth?: any;
  tests: APITestCaseModel[];
}

export class APITestingService {
  private testCases: Map<string, APITestCaseModel> = new Map();
  private testResults: Map<string, APIResult> = new Map();
  private testSuites: Map<string, EndpointGroup> = new Map();

  constructor() {
    this.initializeDefaultTestCases();
  }

  // Test Case Management
  public async createTestCase(testCaseData: Omit<APITestCase, 'curlCommand'>): Promise<APITestCaseModel> {
    const testCase = new APITestCaseModel(testCaseData);
    this.testCases.set(testCase.id, testCase);
    return testCase;
  }

  public async getTestCase(id: string): Promise<APITestCaseModel | null> {
    return this.testCases.get(id) || null;
  }

  public async listTestCases(filter: {
    method?: string;
    endpoint?: string;
    tags?: string[];
  } = {}): Promise<APITestCaseModel[]> {
    let testCases = Array.from(this.testCases.values());

    if (filter.method) {
      testCases = testCases.filter(tc => tc.method === filter.method);
    }

    if (filter.endpoint) {
      testCases = testCases.filter(tc => filter.endpoint && tc.endpoint.includes(filter.endpoint));
    }

    if (filter.tags && filter.tags.length > 0) {
      testCases = testCases.filter(tc =>
        filter.tags!.some(tag => tc.tags.includes(tag))
      );
    }

    return testCases;
  }

  public async updateTestCase(id: string, updates: Partial<APITestCase>): Promise<APITestCaseModel | null> {
    const testCase = this.testCases.get(id);
    if (!testCase) {
      return null;
    }

    // Apply updates and regenerate curl command if needed
    Object.assign(testCase, updates);
    (testCase as any).curlCommand = (testCase as any).generateCurlCommand();

    return testCase;
  }

  public async deleteTestCase(id: string): Promise<boolean> {
    return this.testCases.delete(id);
  }

  // Test Suite Management
  public createTestSuite(name: string, options: Partial<EndpointGroup> = {}): EndpointGroup {
    const suite: EndpointGroup = {
      name,
      ...(options.baseUrl && { baseUrl: options.baseUrl }),
      commonHeaders: options.commonHeaders || {},
      ...(options.commonAuth && { commonAuth: options.commonAuth }),
      tests: options.tests || []
    };

    this.testSuites.set(name, suite);
    return suite;
  }

  public addTestToSuite(suiteName: string, testCase: APITestCaseModel): boolean {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      return false;
    }

    suite.tests.push(testCase);
    return true;
  }

  public getTestSuite(name: string): EndpointGroup | null {
    return this.testSuites.get(name) || null;
  }

  public listTestSuites(): EndpointGroup[] {
    return Array.from(this.testSuites.values());
  }

  // Test Execution
  public async executeTestCase(testCase: APITestCaseModel, baseUrl?: string): Promise<APIResult> {
    const startTime = Date.now();
    const effectiveBaseUrl = baseUrl || 'http://localhost:3000';

    try {
      // Perform HTTP request
      const response = await this.performHttpRequest(testCase, effectiveBaseUrl);

      // Evaluate assertions
      const assertionResults = await this.evaluateAssertions(testCase.assertions, response);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Determine overall status
      const status = this.determineTestStatus(testCase, response, assertionResults);

      const result: APIResult = {
        status,
        actualStatus: response.status,
        actualResponse: response.body,
        actualHeaders: response.headers,
        responseTime,
        errors: this.collectErrors(response, assertionResults),
        assertionResults,
        curlCommand: testCase.curlCommand.replace('${BASE_URL}', effectiveBaseUrl),
        timestamp: new Date()
      };

      this.testResults.set(`${testCase.id}-${Date.now()}`, result);
      return result;

    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const result: APIResult = {
        status: 'error',
        actualStatus: 0,
        actualResponse: null,
        actualHeaders: {},
        responseTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        assertionResults: [],
        curlCommand: testCase.curlCommand.replace('${BASE_URL}', effectiveBaseUrl),
        timestamp: new Date()
      };

      this.testResults.set(`${testCase.id}-${Date.now()}`, result);
      return result;
    }
  }

  public async executeTestSuite(suiteName: string, options: TestSuiteOptions): Promise<TestSuiteResult> {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(`Test suite ${suiteName} not found`);
    }

    const suiteId = `suite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();
    const results: APIResult[] = [];

    const baseUrl = options.baseUrl || suite.baseUrl || 'http://localhost:3000';

    if (options.parallel && options.maxConcurrency) {
      // Execute in parallel with concurrency limit
      const chunks = this.chunkArray(suite.tests, options.maxConcurrency);

      for (const chunk of chunks) {
        const promises = chunk.map(testCase =>
          this.executeTestCaseWithRetry(testCase, baseUrl, options)
        );

        const chunkResults = await Promise.allSettled(promises);
        results.push(...chunkResults.map(r => r.status === 'fulfilled' ? r.value : this.createErrorResult()));
      }
    } else if (options.parallel) {
      // Execute all in parallel
      const promises = suite.tests.map(testCase =>
        this.executeTestCaseWithRetry(testCase, baseUrl, options)
      );

      const parallelResults = await Promise.allSettled(promises);
      results.push(...parallelResults.map(r => r.status === 'fulfilled' ? r.value : this.createErrorResult()));
    } else {
      // Execute sequentially
      for (const testCase of suite.tests) {
        try {
          const result = await this.executeTestCaseWithRetry(testCase, baseUrl, options);
          results.push(result);
        } catch (error) {
          results.push(this.createErrorResult(error instanceof Error ? error.message : 'Unknown error'));
        }
      }
    }

    const endTime = new Date();
    const summary = this.generateTestSummary(results);

    return {
      id: suiteId,
      name: suiteName,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      totalTests: suite.tests.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      errors: results.filter(r => r.status === 'error' || r.status === 'timeout').length,
      results,
      summary
    };
  }

  public async executeMultipleTestCases(testCaseIds: string[], options: TestSuiteOptions): Promise<TestSuiteResult> {
    const testCases = testCaseIds.map(id => this.testCases.get(id)).filter(tc => tc) as APITestCaseModel[];

    if (testCases.length !== testCaseIds.length) {
      const missing = testCaseIds.filter(id => !this.testCases.has(id));
      throw new Error(`Test cases not found: ${missing.join(', ')}`);
    }

    // Create temporary suite
    const tempSuiteName = `temp-suite-${Date.now()}`;
    this.createTestSuite(tempSuiteName, { tests: testCases });

    try {
      return await this.executeTestSuite(tempSuiteName, options);
    } finally {
      this.testSuites.delete(tempSuiteName);
    }
  }

  // Curl Command Execution
  public async executeCurlCommand(curlCommand: string, timeout = 30000): Promise<APIResult> {
    const startTime = Date.now();

    try {
      // Parse curl command (basic implementation)
      const { method, url, headers, body } = this.parseCurlCommand(curlCommand);

      // Create temporary test case
      const tempTestCase = new APITestCaseModel({
        id: `temp-${Date.now()}`,
        name: 'Curl Command Test',
        endpoint: new URL(url).pathname,
        method: method as any,
        headers,
        body: body ? JSON.parse(body) : undefined,
        expectedStatus: 200,
        expectedResponse: {},
        timeout,
        authentication: { type: 'none', credentials: {} },
        assertions: [],
        tags: ['curl']
      });

      return await this.executeTestCase(tempTestCase, new URL(url).origin);

    } catch (error) {
      const endTime = Date.now();

      return {
        status: 'error',
        actualStatus: 0,
        actualResponse: null,
        actualHeaders: {},
        responseTime: endTime - startTime,
        errors: [error instanceof Error ? error.message : 'Curl command parsing failed'],
        assertionResults: [],
        curlCommand,
        timestamp: new Date()
      };
    }
  }

  // Result Management
  public async getTestResult(testId: string): Promise<APIResult | null> {
    return this.testResults.get(testId) || null;
  }

  public async listTestResults(limit = 100): Promise<APIResult[]> {
    const results = Array.from(this.testResults.values());
    return results
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public generateReport(results: APIResult[], format: 'json' | 'html' | 'text' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(results, null, 2);

      case 'html':
        return this.generateHtmlReport(results);

      case 'text':
        return this.generateTextReport(results);

      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  // Private Methods
  private async performHttpRequest(testCase: APITestCaseModel, baseUrl: string): Promise<{
    status: number;
    headers: Record<string, string>;
    body: any;
  }> {
    const url = new URL(testCase.endpoint, baseUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: testCase.method,
        headers: { ...testCase.headers },
        timeout: testCase.timeout
      };

      const req = httpModule.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          let body: any = data;

          // Try to parse JSON
          if (res.headers['content-type']?.includes('application/json')) {
            try {
              body = JSON.parse(data);
            } catch {
              // Keep as string if parsing fails
            }
          }

          resolve({
            status: res.statusCode || 0,
            headers: res.headers as Record<string, string>,
            body
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      // Send body if present
      if (testCase.body && ['POST', 'PUT', 'PATCH'].includes(testCase.method)) {
        const bodyData = typeof testCase.body === 'string'
          ? testCase.body
          : JSON.stringify(testCase.body);
        req.write(bodyData);
      }

      req.end();
    });
  }

  private async evaluateAssertions(assertions: ResponseAssertion[], response: any): Promise<AssertionResult[]> {
    const results: AssertionResult[] = [];

    for (const assertion of assertions) {
      try {
        const result = this.evaluateSingleAssertion(assertion, response);
        results.push(result);
      } catch (error) {
        results.push({
          assertion,
          passed: false,
          actualValue: null,
          error: error instanceof Error ? error.message : 'Assertion evaluation failed'
        });
      }
    }

    return results;
  }

  private evaluateSingleAssertion(assertion: ResponseAssertion, response: any): AssertionResult {
    let actualValue: any;
    let passed = false;

    switch (assertion.type) {
      case 'status':
        actualValue = response.status;
        passed = this.compareValues(actualValue, assertion.expectedValue, assertion.operator);
        break;

      case 'header':
        actualValue = response.headers[assertion.field || ''];
        passed = this.compareValues(actualValue, assertion.expectedValue, assertion.operator);
        break;

      case 'body':
        if (assertion.field) {
          actualValue = this.getNestedValue(response.body, assertion.field);
        } else {
          actualValue = response.body;
        }
        passed = this.compareValues(actualValue, assertion.expectedValue, assertion.operator);
        break;

      case 'performance':
        // Would need response time from the calling context
        actualValue = 0; // Placeholder
        passed = this.compareValues(actualValue, assertion.expectedValue, assertion.operator, assertion.tolerance);
        break;

      default:
        throw new Error(`Unsupported assertion type: ${assertion.type}`);
    }

    return {
      assertion,
      passed,
      actualValue
    };
  }

  private compareValues(actual: any, expected: any, operator: string, _tolerance?: number): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;

      case 'contains':
        return String(actual).includes(String(expected));

      case 'matches':
        return new RegExp(String(expected)).test(String(actual));

      case 'gt':
        return Number(actual) > Number(expected);

      case 'lt':
        return Number(actual) < Number(expected);

      case 'gte':
        return Number(actual) >= Number(expected);

      case 'lte':
        return Number(actual) <= Number(expected);

      case 'exists':
        return actual !== null && actual !== undefined;

      case 'not_exists':
        return actual === null || actual === undefined;

      default:
        throw new Error(`Unsupported comparison operator: ${operator}`);
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private determineTestStatus(testCase: APITestCaseModel, response: any, assertionResults: AssertionResult[]): 'passed' | 'failed' | 'error' | 'timeout' {
    // Check for timeout (would need to be passed from execution context)
    // For now, assume no timeout

    // Check if expected status matches
    if (response.status !== testCase.expectedStatus) {
      return 'failed';
    }

    // Check assertion results
    const hasFailedAssertions = assertionResults.some(result => !result.passed);
    if (hasFailedAssertions) {
      return 'failed';
    }

    return 'passed';
  }

  private collectErrors(_response: any, assertionResults: AssertionResult[]): string[] {
    const errors: string[] = [];

    assertionResults.forEach(result => {
      if (!result.passed && result.error) {
        errors.push(result.error);
      }
    });

    return errors;
  }

  private async executeTestCaseWithRetry(testCase: APITestCaseModel, baseUrl: string, options: TestSuiteOptions): Promise<APIResult> {
    let lastResult: APIResult;
    const maxRetries = options.retryFailures ? (options.maxRetries || 3) : 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      lastResult = await this.executeTestCase(testCase, baseUrl);

      if (lastResult.status === 'passed' || !options.retryFailures) {
        break;
      }

      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    return lastResult!;
  }

  private createErrorResult(message = 'Test execution failed'): APIResult {
    return {
      status: 'error',
      actualStatus: 0,
      actualResponse: null,
      actualHeaders: {},
      responseTime: 0,
      errors: [message],
      assertionResults: [],
      curlCommand: '',
      timestamp: new Date()
    };
  }

  private generateTestSummary(results: APIResult[]): TestSummary {
    if (results.length === 0) {
      return {
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        successRate: 0,
        errorRate: 0,
        timeoutCount: 0,
        assertionFailures: 0
      };
    }

    const responseTimes = results.map(r => r.responseTime);
    const passedCount = results.filter(r => r.status === 'passed').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const timeoutCount = results.filter(r => r.status === 'timeout').length;
    const assertionFailures = results.reduce((sum, r) =>
      sum + r.assertionResults.filter(ar => !ar.passed).length, 0);

    return {
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      successRate: (passedCount / results.length) * 100,
      errorRate: (errorCount / results.length) * 100,
      timeoutCount,
      assertionFailures
    };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private parseCurlCommand(curlCommand: string): {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
  } {
    // Basic curl command parsing (would use a proper parser in production)
    const parts = curlCommand.split(' ');

    let method = 'GET';
    let url = '';
    const headers: Record<string, string> = {};
    let body: string | undefined;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part === '-X' && parts[i + 1]) {
        method = parts[i + 1];
        i++;
      } else if (part === '-H' && parts[i + 1]) {
        const header = parts[i + 1].replace(/"/g, '');
        const [key, value] = header.split(': ');
        if (key && value) {
          headers[key] = value;
        }
        i++;
      } else if (part === '-d' && parts[i + 1]) {
        body = parts[i + 1].replace(/"/g, '');
        i++;
      } else if (part.startsWith('http')) {
        url = part.replace(/"/g, '');
      }
    }

    return { method, url, headers, ...(body && { body }) };
  }

  private generateHtmlReport(results: APIResult[]): string {
    const summary = this.generateTestSummary(results);

    return `
<!DOCTYPE html>
<html>
<head>
    <title>API Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .test-result { border: 1px solid #ddd; margin: 10px 0; padding: 10px; border-radius: 5px; }
        .passed { border-left: 5px solid #4CAF50; }
        .failed { border-left: 5px solid #f44336; }
        .error { border-left: 5px solid #ff9800; }
    </style>
</head>
<body>
    <h1>API Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: ${results.length}</p>
        <p>Success Rate: ${summary.successRate.toFixed(2)}%</p>
        <p>Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms</p>
    </div>
    <div class="results">
        ${results.map(result => `
        <div class="test-result ${result.status}">
            <h3>Test Result - ${result.status.toUpperCase()}</h3>
            <p><strong>Status:</strong> ${result.actualStatus}</p>
            <p><strong>Response Time:</strong> ${result.responseTime}ms</p>
            <p><strong>Curl Command:</strong> <code>${result.curlCommand}</code></p>
            ${result.errors.length > 0 ? `<p><strong>Errors:</strong> ${result.errors.join(', ')}</p>` : ''}
        </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  private generateTextReport(results: APIResult[]): string {
    const summary = this.generateTestSummary(results);

    let report = `API Test Report\n`;
    report += `================\n\n`;
    report += `Summary:\n`;
    report += `  Total Tests: ${results.length}\n`;
    report += `  Success Rate: ${summary.successRate.toFixed(2)}%\n`;
    report += `  Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms\n\n`;

    report += `Results:\n`;
    results.forEach((result, index) => {
      report += `\n${index + 1}. Status: ${result.status.toUpperCase()}\n`;
      report += `   HTTP Status: ${result.actualStatus}\n`;
      report += `   Response Time: ${result.responseTime}ms\n`;
      report += `   Curl Command: ${result.curlCommand}\n`;

      if (result.errors.length > 0) {
        report += `   Errors: ${result.errors.join(', ')}\n`;
      }
    });

    return report;
  }

  private initializeDefaultTestCases(): void {
    // Health check test case
    this.createTestCase({
      id: 'health-check',
      name: 'API Health Check',
      endpoint: '/health',
      method: 'GET',
      headers: {},
      body: undefined,
      expectedStatus: 200,
      expectedResponse: { status: 'ok' },
      timeout: 5000,
      authentication: { type: 'none', credentials: {} },
      assertions: [
        {
          type: 'status',
          operator: 'equals',
          expectedValue: 200,
          description: 'Status should be 200'
        },
        {
          type: 'body',
          field: 'status',
          operator: 'equals',
          expectedValue: 'ok',
          description: 'Status field should be ok'
        }
      ],
      tags: ['health', 'basic']
    });
  }
}

export default APITestingService;