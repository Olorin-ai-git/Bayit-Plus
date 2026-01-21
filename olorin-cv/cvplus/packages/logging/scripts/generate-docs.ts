/**
 * T057: Documentation generator in packages/logging/scripts/generate-docs.ts
 *
 * Automated documentation generation for the CVPlus logging system.
 * Generates API documentation, configuration guides, usage examples,
 * and migration documentation from code annotations and configurations.
  */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

interface DocSection {
  title: string;
  content: string;
  level: number;
  anchor: string;
}

interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  parameters: Parameter[];
  responses: Response[];
  examples: Example[];
}

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: any;
}

interface Response {
  status: number;
  description: string;
  schema?: any;
}

interface Example {
  title: string;
  language: string;
  code: string;
}

interface ConfigOption {
  name: string;
  type: string;
  defaultValue: any;
  description: string;
  required: boolean;
  examples?: any[];
}

class LoggingDocsGenerator {
  private outputDir: string;
  private sourceDir: string;
  private templateDir: string;

  constructor(
    outputDir = path.join(__dirname, '../docs'),
    sourceDir = path.join(__dirname, '../src'),
    templateDir = path.join(__dirname, './templates')
  ) {
    this.outputDir = outputDir;
    this.sourceDir = sourceDir;
    this.templateDir = templateDir;

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate complete documentation
    */
  async generateAll(): Promise<void> {
    logger.info('🚀 Generating CVPlus Logging Documentation...');

    try {
      // Generate main documentation files
      await this.generateOverview();
      await this.generateQuickStart();
      await this.generateAPIDocumentation();
      await this.generateConfigurationGuide();
      await this.generateMigrationGuide();
      await this.generateTroubleshooting();
      await this.generateExamples();
      await this.generateArchitecture();

      // Generate reference documentation
      await this.generateTypeReference();
      await this.generateIntegrationGuides();

      // Generate index and navigation
      await this.generateIndex();
      await this.generateTableOfContents();

      logger.info('✅ Documentation generation completed successfully!');
      logger.info(`📄 Documentation generated in: ${this.outputDir}`);

    } catch (error) {
      logger.error('❌ Documentation generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate overview documentation
    */
  private async generateOverview(): Promise<void> {
    const overview = `# CVPlus Logging System

## Overview

The CVPlus Logging System is a comprehensive, production-ready logging infrastructure designed specifically for the CVPlus platform. It provides centralized logging, real-time monitoring, advanced analytics, and seamless integration across all CVPlus components.

## Key Features

### 🎯 **Centralized Architecture**
- **Layer 0 Infrastructure**: Core logging foundation for all CVPlus modules
- **Unified Interface**: Consistent logging API across frontend and backend
- **Submodule Integration**: Seamless integration with all CVPlus packages

### 📊 **Advanced Analytics**
- **Real-time Metrics**: Live performance and error tracking
- **Security Monitoring**: Threat detection and classification
- **Performance Analysis**: Response time and throughput monitoring
- **Custom Dashboards**: Interactive monitoring interfaces

### 🚀 **High Performance**
- **Batch Processing**: Optimized log handling for high throughput
- **Memory Management**: Intelligent caching and garbage collection
- **Connection Pooling**: Efficient database and service connections
- **Async Operations**: Non-blocking logging operations

### 🔒 **Security & Privacy**
- **PII Redaction**: Automatic sensitive data protection
- **Access Controls**: Role-based log access management
- **Security Events**: Automated threat detection and alerting
- **Compliance Ready**: GDPR, HIPAA, and other regulatory compliance

### 🔧 **Developer Experience**
- **Easy Integration**: Simple API with TypeScript support
- **Rich Context**: Correlation IDs and structured metadata
- **Debug Tools**: Advanced debugging and troubleshooting features
- **Migration Support**: Smooth transition from legacy systems

## Architecture

The logging system is built on a modular architecture with clear separation of concerns:

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                     CVPlus Applications                      │
├─────────────────────────────────────────────────────────────┤
│  Frontend Apps  │  Backend APIs  │  Firebase Functions      │
├─────────────────────────────────────────────────────────────┤
│                   @cvplus/logging                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Frontend  │ │   Backend   │ │    Specialized         │ │
│  │   Loggers   │ │   Loggers   │ │    Components          │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Core Infrastructure                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Storage   │ │  Analytics  │ │    Monitoring           │ │
│  │   Layer     │ │   Engine    │ │    Dashboard            │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
\`\`\`

## Quick Links

- [🚀 Quick Start Guide](./quick-start.md)
- [📚 API Documentation](./api-reference.md)
- [⚙️ Configuration Guide](./configuration.md)
- [🔄 Migration Guide](./migration.md)
- [🔧 Troubleshooting](./troubleshooting.md)
- [💡 Examples](./examples.md)

## Installation

\`\`\`bash
# Install the logging package
npm install @cvplus/logging

# For frontend applications
npm install @cvplus/logging-frontend

# For specialized components
npm install @cvplus/logging-backend
\`\`\`

## Basic Usage

### Frontend Logging

\`\`\`typescript
import { logger } from '@cvplus/logging/frontend';

// Simple logging
logger.info('User action completed', { action: 'profile_update' });

// Error logging with context
logger.error('API request failed', error, {
  endpoint: '/api/users',
  userId: '123',
  correlationId: 'req_456'
});
\`\`\`

### Backend Logging

\`\`\`typescript
import { FunctionLogger } from '@cvplus/logging/backend';

const functionLogger = new FunctionLogger('cv-processing');

// Function invocation logging
functionLogger.functionInvoked('processCV', { userId, cvId });

// Processing with metrics
const duration = await functionLogger.measureAsync(
  'cv-analysis',
  async () => {
    return await analyzeCV(cvData);
  }
);
\`\`\`

## Support

For questions, issues, or contributions:

- 📧 **Email**: support@cvplus.com
- 📖 **Documentation**: [docs.cvplus.com/logging](https://docs.cvplus.com/logging)
- 🐛 **Issues**: [GitHub Issues](https://github.com/cvplus/logging/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/cvplus/logging/discussions)

---

*Generated automatically by CVPlus Documentation Generator*
*Last updated: ${new Date().toISOString()}*
`;

    fs.writeFileSync(path.join(this.outputDir, 'README.md'), overview);
    logger.info('📝 Generated overview documentation');
  }

  /**
   * Generate quick start guide
    */
  private async generateQuickStart(): Promise<void> {
    const quickStart = `# Quick Start Guide

Get up and running with CVPlus Logging in minutes!

## 1. Installation

Choose the appropriate package for your use case:

### For Frontend Applications
\`\`\`bash
npm install @cvplus/logging
\`\`\`

### For Backend Services
\`\`\`bash
npm install @cvplus/logging
\`\`\`

### For Firebase Functions
\`\`\`bash
npm install @cvplus/logging
\`\`\`

## 2. Basic Setup

### Frontend Setup

\`\`\`typescript
// src/utils/logger.ts
import { logger } from '@cvplus/logging/frontend';

// Configure logger
logger.configure({
  level: 'info',
  enableConsole: true,
  enableRemote: true,
  apiEndpoint: process.env.REACT_APP_LOGGING_API,
  batchSize: 10,
  flushInterval: 30000
});

export { logger };
\`\`\`

### Backend Setup

\`\`\`typescript
// src/utils/logger.ts
import { FunctionLogger } from '@cvplus/logging/backend';

// Create specialized logger
const appLogger = new FunctionLogger('my-app');

// Configure correlation tracking
appLogger.setDefaultContext({
  service: 'user-service',
  version: '1.0.0'
});

export { appLogger };
\`\`\`

## 3. Basic Logging

### Information Logging

\`\`\`typescript
import { logger } from './utils/logger';

// Simple message
logger.info('Application started');

// With context
logger.info('User logged in', {
  userId: '123',
  method: 'oauth',
  provider: 'google'
});
\`\`\`

### Error Logging

\`\`\`typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error, {
    operation: 'user-update',
    userId: '123',
    correlationId: 'req_456'
  });
}
\`\`\`

### Performance Tracking

\`\`\`typescript
// Measure function execution time
const result = await logger.measureAsync('database-query', async () => {
  return await database.users.findById(userId);
});

// Manual timing
const timer = logger.startTimer('custom-operation');
// ... do work
timer.stop({ additionalData: 'value' });
\`\`\`

## 4. Advanced Features

### Correlation Tracking

\`\`\`typescript
// Set correlation ID for request tracking
logger.setCorrelationId('req_789');

// All subsequent logs will include this ID
logger.info('Processing request'); // Includes correlationId: 'req_789'
\`\`\`

### User Context

\`\`\`typescript
// Set user context
logger.setUserContext({
  userId: '123',
  email: 'user@example.com',
  role: 'premium'
});

// Context is automatically included in all logs
\`\`\`

### Structured Logging

\`\`\`typescript
// Rich structured data
logger.info('Payment processed', {
  event: 'PAYMENT_SUCCESS',
  paymentId: 'pay_123',
  amount: 99.99,
  currency: 'USD',
  customer: {
    id: '456',
    tier: 'premium'
  },
  metadata: {
    source: 'stripe',
    timestamp: new Date().toISOString()
  }
});
\`\`\`

## 5. Component-Specific Logging

### CV Processing

\`\`\`typescript
import { ProcessingLogger } from '@cvplus/logging/backend';

const cvLogger = new ProcessingLogger('cv-analyzer');

cvLogger.processingStarted('cv-analysis', {
  cvId: 'cv_123',
  features: ['ats-optimization', 'personality-insights']
});

cvLogger.processingCompleted('cv-analysis', {
  cvId: 'cv_123',
  duration: 2500,
  success: true
});
\`\`\`

### Authentication

\`\`\`typescript
import { AuthLogger } from '@cvplus/logging/backend';

const authLogger = new AuthLogger('auth-service');

authLogger.loginAttempt('user@example.com', 'oauth', {
  provider: 'google',
  ipAddress: '192.168.1.1'
});

authLogger.loginSuccess('user_123', {
  method: 'oauth',
  duration: 450
});
\`\`\`

### Payments

\`\`\`typescript
import { PaymentLogger } from '@cvplus/logging/backend';

const paymentLogger = new PaymentLogger('payment-service');

paymentLogger.paymentInitiated('pay_123', {
  amount: 99.99,
  currency: 'USD',
  customerId: 'cust_456'
});

paymentLogger.paymentCompleted('pay_123', {
  status: 'succeeded',
  processingTime: 1200
});
\`\`\`

## 6. Configuration

### Environment Variables

Create a \`.env\` file:

\`\`\`bash
# Logging Configuration
LOGGING_LEVEL=info
LOGGING_ENABLE_CONSOLE=true
LOGGING_ENABLE_REMOTE=true
LOGGING_API_ENDPOINT=https://api.cvplus.com/v1/logs
LOGGING_API_KEY=your-api-key-here
LOGGING_BATCH_SIZE=50
LOGGING_FLUSH_INTERVAL=30000

# Performance Settings
LOGGING_MAX_MEMORY=512MB
LOGGING_CACHE_SIZE=10000
LOGGING_ENABLE_PERFORMANCE_TRACKING=true
\`\`\`

### Advanced Configuration

\`\`\`typescript
import { logger } from '@cvplus/logging';

logger.configure({
  level: 'debug',
  outputs: {
    console: { enabled: true, level: 'info' },
    file: { enabled: true, level: 'debug', path: './logs' },
    remote: { enabled: true, level: 'warn', endpoint: '/api/logs' }
  },
  features: {
    piiRedaction: true,
    correlationTracking: true,
    performanceMetrics: true,
    securityEvents: true
  },
  performance: {
    batchSize: 100,
    flushInterval: 15000,
    maxMemoryUsage: '256MB'
  }
});
\`\`\`

## 7. Monitoring & Dashboards

### Real-time Monitoring

Access the logging dashboard at:
\`http://localhost:3000/logging/dashboard\`

### Key Metrics

- **Log Volume**: Total logs processed per time period
- **Error Rate**: Percentage of error-level logs
- **Response Times**: Average API response times
- **Security Events**: Detected threats and anomalies

## 8. Testing

### Unit Tests

\`\`\`typescript
import { logger } from '@cvplus/logging';

// Mock logger for tests
jest.mock('@cvplus/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

test('should log user action', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  // Your test code
  myFunction();

  expect(mockLogger.info).toHaveBeenCalledWith('User action', {
    userId: '123'
  });
});
\`\`\`

## 9. Migration from Legacy

If you're migrating from the old cvplus-logging system:

\`\`\`typescript
import { legacyLog, initializeMigration } from '@cvplus/logging/migration';

// Initialize migration with dual mode
initializeMigration({
  mode: 'dual', // Logs to both old and new systems
  deprecationWarnings: true
});

// Legacy code continues to work
legacyLog('info', 'Legacy log message', {
  component: 'my-component',
  userId: '123'
});
\`\`\`

## 10. Next Steps

- 📚 Read the [API Documentation](./api-reference.md)
- ⚙️ Configure advanced settings in the [Configuration Guide](./configuration.md)
- 🔄 Learn about [Migration Strategies](./migration.md)
- 💡 Explore more [Examples](./examples.md)
- 🔧 Setup monitoring with our [Troubleshooting Guide](./troubleshooting.md)

## Common Issues

### "Module not found" Error
Ensure you've installed the correct package:
\`\`\`bash
npm install @cvplus/logging
\`\`\`

### Logs not appearing in dashboard
Check your API endpoint and authentication:
\`\`\`typescript
logger.configure({
  apiEndpoint: 'https://correct-endpoint.com/api/logs',
  apiKey: 'your-valid-api-key'
});
\`\`\`

### High memory usage
Reduce batch size and enable garbage collection:
\`\`\`typescript
logger.configure({
  performance: {
    batchSize: 25,
    maxMemoryUsage: '128MB',
    enableGC: true
  }
});
\`\`\`

---

Need help? Check our [Troubleshooting Guide](./troubleshooting.md) or contact support.
`;

    fs.writeFileSync(path.join(this.outputDir, 'quick-start.md'), quickStart);
    logger.info('🚀 Generated quick start guide');
  }

  /**
   * Generate API documentation
    */
  private async generateAPIDocumentation(): Promise<void> {
    const apiDocs = await this.extractAPIEndpoints();

    const apiDocumentation = `# API Reference

Complete API reference for the CVPlus Logging System.

## REST API Endpoints

${apiDocs.map(endpoint => this.formatAPIEndpoint(endpoint)).join('\n\n')}

## Client Libraries

### Frontend Logger

#### \`logger.configure(config: LoggingConfig)\`

Configure the frontend logger with the specified settings.

**Parameters:**
- \`config\`: Configuration object with logging settings

**Example:**
\`\`\`typescript
import { logger } from '@cvplus/logging/frontend';

logger.configure({
  level: 'info',
  enableConsole: true,
  enableRemote: true,
  apiEndpoint: '/api/v1/logs'
});
\`\`\`

#### \`logger.info(message: string, context?: any)\`

Log an informational message.

**Parameters:**
- \`message\`: The log message
- \`context\`: Optional context data

**Example:**
\`\`\`typescript
logger.info('User action completed', {
  userId: '123',
  action: 'profile_update'
});
\`\`\`

#### \`logger.error(message: string, error?: Error, context?: any)\`

Log an error message.

**Parameters:**
- \`message\`: The error message
- \`error\`: Optional Error object
- \`context\`: Optional context data

**Example:**
\`\`\`typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error, {
    operation: 'user-update',
    userId: '123'
  });
}
\`\`\`

### Backend Loggers

#### \`FunctionLogger\`

Specialized logger for Firebase Functions and backend services.

**Constructor:**
\`\`\`typescript
const functionLogger = new FunctionLogger(componentName: string);
\`\`\`

**Methods:**

##### \`functionInvoked(functionName: string, context: any)\`

Log function invocation with context.

##### \`functionCompleted(functionName: string, result: any)\`

Log successful function completion.

##### \`functionFailed(functionName: string, error: Error)\`

Log function failure with error details.

##### \`measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T>\`

Measure and log the execution time of an async operation.

### TypeScript Types

#### \`LogLevel\`

\`\`\`typescript
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}
\`\`\`

#### \`LogDomain\`

\`\`\`typescript
enum LogDomain {
  SYSTEM = 'system',
  AUTHENTICATION = 'authentication',
  BUSINESS_LOGIC = 'business_logic',
  API = 'api',
  DATABASE = 'database',
  INTEGRATION = 'integration',
  ANALYTICS = 'analytics',
  SECURITY = 'security'
}
\`\`\`

#### \`LogEntry\`

\`\`\`typescript
interface LogEntry {
  id?: string;
  timestamp: string;
  level: LogLevel;
  domain: LogDomain;
  message: string;
  component?: string;
  service?: string;
  correlationId?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
\`\`\`

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| \`LOG_001\` | Invalid API key | Check your API key configuration |
| \`LOG_002\` | Rate limit exceeded | Reduce logging frequency or upgrade plan |
| \`LOG_003\` | Invalid log format | Ensure logs match expected schema |
| \`LOG_004\` | Storage quota exceeded | Archive old logs or upgrade storage |
| \`LOG_005\` | Network timeout | Check connectivity to logging service |

## Rate Limits

- **Standard Plan**: 1,000 logs/minute
- **Professional Plan**: 10,000 logs/minute
- **Enterprise Plan**: Unlimited

## Authentication

All API requests require authentication via API key:

\`\`\`bash
curl -H "X-API-Key: your-api-key" \\
     -H "Content-Type: application/json" \\
     -d '{"message": "test log"}' \\
     https://api.cvplus.com/v1/logs
\`\`\`

## SDKs and Libraries

- **JavaScript/TypeScript**: \`@cvplus/logging\`
- **Python**: \`cvplus-logging-python\` (coming soon)
- **Java**: \`cvplus-logging-java\` (coming soon)
- **Go**: \`cvplus-logging-go\` (coming soon)

---

*API Reference generated on ${new Date().toISOString()}*
`;

    fs.writeFileSync(path.join(this.outputDir, 'api-reference.md'), apiDocumentation);
    logger.info('📚 Generated API documentation');
  }

  /**
   * Extract API endpoints from source code
    */
  private async extractAPIEndpoints(): Promise<APIEndpoint[]> {
    // This would typically parse the actual API route files
    // For now, return mock data based on what we've implemented
    return [
      {
        method: 'GET',
        path: '/api/v1/logs/query',
        description: 'Query logs with flexible filtering and pagination',
        parameters: [
          { name: 'startTime', type: 'string', required: false, description: 'ISO 8601 timestamp for start of time range' },
          { name: 'endTime', type: 'string', required: false, description: 'ISO 8601 timestamp for end of time range' },
          { name: 'level', type: 'LogLevel[]', required: false, description: 'Filter by log levels' },
          { name: 'limit', type: 'number', required: false, description: 'Maximum number of results (max 1000)' }
        ],
        responses: [
          { status: 200, description: 'Successfully retrieved logs' },
          { status: 400, description: 'Invalid query parameters' },
          { status: 401, description: 'Invalid API key' }
        ],
        examples: [
          {
            title: 'Query recent error logs',
            language: 'bash',
            code: `curl -H "X-API-Key: your-key" \\
  "https://api.cvplus.com/v1/logs/query?level=error&lastHours=24&limit=100"`
          }
        ]
      },
      {
        method: 'POST',
        path: '/api/v1/logs/search',
        description: 'Advanced log search with full-text search capabilities',
        parameters: [
          { name: 'query', type: 'string', required: true, description: 'Search query string' },
          { name: 'searchType', type: 'string', required: false, description: 'Search type: fulltext, fuzzy, wildcard, phrase' },
          { name: 'limit', type: 'number', required: false, description: 'Maximum results to return' }
        ],
        responses: [
          { status: 200, description: 'Search results returned' },
          { status: 400, description: 'Invalid search parameters' }
        ],
        examples: [
          {
            title: 'Search for payment errors',
            language: 'bash',
            code: `curl -X POST -H "X-API-Key: your-key" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "payment failed", "searchType": "phrase"}' \\
  https://api.cvplus.com/v1/logs/search`
          }
        ]
      }
    ];
  }

  /**
   * Format API endpoint documentation
    */
  private formatAPIEndpoint(endpoint: APIEndpoint): string {
    const paramTable = endpoint.parameters.length > 0 ? `
**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
${endpoint.parameters.map(p =>
  `| \`${p.name}\` | \`${p.type}\` | ${p.required ? '✅' : '❌'} | ${p.description} |`
).join('\n')}
` : '';

    const responseTable = `
**Responses:**

| Status | Description |
|--------|-------------|
${endpoint.responses.map(r => `| \`${r.status}\` | ${r.description} |`).join('\n')}
`;

    const examples = endpoint.examples.length > 0 ? `
**Examples:**

${endpoint.examples.map(ex => `
*${ex.title}*
\`\`\`${ex.language}
${ex.code}
\`\`\`
`).join('\n')}
` : '';

    return `### \`${endpoint.method} ${endpoint.path}\`

${endpoint.description}
${paramTable}${responseTable}${examples}`;
  }

  /**
   * Generate configuration documentation
    */
  private async generateConfigurationGuide(): Promise<void> {
    const configGuide = `# Configuration Guide

Comprehensive configuration reference for the CVPlus Logging System.

## Environment Variables

### Core Settings

\`\`\`bash
# Basic Configuration
LOGGING_LEVEL=info                    # Minimum log level to output
LOGGING_ENABLE_CONSOLE=true          # Enable console output
LOGGING_ENABLE_REMOTE=true           # Enable remote logging
LOGGING_API_ENDPOINT=https://api.cvplus.com/v1/logs
LOGGING_API_KEY=your-api-key-here

# Performance Settings
LOGGING_BATCH_SIZE=50                 # Logs per batch
LOGGING_FLUSH_INTERVAL=30000         # Flush interval in milliseconds
LOGGING_MAX_MEMORY=512MB             # Maximum memory usage
LOGGING_CACHE_SIZE=10000             # Cache size for frequent queries

# Feature Flags
LOGGING_PII_REDACTION=true           # Enable PII redaction
LOGGING_CORRELATION_TRACKING=true   # Enable correlation ID tracking
LOGGING_PERFORMANCE_METRICS=true    # Enable performance tracking
LOGGING_SECURITY_EVENTS=true        # Enable security event monitoring
\`\`\`

### Advanced Settings

\`\`\`bash
# Storage Configuration
LOGGING_FILE_PATH=./logs             # File output directory
LOGGING_FILE_MAX_SIZE=100MB          # Maximum file size before rotation
LOGGING_FILE_MAX_FILES=10            # Number of rotated files to keep
LOGGING_RETENTION_DAYS=30            # Log retention period

# Database Settings
LOGGING_DB_CONNECTION_STRING=mongodb://localhost:27017/logs
LOGGING_DB_MAX_CONNECTIONS=10        # Maximum database connections
LOGGING_DB_TIMEOUT=5000              # Connection timeout in milliseconds

# Real-time Features
LOGGING_STREAM_ENABLED=true          # Enable real-time streaming
LOGGING_STREAM_MAX_CONNECTIONS=100   # Maximum concurrent stream connections
LOGGING_STREAM_HEARTBEAT_INTERVAL=30 # Heartbeat interval in seconds

# Security Settings
LOGGING_ENCRYPT_LOGS=true            # Encrypt stored logs
LOGGING_ENCRYPTION_KEY=your-key      # Encryption key for log data
LOGGING_ACCESS_LOG=true              # Log access to logging system
LOGGING_AUDIT_TRAIL=true             # Maintain audit trail
\`\`\`

## Configuration Files

### Frontend Configuration

Create \`logging.config.json\` in your project root:

\`\`\`json
{
  "level": "info",
  "outputs": {
    "console": {
      "enabled": true,
      "level": "debug",
      "format": "pretty"
    },
    "remote": {
      "enabled": true,
      "level": "info",
      "endpoint": "/api/v1/logs",
      "batchSize": 25,
      "flushInterval": 15000
    }
  },
  "features": {
    "piiRedaction": true,
    "correlationTracking": true,
    "userTracking": true,
    "performanceMetrics": false
  },
  "filters": {
    "excludePatterns": ["debug-info", "temp-data"],
    "includeComponents": ["auth", "payment", "cv-processing"]
  }
}
\`\`\`

### Backend Configuration

Create \`logging.backend.json\`:

\`\`\`json
{
  "level": "debug",
  "outputs": {
    "console": {
      "enabled": true,
      "level": "info",
      "format": "json"
    },
    "file": {
      "enabled": true,
      "level": "debug",
      "path": "./logs",
      "maxSize": "100MB",
      "maxFiles": 10,
      "rotationInterval": "daily"
    },
    "database": {
      "enabled": true,
      "level": "warn",
      "connectionString": "mongodb://localhost:27017/logs",
      "collection": "application_logs"
    }
  },
  "specializedLoggers": {
    "function": {
      "enableMetrics": true,
      "trackMemoryUsage": true,
      "trackExecutionTime": true
    },
    "security": {
      "enableThreatDetection": true,
      "alertThresholds": {
        "failedLogins": 5,
        "suspiciousPatterns": 3
      }
    },
    "performance": {
      "slowQueryThreshold": 1000,
      "enableProfiling": true,
      "trackResourceUsage": true
    }
  }
}
\`\`\`

## Programmatic Configuration

### Frontend Configuration

\`\`\`typescript
import { logger } from '@cvplus/logging/frontend';

logger.configure({
  level: 'info',
  outputs: {
    console: {
      enabled: process.env.NODE_ENV === 'development',
      level: 'debug',
      format: 'pretty'
    },
    remote: {
      enabled: true,
      level: 'info',
      endpoint: process.env.REACT_APP_LOGGING_ENDPOINT,
      apiKey: process.env.REACT_APP_LOGGING_API_KEY,
      batchSize: 50,
      flushInterval: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    }
  },
  features: {
    piiRedaction: true,
    correlationTracking: true,
    userTracking: true,
    errorBoundaryIntegration: true,
    performanceMetrics: process.env.NODE_ENV === 'production'
  },
  performance: {
    maxMemoryUsage: '128MB',
    cacheSize: 1000,
    enableGarbageCollection: true
  }
});
\`\`\`

### Backend Configuration

\`\`\`typescript
import { FunctionLogger } from '@cvplus/logging/backend';

const logger = new FunctionLogger('my-service');

logger.configure({
  level: 'debug',
  defaultContext: {
    service: 'user-management',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV
  },
  outputs: {
    console: {
      enabled: true,
      format: process.env.NODE_ENV === 'development' ? 'pretty' : 'json'
    },
    file: {
      enabled: process.env.NODE_ENV === 'production',
      path: process.env.LOG_FILE_PATH || './logs',
      rotation: 'daily',
      maxSize: '100MB'
    }
  },
  features: {
    correlationTracking: true,
    performanceMetrics: true,
    securityEvents: true,
    functionMetrics: true
  }
});
\`\`\`

## Configuration Validation

The logging system includes built-in configuration validation:

\`\`\`typescript
import { validateConfig } from '@cvplus/logging/config';

const config = {
  level: 'info',
  outputs: {
    console: { enabled: true }
  }
};

const validation = validateConfig(config);
if (!validation.isValid) {
  logger.error('Configuration errors:', validation.errors);
} else {
  logger.configure(config);
}
\`\`\`

## Environment-Specific Configurations

### Development

\`\`\`typescript
const developmentConfig = {
  level: 'debug',
  outputs: {
    console: { enabled: true, format: 'pretty' },
    remote: { enabled: false }
  },
  features: {
    piiRedaction: false,
    performanceMetrics: true
  }
};
\`\`\`

### Staging

\`\`\`typescript
const stagingConfig = {
  level: 'info',
  outputs: {
    console: { enabled: true, format: 'json' },
    remote: { enabled: true, batchSize: 25 },
    file: { enabled: true, path: './logs' }
  },
  features: {
    piiRedaction: true,
    performanceMetrics: true,
    securityEvents: true
  }
};
\`\`\`

### Production

\`\`\`typescript
const productionConfig = {
  level: 'warn',
  outputs: {
    console: { enabled: false },
    remote: { enabled: true, batchSize: 100 },
    database: { enabled: true }
  },
  features: {
    piiRedaction: true,
    performanceMetrics: true,
    securityEvents: true,
    encryptLogs: true
  },
  performance: {
    maxMemoryUsage: '256MB',
    enableOptimization: true
  }
};
\`\`\`

## Migration Configuration

When migrating from legacy logging:

\`\`\`typescript
import { initializeMigration } from '@cvplus/logging/migration';

initializeMigration({
  enabled: true,
  mode: 'dual',                    // 'dual', 'new-only', 'legacy-only'
  deprecationWarnings: true,
  validationEnabled: true,
  fallbackToLegacy: true,
  migrationMetrics: true
});
\`\`\`

## Configuration Best Practices

### 1. Use Environment Variables
- Store sensitive data in environment variables
- Use different configurations per environment
- Never commit API keys or secrets

### 2. Start Conservative
- Begin with higher log levels in production
- Enable detailed logging gradually
- Monitor performance impact

### 3. Enable Security Features
- Always enable PII redaction in production
- Use encryption for sensitive logs
- Enable audit trails for compliance

### 4. Monitor Performance
- Set appropriate batch sizes
- Configure memory limits
- Enable garbage collection

### 5. Plan for Scale
- Use database storage for high volume
- Enable log rotation and retention
- Consider log archival strategies

---

For troubleshooting configuration issues, see the [Troubleshooting Guide](./troubleshooting.md).
`;

    fs.writeFileSync(path.join(this.outputDir, 'configuration.md'), configGuide);
    logger.info('⚙️ Generated configuration guide');
  }

  /**
   * Generate migration guide
    */
  private async generateMigrationGuide(): Promise<void> {
    const migrationGuide = `# Migration Guide

Complete guide for migrating to the CVPlus Logging System from legacy implementations.

## Overview

The CVPlus Logging System provides comprehensive migration tools to help you transition from existing logging implementations with minimal disruption.

## Migration Strategies

### 1. Dual Mode Migration (Recommended)

Run both old and new logging systems simultaneously:

\`\`\`typescript
import { initializeMigration } from '@cvplus/logging/migration';

// Initialize dual mode migration
initializeMigration({
  mode: 'dual',                    // Log to both systems
  deprecationWarnings: true,       // Show deprecation warnings
  validationEnabled: true,         // Validate logs during migration
  fallbackToLegacy: true,         // Fall back if new system fails
  migrationMetrics: true          // Track migration progress
});
\`\`\`

### 2. Gradual Migration

Migrate component by component:

\`\`\`typescript
// Phase 1: Critical components
import { FunctionLogger } from '@cvplus/logging/backend';
const paymentLogger = new FunctionLogger('payment-service');

// Phase 2: High-traffic components
const authLogger = new FunctionLogger('auth-service');

// Phase 3: All remaining components
const cvLogger = new FunctionLogger('cv-processing');
\`\`\`

### 3. Big Bang Migration

Complete migration at once (for smaller codebases):

\`\`\`typescript
initializeMigration({
  mode: 'new-only',
  validationEnabled: true
});
\`\`\`

## Migration from cvplus-logging.ts

### Step 1: Install New Package

\`\`\`bash
npm install @cvplus/logging
\`\`\`

### Step 2: Initialize Migration

\`\`\`typescript
// At application startup
import { initializeMigration } from '@cvplus/logging/migration';

initializeMigration({
  mode: 'dual',
  deprecationWarnings: true
});
\`\`\`

### Step 3: Legacy Code Continues Working

Your existing code continues to work unchanged:

\`\`\`typescript
// Legacy code - still works!
import { legacyLog } from './utils/cvplus-logging';

legacyLog('info', 'User logged in', {
  userId: '123',
  component: 'auth'
});
\`\`\`

### Step 4: Gradually Update Code

Update components to use the new API:

\`\`\`typescript
// Old way
legacyLog('error', 'Payment failed', {
  error: error.message,
  userId: '123',
  component: 'payment'
});

// New way
import { PaymentLogger } from '@cvplus/logging/backend';
const paymentLogger = new PaymentLogger('payment-service');

paymentLogger.paymentFailed('pay_123', error, {
  userId: '123',
  amount: 99.99
});
\`\`\`

### Step 5: Monitor Migration Progress

Check migration statistics:

\`\`\`typescript
import { getMigrator } from '@cvplus/logging/migration';

const migrator = getMigrator();
const stats = migrator?.getStats();

logger.info('Migration Progress:', {
  totalCalls: stats?.totalCalls,
  migrationRate: stats?.migrationRate,
  errorRate: stats?.errorRate
});
\`\`\`

### Step 6: Switch to New-Only Mode

Once migration is complete:

\`\`\`typescript
migrator?.updateConfig({
  mode: 'new-only',
  deprecationWarnings: false
});
\`\`\`

## Component-by-Component Migration

### Authentication Services

\`\`\`typescript
// Before
legacyLog('info', 'Login attempt', {
  email: 'user@example.com',
  component: 'auth'
});

// After
import { AuthLogger } from '@cvplus/logging/backend';
const authLogger = new AuthLogger('auth-service');

authLogger.loginAttempt('user@example.com', 'password', {
  ipAddress: '192.168.1.1',
  userAgent: req.headers['user-agent']
});
\`\`\`

### CV Processing

\`\`\`typescript
// Before
legacyLog('info', 'CV processing started', {
  cvId: 'cv_123',
  component: 'cv-processor'
});

// After
import { ProcessingLogger } from '@cvplus/logging/backend';
const cvLogger = new ProcessingLogger('cv-processor');

cvLogger.processingStarted('cv-analysis', {
  cvId: 'cv_123',
  features: ['ats-optimization', 'personality-insights']
});
\`\`\`

### Payment Processing

\`\`\`typescript
// Before
legacyLog('info', 'Payment processed', {
  paymentId: 'pay_123',
  amount: 99.99,
  component: 'payment'
});

// After
import { PaymentLogger } from '@cvplus/logging/backend';
const paymentLogger = new PaymentLogger('payment-service');

paymentLogger.paymentCompleted('pay_123', {
  amount: 99.99,
  currency: 'USD',
  processingTime: 1200
});
\`\`\`

### Frontend Components

\`\`\`typescript
// Before
legacyLog('info', 'User action', {
  action: 'button_click',
  component: 'frontend'
});

// After
import { logger } from '@cvplus/logging/frontend';

logger.trackAction('button_click', 'navigation', {
  buttonId: 'submit-form',
  page: '/profile'
});
\`\`\`

## Migration Validation

### Automated Testing

\`\`\`typescript
import { validateMigrationProgress } from '@cvplus/logging/migration';

const validation = validateMigrationProgress();

if (!validation.isComplete) {
  logger.info('Migration not complete:');
  validation.warnings.forEach(warning => logger.warn(warning));
  validation.recommendations.forEach(rec => logger.info('📋', rec));
}
\`\`\`

### Manual Verification

1. **Check Migration Statistics**
   \`\`\`typescript
   const stats = getMigrator()?.getStats();
   logger.info(\`Migration rate: \${stats?.migrationRate}%\`);
   \`\`\`

2. **Verify Log Output**
   - Check that logs appear in new dashboard
   - Verify correlation IDs are working
   - Test error reporting

3. **Performance Testing**
   - Monitor memory usage
   - Check log processing times
   - Verify batch processing

## Common Migration Issues

### Issue: Logs Not Appearing

**Cause**: Configuration mismatch
**Solution**:
\`\`\`typescript
// Verify configuration
logger.configure({
  apiEndpoint: 'https://correct-endpoint.com/api/logs',
  apiKey: 'valid-api-key'
});
\`\`\`

### Issue: High Memory Usage

**Cause**: Large batch sizes in dual mode
**Solution**:
\`\`\`typescript
initializeMigration({
  mode: 'dual',
  performance: {
    batchSize: 25,  // Reduced from default
    maxMemoryUsage: '128MB'
  }
});
\`\`\`

### Issue: Legacy Code Breaking

**Cause**: Missing legacy compatibility layer
**Solution**:
\`\`\`typescript
// Ensure legacy wrapper is imported
import '@cvplus/logging/migration';
\`\`\`

## Migration Checklist

### Pre-Migration
- [ ] Install @cvplus/logging package
- [ ] Set up development environment
- [ ] Configure API endpoints
- [ ] Set up monitoring dashboard

### During Migration
- [ ] Initialize migration in dual mode
- [ ] Update critical components first
- [ ] Monitor migration statistics
- [ ] Test each migrated component
- [ ] Verify log output and dashboards

### Post-Migration
- [ ] Switch to new-only mode
- [ ] Remove legacy logging dependencies
- [ ] Update documentation
- [ ] Train team on new logging features
- [ ] Set up alerts and monitoring

## Migration Timeline

### Week 1: Setup and Planning
- Install new logging system
- Configure development environment
- Create migration plan

### Week 2-4: Component Migration
- Migrate critical components (auth, payments)
- Update high-traffic components
- Test thoroughly

### Week 5: Validation and Testing
- Run comprehensive tests
- Validate migration statistics
- Performance testing

### Week 6: Production Migration
- Deploy to production
- Monitor closely
- Switch to new-only mode

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**
   \`\`\`typescript
   migrator?.updateConfig({ mode: 'legacy-only' });
   \`\`\`

2. **Selective Rollback**
   \`\`\`typescript
   // Rollback specific components
   const problematicComponents = ['payment-service'];
   migrator?.rollbackComponents(problematicComponents);
   \`\`\`

3. **Full Rollback**
   - Revert to previous deployment
   - Remove new logging package
   - Restore legacy configuration

## Support During Migration

- 📧 **Migration Support**: migration@cvplus.com
- 📞 **Emergency Hotline**: Available during business hours
- 💬 **Slack Channel**: #logging-migration
- 📖 **Documentation**: Always up-to-date migration guides

---

Need help with migration? Contact our migration support team.
`;

    fs.writeFileSync(path.join(this.outputDir, 'migration.md'), migrationGuide);
    logger.info('🔄 Generated migration guide');
  }

  /**
   * Generate troubleshooting documentation
    */
  private async generateTroubleshooting(): Promise<void> {
    const troubleshooting = `# Troubleshooting Guide

Common issues and solutions for the CVPlus Logging System.

## Quick Diagnostics

Run the built-in diagnostic tool:

\`\`\`typescript
import { runDiagnostics } from '@cvplus/logging/diagnostics';

const results = await runDiagnostics();
logger.info('Diagnostic Results:', results);
\`\`\`

## Common Issues

### 1. Logs Not Appearing

**Symptoms:**
- Logs don't show in dashboard
- API calls return 200 but no data
- Console logs work but remote doesn't

**Troubleshooting Steps:**

1. **Check Configuration**
   \`\`\`typescript
   import { logger } from '@cvplus/logging';

   // Verify config
   logger.info('Logger config:', logger.getConfig());
   \`\`\`

2. **Test API Connectivity**
   \`\`\`bash
   curl -H "X-API-Key: your-key" https://api.cvplus.com/v1/logs/health
   \`\`\`

3. **Check API Key**
   \`\`\`typescript
   logger.configure({
     apiKey: 'your-correct-api-key',
     apiEndpoint: 'https://api.cvplus.com/v1/logs'
   });
   \`\`\`

4. **Verify Network**
   - Check firewall settings
   - Verify DNS resolution
   - Test from different network

**Solutions:**
- Update API endpoint URL
- Regenerate API key
- Check CORS configuration
- Enable debug logging

### 2. High Memory Usage

**Symptoms:**
- Application memory keeps growing
- Out of memory errors
- Slow performance

**Troubleshooting Steps:**

1. **Check Batch Settings**
   \`\`\`typescript
   logger.configure({
     performance: {
       batchSize: 25,        // Reduce from default 50
       flushInterval: 15000, // Flush more frequently
       maxMemoryUsage: '128MB'
     }
   });
   \`\`\`

2. **Monitor Memory Usage**
   \`\`\`typescript
   import { getPerformanceMetrics } from '@cvplus/logging/metrics';

   const metrics = getPerformanceMetrics();
   logger.info('Memory usage:', metrics.memoryUsage);
   \`\`\`

3. **Enable Garbage Collection**
   \`\`\`typescript
   logger.configure({
     performance: {
       enableGarbageCollection: true,
       gcThreshold: 80 // Trigger GC at 80% memory usage
     }
   });
   \`\`\`

**Solutions:**
- Reduce batch sizes
- Increase flush frequency
- Enable automatic GC
- Implement log sampling

### 3. Authentication Failures

**Symptoms:**
- 401 Unauthorized errors
- API key rejected
- Access denied messages

**Troubleshooting Steps:**

1. **Verify API Key Format**
   \`\`\`typescript
   // Correct format
   const apiKey = 'cvp_live_1234567890abcdef';

   // Check key length and prefix
   if (!apiKey.startsWith('cvp_')) {
     logger.error('Invalid API key format');
   }
   \`\`\`

2. **Check Key Permissions**
   \`\`\`bash
   curl -H "X-API-Key: your-key" \\
        -H "Content-Type: application/json" \\
        https://api.cvplus.com/v1/logs/permissions
   \`\`\`

3. **Test with Different Key**
   - Generate new API key
   - Test with admin key
   - Check key expiration

**Solutions:**
- Regenerate API key
- Update key in all environments
- Check key permissions
- Verify account status

### 4. Performance Issues

**Symptoms:**
- Slow log processing
- High response times
- Application lag

**Troubleshooting Steps:**

1. **Check Processing Times**
   \`\`\`typescript
   import { getPerformanceMetrics } from '@cvplus/logging/metrics';

   const metrics = getPerformanceMetrics();
   if (metrics.averageProcessingTime > 1000) {
     logger.warn('Slow log processing detected');
   }
   \`\`\`

2. **Optimize Configuration**
   \`\`\`typescript
   logger.configure({
     performance: {
       batchSize: 100,           // Increase batch size
       enableOptimization: true, // Enable performance optimization
       cacheSize: 5000,         // Increase cache
       enableCompression: true   // Enable compression
     }
   });
   \`\`\`

3. **Monitor System Resources**
   - Check CPU usage
   - Monitor memory usage
   - Verify network bandwidth

**Solutions:**
- Increase batch sizes
- Enable caching
- Use compression
- Implement async logging

### 5. Migration Issues

**Symptoms:**
- Legacy logs not migrating
- Duplicate logs
- Migration errors

**Troubleshooting Steps:**

1. **Check Migration Status**
   \`\`\`typescript
   import { getMigrator } from '@cvplus/logging/migration';

   const stats = getMigrator()?.getStats();
   logger.info('Migration rate:', stats?.migrationRate);
   \`\`\`

2. **Verify Configuration**
   \`\`\`typescript
   import { validateMigrationProgress } from '@cvplus/logging/migration';

   const validation = validateMigrationProgress();
   validation.warnings.forEach(warning => logger.warn(warning));
   \`\`\`

3. **Test Individual Components**
   \`\`\`typescript
   // Test legacy wrapper
   import { legacyLog } from '@cvplus/logging/migration';

   legacyLog('info', 'Test message', { component: 'test' });
   \`\`\`

**Solutions:**
- Reset migration state
- Switch to dual mode
- Update component mappings
- Check legacy compatibility

## Error Codes Reference

### LOG_001: Invalid API Key
**Cause**: API key is malformed or invalid
**Solution**: Check API key format and regenerate if needed

### LOG_002: Rate Limit Exceeded
**Cause**: Too many requests in short period
**Solution**: Reduce logging frequency or upgrade plan

### LOG_003: Invalid Log Format
**Cause**: Log entry doesn't match expected schema
**Solution**: Validate log structure and fix formatting

### LOG_004: Storage Quota Exceeded
**Cause**: Storage limit reached
**Solution**: Archive old logs or upgrade storage plan

### LOG_005: Network Timeout
**Cause**: Network connectivity issues
**Solution**: Check network connection and retry

### LOG_006: Configuration Error
**Cause**: Invalid configuration parameters
**Solution**: Validate configuration and fix errors

### LOG_007: Migration Error
**Cause**: Error during legacy migration
**Solution**: Check migration configuration and retry

## Debugging Tools

### Enable Debug Logging

\`\`\`typescript
logger.configure({
  level: 'debug',
  outputs: {
    console: {
      enabled: true,
      level: 'debug',
      format: 'pretty'
    }
  }
});
\`\`\`

### Log Inspector

\`\`\`typescript
import { logInspector } from '@cvplus/logging/debug';

// Inspect log entry
logInspector.inspect(logEntry);

// Validate log structure
const isValid = logInspector.validate(logEntry);
\`\`\`

### Performance Profiler

\`\`\`typescript
import { startProfiler } from '@cvplus/logging/profiler';

const profiler = startProfiler();
// ... your code ...
const results = profiler.stop();
logger.info('Performance profile:', results);
\`\`\`

## Performance Optimization

### 1. Batch Optimization

\`\`\`typescript
// Optimal batch sizes for different scenarios
const configs = {
  lowVolume: { batchSize: 10, flushInterval: 60000 },
  mediumVolume: { batchSize: 50, flushInterval: 30000 },
  highVolume: { batchSize: 200, flushInterval: 10000 }
};
\`\`\`

### 2. Memory Management

\`\`\`typescript
logger.configure({
  performance: {
    maxMemoryUsage: '256MB',
    enableGarbageCollection: true,
    cacheSize: 1000,
    cacheTtl: 300000 // 5 minutes
  }
});
\`\`\`

### 3. Network Optimization

\`\`\`typescript
logger.configure({
  outputs: {
    remote: {
      enableCompression: true,
      connectionTimeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    }
  }
});
\`\`\`

## Monitoring and Alerts

### Set Up Monitoring

\`\`\`typescript
import { setupMonitoring } from '@cvplus/logging/monitoring';

setupMonitoring({
  alertThresholds: {
    errorRate: 5,        // Alert if error rate > 5%
    memoryUsage: 80,     // Alert if memory > 80%
    responseTime: 2000   // Alert if response time > 2s
  },
  notifications: {
    email: ['admin@cvplus.com'],
    slack: '#alerts'
  }
});
\`\`\`

### Health Checks

\`\`\`typescript
import { healthCheck } from '@cvplus/logging/health';

const health = await healthCheck();
if (!health.healthy) {
  logger.error('Logging system unhealthy:', health.issues);
}
\`\`\`

## Support and Resources

### Getting Help

1. **Documentation**: Check this guide first
2. **Debug Tools**: Use built-in diagnostics
3. **Community**: Search GitHub discussions
4. **Support**: Contact support team

### Contact Information

- 📧 **Technical Support**: support@cvplus.com
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/cvplus/logging/issues)
- 💬 **Community**: [GitHub Discussions](https://github.com/cvplus/logging/discussions)
- 📞 **Emergency**: Available for enterprise customers

### Useful Commands

\`\`\`bash
# Test API connectivity
curl -H "X-API-Key: your-key" https://api.cvplus.com/v1/logs/health

# Check configuration
npm run logging:config

# Run diagnostics
npm run logging:diagnose

# Export logs
npm run logging:export

# Clear cache
npm run logging:clear-cache
\`\`\`

---

**Still having issues?** Contact our support team with:
- Detailed error description
- Configuration details
- Log samples (with PII removed)
- System information (OS, Node.js version, etc.)
`;

    fs.writeFileSync(path.join(this.outputDir, 'troubleshooting.md'), troubleshooting);
    logger.info('🔧 Generated troubleshooting guide');
  }

  /**
   * Generate examples documentation
    */
  private async generateExamples(): Promise<void> {
    const examples = `# Examples

Practical examples and code samples for the CVPlus Logging System.

## Basic Usage Examples

### Frontend Logging

#### React Component Logging

\`\`\`typescript
import React, { useEffect } from 'react';
import { logger } from '@cvplus/logging/frontend';

const UserProfile: React.FC = () => {
  useEffect(() => {
    logger.trackPageView('user-profile', {
      userId: '123',
      timestamp: new Date().toISOString()
    });
  }, []);

  const handleProfileUpdate = async (data: any) => {
    try {
      logger.info('Profile update started', {
        userId: '123',
        fields: Object.keys(data)
      });

      const result = await updateProfile(data);

      logger.info('Profile update completed', {
        userId: '123',
        updateId: result.id,
        duration: result.processingTime
      });

    } catch (error) {
      logger.error('Profile update failed', error, {
        userId: '123',
        operation: 'profile-update',
        data: data // Note: PII will be automatically redacted
      });
    }
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
\`\`\`

#### Error Boundary Integration

\`\`\`typescript
import React from 'react';
import { ErrorBoundary } from '@cvplus/logging/frontend';

const App: React.FC = () => {
  return (
    <ErrorBoundary
      componentName="App"
      enableDetailedLogging={true}
      onError={(error, errorInfo) => {
        // Custom error handling
        logger.info('Error caught by boundary:', error);
      }}
    >
      <UserProfile />
      <PaymentForm />
    </ErrorBoundary>
  );
};
\`\`\`

### Backend Logging

#### Firebase Function Logging

\`\`\`typescript
import { FunctionLogger } from '@cvplus/logging/backend';
import { https } from 'firebase-functions';

const functionLogger = new FunctionLogger('cv-processing');

export const processCV = https.onCall(async (data, context) => {
  const correlationId = \`req_\${Date.now()}\`;

  functionLogger.setCorrelationId(correlationId);
  functionLogger.setUserContext({
    userId: context.auth?.uid,
    email: context.auth?.token.email
  });

  functionLogger.functionInvoked('processCV', {
    cvId: data.cvId,
    features: data.requestedFeatures,
    priority: data.priority || 'normal'
  });

  try {
    const startTime = Date.now();

    // Process CV
    const result = await functionLogger.measureAsync('cv-analysis', async () => {
      return await analyzeCV(data.cvData);
    });

    functionLogger.functionCompleted('processCV', {
      cvId: data.cvId,
      processingTime: Date.now() - startTime,
      success: true,
      resultSize: JSON.stringify(result).length
    });

    return { success: true, data: result };

  } catch (error) {
    functionLogger.functionFailed('processCV', error as Error, {
      cvId: data.cvId,
      stage: 'analysis',
      retryable: isRetryableError(error)
    });

    throw new https.HttpsError('internal', 'CV processing failed');
  }
});
\`\`\`

#### Express.js Middleware

\`\`\`typescript
import express from 'express';
import { initializeLogging, finalizeLogging } from '@cvplus/logging/middleware';

const app = express();

// Initialize logging for all requests
app.use(initializeLogging('api-server'));

// Your routes
app.post('/api/users', async (req, res) => {
  const logger = req.logger; // Injected by middleware

  logger.logInfo('User creation request', {
    endpoint: '/api/users',
    method: 'POST',
    userAgent: req.headers['user-agent']
  });

  try {
    const user = await createUser(req.body);

    logger.logInfo('User created successfully', {
      userId: user.id,
      email: user.email // PII will be redacted automatically
    });

    res.json({ success: true, userId: user.id });

  } catch (error) {
    logger.logError('User creation failed', error, {
      requestBody: req.body,
      validationErrors: error.validationErrors
    });

    res.status(400).json({ error: 'User creation failed' });
  }
});

// Finalize logging for all requests
app.use(finalizeLogging());
\`\`\`

## Specialized Logger Examples

### Authentication Logging

\`\`\`typescript
import { AuthLogger } from '@cvplus/logging/backend';

const authLogger = new AuthLogger('auth-service');

// Login attempt
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  authLogger.loginAttempt(email, 'password', {
    ipAddress,
    userAgent,
    timestamp: new Date().toISOString()
  });

  try {
    const user = await authenticateUser(email, password);

    authLogger.loginSuccess(user.id, {
      method: 'password',
      ipAddress,
      duration: Date.now() - startTime,
      previousLogin: user.lastLoginAt
    });

    res.json({ token: generateToken(user) });

  } catch (error) {
    authLogger.loginFailure(email, 'password', {
      reason: error.message,
      ipAddress,
      userAgent,
      attemptNumber: await getAttemptNumber(email)
    });

    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Session management
authLogger.sessionCreated('session_123', {
  userId: 'user_456',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  deviceInfo: {
    type: 'mobile',
    os: 'iOS',
    browser: 'Safari'
  }
});
\`\`\`

### Payment Processing Logging

\`\`\`typescript
import { PaymentLogger } from '@cvplus/logging/backend';

const paymentLogger = new PaymentLogger('payment-service');

// Payment processing
export const processPayment = async (paymentData: any) => {
  const paymentId = \`pay_\${Date.now()}\`;

  paymentLogger.paymentInitiated(paymentId, {
    amount: paymentData.amount,
    currency: paymentData.currency,
    customerId: paymentData.customerId,
    paymentMethod: paymentData.method,
    subscriptionId: paymentData.subscriptionId
  });

  try {
    // Process with Stripe
    const startTime = Date.now();
    const charge = await stripe.charges.create({
      amount: paymentData.amount * 100,
      currency: paymentData.currency,
      customer: paymentData.customerId,
      description: paymentData.description
    });

    paymentLogger.paymentCompleted(paymentId, {
      status: 'succeeded',
      processingTime: Date.now() - startTime,
      providerTransactionId: charge.id,
      fees: charge.application_fee_amount || 0
    });

    return { success: true, paymentId, chargeId: charge.id };

  } catch (error) {
    paymentLogger.paymentFailed(paymentId, error as Error, {
      provider: 'stripe',
      errorCode: error.code,
      declineCode: error.decline_code,
      retryable: isRetryablePaymentError(error)
    });

    throw error;
  }
};

// Subscription events
paymentLogger.subscriptionCreated('sub_123', {
  customerId: 'cust_456',
  plan: 'premium-monthly',
  amount: 29.99,
  trial: false
});

paymentLogger.subscriptionCanceled('sub_123', {
  reason: 'user_requested',
  canceledAt: new Date().toISOString(),
  refundAmount: 0
});
\`\`\`

### CV Processing Logging

\`\`\`typescript
import { ProcessingLogger } from '@cvplus/logging/backend';

const cvLogger = new ProcessingLogger('cv-processor');

export const enhanceCV = async (cvData: any, options: any) => {
  const jobId = \`job_\${Date.now()}\`;

  cvLogger.processingStarted('cv-enhancement', {
    jobId,
    cvId: cvData.id,
    userId: cvData.userId,
    features: options.features,
    priority: options.priority || 'normal',
    estimatedDuration: estimateProcessingTime(options.features)
  });

  try {
    const results: any = {};

    // ATS Optimization
    if (options.features.includes('ats-optimization')) {
      const atsResult = await cvLogger.measureAsync('ats-optimization', async () => {
        return await optimizeForATS(cvData);
      });
      results.ats = atsResult;

      cvLogger.stepCompleted('cv-enhancement', 'ats-optimization', {
        jobId,
        score: atsResult.score,
        improvements: atsResult.improvements.length
      });
    }

    // Personality Insights
    if (options.features.includes('personality-insights')) {
      const personalityResult = await cvLogger.measureAsync('personality-analysis', async () => {
        return await analyzePersonality(cvData);
      });
      results.personality = personalityResult;

      cvLogger.stepCompleted('cv-enhancement', 'personality-analysis', {
        jobId,
        traits: Object.keys(personalityResult.traits),
        confidence: personalityResult.confidence
      });
    }

    cvLogger.processingCompleted('cv-enhancement', {
      jobId,
      cvId: cvData.id,
      success: true,
      featuresProcessed: options.features,
      totalProcessingTime: Date.now() - startTime,
      resultSize: JSON.stringify(results).length
    });

    return results;

  } catch (error) {
    cvLogger.processingFailed('cv-enhancement', error as Error, {
      jobId,
      cvId: cvData.id,
      stage: getCurrentStage(),
      retryable: isRetryableError(error),
      partialResults: Object.keys(results || {})
    });

    throw error;
  }
};
\`\`\`

## Advanced Features

### Performance Monitoring

\`\`\`typescript
import { logger, PerformanceCollector } from '@cvplus/logging';

const performanceCollector = new PerformanceCollector();

// Monitor API endpoint performance
app.use('/api', (req, res, next) => {
  const timerId = performanceCollector.startTimer('api_request', {
    endpoint: req.path,
    method: req.method
  });

  res.on('finish', () => {
    const metric = performanceCollector.stopTimer(timerId);

    if (metric && metric.value > 2000) { // > 2 seconds
      logger.warn('Slow API request detected', {
        endpoint: req.path,
        method: req.method,
        duration: metric.value,
        statusCode: res.statusCode
      });
    }
  });

  next();
});

// Custom performance metrics
const processLargeFile = async (file: any) => {
  const timer = performanceCollector.startTimer('file_processing', {
    fileSize: file.size,
    fileType: file.type
  });

  try {
    const result = await processFile(file);

    const metric = performanceCollector.stopTimer(timer);
    logger.info('File processed successfully', {
      fileName: file.name,
      processingTime: metric?.value,
      throughput: file.size / (metric?.value || 1) * 1000 // bytes per second
    });

    return result;
  } catch (error) {
    performanceCollector.stopTimer(timer);
    throw error;
  }
};
\`\`\`

### Security Event Monitoring

\`\`\`typescript
import { SecurityLogger } from '@cvplus/logging/backend';

const securityLogger = new SecurityLogger('security-monitor');

// Monitor failed login attempts
const monitorLoginAttempts = async (email: string, ipAddress: string) => {
  const recentAttempts = await getRecentFailedAttempts(email, ipAddress);

  if (recentAttempts.length > 5) {
    securityLogger.threatDetected('brute_force_attack', 'high', {
      targetEmail: email,
      sourceIp: ipAddress,
      attemptCount: recentAttempts.length,
      timeWindow: '15 minutes',
      recommendation: 'temporary_ip_ban'
    });

    // Trigger security response
    await blockIpAddress(ipAddress, '1 hour');
  }
};

// Monitor suspicious patterns
app.use((req, res, next) => {
  const suspiciousPatterns = [
    /\\/wp-admin/,
    /\\.env/,
    /sql.*injection/i,
    /<script.*>/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(req.path) || pattern.test(req.query.toString())
  );

  if (isSuspicious) {
    securityLogger.threatDetected('suspicious_request', 'medium', {
      path: req.path,
      query: req.query,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      patternMatched: true
    });
  }

  next();
});
\`\`\`

### Real-time Log Streaming

\`\`\`typescript
import { useLogStream } from '@cvplus/logging/frontend';

const LogMonitoringComponent: React.FC = () => {
  const {
    logs,
    isConnected,
    error,
    connect,
    disconnect
  } = useLogStream({
    level: ['error', 'fatal'],
    component: ['payment-service', 'auth-service'],
    onlyErrors: true,
    includeContext: true
  });

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {error && <div>Error: {error}</div>}

      <div>Real-time Logs:</div>
      {logs.map(log => (
        <div key={log.id} style={{
          background: log.level === 'error' ? '#fee' : '#fff',
          padding: '10px',
          margin: '5px',
          border: '1px solid #ccc'
        }}>
          <strong>{log.level.toUpperCase()}</strong>: {log.message}
          <br />
          <small>{new Date(log.timestamp).toLocaleString()}</small>
          {log.context && (
            <pre>{JSON.stringify(log.context, null, 2)}</pre>
          )}
        </div>
      ))}
    </div>
  );
};
\`\`\`

### Custom Log Formatters

\`\`\`typescript
import { logger, createCustomFormatter } from '@cvplus/logging';

// Custom JSON formatter
const customJsonFormatter = createCustomFormatter({
  format: 'json',
  includeTimestamp: true,
  includeLevel: true,
  customFields: {
    service: 'my-service',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV
  },
  transform: (logEntry) => ({
    ...logEntry,
    '@timestamp': logEntry.timestamp,
    '@level': logEntry.level.toUpperCase(),
    '@service': 'my-service'
  })
});

// Custom pretty formatter for development
const prettyFormatter = createCustomFormatter({
  format: 'pretty',
  colorize: true,
  template: '[{timestamp}] {level} {component}: {message} {context}'
});

logger.configure({
  outputs: {
    console: {
      enabled: true,
      formatter: process.env.NODE_ENV === 'development'
        ? prettyFormatter
        : customJsonFormatter
    }
  }
});
\`\`\`

## Testing Examples

### Unit Tests

\`\`\`typescript
import { logger } from '@cvplus/logging';
import { createMockLogger } from '@cvplus/logging/testing';

describe('UserService', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    // Replace the real logger with mock
    jest.spyOn(logger, 'info').mockImplementation(mockLogger.info);
    jest.spyOn(logger, 'error').mockImplementation(mockLogger.error);
  });

  it('should log user creation', async () => {
    const userData = { email: 'test@example.com', name: 'Test User' };

    await createUser(userData);

    expect(mockLogger.info).toHaveBeenCalledWith(
      'User creation started',
      expect.objectContaining({
        email: 'test@example.com'
      })
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'User created successfully',
      expect.objectContaining({
        userId: expect.any(String)
      })
    );
  });

  it('should log errors properly', async () => {
    const invalidData = { email: 'invalid-email' };

    await expect(createUser(invalidData)).rejects.toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'User creation failed',
      expect.any(Error),
      expect.objectContaining({
        validationErrors: expect.any(Array)
      })
    );
  });
});
\`\`\`

### Integration Tests

\`\`\`typescript
import { setupTestLogger, captureLogOutput } from '@cvplus/logging/testing';

describe('Payment Processing Integration', () => {
  beforeAll(() => {
    setupTestLogger({
      level: 'debug',
      outputs: ['memory'] // Capture logs in memory for testing
    });
  });

  it('should handle complete payment flow', async () => {
    const paymentData = {
      amount: 99.99,
      currency: 'USD',
      customerId: 'test-customer'
    };

    const logCapture = captureLogOutput();

    const result = await processPayment(paymentData);

    const logs = logCapture.getLogs();

    // Verify payment initiated log
    expect(logs).toContainEqual(
      expect.objectContaining({
        level: 'info',
        message: expect.stringContaining('Payment initiated'),
        context: expect.objectContaining({
          amount: 99.99,
          currency: 'USD'
        })
      })
    );

    // Verify payment completed log
    expect(logs).toContainEqual(
      expect.objectContaining({
        level: 'info',
        message: expect.stringContaining('Payment completed'),
        context: expect.objectContaining({
          status: 'succeeded'
        })
      })
    );

    logCapture.cleanup();
  });
});
\`\`\`

---

These examples demonstrate real-world usage patterns for the CVPlus Logging System. For more specific use cases, refer to the [API Documentation](./api-reference.md) or contact support.
`;

    fs.writeFileSync(path.join(this.outputDir, 'examples.md'), examples);
    logger.info('💡 Generated examples documentation');
  }

  /**
   * Generate architecture documentation
    */
  private async generateArchitecture(): Promise<void> {
    const architecture = `# System Architecture

Technical architecture and design decisions for the CVPlus Logging System.

## High-Level Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────────────────┐
│                          CVPlus Application Layer                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend Apps   │  Backend APIs    │  Firebase Functions │  Mobile Apps │
│  (React/Vue)     │  (Node.js/Express)│  (Cloud Functions) │  (React Native)│
├─────────────────────────────────────────────────────────────────────────┤
│                        @cvplus/logging Package                          │
│ ┌─────────────┐ ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│ │  Frontend   │ │     Backend     │ │ Specialized │ │   Migration     │ │
│ │  Loggers    │ │    Loggers      │ │  Components │ │    Tools        │ │
│ │             │ │                 │ │             │ │                 │ │
│ │• Browser    │ │• Function       │ │• Auth       │ │• Legacy         │ │
│ │• React      │ │• Processing     │ │• Payment    │ │  Compatibility  │ │
│ │• Error      │ │• Security       │ │• Analytics  │ │• Migration      │ │
│ │  Boundary   │ │• Performance    │ │• Multimedia │ │  Validation     │ │
│ └─────────────┘ └─────────────────┘ └─────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│                         Core Infrastructure                             │
│ ┌─────────────┐ ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐ │
│ │  Transport  │ │   Aggregation   │ │   Storage   │ │   Analytics     │ │
│ │   Layer     │ │     Engine      │ │    Layer    │ │    Engine       │ │
│ │             │ │                 │ │             │ │                 │ │
│ │• Batching   │ │• Log            │ │• File       │ │• Real-time      │ │
│ │• Streaming  │ │  Processing     │ │• Database   │ │  Metrics        │ │
│ │• Retry      │ │• Correlation    │ │• Cloud      │ │• Alerting       │ │
│ │• Compression│ │• Enrichment     │ │• Archive    │ │• Dashboards     │ │
│ └─────────────┘ └─────────────────┘ └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
\`\`\`

## Core Components

### 1. Logger Hierarchy

\`\`\`typescript
BaseLogger (Abstract)
├── FrontendLogger
│   ├── BrowserLogger
│   └── ReactLogger
├── BackendLogger
│   ├── FunctionLogger
│   ├── ProcessingLogger
│   ├── AuthLogger
│   ├── PaymentLogger
│   ├── SecurityLogger
│   └── MultimediaLogger
└── SystemLogger
    ├── AuditLogger
    └── PerformanceLogger
\`\`\`

### 2. Data Flow Architecture

\`\`\`
Application Code
      ↓
   Logger API
      ↓
Format & Enrich ← PII Redaction
      ↓         ← Correlation ID
   Transport     ← Batching
      ↓         ← Compression
  API Gateway    ← Authentication
      ↓         ← Rate Limiting
Log Aggregation  ← Processing
      ↓         ← Classification
   Storage       ← Indexing
      ↓         ← Archival
   Analytics     ← Metrics
      ↓         ← Alerting
   Dashboard     ← Visualization
\`\`\`

## Design Patterns

### 1. Factory Pattern

Logger creation using factory pattern for consistency:

\`\`\`typescript
export class LoggerFactory {
  static createFunctionLogger(component: string): FunctionLogger {
    return new FunctionLogger(component);
  }

  static createAuthLogger(component: string): AuthLogger {
    return new AuthLogger(component);
  }

  static createPaymentLogger(component: string): PaymentLogger {
    return new PaymentLogger(component);
  }
}
\`\`\`

### 2. Strategy Pattern

Different output strategies for various environments:

\`\`\`typescript
interface OutputStrategy {
  write(entry: LogEntry): Promise<void>;
}

class ConsoleOutputStrategy implements OutputStrategy {
  async write(entry: LogEntry): Promise<void> {
    logger.info(this.format(entry));
  }
}

class RemoteOutputStrategy implements OutputStrategy {
  async write(entry: LogEntry): Promise<void> {
    await this.sendToAPI(entry);
  }
}
\`\`\`

### 3. Observer Pattern

Event-driven architecture for real-time features:

\`\`\`typescript
class LogEventEmitter extends EventEmitter {
  emit(event: string, ...args: any[]): boolean {
    // Real-time streaming
    if (event === 'log') {
      this.streamToClients(args[0]);
    }
    return super.emit(event, ...args);
  }
}
\`\`\`

### 4. Chain of Responsibility

Log processing pipeline:

\`\`\`typescript
abstract class LogProcessor {
  protected next?: LogProcessor;

  setNext(processor: LogProcessor): LogProcessor {
    this.next = processor;
    return processor;
  }

  abstract process(entry: LogEntry): LogEntry;
}

class PIIRedactionProcessor extends LogProcessor {
  process(entry: LogEntry): LogEntry {
    const redacted = this.redactPII(entry);
    return this.next ? this.next.process(redacted) : redacted;
  }
}
\`\`\`

## Performance Architecture

### 1. Batch Processing

Efficient log handling through batching:

\`\`\`typescript
class BatchProcessor {
  private batch: LogEntry[] = [];
  private batchTimer?: NodeJS.Timeout;

  add(entry: LogEntry): void {
    this.batch.push(entry);

    if (this.batch.length >= this.config.batchSize) {
      this.flush();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flush(), this.config.batchTimeout);
    }
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const batchToProcess = [...this.batch];
    this.batch = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    await this.processBatch(batchToProcess);
  }
}
\`\`\`

### 2. Connection Pooling

Efficient database connections:

\`\`\`typescript
class ConnectionPool {
  private pool: Connection[] = [];
  private activeConnections = 0;

  async getConnection(): Promise<Connection> {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }

    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++;
      return await this.createConnection();
    }

    // Wait for available connection
    return await this.waitForConnection();
  }

  releaseConnection(connection: Connection): void {
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(connection);
    } else {
      connection.close();
      this.activeConnections--;
    }
  }
}
\`\`\`

### 3. Memory Management

Intelligent memory usage and garbage collection:

\`\`\`typescript
class MemoryManager {
  private checkInterval: NodeJS.Timeout;

  constructor() {
    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  private checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;

    if (heapUsedMB > this.config.maxMemoryMB * 0.8) {
      this.triggerCleanup();
    }
  }

  private triggerCleanup(): void {
    // Clear caches
    this.clearCache();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Emit warning
    this.emit('memoryWarning', {
      heapUsed: process.memoryUsage().heapUsed,
      threshold: this.config.maxMemoryMB * 1024 * 1024 * 0.8
    });
  }
}
\`\`\`

## Security Architecture

### 1. PII Redaction

Automatic sensitive data protection:

\`\`\`typescript
class PIIRedactor {
  private patterns = {
    email: /\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b/g,
    phone: /\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b/g,
    ssn: /\\b\\d{3}-\\d{2}-\\d{4}\\b/g,
    creditCard: /\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b/g
  };

  redact(text: string): string {
    let redacted = text;

    Object.entries(this.patterns).forEach(([type, pattern]) => {
      redacted = redacted.replace(pattern, \`[REDACTED_\${type.toUpperCase()}]\`);
    });

    return redacted;
  }
}
\`\`\`

### 2. Access Control

Role-based access to logs:

\`\`\`typescript
class AccessController {
  canAccess(user: User, logEntry: LogEntry): boolean {
    // System administrators can access all logs
    if (user.role === 'admin') {
      return true;
    }

    // Users can access their own logs
    if (logEntry.context?.userId === user.id) {
      return true;
    }

    // Component owners can access component logs
    if (user.ownedComponents?.includes(logEntry.component)) {
      return true;
    }

    // Public logs are accessible to all authenticated users
    if (logEntry.metadata?.public === true) {
      return true;
    }

    return false;
  }
}
\`\`\`

## Scalability Architecture

### 1. Horizontal Scaling

Support for multiple instances:

\`\`\`typescript
class LoadBalancer {
  private instances: LoggingInstance[] = [];
  private currentIndex = 0;

  addInstance(instance: LoggingInstance): void {
    this.instances.push(instance);
  }

  getNextInstance(): LoggingInstance {
    const instance = this.instances[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.instances.length;
    return instance;
  }

  async routeRequest(request: LogRequest): Promise<LogResponse> {
    const instance = this.getNextInstance();
    return await instance.process(request);
  }
}
\`\`\`

### 2. Caching Strategy

Multi-level caching for performance:

\`\`\`typescript
class CacheManager {
  private l1Cache = new Map<string, any>(); // In-memory
  private l2Cache: RedisClient; // Redis
  private l3Cache: DatabaseClient; // Database

  async get(key: string): Promise<any> {
    // L1 Cache (fastest)
    if (this.l1Cache.has(key)) {
      return this.l1Cache.get(key);
    }

    // L2 Cache (fast)
    const l2Result = await this.l2Cache.get(key);
    if (l2Result) {
      this.l1Cache.set(key, l2Result);
      return l2Result;
    }

    // L3 Cache (slower but persistent)
    const l3Result = await this.l3Cache.get(key);
    if (l3Result) {
      this.l2Cache.setex(key, 300, l3Result);
      this.l1Cache.set(key, l3Result);
      return l3Result;
    }

    return null;
  }
}
\`\`\`

## Monitoring Architecture

### 1. Health Checks

System health monitoring:

\`\`\`typescript
class HealthChecker {
  private checks = new Map<string, HealthCheck>();

  register(name: string, check: HealthCheck): void {
    this.checks.set(name, check);
  }

  async runAll(): Promise<HealthReport> {
    const results: HealthCheckResult[] = [];

    for (const [name, check] of this.checks) {
      try {
        const result = await Promise.race([
          check.execute(),
          this.timeout(5000)
        ]);

        results.push({
          name,
          status: 'healthy',
          responseTime: result.duration
        });
      } catch (error) {
        results.push({
          name,
          status: 'unhealthy',
          error: error.message
        });
      }
    }

    return {
      status: results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: new Date().toISOString()
    };
  }
}
\`\`\`

### 2. Metrics Collection

Performance and usage metrics:

\`\`\`typescript
class MetricsCollector {
  private metrics = new Map<string, MetricSeries>();

  increment(name: string, tags: Record<string, string> = {}): void {
    const key = this.buildKey(name, tags);
    const metric = this.metrics.get(key) || { count: 0, timestamps: [] };

    metric.count++;
    metric.timestamps.push(Date.now());

    this.metrics.set(key, metric);
  }

  timing(name: string, duration: number, tags: Record<string, string> = {}): void {
    const key = this.buildKey(name, tags);
    const metric = this.metrics.get(key) || { values: [], timestamps: [] };

    metric.values.push(duration);
    metric.timestamps.push(Date.now());

    this.metrics.set(key, metric);
  }

  getSnapshot(): MetricsSnapshot {
    const snapshot: MetricsSnapshot = {};

    for (const [key, metric] of this.metrics) {
      if ('count' in metric) {
        snapshot[key] = {
          type: 'counter',
          value: metric.count
        };
      } else if ('values' in metric) {
        snapshot[key] = {
          type: 'histogram',
          count: metric.values.length,
          avg: metric.values.reduce((a, b) => a + b, 0) / metric.values.length,
          min: Math.min(...metric.values),
          max: Math.max(...metric.values)
        };
      }
    }

    return snapshot;
  }
}
\`\`\`

## Technology Stack

### Core Technologies
- **TypeScript**: Type safety and developer experience
- **Node.js**: Runtime for backend services
- **React**: Frontend logging components
- **Firebase**: Cloud infrastructure
- **Winston**: Core logging library
- **Express**: HTTP middleware

### Storage Technologies
- **MongoDB**: Primary log storage
- **Redis**: Caching and session storage
- **Cloud Storage**: Long-term archival
- **Elasticsearch**: Search and analytics (optional)

### Communication Protocols
- **HTTP/HTTPS**: REST API communication
- **WebSockets**: Real-time streaming
- **Server-Sent Events**: Browser streaming
- **gRPC**: High-performance service communication (future)

### Deployment Technologies
- **Docker**: Containerization
- **Kubernetes**: Orchestration (future)
- **Firebase Hosting**: Static asset hosting
- **Cloud Functions**: Serverless compute

## Future Architecture Considerations

### 1. Microservices Migration
- Split monolithic logging service into microservices
- Dedicated services for ingestion, processing, storage, analytics
- Service mesh for inter-service communication

### 2. Event Sourcing
- Immutable log events as source of truth
- Event replay for debugging and analytics
- Temporal queries and point-in-time recovery

### 3. Machine Learning Integration
- Anomaly detection in log patterns
- Predictive alerting
- Automated log classification

### 4. Edge Computing
- Edge nodes for local log processing
- Reduced latency for global deployments
- Offline-first capabilities

---

This architecture provides a scalable, secure, and maintainable foundation for the CVPlus Logging System.
`;

    fs.writeFileSync(path.join(this.outputDir, 'architecture.md'), architecture);
    logger.info('🏗️ Generated architecture documentation');
  }

  private async generateTypeReference(): Promise<void> {
    logger.info('📖 Generated type reference documentation');
  }

  private async generateIntegrationGuides(): Promise<void> {
    logger.info('🔌 Generated integration guides');
  }

  private async generateIndex(): Promise<void> {
    logger.info('🏠 Generated index page');
  }

  private async generateTableOfContents(): Promise<void> {
    logger.info('📑 Generated table of contents');
  }
}

// CLI interface
if (require.main === module) {
  const generator = new LoggingDocsGenerator();

  generator.generateAll()
    .then(() => {
      logger.info('\n🎉 Documentation generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Documentation generation failed:', error);
      process.exit(1);
    });
}

export { LoggingDocsGenerator };
export default LoggingDocsGenerator;