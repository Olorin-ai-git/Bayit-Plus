# CVPlus Logging System - Quick Start Guide

**Version**: 1.0.0
**Date**: 2025-09-13
**Audience**: Developers, DevOps Engineers
**Prerequisites**: Node.js 18+, TypeScript 4.5+

## Introduction

Welcome to the CVPlus Logging System! This guide will get you up and running with enterprise-grade logging in under 10 minutes. Our logging system provides automatic performance optimization, security hardening, and error recovery out of the box.

## Table of Contents

1. [Installation](#installation)
2. [Basic Setup](#basic-setup)
3. [Your First Logs](#your-first-logs)
4. [Advanced Features](#advanced-features)
5. [Express Integration](#express-integration)
6. [Package-Specific Logging](#package-specific-logging)
7. [Monitoring and Health](#monitoring-and-health)
8. [Production Checklist](#production-checklist)

## Installation

### NPM Installation

```bash
npm install @cvplus/logging
```

### Yarn Installation

```bash
yarn add @cvplus/logging
```

### TypeScript Support

TypeScript definitions are included automatically. No additional `@types` packages needed.

## Basic Setup

### Minimal Setup (30 seconds)

Create your first logger and start logging:

```typescript
import { createLogger } from '@cvplus/logging';

// Create a logger - automatically optimized and secured
const logger = createLogger('my-service');

// Start logging immediately
logger.info('Application started', {
  version: '1.0.0',
  environment: process.env.NODE_ENV
});
```

### Recommended Setup (2 minutes)

Enable all features for production-ready logging:

```typescript
import {
  createLogger,
  startPerformanceMonitoring,
  createSecureLoggingMiddleware
} from '@cvplus/logging';

// 1. Start performance monitoring
startPerformanceMonitoring();

// 2. Create optimized logger with all features
const logger = createOptimizedLogger('my-service', {
  enablePerformanceMonitoring: true,
  enableSecurityValidation: true
});

// 3. Use Express middleware (if using Express)
app.use(createSecureLoggingMiddleware({
  rateLimitConfig: {
    windowMs: 60000,
    maxRequests: 1000
  }
}));

logger.info('System initialized with full feature set');
```

## Your First Logs

### Standard Log Levels

```typescript
import { createLogger } from '@cvplus/logging';
const logger = createLogger('demo-service');

// Debug - Development information
logger.debug('Processing user request', {
  userId: 'u123',
  action: 'profile-update'
});

// Info - General information
logger.info('User profile updated successfully', {
  userId: 'u123',
  updatedFields: ['email', 'phone'],
  duration: 245
});

// Warning - Potentially harmful situations
logger.warn('API rate limit approaching', {
  currentRate: 95,
  limit: 100,
  timeWindow: '1m'
});

// Error - Runtime errors
logger.error('Database connection failed', {
  host: 'db.example.com',
  port: 5432,
  retryAttempt: 3
}, new Error('Connection timeout'));

// Fatal - Application-terminating errors
logger.fatal('Critical system failure', {
  component: 'payment-processor',
  errorCode: 'SYS_001'
}, new Error('Payment gateway unreachable'));
```

### Domain-Specific Logging

```typescript
// Security events - automatically flagged for security monitoring
logger.security('Suspicious login attempt detected', {
  userId: 'u123',
  ipAddress: '192.168.1.100',
  failedAttempts: 5,
  timeWindow: '5m'
});

// Performance metrics - automatically analyzed for optimization
logger.performance('API endpoint response', {
  duration: 245,
  memoryUsage: 1024000,
  cpuUsage: 15.5
}, {
  endpoint: '/api/users',
  method: 'GET',
  statusCode: 200
});

// Audit trail - compliance-ready audit logs
logger.audit('UPDATE', 'user-profile', 'success', {
  userId: 'u123',
  changes: ['email', 'phone'],
  operator: 'admin456',
  ipAddress: '10.0.0.1'
});
```

## Advanced Features

### Automatic Error Recovery

Never lose logs again with automatic retry and fallback mechanisms:

```typescript
import { withRecovery } from '@cvplus/logging';

// Wrap critical operations with automatic recovery
const result = await withRecovery(
  async () => {
    // Your critical operation that might fail
    logger.info('Processing payment', { amount: 99.99 });
    return await processPayment(paymentData);
  },
  'payment-processing', // Operation name for recovery tracking
  {
    maxRetries: 3,
    exponentialBackoff: true,
    fallbackEnabled: true
  }
);
```

### Custom Error Recovery Strategies

```typescript
import { globalErrorRecovery } from '@cvplus/logging';

// Add custom recovery strategy for API key issues
globalErrorRecovery.addRecoveryStrategy({
  name: 'api_key_refresh',
  condition: (error) => error.message.includes('Invalid API key'),
  action: async () => {
    console.log('Refreshing API key...');
    await refreshApiKey();
    return true; // Recovery successful
  },
  priority: 10 // Higher priority = runs first
});
```

### Enhanced PII Protection

Automatic detection and redaction of sensitive information:

```typescript
import { PiiRedaction } from '@cvplus/logging';

// Add custom PII patterns
PiiRedaction.addCustomPattern(
  'customerId',
  /CUST-\d{6}/g,
  () => '[CUSTOMER_ID_REDACTED]'
);

// Log with automatic PII redaction (enabled by default)
logger.info('Customer order processed', {
  customerId: 'CUST-123456', // Will be redacted
  email: 'user@example.com', // Will be redacted
  orderTotal: 99.99 // Will NOT be redacted
});

// Output: "Customer order processed" with redacted PII
```

### Performance Optimization

Automatic performance monitoring and optimization:

```typescript
import { getPerformanceStatus } from '@cvplus/logging';

// Check performance status periodically
setInterval(() => {
  const status = getPerformanceStatus();

  // Act on performance recommendations
  status.recommendations.forEach(recommendation => {
    if (recommendation.severity === 'critical') {
      console.error(`CRITICAL: ${recommendation.message}`);
      console.error(`Action: ${recommendation.action}`);
      // Trigger alert or automatic remediation
    }
  });

  // Monitor system health
  if (status.trends.memoryTrend === 'degrading') {
    console.warn('Memory usage is increasing - consider optimization');
  }
}, 300000); // Every 5 minutes
```

## Express Integration

### Complete Express Setup

```typescript
import express from 'express';
import {
  createLogger,
  createSecureLoggingMiddleware,
  correlationMiddleware,
  withRecovery
} from '@cvplus/logging';

const app = express();
const logger = createLogger('web-server');

// 1. Apply correlation middleware first
app.use(correlationMiddleware);

// 2. Apply secure logging middleware with rate limiting
app.use(createSecureLoggingMiddleware({
  rateLimitConfig: {
    windowMs: 60000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute
    enableBurstProtection: true,
    burstThreshold: 100 // Max 100 requests in 10% of window
  },
  enableSecurityValidation: true
}));

// 3. Request/Response logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Log response when complete
  res.on('finish', () => {
    logger.performance('Request completed', {
      duration: Date.now() - startTime,
      memoryUsage: process.memoryUsage().heapUsed
    }, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length')
    });
  });

  next();
});

// 4. Route handlers with automatic recovery
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await withRecovery(
      () => getUserById(req.params.id),
      'get-user-by-id'
    );

    logger.info('User retrieved successfully', {
      userId: req.params.id,
      requestId: req.correlationId // Automatic correlation
    });

    res.json(user);
  } catch (error) {
    logger.error('Failed to retrieve user', {
      userId: req.params.id,
      errorType: error.constructor.name
    }, error);

    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    path: req.path,
    method: req.method,
    correlationId: req.correlationId
  }, error);

  res.status(500).json({
    error: 'Internal server error',
    correlationId: req.correlationId
  });
});
```

### Rate Limiting Examples

```typescript
import { defaultRateLimits } from '@cvplus/logging';

// Use predefined rate limits
app.use('/api', createSecureLoggingMiddleware({
  rateLimitConfig: defaultRateLimits.api // 100 requests/minute
}));

app.use('/api/sensitive', createSecureLoggingMiddleware({
  rateLimitConfig: defaultRateLimits.sensitive // 10 requests/5 minutes
}));

// Custom rate limiting for specific endpoints
app.use('/api/upload', createSecureLoggingMiddleware({
  rateLimitConfig: {
    windowMs: 300000, // 5 minutes
    maxRequests: 5, // 5 uploads per 5 minutes
    enableBurstProtection: true,
    burstThreshold: 2
  }
}));
```

## Package-Specific Logging

CVPlus provides specialized loggers for each package with optimized configurations:

```typescript
// Use package-specific loggers for enhanced context
import {
  analyticsLogger,
  premiumLogger,
  recommendationsLogger,
  profilesLogger,
  adminLogger,
  workflowLogger,
  paymentsLogger
} from '@cvplus/logging';

// Analytics package
analyticsLogger.info('Page view tracked', {
  userId: 'u123',
  page: '/dashboard',
  sessionId: 's456',
  duration: 2500
});

// Premium package
premiumLogger.audit('SUBSCRIPTION_UPGRADE', 'premium-plan', 'success', {
  userId: 'u123',
  fromPlan: 'basic',
  toPlan: 'premium',
  amount: 29.99
});

// Payments package with enhanced security
paymentsLogger.security('Payment processing initiated', {
  orderId: 'ord-789',
  amount: 99.99,
  paymentMethod: 'card', // Sensitive details auto-redacted
  riskScore: 0.15
});

// Recommendations package with performance tracking
recommendationsLogger.performance('Recommendation generation completed', {
  duration: 245,
  memoryUsage: 2048000,
  cacheHitRatio: 0.85
}, {
  userId: 'u123',
  recommendationType: 'cv-optimization',
  itemsGenerated: 12
});
```

## Monitoring and Health

### System Health Monitoring

```typescript
import {
  getPerformanceStatus,
  globalSecurityService,
  globalErrorRecovery,
  LoggerFactory
} from '@cvplus/logging';

// Create comprehensive health check endpoint
app.get('/health/logging', (req, res) => {
  const performance = getPerformanceStatus();
  const security = globalSecurityService.getSecuritySummary();
  const recovery = globalErrorRecovery.getRecoveryReport();
  const system = LoggerFactory.getSystemStatus();

  const health = {
    timestamp: new Date().toISOString(),
    overallHealth: system.overallHealth,
    services: {
      performance: {
        status: performance.trends.memoryTrend === 'degrading' ? 'warning' : 'healthy',
        metrics: {
          memoryUsage: performance.current?.memoryUsage.heapUsed,
          throughput: performance.current?.logThroughput.logsPerSecond,
          avgQueryTime: performance.current?.queryPerformance.avgQueryTime
        },
        recommendations: performance.recommendations.length
      },
      security: {
        status: security.riskLevel === 'critical' ? 'critical' : 'healthy',
        riskLevel: security.riskLevel,
        totalViolations: security.totalViolations,
        currentThreats: security.currentThreats
      },
      errorRecovery: {
        status: recovery.systemHealth,
        activeIssues: recovery.activeIssues.length,
        recommendations: recovery.recommendations.length
      }
    }
  };

  const statusCode = health.overallHealth === 'critical' ? 503 :
                    health.overallHealth === 'degraded' ? 200 : 200;

  res.status(statusCode).json(health);
});
```

### Proactive Monitoring Setup

```typescript
// Set up proactive monitoring and alerting
class LoggingMonitor {
  private checkInterval: NodeJS.Timeout;

  start() {
    this.checkInterval = setInterval(() => {
      this.checkSystemHealth();
    }, 60000); // Check every minute
  }

  private async checkSystemHealth() {
    const logger = createLogger('logging-monitor');

    // Check performance
    const performance = getPerformanceStatus();
    const criticalRecommendations = performance.recommendations
      .filter(r => r.severity === 'critical');

    if (criticalRecommendations.length > 0) {
      logger.warn('Critical performance issues detected', {
        issues: criticalRecommendations.map(r => ({
          type: r.type,
          message: r.message,
          action: r.action
        }))
      });

      // Trigger automatic optimizations
      await this.applyOptimizations(criticalRecommendations);
    }

    // Check security
    const security = globalSecurityService.getSecuritySummary();
    if (security.riskLevel === 'critical') {
      logger.security('Critical security risk detected', {
        riskLevel: security.riskLevel,
        totalViolations: security.totalViolations,
        topViolations: security.topViolations
      });

      // Could trigger security response here
    }

    // Check error recovery
    const recovery = globalErrorRecovery.getRecoveryReport();
    if (recovery.systemHealth === 'critical') {
      logger.fatal('Error recovery system is critical', {
        activeIssues: recovery.activeIssues,
        recommendations: recovery.recommendations
      });

      // Could trigger incident response here
    }
  }

  private async applyOptimizations(recommendations: any[]) {
    const logger = createLogger('auto-optimizer');

    for (const rec of recommendations) {
      try {
        switch (rec.type) {
          case 'memory':
            // Clean up unused loggers
            const cleaned = LoggerFactory.cleanupUnusedLoggers(1800000); // 30 minutes
            logger.info('Memory optimization applied', { cleaned });
            break;

          case 'query':
            // Could trigger cache warming, index optimization, etc.
            logger.info('Query optimization triggered', { recommendation: rec.action });
            break;
        }
      } catch (error) {
        logger.error('Failed to apply optimization', { type: rec.type }, error);
      }
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Start monitoring
const monitor = new LoggingMonitor();
monitor.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  monitor.stop();
});
```

## Production Checklist

### Pre-Deployment Checklist

- [ ] **Performance Monitoring Enabled**
  ```typescript
  startPerformanceMonitoring(60000); // Every minute
  ```

- [ ] **PII Redaction Configured**
  ```typescript
  // Verify PII redaction is enabled (default: true)
  const logger = createLogger('service', { enablePiiRedaction: true });
  ```

- [ ] **Rate Limiting Configured**
  ```typescript
  // Apply appropriate rate limits for your traffic
  app.use(createSecureLoggingMiddleware({
    rateLimitConfig: defaultRateLimits.api
  }));
  ```

- [ ] **Error Recovery Strategies**
  ```typescript
  // Add custom recovery strategies for your specific error types
  globalErrorRecovery.addRecoveryStrategy({...});
  ```

- [ ] **Health Monitoring**
  ```typescript
  // Implement health check endpoint
  app.get('/health/logging', healthCheckHandler);
  ```

- [ ] **Log Level Configuration**
  ```typescript
  // Use INFO level in production
  const logger = createLogger('service', {
    level: LogLevel.INFO,
    environment: 'production'
  });
  ```

### Performance Optimization

- [ ] **Memory Limits Configured**
  - Monitor heap usage: Target < 100MB under normal load
  - Set up automatic cleanup of unused loggers

- [ ] **Throughput Targets**
  - Target: >1000 logs/second
  - Monitor and alert on degradation

- [ ] **Query Performance**
  - Target: <200ms average query time
  - Monitor slow queries and cache hit ratios

### Security Configuration

- [ ] **PII Patterns Updated**
  ```typescript
  // Add industry-specific PII patterns
  PiiRedaction.addCustomPattern('accountNumber', /ACC-\d{8}/,
    () => '[ACCOUNT_REDACTED]'
  );
  ```

- [ ] **Rate Limits Tuned**
  - API endpoints: 100-1000 requests/minute
  - Sensitive operations: 5-10 requests/5 minutes
  - File uploads: 5 requests/5 minutes

- [ ] **Security Monitoring**
  - Alert on injection attempts
  - Monitor PII exposure violations
  - Track suspicious patterns

### Monitoring and Alerting

- [ ] **System Health Alerts**
  - Critical: System health degraded
  - Warning: High memory usage
  - Info: Performance recommendations available

- [ ] **Security Alerts**
  - Critical: Injection attempts detected
  - Warning: High rate limit violations
  - Info: PII redaction statistics

- [ ] **Error Recovery Alerts**
  - Critical: Circuit breakers open
  - Warning: High failure rates
  - Info: Recovery strategies activated

## Troubleshooting

### Common Issues

#### "Circuit breaker is OPEN" errors
```typescript
// Check circuit breaker status
const recovery = globalErrorRecovery.getRecoveryStats();
console.log('Circuit breakers:', recovery.circuitBreakers);

// Wait for circuit breaker to reset or fix underlying issues
```

#### High memory usage warnings
```typescript
// Check performance status
const performance = getPerformanceStatus();
console.log('Memory usage:', performance.current?.memoryUsage);

// Apply recommendations
performance.recommendations
  .filter(r => r.type === 'memory')
  .forEach(r => console.log('Action:', r.action));
```

#### Rate limit exceeded errors
```typescript
// Check rate limit configuration
app.use(createSecureLoggingMiddleware({
  rateLimitConfig: {
    windowMs: 60000,
    maxRequests: 2000, // Increase if needed
  }
}));
```

### Debug Mode

Enable verbose debugging for troubleshooting:

```typescript
// Enable debug logging
const logger = createLogger('debug-service', {
  level: LogLevel.DEBUG
});

// Get detailed system information
const systemStatus = LoggerFactory.getSystemStatus();
console.log('System Status:', JSON.stringify(systemStatus, null, 2));
```

## Next Steps

- **Advanced Configuration**: See [API Documentation](../technical/cvplus-logging-system-api-documentation.md)
- **Security Best Practices**: See [Security Guide](../security/logging-security-best-practices.md)
- **Production Deployment**: See [Production Guide](../deployment/logging-production-deployment.md)
- **Monitoring Integration**: See [Monitoring Guide](../operations/logging-monitoring-integration.md)

## Support

- **Issues**: Create a GitHub issue
- **Questions**: Check the [FAQ](../support/logging-faq.md)
- **Security**: Contact security@cvplus.com

---

**Happy logging! 🚀**

*The CVPlus Logging System team*