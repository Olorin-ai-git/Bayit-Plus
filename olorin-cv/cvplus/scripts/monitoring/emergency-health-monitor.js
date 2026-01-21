#!/usr/bin/env node

/**
 * CVPlus Emergency Health Monitoring System
 * Continuous monitoring with automatic rollback triggers
 * Response Time: Real-time monitoring with <2 minute detection
 * Author: Gil Klainert
 * Date: 2025-08-21
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  projectRoot: '/Users/gklainert/Documents/cvplus',
  logDir: '/Users/gklainert/Documents/cvplus/logs/monitoring',
  checkInterval: 30000, // 30 seconds
  alertCooldown: 300000, // 5 minutes between same type alerts
  
  // Health check endpoints
  endpoints: {
    frontend: 'https://cvplus.com',
    api: 'https://cvplus.com/api/health',
    functions: {
      processCV: 'https://us-central1-cvplus.cloudfunctions.net/processCV',
      analyzeCV: 'https://us-central1-cvplus.cloudfunctions.net/analyzeCV',
      generatePodcast: 'https://us-central1-cvplus.cloudfunctions.net/generatePodcast',
      userAuth: 'https://us-central1-cvplus.cloudfunctions.net/userAuth'
    }
  },
  
  // Critical thresholds that trigger automatic rollback
  criticalThresholds: {
    frontendUnavailable: { duration: 30000, action: 'IMMEDIATE_ROLLBACK' }, // 30 seconds
    functionFailureRate: { threshold: 0.5, duration: 120000, action: 'FUNCTIONS_ROLLBACK' }, // 50% failures for 2 minutes
    databaseConnectivity: { failures: 10, duration: 60000, action: 'DATABASE_ROLLBACK' }, // 10 failures in 1 minute
    authenticationFailure: { rate: 0.8, duration: 300000, action: 'AUTH_ROLLBACK' } // 80% auth failures for 5 minutes
  },
  
  // Warning thresholds for monitoring
  warningThresholds: {
    slowResponse: { threshold: 30000, action: 'PERFORMANCE_MONITORING' }, // 30 seconds response time
    errorRate: { threshold: 0.1, duration: 300000, action: 'ERROR_ANALYSIS' }, // 10% errors for 5 minutes
    quotaUsage: { threshold: 0.8, action: 'CAPACITY_MONITORING' } // 80% quota usage
  }
};

// Monitoring state
const monitoringState = {
  startTime: Date.now(),
  lastAlerts: new Map(),
  healthHistory: new Map(),
  alertHistory: [],
  stats: {
    totalChecks: 0,
    failures: 0,
    rollbacksTriggered: 0,
    lastRollback: null
  }
};

// Logging utilities
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...data
  };
  
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  
  // Write to log file
  const logFile = path.join(CONFIG.logDir, `health-monitor-${new Date().toISOString().split('T')[0]}.log`);
  try {
    if (!fs.existsSync(CONFIG.logDir)) {
      fs.mkdirSync(CONFIG.logDir, { recursive: true });
    }
    
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

function logInfo(message, data) { log('info', message, data); }
function logWarning(message, data) { log('warning', message, data); }
function logError(message, data) { log('error', message, data); }
function logCritical(message, data) { log('critical', message, data); }

// HTTP request utility with timeout
function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https:') ? https : http;
    
    const request = protocol.get(url, (response) => {
      const responseTime = Date.now() - startTime;
      const statusCode = response.statusCode;
      
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        resolve({
          statusCode,
          responseTime,
          body: body.substring(0, 1000), // Limit body size
          success: statusCode >= 200 && statusCode < 400
        });
      });
    });
    
    request.on('error', (error) => {
      reject({
        error: error.message,
        responseTime: Date.now() - startTime,
        success: false
      });
    });
    
    request.setTimeout(timeout, () => {
      request.destroy();
      reject({
        error: 'Request timeout',
        responseTime: timeout,
        success: false
      });
    });
  });
}

// Health check functions
async function checkEndpointHealth(name, url) {
  try {
    const result = await makeRequest(url);
    
    const healthData = {
      name,
      url,
      timestamp: Date.now(),
      success: result.success,
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      error: result.error || null
    };
    
    // Update health history
    if (!monitoringState.healthHistory.has(name)) {
      monitoringState.healthHistory.set(name, []);
    }
    
    const history = monitoringState.healthHistory.get(name);
    history.push(healthData);
    
    // Keep only last 100 checks
    if (history.length > 100) {
      history.shift();
    }
    
    return healthData;
    
  } catch (error) {
    const healthData = {
      name,
      url,
      timestamp: Date.now(),
      success: false,
      error: error.message || 'Unknown error',
      responseTime: 0
    };
    
    logError(`Health check failed for ${name}`, healthData);
    return healthData;
  }
}

async function checkSystemHealth() {
  logInfo('Starting system health check cycle');
  monitoringState.stats.totalChecks++;
  
  const healthResults = [];
  
  // Check frontend
  healthResults.push(await checkEndpointHealth('frontend', CONFIG.endpoints.frontend));
  
  // Check API
  healthResults.push(await checkEndpointHealth('api', CONFIG.endpoints.api));
  
  // Check critical functions
  for (const [funcName, funcUrl] of Object.entries(CONFIG.endpoints.functions)) {
    healthResults.push(await checkEndpointHealth(`function_${funcName}`, funcUrl));
  }
  
  // Analyze results and trigger alerts if needed
  await analyzeHealthResults(healthResults);
  
  return healthResults;
}

// Alert analysis and triggers
async function analyzeHealthResults(healthResults) {
  const now = Date.now();
  
  // Check for critical failures
  const frontendHealth = healthResults.find(r => r.name === 'frontend');
  if (!frontendHealth.success) {
    await checkCriticalThreshold('frontendUnavailable', true, now);
  }
  
  // Check function failure rate
  const functionResults = healthResults.filter(r => r.name.startsWith('function_'));
  const functionFailureRate = functionResults.filter(r => !r.success).length / functionResults.length;
  
  if (functionFailureRate > 0) {
    await checkCriticalThreshold('functionFailureRate', functionFailureRate, now);
  }
  
  // Check for slow responses
  const slowResponses = healthResults.filter(r => r.success && r.responseTime > CONFIG.warningThresholds.slowResponse.threshold);
  if (slowResponses.length > 0) {
    await checkWarningThreshold('slowResponse', slowResponses, now);
  }
  
  // Update failure count
  const failures = healthResults.filter(r => !r.success).length;
  monitoringState.stats.failures += failures;
  
  logInfo(`Health check completed: ${healthResults.length - failures}/${healthResults.length} services healthy`);
}

async function checkCriticalThreshold(thresholdName, currentValue, timestamp) {
  const threshold = CONFIG.criticalThresholds[thresholdName];
  if (!threshold) return;
  
  const key = `critical_${thresholdName}`;
  
  // Check if we've already triggered this alert recently
  const lastAlert = monitoringState.lastAlerts.get(key);
  if (lastAlert && (timestamp - lastAlert) < CONFIG.alertCooldown) {
    return; // Still in cooldown
  }
  
  // Check threshold conditions
  let shouldTrigger = false;
  
  switch (thresholdName) {
    case 'frontendUnavailable':
      // For immediate triggers, check if frontend has been down
      shouldTrigger = currentValue === true;
      break;
      
    case 'functionFailureRate':
      // Check if failure rate exceeds threshold
      shouldTrigger = currentValue >= threshold.threshold;
      break;
      
    default:
      shouldTrigger = currentValue >= threshold.threshold;
  }
  
  if (shouldTrigger) {
    await triggerEmergencyResponse(thresholdName, threshold.action, currentValue, timestamp);
    monitoringState.lastAlerts.set(key, timestamp);
  }
}

async function checkWarningThreshold(thresholdName, data, timestamp) {
  const key = `warning_${thresholdName}`;
  
  // Check cooldown
  const lastAlert = monitoringState.lastAlerts.get(key);
  if (lastAlert && (timestamp - lastAlert) < CONFIG.alertCooldown) {
    return;
  }
  
  logWarning(`Warning threshold triggered: ${thresholdName}`, { data, timestamp });
  monitoringState.lastAlerts.set(key, timestamp);
}

// Emergency response system
async function triggerEmergencyResponse(thresholdName, action, triggerValue, timestamp) {
  const incidentId = `AUTO-${Date.now()}`;
  
  logCritical(`EMERGENCY: ${thresholdName} threshold exceeded`, {
    incidentId,
    action,
    triggerValue,
    timestamp
  });
  
  // Record the alert
  monitoringState.alertHistory.push({
    incidentId,
    thresholdName,
    action,
    triggerValue,
    timestamp,
    autoTriggered: true
  });
  
  // Execute appropriate emergency response
  switch (action) {
    case 'IMMEDIATE_ROLLBACK':
      await executeEmergencyRollback(incidentId, 'critical', 'System unavailable - automated rollback triggered');
      break;
      
    case 'FUNCTIONS_ROLLBACK':
      await executeFunctionsRollback(incidentId, triggerValue);
      break;
      
    case 'DATABASE_ROLLBACK':
      await executeDatabaseRollback(incidentId);
      break;
      
    default:
      logError(`Unknown emergency action: ${action}`, { incidentId, thresholdName });
  }
}

async function executeEmergencyRollback(incidentId, severity, reason) {
  logCritical(`Executing emergency system rollback`, { incidentId, severity, reason });
  
  try {
    const rollbackScript = path.join(CONFIG.projectRoot, 'scripts/emergency/critical-rollback.sh');
    
    if (!fs.existsSync(rollbackScript)) {
      logError('Emergency rollback script not found', { script: rollbackScript });
      return false;
    }
    
    const rollbackProcess = spawn(rollbackScript, [
      '--auto-confirm',
      `--reason=${reason}`,
      '--target-deployment=last-stable'
    ], {
      stdio: 'pipe',
      cwd: CONFIG.projectRoot
    });
    
    let output = '';
    rollbackProcess.stdout.on('data', (data) => {
      output += data.toString();
      logInfo(`Rollback output: ${data.toString().trim()}`);
    });
    
    rollbackProcess.stderr.on('data', (data) => {
      logError(`Rollback error: ${data.toString().trim()}`);
    });
    
    rollbackProcess.on('close', (code) => {
      if (code === 0) {
        logCritical(`Emergency rollback completed successfully`, { incidentId, code });
        monitoringState.stats.rollbacksTriggered++;
        monitoringState.stats.lastRollback = Date.now();
      } else {
        logCritical(`Emergency rollback failed`, { incidentId, code, output });
      }
    });
    
    return true;
    
  } catch (error) {
    logError('Failed to execute emergency rollback', { incidentId, error: error.message });
    return false;
  }
}

async function executeFunctionsRollback(incidentId, failureRate) {
  logCritical(`Executing functions rollback`, { incidentId, failureRate });
  
  try {
    const rollbackScript = path.join(CONFIG.projectRoot, 'scripts/emergency/functions-rollback.sh');
    
    const rollbackProcess = spawn(rollbackScript, [
      '--target=last-stable',
      '--batch-size=10',
      '--delay=30'
    ], {
      stdio: 'pipe',
      cwd: CONFIG.projectRoot
    });
    
    rollbackProcess.on('close', (code) => {
      if (code === 0) {
        logCritical(`Functions rollback completed`, { incidentId, code });
        monitoringState.stats.rollbacksTriggered++;
      } else {
        logCritical(`Functions rollback failed`, { incidentId, code });
      }
    });
    
    return true;
    
  } catch (error) {
    logError('Failed to execute functions rollback', { incidentId, error: error.message });
    return false;
  }
}

async function executeDatabaseRollback(incidentId) {
  logCritical(`Database rollback would be triggered`, { 
    incidentId,
    note: 'Database rollback requires manual approval for safety'
  });
  
  // Database rollbacks are too risky for full automation
  // Instead, we log the requirement and alert the team
  return false;
}

// Reporting and status
function generateStatusReport() {
  const uptime = Date.now() - monitoringState.startTime;
  const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
  
  const report = {
    timestamp: new Date().toISOString(),
    uptime: {
      milliseconds: uptime,
      hours: uptimeHours
    },
    stats: monitoringState.stats,
    recentAlerts: monitoringState.alertHistory.slice(-10),
    healthSummary: generateHealthSummary()
  };
  
  // Save report
  const reportFile = path.join(CONFIG.logDir, `status-report-${Date.now()}.json`);
  try {
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logInfo(`Status report generated: ${reportFile}`);
  } catch (error) {
    logError('Failed to save status report', { error: error.message });
  }
  
  return report;
}

function generateHealthSummary() {
  const summary = {};
  
  for (const [serviceName, history] of monitoringState.healthHistory.entries()) {
    const recent = history.slice(-10); // Last 10 checks
    const successRate = recent.filter(h => h.success).length / recent.length;
    const avgResponseTime = recent.reduce((sum, h) => sum + (h.responseTime || 0), 0) / recent.length;
    
    summary[serviceName] = {
      successRate: (successRate * 100).toFixed(1) + '%',
      averageResponseTime: Math.round(avgResponseTime) + 'ms',
      lastCheck: recent[recent.length - 1]?.timestamp || null,
      status: successRate >= 0.9 ? 'healthy' : successRate >= 0.7 ? 'degraded' : 'unhealthy'
    };
  }
  
  return summary;
}

// Signal handlers for graceful shutdown
process.on('SIGINT', () => {
  logInfo('Received SIGINT, generating final report and shutting down...');
  generateStatusReport();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logInfo('Received SIGTERM, generating final report and shutting down...');
  generateStatusReport();
  process.exit(0);
});

// Main monitoring loop
async function startMonitoring() {
  logInfo('Starting CVPlus Emergency Health Monitoring System', {
    version: '1.0.0',
    checkInterval: CONFIG.checkInterval,
    endpoints: Object.keys(CONFIG.endpoints)
  });
  
  // Initial health check
  await checkSystemHealth();
  
  // Start monitoring loop
  const monitoringInterval = setInterval(async () => {
    try {
      await checkSystemHealth();
    } catch (error) {
      logError('Monitoring cycle failed', { error: error.message });
    }
  }, CONFIG.checkInterval);
  
  // Generate status reports every 15 minutes
  const reportInterval = setInterval(() => {
    try {
      generateStatusReport();
    } catch (error) {
      logError('Failed to generate status report', { error: error.message });
    }
  }, 15 * 60 * 1000);
  
  logInfo('Health monitoring system started successfully');
  
  // Keep the process running
  return { monitoringInterval, reportInterval };
}

// Export for testing
module.exports = {
  startMonitoring,
  checkSystemHealth,
  generateStatusReport,
  CONFIG,
  monitoringState
};

// Start monitoring if run directly
if (require.main === module) {
  startMonitoring().catch((error) => {
    logCritical('Failed to start monitoring system', { error: error.message });
    process.exit(1);
  });
}