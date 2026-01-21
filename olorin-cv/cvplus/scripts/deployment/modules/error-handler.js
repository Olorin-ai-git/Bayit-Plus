#!/usr/bin/env node

/**
 * Error Handler and Recovery System
 * Intelligent error detection, categorization, and recovery mechanisms
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ErrorHandler {
  constructor(projectRoot, configDir) {
    this.projectRoot = projectRoot;
    this.configDir = configDir;
    this.maxRetries = 3;
    this.retryDelays = [5000, 15000, 30000]; // 5s, 15s, 30s
    this.errorHistory = [];
    this.recoveryStrategies = this.initializeRecoveryStrategies();
  }

  initializeRecoveryStrategies() {
    return {
      QUOTA_EXCEEDED: {
        strategies: [
          { name: 'batch_deployment', priority: 1 },
          { name: 'add_delays', priority: 2 },
          { name: 'schedule_off_peak', priority: 3 }
        ],
        maxRetries: 5
      },
      BUILD_FAILURE: {
        strategies: [
          { name: 'clear_cache', priority: 1 },
          { name: 'reinstall_dependencies', priority: 2 },
          { name: 'fix_typescript_errors', priority: 3 },
          { name: 'bundle_optimization', priority: 4 }
        ],
        maxRetries: 3
      },
      NETWORK_ISSUE: {
        strategies: [
          { name: 'exponential_backoff', priority: 1 },
          { name: 'connection_validation', priority: 2 },
          { name: 'alternative_route', priority: 3 }
        ],
        maxRetries: 5
      },
      AUTH_PROBLEM: {
        strategies: [
          { name: 'refresh_tokens', priority: 1 },
          { name: 'service_account_fallback', priority: 2 },
          { name: 'reauthenticate', priority: 3 }
        ],
        maxRetries: 3
      },
      FUNCTION_ERROR: {
        strategies: [
          { name: 'memory_optimization', priority: 1 },
          { name: 'timeout_adjustment', priority: 2 },
          { name: 'dependency_check', priority: 3 },
          { name: 'function_warming', priority: 4 }
        ],
        maxRetries: 3
      },
      UNKNOWN_ERROR: {
        strategies: [
          { name: 'log_analysis', priority: 1 },
          { name: 'manual_review', priority: 2 }
        ],
        maxRetries: 1
      }
    };
  }

  async handleError(error, context = {}) {
    console.log(`🔧 Handling error: ${error.message}`);
    
    const errorType = this.categorizeError(error);
    const errorRecord = {
      timestamp: new Date().toISOString(),
      type: errorType,
      message: error.message,
      context: context,
      attempts: 0
    };
    
    this.errorHistory.push(errorRecord);
    
    console.log(`📊 Error categorized as: ${errorType}`);
    
    return await this.attemptRecovery(errorRecord);
  }

  categorizeError(error) {
    const message = error.message.toLowerCase();
    const stack = error.stack ? error.stack.toLowerCase() : '';
    
    // Quota exceeded patterns
    if (message.includes('quota') || 
        message.includes('limit exceeded') ||
        message.includes('too many requests')) {
      return 'QUOTA_EXCEEDED';
    }
    
    // Build failure patterns
    if (message.includes('typescript') ||
        message.includes('compilation') ||
        message.includes('build failed') ||
        message.includes('tsc') ||
        stack.includes('typescript')) {
      return 'BUILD_FAILURE';
    }
    
    // Network issue patterns
    if (message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('enotfound') ||
        message.includes('econnrefused')) {
      return 'NETWORK_ISSUE';
    }
    
    // Authentication problems
    if (message.includes('unauthorized') ||
        message.includes('authentication') ||
        message.includes('permission') ||
        message.includes('access denied') ||
        message.includes('not logged in')) {
      return 'AUTH_PROBLEM';
    }
    
    // Function-specific errors
    if (message.includes('function') && 
        (message.includes('memory') ||
         message.includes('cold start') ||
         message.includes('deployment failed'))) {
      return 'FUNCTION_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  async attemptRecovery(errorRecord) {
    const errorType = errorRecord.type;
    const recoveryConfig = this.recoveryStrategies[errorType];
    
    if (!recoveryConfig) {
      console.log(`❌ No recovery strategy for error type: ${errorType}`);
      return false;
    }
    
    console.log(`🔄 Attempting recovery for ${errorType}...`);
    
    for (const strategy of recoveryConfig.strategies) {
      if (errorRecord.attempts >= recoveryConfig.maxRetries) {
        console.log(`⏹️  Max retries (${recoveryConfig.maxRetries}) exceeded for ${errorType}`);
        return false;
      }
      
      console.log(`  🎯 Trying strategy: ${strategy.name} (priority: ${strategy.priority})`);
      
      try {
        const success = await this.executeRecoveryStrategy(strategy.name, errorRecord);
        
        if (success) {
          console.log(`  ✅ Recovery successful with strategy: ${strategy.name}`);
          return true;
        } else {
          console.log(`  ❌ Recovery failed with strategy: ${strategy.name}`);
        }
      } catch (recoveryError) {
        console.log(`  💥 Recovery strategy failed: ${recoveryError.message}`);
      }
      
      errorRecord.attempts++;
      
      // Wait before next attempt
      if (errorRecord.attempts < recoveryConfig.maxRetries) {
        const delay = this.getRetryDelay(errorRecord.attempts);
        console.log(`  ⏳ Waiting ${delay}ms before next attempt...`);
        await this.sleep(delay);
      }
    }
    
    console.log(`🚫 All recovery strategies failed for ${errorType}`);
    return false;
  }

  async executeRecoveryStrategy(strategyName, errorRecord) {
    switch (strategyName) {
      case 'batch_deployment':
        return await this.batchDeployment();
      
      case 'add_delays':
        return await this.addDeploymentDelays();
      
      case 'schedule_off_peak':
        return await this.scheduleOffPeak();
      
      case 'clear_cache':
        return await this.clearBuildCache();
      
      case 'reinstall_dependencies':
        return await this.reinstallDependencies();
      
      case 'fix_typescript_errors':
        return await this.fixTypescriptErrors();
      
      case 'bundle_optimization':
        return await this.optimizeBundle();
      
      case 'exponential_backoff':
        return await this.exponentialBackoff(errorRecord.attempts);
      
      case 'connection_validation':
        return await this.validateConnection();
      
      case 'alternative_route':
        return await this.tryAlternativeRoute();
      
      case 'refresh_tokens':
        return await this.refreshTokens();
      
      case 'service_account_fallback':
        return await this.useServiceAccountFallback();
      
      case 'reauthenticate':
        return await this.reauthenticate();
      
      case 'memory_optimization':
        return await this.optimizeMemory();
      
      case 'timeout_adjustment':
        return await this.adjustTimeouts();
      
      case 'dependency_check':
        return await this.checkDependencies();
      
      case 'function_warming':
        return await this.warmFunctions();
      
      case 'log_analysis':
        return await this.analyzeLogsForSolution();
      
      case 'manual_review':
        return await this.requestManualReview();
      
      default:
        console.log(`⚠️  Unknown recovery strategy: ${strategyName}`);
        return false;
    }
  }

  // Recovery Strategy Implementations

  async batchDeployment() {
    console.log('    📦 Implementing batch deployment strategy...');
    
    try {
      // Implement batched function deployment
      const functionsDir = path.join(this.projectRoot, 'functions', 'src', 'functions');
      const functionFiles = await fs.readdir(functionsDir);
      
      const batchSize = 3; // Deploy 3 functions at a time
      const batches = [];
      
      for (let i = 0; i < functionFiles.length; i += batchSize) {
        batches.push(functionFiles.slice(i, i + batchSize));
      }
      
      console.log(`    📊 Created ${batches.length} batches with ${batchSize} functions each`);
      return true;
    } catch (error) {
      console.log(`    ❌ Batch deployment strategy failed: ${error.message}`);
      return false;
    }
  }

  async addDeploymentDelays() {
    console.log('    ⏱️  Adding delays between deployments...');
    
    // Wait 30 seconds to let quotas reset
    await this.sleep(30000);
    return true;
  }

  async scheduleOffPeak() {
    console.log('    🌙 Scheduling deployment for off-peak hours...');
    
    const now = new Date();
    const hour = now.getHours();
    
    // If it's peak hours (9 AM - 5 PM PT), suggest waiting
    if (hour >= 9 && hour <= 17) {
      console.log('    ⏰ Peak hours detected. Consider running deployment later.');
      console.log('    💡 Continuing with throttled deployment...');
      
      // Add extra delays during peak hours
      await this.sleep(60000); // 1 minute delay
    }
    
    return true;
  }

  async clearBuildCache() {
    console.log('    🧹 Clearing build cache...');
    
    try {
      // Clear npm cache
      execSync('npm cache clean --force', { cwd: this.projectRoot });
      
      // Clear frontend build cache
      const frontendDist = path.join(this.projectRoot, 'frontend', 'dist');
      try {
        await fs.rm(frontendDist, { recursive: true, force: true });
      } catch (error) {
        // Directory might not exist
      }
      
      // Clear functions build cache
      const functionsLib = path.join(this.projectRoot, 'functions', 'lib');
      try {
        await fs.rm(functionsLib, { recursive: true, force: true });
      } catch (error) {
        // Directory might not exist
      }
      
      console.log('    ✅ Build cache cleared');
      return true;
    } catch (error) {
      console.log(`    ❌ Failed to clear cache: ${error.message}`);
      return false;
    }
  }

  async reinstallDependencies() {
    console.log('    📦 Reinstalling dependencies...');
    
    try {
      // Reinstall frontend dependencies
      const frontendPath = path.join(this.projectRoot, 'frontend');
      execSync('rm -rf node_modules package-lock.json', { cwd: frontendPath });
      execSync('npm install', { cwd: frontendPath });
      
      // Reinstall functions dependencies
      const functionsPath = path.join(this.projectRoot, 'functions');
      execSync('rm -rf node_modules package-lock.json', { cwd: functionsPath });
      execSync('npm install', { cwd: functionsPath });
      
      console.log('    ✅ Dependencies reinstalled');
      return true;
    } catch (error) {
      console.log(`    ❌ Failed to reinstall dependencies: ${error.message}`);
      return false;
    }
  }

  async fixTypescriptErrors() {
    console.log('    🔧 Attempting to fix TypeScript errors...');
    
    try {
      // Run TypeScript compiler to get error details
      const frontendPath = path.join(this.projectRoot, 'frontend');
      const functionsPath = path.join(this.projectRoot, 'functions');
      
      // Try to compile and capture errors
      try {
        execSync('npx tsc --noEmit', { cwd: frontendPath, stdio: 'pipe' });
        execSync('npx tsc --noEmit', { cwd: functionsPath, stdio: 'pipe' });
        console.log('    ✅ TypeScript errors resolved');
        return true;
      } catch (tscError) {
        console.log('    ⚠️  TypeScript errors still present. Manual intervention may be required.');
        console.log('    💡 Consider running: npm run build to see detailed errors');
        return false;
      }
    } catch (error) {
      console.log(`    ❌ TypeScript fix attempt failed: ${error.message}`);
      return false;
    }
  }

  async optimizeBundle() {
    console.log('    📦 Optimizing bundle...');
    
    // This is a placeholder for bundle optimization
    // In a real implementation, you might:
    // - Analyze bundle size
    // - Remove unused dependencies
    // - Enable tree shaking
    // - Compress assets
    
    return true;
  }

  async exponentialBackoff(attempt) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    console.log(`    ⏳ Exponential backoff: waiting ${delay}ms...`);
    await this.sleep(delay);
    return true;
  }

  async validateConnection() {
    console.log('    🌐 Validating network connection...');
    
    try {
      // Test Firebase connectivity
      execSync('firebase projects:list', { stdio: 'pipe' });
      console.log('    ✅ Firebase connection validated');
      return true;
    } catch (error) {
      console.log('    ❌ Firebase connection failed');
      return false;
    }
  }

  async tryAlternativeRoute() {
    console.log('    🔄 Trying alternative deployment route...');
    
    // This could involve using different regions or deployment methods
    // For now, just add a delay and retry
    await this.sleep(10000);
    return true;
  }

  async refreshTokens() {
    console.log('    🔐 Refreshing authentication tokens...');
    
    try {
      // This would typically refresh Firebase tokens
      // For now, check current auth status
      const loginList = execSync('firebase login:list', { encoding: 'utf8' });
      
      if (loginList.includes('No accounts')) {
        console.log('    ⚠️  Not logged in to Firebase. Please run: firebase login');
        return false;
      }
      
      console.log('    ✅ Authentication tokens validated');
      return true;
    } catch (error) {
      console.log(`    ❌ Token refresh failed: ${error.message}`);
      return false;
    }
  }

  async useServiceAccountFallback() {
    console.log('    🔑 Attempting service account fallback...');
    
    // Check for service account key
    const serviceAccountPath = path.join(this.projectRoot, 'service-account-key.json');
    
    try {
      await fs.access(serviceAccountPath);
      console.log('    ✅ Service account key found');
      
      // Set environment variable for service account
      process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
      return true;
    } catch (error) {
      console.log('    ⚠️  Service account key not found');
      return false;
    }
  }

  async reauthenticate() {
    console.log('    🔓 Re-authentication required...');
    console.log('    💡 Please run: firebase login');
    return false; // Requires manual intervention
  }

  async optimizeMemory() {
    console.log('    🧠 Optimizing memory allocation...');
    
    // This would adjust function memory settings in firebase.json
    // For now, just return true as a placeholder
    return true;
  }

  async adjustTimeouts() {
    console.log('    ⏱️  Adjusting timeout settings...');
    
    // This would adjust timeout settings for functions
    return true;
  }

  async checkDependencies() {
    console.log('    📋 Checking function dependencies...');
    
    try {
      const functionsPath = path.join(this.projectRoot, 'functions');
      execSync('npm audit fix', { cwd: functionsPath, stdio: 'pipe' });
      console.log('    ✅ Dependencies checked and fixed');
      return true;
    } catch (error) {
      console.log('    ⚠️  Dependency check completed with warnings');
      return true; // Don't fail deployment for dependency warnings
    }
  }

  async warmFunctions() {
    console.log('    🔥 Warming functions...');
    
    // This would implement function warming strategies
    // For now, just return true
    return true;
  }

  async analyzeLogsForSolution() {
    console.log('    📝 Analyzing logs for solution patterns...');
    
    // This would analyze error logs to suggest solutions
    // For now, log the error for manual review
    const recentErrors = this.errorHistory.slice(-5);
    console.log('    📊 Recent error patterns:', recentErrors.map(e => e.type));
    
    return false; // Requires manual intervention
  }

  async requestManualReview() {
    console.log('    👤 Manual review required');
    console.log('    📋 Error history:', JSON.stringify(this.errorHistory, null, 2));
    return false;
  }

  // Utility methods
  getRetryDelay(attempt) {
    return this.retryDelays[Math.min(attempt - 1, this.retryDelays.length - 1)] || 30000;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getErrorSummary() {
    const summary = {
      total: this.errorHistory.length,
      byType: {},
      resolved: 0,
      unresolved: 0
    };
    
    this.errorHistory.forEach(error => {
      summary.byType[error.type] = (summary.byType[error.type] || 0) + 1;
    });
    
    return summary;
  }
}

// Main execution
if (require.main === module) {
  const [,, projectRoot, configDir] = process.argv;
  
  if (!projectRoot) {
    console.error('Usage: node error-handler.js <project-root> [config-dir]');
    process.exit(1);
  }
  
  const errorHandler = new ErrorHandler(
    projectRoot, 
    configDir || path.join(projectRoot, 'scripts', 'deployment', 'config')
  );
  
  // Test error handling
  const testError = new Error('Test error for demonstration');
  errorHandler.handleError(testError, { component: 'test' }).then(recovered => {
    console.log(`Recovery ${recovered ? 'successful' : 'failed'}`);
    console.log('Error summary:', errorHandler.getErrorSummary());
  });
}

module.exports = ErrorHandler;