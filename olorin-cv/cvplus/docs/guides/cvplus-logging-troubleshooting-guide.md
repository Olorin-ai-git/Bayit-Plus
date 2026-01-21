# CVPlus Logging System - Troubleshooting Guide

**Version**: 1.0.0
**Date**: 2025-09-13
**Audience**: Developers, DevOps Engineers, Support Teams

## Overview

This guide provides step-by-step troubleshooting procedures for common issues with the CVPlus Logging System. All solutions include diagnostic commands, root cause analysis, and preventive measures.

## Table of Contents

1. [Quick Diagnostic Commands](#quick-diagnostic-commands)
2. [Performance Issues](#performance-issues)
3. [Security Issues](#security-issues)
4. [Error Recovery Issues](#error-recovery-issues)
5. [Integration Issues](#integration-issues)
6. [Configuration Issues](#configuration-issues)
7. [Emergency Procedures](#emergency-procedures)

## Quick Diagnostic Commands

### System Health Check

```typescript
import { LoggerFactory, getPerformanceStatus, globalSecurityService, globalErrorRecovery } from '@cvplus/logging';

// Get comprehensive system status
const systemStatus = LoggerFactory.getSystemStatus();
console.log('System Health:', systemStatus.overallHealth);

// Get detailed metrics
const performance = getPerformanceStatus();
const security = globalSecurityService.getSecuritySummary();
const recovery = globalErrorRecovery.getRecoveryReport();

console.log('Performance:', performance.current?.memoryUsage.heapUsed);
console.log('Security Risk:', security.riskLevel);
console.log('Recovery Health:', recovery.systemHealth);
```

### Logger Factory Diagnostics

```typescript
// Check factory metrics
const metrics = LoggerFactory.getFactoryMetrics();
console.log('Active loggers:', metrics.activeLoggers);
console.log('Cache hit ratio:', metrics.cacheHitRatio);
console.log('Memory usage:', metrics);

// List all loggers
const allLoggers = LoggerFactory.getAllLoggers();
console.log('Logger names:', Object.keys(allLoggers));
```

### Performance Diagnostics

```typescript
// Get performance recommendations
const recommendations = getPerformanceStatus().recommendations;
recommendations.forEach(rec => {
  console.log(`${rec.severity.toUpperCase()}: ${rec.message}`);
  console.log(`Action: ${rec.action}`);
  console.log(`Impact: ${rec.impact}`);
  console.log('---');
});
```

## Performance Issues

### Issue: High Memory Usage

**Symptoms:**
- Out of memory errors
- Slow application performance
- Memory usage warnings in logs

**Diagnostic Commands:**
```typescript
const performance = getPerformanceStatus();
const current = performance.current;

if (current && current.memoryUsage.heapUsed > 100 * 1024 * 1024) {
  console.log('HIGH MEMORY USAGE DETECTED');
  console.log('Heap used:', current.memoryUsage.heapUsed / 1024 / 1024, 'MB');
  console.log('Heap total:', current.memoryUsage.heapTotal / 1024 / 1024, 'MB');
  console.log('RSS:', current.memoryUsage.rss / 1024 / 1024, 'MB');

  // Check factory metrics
  const factoryMetrics = LoggerFactory.getFactoryMetrics();
  console.log('Active loggers:', factoryMetrics.activeLoggers);
  console.log('Cached loggers:', factoryMetrics.cachedLoggers);
}
```

**Root Causes:**
1. Too many logger instances created
2. Large context objects not being garbage collected
3. Memory leaks in custom transports
4. Excessive log retention in memory

**Solutions:**

1. **Clean up unused loggers:**
```typescript
// Clean loggers unused for more than 30 minutes
const cleaned = LoggerFactory.cleanupUnusedLoggers(1800000);
console.log('Cleaned up loggers:', cleaned);
```

2. **Optimize context objects:**
```typescript
// Instead of large objects, use references
// ❌ Bad
logger.info('Processing', { largeObject: entireUserDatabase });

// ✅ Good
logger.info('Processing', {
  objectType: 'userDatabase',
  recordCount: userDatabase.length,
  processId: generateProcessId()
});
```

3. **Enable garbage collection monitoring:**
```typescript
// Force garbage collection if available
if (global.gc) {
  global.gc();
  const afterGC = process.memoryUsage();
  console.log('Memory after GC:', afterGC.heapUsed / 1024 / 1024, 'MB');
}
```

4. **Configure memory limits:**
```typescript
// Set Node.js memory limit
// node --max-old-space-size=2048 app.js
```

**Prevention:**
- Monitor memory usage regularly
- Set up automatic cleanup schedules
- Use memory profiling tools in development
- Implement memory alerts

### Issue: Low Throughput

**Symptoms:**
- Logs per second below expected rates
- Application blocking on log operations
- Slow response times

**Diagnostic Commands:**
```typescript
const performance = getPerformanceStatus();
const throughput = performance.current?.logThroughput;

if (throughput && throughput.logsPerSecond < 100) {
  console.log('LOW THROUGHPUT DETECTED');
  console.log('Current rate:', throughput.logsPerSecond, 'logs/sec');
  console.log('Peak rate:', throughput.peakThroughput, 'logs/sec');

  // Check for synchronous operations
  const avgLogTime = LoggerFactory.getPerformanceMetrics().avgLogTime;
  if (avgLogTime > 50) {
    console.log('SLOW LOG OPERATIONS:', avgLogTime, 'ms average');
  }
}
```

**Root Causes:**
1. Synchronous logging operations blocking threads
2. Inefficient transport configurations
3. Network latency in remote logging
4. Insufficient batching

**Solutions:**

1. **Enable asynchronous logging:**
```typescript
// Already enabled by default, but verify configuration
const logger = createLogger('service', {
  enableConsole: true,
  enableFile: true,
  enableFirebase: true
});

// Check transport statistics
if (logger.winstonLogger?.transports) {
  logger.winstonLogger.transports.forEach(transport => {
    if (transport.name === 'firebase') {
      console.log('Firebase stats:', transport.getStats());
    }
  });
}
```

2. **Optimize batch sizes:**
```typescript
// For Firebase transport
const firebaseTransport = new FirebaseTransport({
  batchSize: 500, // Increase from default 100
  flushInterval: 2000, // Decrease from default 5000
});
```

3. **Use performance monitoring:**
```typescript
// Monitor and optimize based on recommendations
const recommendations = getPerformanceStatus().recommendations;
const throughputRecs = recommendations.filter(r => r.type === 'throughput');
throughputRecs.forEach(rec => {
  console.log('Throughput optimization:', rec.action);
});
```

**Prevention:**
- Set throughput targets and monitor regularly
- Use load testing to identify bottlenecks
- Implement performance regression testing

### Issue: Slow Query Performance

**Symptoms:**
- Slow log retrieval operations
- High database load
- Poor dashboard performance

**Diagnostic Commands:**
```typescript
const performance = getPerformanceStatus();
const queryPerf = performance.current?.queryPerformance;

if (queryPerf && queryPerf.avgQueryTime > 200) {
  console.log('SLOW QUERIES DETECTED');
  console.log('Average query time:', queryPerf.avgQueryTime, 'ms');
  console.log('Slow queries:', queryPerf.slowQueries);
  console.log('Cache hit ratio:', queryPerf.cacheHitRatio);
}
```

**Solutions:**

1. **Improve caching:**
```typescript
// Clear and warm cache
FirebaseTransport.clearCache();

// Monitor cache performance
const stats = FirebaseTransport.getGlobalMetrics();
console.log('Cache size:', stats.cacheSize);
console.log('Indexed fields:', stats.indexedFields);
```

2. **Optimize query patterns:**
```typescript
// Use indexed fields for queries
const indexedFields = ['timestamp', 'level', 'correlationId', 'domain', 'package'];
// Ensure queries use these fields for optimal performance
```

## Security Issues

### Issue: High Security Violations

**Symptoms:**
- Security risk level elevated
- PII exposure alerts
- Injection attempt warnings

**Diagnostic Commands:**
```typescript
const security = globalSecurityService.getSecuritySummary();

if (security.riskLevel === 'critical' || security.totalViolations > 50) {
  console.log('SECURITY VIOLATIONS DETECTED');
  console.log('Risk level:', security.riskLevel);
  console.log('Total violations:', security.totalViolations);
  console.log('Current threats:', security.currentThreats);

  // Get detailed violation breakdown
  security.topViolations.forEach(violation => {
    console.log(`${violation.type}: ${violation.count} occurrences`);
  });

  // Check recent security metrics
  const recentMetrics = globalSecurityService.getSecurityMetrics(1);
  console.log('Recent metrics:', recentMetrics);
}
```

**Root Causes:**
1. PII not being properly redacted
2. Injection attempts in log data
3. Insufficient input validation
4. Misconfigured security patterns

**Solutions:**

1. **Update PII redaction patterns:**
```typescript
import { PiiRedaction } from '@cvplus/logging';

// Check current redaction stats
const stats = PiiRedaction.getRedactionStats();
console.log('PII redaction enabled:', stats.enabled);
console.log('Total patterns:', stats.totalPatterns);
console.log('Security metrics:', stats.securityMetrics);

// Add missing patterns
PiiRedaction.addCustomPattern(
  'internalId',
  /INT-\d{8}/g,
  () => '[INTERNAL_ID_REDACTED]'
);

// Test redaction
const testText = "User INT-12345678 logged in with email user@test.com";
const redacted = PiiRedaction.redactString(testText);
console.log('Redacted:', redacted);
```

2. **Strengthen input validation:**
```typescript
// Validate log entries before processing
const logEntry = {
  message: "User action",
  context: { userId: "u123" }
};

const validation = globalSecurityService.validateLogEntry(logEntry);
if (!validation.isValid) {
  console.log('Security violations found:');
  validation.violations.forEach(violation => {
    console.log(`- ${violation.type}: ${violation.message}`);
    console.log(`  Recommendation: ${violation.recommendation}`);
  });

  // Use sanitized version
  if (validation.sanitized) {
    console.log('Using sanitized entry');
  }
}
```

3. **Monitor for advanced threats:**
```typescript
// Check for advanced threat patterns
const threats = PiiRedaction.detectAdvancedThreats("export all user data");
console.log('Risk score:', threats.riskScore);
threats.threats.forEach(threat => {
  console.log(`Threat: ${threat.type} (${threat.severity})`);
  console.log(`Confidence: ${threat.confidence * 100}%`);
  console.log(`Recommendation: ${threat.recommendation}`);
});
```

**Prevention:**
- Regular security pattern updates
- Automated security testing
- Staff security training
- Incident response procedures

### Issue: Rate Limiting False Positives

**Symptoms:**
- Legitimate requests being blocked
- Rate limit violations for normal operations
- User complaints about access issues

**Diagnostic Commands:**
```typescript
// Check rate limit statistics
const testIdentifier = 'user123';
const rateLimit = globalSecurityService.checkRateLimit(
  testIdentifier,
  { windowMs: 60000, maxRequests: 100 }
);

console.log('Rate limit status:');
console.log('Allowed:', rateLimit.allowed);
console.log('Remaining:', rateLimit.remaining);
console.log('Reset time:', new Date(rateLimit.resetTime));
```

**Solutions:**

1. **Adjust rate limit thresholds:**
```typescript
import { defaultRateLimits } from '@cvplus/logging';

// Use higher limits for regular operations
app.use(createSecureLoggingMiddleware({
  rateLimitConfig: {
    ...defaultRateLimits.api,
    maxRequests: 2000, // Increased from 100
    enableBurstProtection: true,
    burstThreshold: 200 // Allow bursts up to 200
  }
}));
```

2. **Implement different limits per user type:**
```typescript
// Custom rate limiting based on user type
function getRateLimitConfig(userType: string) {
  switch (userType) {
    case 'premium':
      return { windowMs: 60000, maxRequests: 5000 };
    case 'admin':
      return { windowMs: 60000, maxRequests: 10000 };
    default:
      return defaultRateLimits.api;
  }
}
```

## Error Recovery Issues

### Issue: Circuit Breakers Stuck Open

**Symptoms:**
- Operations failing with "Circuit breaker is OPEN" errors
- Services not recovering automatically
- Persistent error states

**Diagnostic Commands:**
```typescript
const recovery = globalErrorRecovery.getRecoveryStats();

// Check circuit breaker states
Object.entries(recovery.circuitBreakers).forEach(([key, state]) => {
  if (state.state === 'OPEN') {
    console.log(`Circuit breaker OPEN: ${key}`);
    console.log(`Failure count: ${state.failureCount}`);
    console.log(`Last failure: ${new Date(state.lastFailureTime || 0)}`);
    console.log(`Next attempt: ${new Date(state.nextAttemptTime || 0)}`);
  }
});
```

**Root Causes:**
1. Underlying service issues not resolved
2. Circuit breaker thresholds too low
3. Timeout values too short
4. Recovery strategies not working

**Solutions:**

1. **Check underlying service health:**
```typescript
// Manual health check
const services = ['firebase', 'logging', 'storage', 'auth'];
for (const service of services) {
  try {
    // Implement actual health checks
    console.log(`${service}: Checking...`);
    // await actualHealthCheck(service);
    console.log(`${service}: OK`);
  } catch (error) {
    console.log(`${service}: FAILED - ${error.message}`);
  }
}
```

2. **Manually reset circuit breaker:**
```typescript
// Reset all circuit breakers (use with caution)
globalErrorRecovery.reset();
console.log('Circuit breakers reset');
```

3. **Adjust circuit breaker configuration:**
```typescript
// Use more lenient settings
await withRecovery(
  operation,
  'operation-name',
  {
    circuitBreakerThreshold: 10, // Increased from 5
    circuitBreakerTimeoutMs: 120000, // Increased to 2 minutes
    maxRetries: 5,
    fallbackEnabled: true
  }
);
```

4. **Add custom recovery strategies:**
```typescript
// Add service-specific recovery
globalErrorRecovery.addRecoveryStrategy({
  name: 'service_restart',
  condition: (error) => error.message.includes('Service unavailable'),
  action: async () => {
    console.log('Attempting service restart...');
    // Implement service restart logic
    await new Promise(resolve => setTimeout(resolve, 5000));
    return Math.random() > 0.3; // 70% success rate
  },
  priority: 8
});
```

**Prevention:**
- Monitor circuit breaker metrics
- Set appropriate thresholds for your environment
- Implement proper health checks
- Test recovery procedures regularly

### Issue: Fallback Mechanisms Not Working

**Symptoms:**
- Complete operation failures instead of graceful degradation
- No fallback logs being created
- System instability during outages

**Diagnostic Commands:**
```typescript
const recovery = globalErrorRecovery.getRecoveryStats();
console.log('Fallback storage size:', recovery.fallbackStorage);

// Check retry queues
Object.entries(recovery.retryQueues).forEach(([operation, count]) => {
  if (count > 0) {
    console.log(`Retry queue ${operation}: ${count} items`);
  }
});
```

**Solutions:**

1. **Verify fallback configuration:**
```typescript
// Ensure fallback is enabled
await withRecovery(
  operation,
  'critical-operation',
  {
    fallbackEnabled: true, // Must be true
    maxRetries: 3
  }
);
```

2. **Test fallback mechanisms:**
```typescript
// Simulate failure to test fallback
const testOperation = async () => {
  throw new Error('Simulated failure');
};

try {
  await withRecovery(testOperation, 'test-fallback', {
    fallbackEnabled: true,
    maxRetries: 1
  });
} catch (error) {
  console.log('Fallback test result:', error.message);
  // Should show fallback was executed
}
```

## Integration Issues

### Issue: Express Middleware Not Working

**Symptoms:**
- Correlation IDs missing from logs
- Rate limiting not applied
- Security validation skipped

**Diagnostic Commands:**
```typescript
// Test middleware setup
app.use((req, res, next) => {
  console.log('Correlation ID:', req.correlationId);
  console.log('Rate limit headers:', {
    remaining: res.getHeader('X-RateLimit-Remaining'),
    reset: res.getHeader('X-RateLimit-Reset')
  });
  next();
});
```

**Solutions:**

1. **Verify middleware order:**
```typescript
// Correct order is critical
app.use(correlationMiddleware);           // 1. First
app.use(createSecureLoggingMiddleware()); // 2. Second
app.use(yourOtherMiddleware);             // 3. Then others
```

2. **Check middleware configuration:**
```typescript
// Ensure proper configuration
const secureMiddleware = createSecureLoggingMiddleware({
  rateLimitConfig: {
    windowMs: 60000,
    maxRequests: 1000,
    enableBurstProtection: true
  },
  enableSecurityValidation: true
});

app.use('/api', secureMiddleware);
```

### Issue: Package-Specific Loggers Not Working

**Symptoms:**
- Package loggers throwing errors
- Missing specialized logging features
- Import errors

**Solutions:**

1. **Verify imports:**
```typescript
// Check available package loggers
import {
  analyticsLogger,
  premiumLogger,
  recommendationsLogger,
  profilesLogger,
  adminLogger,
  workflowLogger,
  paymentsLogger,
  packageLogging
} from '@cvplus/logging';

// Test each logger
const loggers = {
  analyticsLogger,
  premiumLogger,
  recommendationsLogger,
  profilesLogger,
  adminLogger,
  workflowLogger,
  paymentsLogger
};

Object.entries(loggers).forEach(([name, logger]) => {
  try {
    logger.info(`${name} is working`);
    console.log(`✅ ${name}: OK`);
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
  }
});
```

## Configuration Issues

### Issue: Environment-Specific Configurations

**Symptoms:**
- Wrong log levels in different environments
- Incorrect transport configurations
- Missing environment variables

**Solutions:**

1. **Environment detection:**
```typescript
const environment = process.env.NODE_ENV || 'development';
const config = {
  level: environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableFile: environment !== 'test',
  enableFirebase: environment === 'production',
  enablePiiRedaction: environment !== 'development'
};

const logger = createLogger('service', config);
```

2. **Configuration validation:**
```typescript
// Validate configuration
function validateConfig() {
  const required = ['NODE_ENV'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    process.exit(1);
  }

  console.log('Configuration validated');
}
```

## Emergency Procedures

### Complete System Reset

**When to use:** Critical system failures, corrupted state

```typescript
// 1. Stop all monitoring
import { globalPerformanceMonitor } from '@cvplus/logging';
globalPerformanceMonitor.stopMonitoring();

// 2. Reset all systems
LoggerFactory.reset(); // Clears all loggers and caches
globalErrorRecovery.reset(); // Resets circuit breakers and queues
globalSecurityService.clearSecurityData(); // Clears security metrics
PiiRedaction.reset(); // Resets custom patterns

// 3. Restart monitoring
globalPerformanceMonitor.startMonitoring();

console.log('Complete system reset completed');
```

### Emergency Logging

**When to use:** Primary logging system failure

```typescript
// Minimal console-only logging
const emergencyLogger = createLogger('emergency', {
  level: LogLevel.ERROR,
  enableConsole: true,
  enableFile: false,
  enableFirebase: false,
  enablePiiRedaction: false
});

emergencyLogger.error('Emergency logging activated', {
  timestamp: new Date().toISOString(),
  reason: 'Primary logging system failure'
});
```

### Health Check Script

Save this as a standalone script for system verification:

```typescript
#!/usr/bin/env node
import {
  LoggerFactory,
  getPerformanceStatus,
  globalSecurityService,
  globalErrorRecovery
} from '@cvplus/logging';

async function healthCheck() {
  const results = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    details: {}
  };

  try {
    // System status
    const system = LoggerFactory.getSystemStatus();
    results.details.system = {
      health: system.overallHealth,
      activeLoggers: system.factory.activeLoggers
    };

    // Performance
    const performance = getPerformanceStatus();
    results.details.performance = {
      memoryMB: Math.round((performance.current?.memoryUsage.heapUsed || 0) / 1024 / 1024),
      logsPerSecond: performance.current?.logThroughput.logsPerSecond || 0,
      recommendationsCount: performance.recommendations.length
    };

    // Security
    const security = globalSecurityService.getSecuritySummary();
    results.details.security = {
      riskLevel: security.riskLevel,
      violations: security.totalViolations,
      threats: security.currentThreats
    };

    // Recovery
    const recovery = globalErrorRecovery.getRecoveryReport();
    results.details.recovery = {
      health: recovery.systemHealth,
      issues: recovery.activeIssues.length
    };

    // Determine overall health
    if (system.overallHealth === 'critical' || recovery.systemHealth === 'critical') {
      results.overall = 'critical';
    } else if (system.overallHealth === 'degraded' || recovery.systemHealth === 'degraded') {
      results.overall = 'degraded';
    }

  } catch (error) {
    results.overall = 'error';
    results.error = error.message;
  }

  console.log(JSON.stringify(results, null, 2));
  process.exit(results.overall === 'healthy' ? 0 : 1);
}

healthCheck();
```

## Getting Help

### Diagnostic Information to Collect

When reporting issues, include:

```typescript
// Run this to collect diagnostic information
const diagnostics = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  system: LoggerFactory.getSystemStatus(),
  performance: getPerformanceStatus(),
  security: globalSecurityService.getSecuritySummary(),
  recovery: globalErrorRecovery.getRecoveryReport(),
  environment: {
    NODE_ENV: process.env.NODE_ENV,
    // Add other relevant env vars (excluding secrets)
  }
};

console.log('DIAGNOSTIC REPORT:');
console.log(JSON.stringify(diagnostics, null, 2));
```

### Support Channels

- **GitHub Issues**: For bugs and feature requests
- **Email**: support@cvplus.com
- **Security Issues**: security@cvplus.com
- **Documentation**: [API Docs](../technical/cvplus-logging-system-api-documentation.md)

---

**This troubleshooting guide is actively maintained. Last updated: 2025-09-13**