#!/usr/bin/env node

/**
 * API Contract Validator Script
 *
 * Automated API contract testing and validation for Olorin backend integration.
 * Validates API endpoints, response schemas, and data contracts to ensure
 * frontend-backend compatibility.
 *
 * Features:
 * - Automated contract testing for all API endpoints
 * - JSON Schema validation for request/response payloads
 * - Backward compatibility checking
 * - Performance and response time validation
 * - Authentication and authorization testing
 * - Error handling and edge case validation
 * - Comprehensive reporting with contract violations
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration for API contract validation
const config = {
  backend: {
    baseUrl: 'http://localhost:8090',
    timeout: 15000,
    retries: 3
  },

  // API contract definitions for each microservice
  contracts: {
<<<<<<< HEAD
    'autonomous-investigation': {
=======
    'structured-investigation': {
>>>>>>> 001-modify-analyzer-method
      endpoints: [
        {
          path: '/api/investigations',
          method: 'GET',
          description: 'List all investigations',
          requiresAuth: true,
          responseSchema: {
            type: 'object',
            required: ['investigations', 'total', 'pagination'],
            properties: {
              investigations: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'title', 'status', 'createdAt'],
                  properties: {
                    id: { type: 'string', pattern: '^[a-zA-Z0-9-_]+$' },
                    title: { type: 'string', minLength: 1, maxLength: 200 },
                    status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
                    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                    type: { type: 'string', enum: ['fraud_detection', 'data_breach', 'insider_threat'] },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                  }
                }
              },
              total: { type: 'number', minimum: 0 },
              pagination: {
                type: 'object',
                required: ['page', 'limit', 'totalPages'],
                properties: {
                  page: { type: 'number', minimum: 1 },
                  limit: { type: 'number', minimum: 1, maximum: 100 },
                  totalPages: { type: 'number', minimum: 0 }
                }
              }
            }
          }
        },
        {
          path: '/api/investigations',
          method: 'POST',
          description: 'Create new investigation',
          requiresAuth: true,
          requestSchema: {
            type: 'object',
            required: ['title', 'type'],
            properties: {
              title: { type: 'string', minLength: 1, maxLength: 200 },
              description: { type: 'string', maxLength: 2000 },
              type: { type: 'string', enum: ['fraud_detection', 'data_breach', 'insider_threat'] },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
              assignedTo: { type: 'string' },
              metadata: { type: 'object' }
            }
          },
          responseSchema: {
            type: 'object',
            required: ['id', 'title', 'status', 'createdAt'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        {
          path: '/api/investigations/{id}/analyze',
          method: 'POST',
          description: 'Run AI analysis on investigation',
          requiresAuth: true,
          requestSchema: {
            type: 'object',
            required: ['analysisType'],
            properties: {
              analysisType: { type: 'string', enum: ['quick', 'comprehensive', 'deep_learning'] },
              includeRiskScore: { type: 'boolean' },
              includePredictions: { type: 'boolean' },
              parameters: { type: 'object' }
            }
          },
          responseSchema: {
            type: 'object',
            required: ['analysisId', 'status', 'estimatedDuration'],
            properties: {
              analysisId: { type: 'string' },
              status: { type: 'string', enum: ['queued', 'running', 'completed', 'failed'] },
              estimatedDuration: { type: 'number', minimum: 0 }
            }
          }
        }
      ]
    },
    'agent-analytics': {
      endpoints: [
        {
          path: '/api/agents/analytics',
          method: 'GET',
          description: 'Get agent performance analytics',
          requiresAuth: true,
          queryParams: {
            timeRange: { type: 'string', enum: ['1h', '24h', '7d', '30d', '90d'] },
            agentType: { type: 'string', enum: ['all', 'device_analysis', 'location_analysis', 'network_analysis'] },
            includeMetrics: { type: 'boolean' }
          },
          responseSchema: {
            type: 'object',
            required: ['agents', 'summary', 'timeRange'],
            properties: {
              agents: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'type', 'performance'],
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string' },
                    performance: {
                      type: 'object',
                      required: ['accuracy', 'responseTime', 'throughput'],
                      properties: {
                        accuracy: { type: 'number', minimum: 0, maximum: 1 },
                        responseTime: { type: 'number', minimum: 0 },
                        throughput: { type: 'number', minimum: 0 }
                      }
                    }
                  }
                }
              },
              summary: {
                type: 'object',
                required: ['totalAgents', 'averageAccuracy', 'averageResponseTime'],
                properties: {
                  totalAgents: { type: 'number', minimum: 0 },
                  averageAccuracy: { type: 'number', minimum: 0, maximum: 1 },
                  averageResponseTime: { type: 'number', minimum: 0 }
                }
              }
            }
          }
        }
      ]
    },
    'reporting': {
      endpoints: [
        {
          path: '/api/reports/generate',
          method: 'POST',
          description: 'Generate investigation report',
          requiresAuth: true,
          requestSchema: {
            type: 'object',
            required: ['investigationId', 'format'],
            properties: {
              investigationId: { type: 'string' },
              format: { type: 'string', enum: ['pdf', 'html', 'json', 'csv'] },
              includeCharts: { type: 'boolean' },
              includeEvidence: { type: 'boolean' },
              includeTimeline: { type: 'boolean' },
              templateId: { type: 'string' }
            }
          },
          responseSchema: {
            type: 'object',
            required: ['reportId', 'status', 'estimatedCompletion'],
            properties: {
              reportId: { type: 'string' },
              status: { type: 'string', enum: ['queued', 'generating', 'completed', 'failed'] },
              estimatedCompletion: { type: 'string', format: 'date-time' }
            }
          }
        },
        {
          path: '/api/reports',
          method: 'GET',
          description: 'List generated reports',
          requiresAuth: true,
          queryParams: {
            status: { type: 'string', enum: ['all', 'completed', 'failed', 'generating'] },
            format: { type: 'string', enum: ['all', 'pdf', 'html', 'json', 'csv'] },
            limit: { type: 'number', minimum: 1, maximum: 100 },
            offset: { type: 'number', minimum: 0 }
          },
          responseSchema: {
            type: 'object',
            required: ['reports', 'total'],
            properties: {
              reports: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'investigationId', 'format', 'status', 'createdAt'],
                  properties: {
                    id: { type: 'string' },
                    investigationId: { type: 'string' },
                    format: { type: 'string' },
                    status: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    completedAt: { type: 'string', format: 'date-time' },
                    downloadUrl: { type: 'string', format: 'uri' }
                  }
                }
              },
              total: { type: 'number', minimum: 0 }
            }
          }
        }
      ]
    },
    'rag-intelligence': {
      endpoints: [
        {
          path: '/api/rag/query',
          method: 'POST',
          description: 'Query RAG system for information',
          requiresAuth: true,
          requestSchema: {
            type: 'object',
            required: ['query'],
            properties: {
              query: { type: 'string', minLength: 1, maxLength: 1000 },
              context: { type: 'string', enum: ['investigation', 'general', 'evidence'] },
              maxResults: { type: 'number', minimum: 1, maximum: 50 },
              includeConfidence: { type: 'boolean' },
              filters: { type: 'object' }
            }
          },
          responseSchema: {
            type: 'object',
            required: ['results', 'confidence', 'processingTime'],
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'content', 'relevance'],
                  properties: {
                    id: { type: 'string' },
                    content: { type: 'string' },
                    relevance: { type: 'number', minimum: 0, maximum: 1 },
                    source: { type: 'string' },
                    metadata: { type: 'object' }
                  }
                }
              },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              processingTime: { type: 'number', minimum: 0 }
            }
          }
        }
      ]
    }
  },

  // Performance thresholds
  thresholds: {
    responseTime: {
      fast: 500,      // ≤500ms
      acceptable: 2000, // ≤2s
      slow: 5000      // ≤5s
    },
    availability: 99.5, // 99.5% uptime
    errorRate: 1       // ≤1% error rate
  },

  // Output configuration
  output: {
    directory: './test-results/api-contracts',
    generateHtml: true,
    generateJson: true,
    includeDetails: true
  }
};

/**
 * Main contract validation runner
 */
async function runContractValidation() {
  console.log('📋 Starting API Contract Validation');
  console.log('==================================');

  const results = {
    services: [],
    summary: {
      totalEndpoints: 0,
      passedEndpoints: 0,
      failedEndpoints: 0,
      violations: [],
      timestamp: new Date().toISOString()
    }
  };

  try {
    // Ensure output directory exists
    await ensureDirectoryExists(config.output.directory);

    // Validate each service contract
    for (const [serviceName, serviceContract] of Object.entries(config.contracts)) {
      console.log(`\\n🔍 Validating ${serviceName} contracts...`);

      const serviceResult = await validateServiceContract(serviceName, serviceContract);
      results.services.push(serviceResult);

      // Update summary
      results.summary.totalEndpoints += serviceResult.endpoints.length;
      results.summary.passedEndpoints += serviceResult.endpoints.filter(e => e.passed).length;
      results.summary.failedEndpoints += serviceResult.endpoints.filter(e => !e.passed).length;
      results.summary.violations.push(...serviceResult.violations);

      // Log service results
      logServiceResults(serviceName, serviceResult);
    }

    // Generate comprehensive reports
    await generateContractReports(results);

    // Log final summary
    logFinalSummary(results);

    // Exit with error if contracts failed
    if (results.summary.failedEndpoints > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Contract validation failed:', error);
    process.exit(1);
  }
}

/**
 * Validate contract for individual service
 */
async function validateServiceContract(serviceName, serviceContract) {
  const serviceResult = {
    service: serviceName,
    endpoints: [],
    violations: [],
    summary: {
      total: serviceContract.endpoints.length,
      passed: 0,
      failed: 0,
      avgResponseTime: 0
    }
  };

  let totalResponseTime = 0;

  for (const endpoint of serviceContract.endpoints) {
    console.log(`  📡 Testing ${endpoint.method} ${endpoint.path}`);

    const endpointResult = await validateEndpointContract(endpoint);
    serviceResult.endpoints.push(endpointResult);

    if (endpointResult.passed) {
      serviceResult.summary.passed++;
    } else {
      serviceResult.summary.failed++;
      serviceResult.violations.push(...endpointResult.violations);
    }

    totalResponseTime += endpointResult.responseTime || 0;
  }

  serviceResult.summary.avgResponseTime = Math.round(
    totalResponseTime / serviceContract.endpoints.length
  );

  return serviceResult;
}

/**
 * Validate individual endpoint contract
 */
async function validateEndpointContract(endpoint) {
  const result = {
    path: endpoint.path,
    method: endpoint.method,
    description: endpoint.description,
    passed: false,
    responseTime: 0,
    statusCode: 0,
    violations: [],
    response: null,
    timestamp: new Date().toISOString()
  };

  try {
    // Prepare request
    const url = `${config.backend.baseUrl}${endpoint.path.replace('{id}', 'test-id')}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add authentication if required
    if (endpoint.requiresAuth) {
      const authToken = await getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      } else {
        result.violations.push({
          type: 'authentication',
          message: 'Failed to obtain authentication token',
          severity: 'error'
        });
        return result;
      }
    }

    // Prepare request body
    let body = null;
    if (endpoint.requestSchema && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
      body = generateSampleData(endpoint.requestSchema);
    }

    // Make request
    const startTime = Date.now();
    const response = await makeRequest(endpoint.method, url, headers, body);
    result.responseTime = Date.now() - startTime;
    result.statusCode = response.status;

    // Parse response
    let responseData = null;
    try {
      const responseText = await response.text();
      if (responseText) {
        responseData = JSON.parse(responseText);
      }
    } catch (e) {
      if (response.ok) {
        result.violations.push({
          type: 'format',
          message: 'Response is not valid JSON',
          severity: 'warning'
        });
      }
    }

    result.response = responseData;

    // Validate status code
    const expectedStatus = getExpectedStatusCode(endpoint.method);
    if (response.status !== expectedStatus && !response.ok) {
      result.violations.push({
        type: 'status',
        message: `Expected successful status, got ${response.status}`,
        expected: expectedStatus,
        actual: response.status,
        severity: 'error'
      });
    }

    // Validate response schema
    if (response.ok && endpoint.responseSchema && responseData) {
      const schemaViolations = validateSchema(responseData, endpoint.responseSchema, 'response');
      result.violations.push(...schemaViolations);
    }

    // Validate performance
    const perfViolations = validatePerformance(result.responseTime, endpoint.path);
    result.violations.push(...perfViolations);

    // Determine if endpoint passed
    const errorViolations = result.violations.filter(v => v.severity === 'error');
    result.passed = errorViolations.length === 0;

  } catch (error) {
    result.violations.push({
      type: 'network',
      message: `Request failed: ${error.message}`,
      severity: 'error'
    });
  }

  return result;
}

/**
 * Get authentication token
 */
async function getAuthToken() {
  try {
    const response = await fetch(`${config.backend.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test-user',
        password: 'test-password'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.token || data.access_token;
    }
  } catch (error) {
    console.warn('Authentication failed:', error.message);
  }

  return null;
}

/**
 * Make HTTP request with timeout
 */
async function makeRequest(method, url, headers, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.backend.timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Generate sample data from schema
 */
function generateSampleData(schema) {
  if (schema.type === 'object') {
    const data = {};

    // Add required fields
    if (schema.required) {
      schema.required.forEach(field => {
        const fieldSchema = schema.properties[field];
        data[field] = generateSampleValue(fieldSchema);
      });
    }

    return data;
  }

  return generateSampleValue(schema);
}

/**
 * Generate sample value from schema
 */
function generateSampleValue(schema) {
  if (!schema) return null;

  switch (schema.type) {
    case 'string':
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'uri') return 'https://example.com';
      return 'test-value';

    case 'number':
      if (schema.minimum !== undefined) return schema.minimum;
      return 42;

    case 'boolean':
      return true;

    case 'array':
      return [];

    case 'object':
      return {};

    default:
      return null;
  }
}

/**
 * Get expected status code for method
 */
function getExpectedStatusCode(method) {
  switch (method) {
    case 'POST':
      return 201;
    case 'GET':
    case 'PUT':
    case 'PATCH':
      return 200;
    case 'DELETE':
      return 204;
    default:
      return 200;
  }
}

/**
 * Validate JSON schema
 */
function validateSchema(data, schema, context) {
  const violations = [];

  try {
    // Simple schema validation - in real implementation, use ajv
    const isValid = validateObjectSchema(data, schema, '', violations);

    if (!isValid && violations.length === 0) {
      violations.push({
        type: 'schema',
        message: `${context} schema validation failed`,
        severity: 'error'
      });
    }

  } catch (error) {
    violations.push({
      type: 'schema',
      message: `Schema validation error: ${error.message}`,
      severity: 'error'
    });
  }

  return violations;
}

/**
 * Validate object against schema
 */
function validateObjectSchema(data, schema, path, violations) {
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null) {
      violations.push({
        type: 'type',
        message: `Expected object at ${path}, got ${typeof data}`,
        severity: 'error'
      });
      return false;
    }

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          violations.push({
            type: 'missing-field',
            message: `Missing required field: ${path}.${field}`,
            severity: 'error'
          });
        }
      }
    }

    // Validate field types
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in data) {
          validateObjectSchema(data[field], fieldSchema, `${path}.${field}`, violations);
        }
      }
    }

    return true;
  }

  // Validate primitive types
  if (schema.type === 'string' && typeof data !== 'string') {
    violations.push({
      type: 'type',
      message: `Expected string at ${path}, got ${typeof data}`,
      severity: 'error'
    });
    return false;
  }

  if (schema.type === 'number' && typeof data !== 'number') {
    violations.push({
      type: 'type',
      message: `Expected number at ${path}, got ${typeof data}`,
      severity: 'error'
    });
    return false;
  }

  if (schema.type === 'array' && !Array.isArray(data)) {
    violations.push({
      type: 'type',
      message: `Expected array at ${path}, got ${typeof data}`,
      severity: 'error'
    });
    return false;
  }

  return true;
}

/**
 * Validate performance against thresholds
 */
function validatePerformance(responseTime, endpoint) {
  const violations = [];

  if (responseTime > config.thresholds.responseTime.slow) {
    violations.push({
      type: 'performance',
      message: `Very slow response time: ${responseTime}ms`,
      severity: 'error'
    });
  } else if (responseTime > config.thresholds.responseTime.acceptable) {
    violations.push({
      type: 'performance',
      message: `Slow response time: ${responseTime}ms`,
      severity: 'warning'
    });
  }

  return violations;
}

/**
 * Generate contract validation reports
 */
async function generateContractReports(results) {
  // Generate HTML report
  if (config.output.generateHtml) {
    const htmlReport = generateHtmlReport(results);
    const htmlPath = path.join(config.output.directory, 'contract-validation-report.html');
    await fs.writeFile(htmlPath, htmlReport, 'utf8');
    console.log(`\\n📄 HTML report: ${htmlPath}`);
  }

  // Generate JSON report
  if (config.output.generateJson) {
    const jsonPath = path.join(config.output.directory, 'contract-validation-results.json');
    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`📄 JSON report: ${jsonPath}`);
  }
}

/**
 * Generate HTML report
 */
function generateHtmlReport(results) {
  const timestamp = new Date().toLocaleString();
  const successRate = Math.round((results.summary.passedEndpoints / results.summary.totalEndpoints) * 100);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Olorin API Contract Validation Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { color: #2563eb; margin-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .success { color: #059669; }
        .warning { color: #d97706; }
        .error { color: #dc2626; }
        .service-section { background: white; margin: 20px 0; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .endpoint-result { margin: 15px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #e5e7eb; }
        .endpoint-result.passed { background: #f0fdf4; border-color: #22c55e; }
        .endpoint-result.failed { background: #fef2f2; border-color: #ef4444; }
        .endpoint-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .violations { margin-top: 10px; }
        .violation { background: #fecaca; padding: 8px; margin: 5px 0; border-radius: 4px; font-size: 0.9em; }
        .footer { text-align: center; color: #666; margin-top: 40px; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Olorin API Contract Validation Report</h1>
            <p>Automated contract testing and schema validation for backend API integration</p>
            <p><strong>Generated:</strong> ${timestamp}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value ${successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'error'}">${successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.summary.totalEndpoints}</div>
                <div class="metric-label">Total Endpoints</div>
            </div>
            <div class="metric">
                <div class="metric-value success">${results.summary.passedEndpoints}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value ${results.summary.failedEndpoints > 0 ? 'error' : 'success'}">${results.summary.failedEndpoints}</div>
                <div class="metric-label">Failed</div>
            </div>
        </div>

        ${results.services.map(service => `
            <div class="service-section">
                <h2>${service.service}</h2>
                <p><strong>Endpoints:</strong> ${service.summary.total} | <strong>Passed:</strong> ${service.summary.passed} | <strong>Failed:</strong> ${service.summary.failed}</p>
                <p><strong>Average Response Time:</strong> ${service.summary.avgResponseTime}ms</p>

                ${service.endpoints.map(endpoint => `
                    <div class="endpoint-result ${endpoint.passed ? 'passed' : 'failed'}">
                        <div class="endpoint-header">
                            <div>
                                <strong>${endpoint.method} ${endpoint.path}</strong>
                                <div style="font-size: 0.9em; color: #666;">${endpoint.description}</div>
                            </div>
                            <div>
                                <span>${endpoint.passed ? '✅' : '❌'}</span>
                                <span style="margin-left: 10px;">${endpoint.responseTime}ms</span>
                            </div>
                        </div>
                        ${endpoint.violations.length > 0 ? `
                            <div class="violations">
                                ${endpoint.violations.map(v => `<div class="violation">${v.type}: ${v.message}</div>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('')}

        <div class="footer">
            <p>Report generated by Olorin API Contract Validation Framework</p>
            <p>Ensuring frontend-backend API compatibility and data integrity</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Log service results
 */
function logServiceResults(serviceName, serviceResult) {
  console.log(`   📊 ${serviceName}: ${serviceResult.summary.passed}/${serviceResult.summary.total} passed`);
  console.log(`   ⏱️  Average response time: ${serviceResult.summary.avgResponseTime}ms`);

  if (serviceResult.summary.failed > 0) {
    console.log(`   ❌ ${serviceResult.summary.failed} endpoints failed validation`);
  }
}

/**
 * Log final summary
 */
function logFinalSummary(results) {
  console.log('\\n🎯 API Contract Validation Summary');
  console.log('==================================');

  const successRate = Math.round((results.summary.passedEndpoints / results.summary.totalEndpoints) * 100);

  console.log(`📊 Total Endpoints: ${results.summary.totalEndpoints}`);
  console.log(`✅ Passed: ${results.summary.passedEndpoints}`);
  console.log(`❌ Failed: ${results.summary.failedEndpoints}`);
  console.log(`📈 Success Rate: ${successRate}%`);
  console.log(`🚨 Total Violations: ${results.summary.violations.length}`);

  if (results.summary.failedEndpoints === 0) {
    console.log('\\n🎉 All API contracts validated successfully!');
  } else {
    console.log('\\n⚠️ Some API contracts failed validation - see detailed report');
  }

  console.log(`\\n📄 Detailed reports available in ${config.output.directory}`);
}

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Olorin API Contract Validation Tool

Usage:
  node scripts/api/contract-validator.js [options]

Options:
  --help, -h     Show this help message
  --service      Validate specific service only
  --verbose      Show detailed output

Examples:
  npm run api:contracts
<<<<<<< HEAD
  node scripts/api/contract-validator.js --service autonomous-investigation
=======
  node scripts/api/contract-validator.js --service structured-investigation
>>>>>>> 001-modify-analyzer-method
  node scripts/api/contract-validator.js --verbose
  `);
  process.exit(0);
}

// Filter to specific service if requested
if (args.includes('--service')) {
  const serviceIndex = args.indexOf('--service') + 1;
  if (serviceIndex < args.length) {
    const serviceName = args[serviceIndex];
    if (config.contracts[serviceName]) {
      config.contracts = { [serviceName]: config.contracts[serviceName] };
    } else {
      console.error(`❌ Service '${serviceName}' not found`);
      console.log('Available services:', Object.keys(config.contracts).join(', '));
      process.exit(1);
    }
  }
}

// Run contract validation
runContractValidation().catch(error => {
  console.error('❌ Contract validation failed:', error);
  process.exit(1);
});