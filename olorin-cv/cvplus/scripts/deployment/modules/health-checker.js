#!/usr/bin/env node

/**
 * Health Checker and Validation Framework
 * Post-deployment validation and health monitoring
 */

const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class HealthChecker {
  constructor(projectRoot, configDir) {
    this.projectRoot = projectRoot;
    this.configDir = configDir;
    this.healthChecks = [];
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      skipped: []
    };
    this.timeout = 30000; // 30 seconds
  }

  async runHealthChecks() {
    console.log('🏥 Starting post-deployment health checks...');
    
    try {
      await this.initializeChecks();
      await this.runAllChecks();
      return this.generateHealthReport();
    } catch (error) {
      console.log(`❌ Health check failed: ${error.message}`);
      throw error;
    }
  }

  async initializeChecks() {
    // Get Firebase project info
    this.projectInfo = await this.getProjectInfo();
    
    // Initialize health check suite
    this.healthChecks = [
      { name: 'firebase_project_connectivity', priority: 1, critical: true },
      { name: 'functions_deployment_status', priority: 1, critical: true },
      { name: 'hosting_accessibility', priority: 1, critical: true },
      { name: 'firestore_connectivity', priority: 2, critical: true },
      { name: 'storage_accessibility', priority: 2, critical: true },
      { name: 'function_endpoints_health', priority: 3, critical: false },
      { name: 'cors_configuration', priority: 3, critical: false },
      { name: 'performance_benchmarks', priority: 4, critical: false },
      { name: 'security_validation', priority: 4, critical: false },
      { name: 'api_integration_tests', priority: 5, critical: false }
    ];
    
    console.log(`  📋 Initialized ${this.healthChecks.length} health checks`);
  }

  async runAllChecks() {
    console.log('  🔍 Running health checks...');
    
    // Sort by priority
    const sortedChecks = this.healthChecks.sort((a, b) => a.priority - b.priority);
    
    for (const check of sortedChecks) {
      try {
        console.log(`    🔍 ${check.name}...`);
        
        const result = await this.runHealthCheck(check.name);
        
        if (result.status === 'passed') {
          this.results.passed.push({ ...check, ...result });
          console.log(`      ✅ ${check.name}: PASSED`);
        } else if (result.status === 'warning') {
          this.results.warnings.push({ ...check, ...result });
          console.log(`      ⚠️  ${check.name}: WARNING - ${result.message}`);
        } else if (result.status === 'failed') {
          this.results.failed.push({ ...check, ...result });
          console.log(`      ❌ ${check.name}: FAILED - ${result.message}`);
          
          // Stop on critical failures
          if (check.critical) {
            console.log(`      🛑 Critical check failed, stopping health checks`);
            break;
          }
        } else {
          this.results.skipped.push({ ...check, ...result });
          console.log(`      ⏭️  ${check.name}: SKIPPED - ${result.message}`);
        }
        
      } catch (error) {
        const failureResult = {
          status: 'failed',
          message: error.message,
          error: error.stack
        };
        
        this.results.failed.push({ ...check, ...failureResult });
        console.log(`      💥 ${check.name}: ERROR - ${error.message}`);
        
        if (check.critical) {
          console.log(`      🛑 Critical check error, stopping health checks`);
          break;
        }
      }
    }
  }

  async runHealthCheck(checkName) {
    switch (checkName) {
      case 'firebase_project_connectivity':
        return await this.checkFirebaseProjectConnectivity();
      
      case 'functions_deployment_status':
        return await this.checkFunctionsDeploymentStatus();
      
      case 'hosting_accessibility':
        return await this.checkHostingAccessibility();
      
      case 'firestore_connectivity':
        return await this.checkFirestoreConnectivity();
      
      case 'storage_accessibility':
        return await this.checkStorageAccessibility();
      
      case 'function_endpoints_health':
        return await this.checkFunctionEndpointsHealth();
      
      case 'cors_configuration':
        return await this.checkCorsConfiguration();
      
      case 'performance_benchmarks':
        return await this.checkPerformanceBenchmarks();
      
      case 'security_validation':
        return await this.checkSecurityValidation();
      
      case 'api_integration_tests':
        return await this.checkApiIntegrationTests();
      
      default:
        return {
          status: 'skipped',
          message: `Unknown health check: ${checkName}`
        };
    }
  }

  async checkFirebaseProjectConnectivity() {
    try {
      const projectList = execSync('firebase projects:list --json', { 
        encoding: 'utf8',
        timeout: this.timeout 
      });
      
      const projects = JSON.parse(projectList);
      const currentProject = this.projectInfo?.projectId;
      
      if (currentProject && projects.some(p => p.projectId === currentProject)) {
        return {
          status: 'passed',
          message: `Connected to project: ${currentProject}`,
          details: { projectId: currentProject, projectCount: projects.length }
        };
      } else {
        return {
          status: 'failed',
          message: 'Current project not found in accessible projects'
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        message: `Firebase connectivity failed: ${error.message}`
      };
    }
  }

  async checkFunctionsDeploymentStatus() {
    try {
      const functionsList = execSync('firebase functions:list --json', { 
        encoding: 'utf8',
        timeout: this.timeout,
        cwd: this.projectRoot
      });
      
      const functions = JSON.parse(functionsList);
      const deployedFunctions = functions.filter(f => f.status === 'ACTIVE');
      
      if (deployedFunctions.length === 0) {
        return {
          status: 'warning',
          message: 'No active functions found',
          details: { totalFunctions: functions.length, activeFunctions: 0 }
        };
      }
      
      const failedFunctions = functions.filter(f => f.status !== 'ACTIVE');
      
      if (failedFunctions.length > 0) {
        return {
          status: 'warning',
          message: `${failedFunctions.length} functions are not active`,
          details: { 
            totalFunctions: functions.length,
            activeFunctions: deployedFunctions.length,
            failedFunctions: failedFunctions.map(f => ({ name: f.name, status: f.status }))
          }
        };
      }
      
      return {
        status: 'passed',
        message: `${deployedFunctions.length} functions are active`,
        details: { totalFunctions: functions.length, activeFunctions: deployedFunctions.length }
      };
      
    } catch (error) {
      return {
        status: 'failed',
        message: `Functions status check failed: ${error.message}`
      };
    }
  }

  async checkHostingAccessibility() {
    try {
      const projectId = this.projectInfo?.projectId;
      if (!projectId) {
        return {
          status: 'failed',
          message: 'Project ID not available for hosting check'
        };
      }
      
      const hostingUrl = `https://${projectId}.web.app`;
      
      const response = await this.httpRequest(hostingUrl, { timeout: this.timeout });
      
      if (response.statusCode === 200) {
        return {
          status: 'passed',
          message: 'Hosting site is accessible',
          details: { 
            url: hostingUrl, 
            statusCode: response.statusCode,
            responseTime: response.responseTime 
          }
        };
      } else {
        return {
          status: 'warning',
          message: `Hosting returned status ${response.statusCode}`,
          details: { url: hostingUrl, statusCode: response.statusCode }
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        message: `Hosting accessibility check failed: ${error.message}`
      };
    }
  }

  async checkFirestoreConnectivity() {
    try {
      // Test Firestore connection using Firebase CLI
      const result = execSync('firebase firestore:databases:list --json', { 
        encoding: 'utf8',
        timeout: this.timeout,
        cwd: this.projectRoot
      });
      
      const databases = JSON.parse(result);
      
      if (databases && databases.length > 0) {
        return {
          status: 'passed',
          message: 'Firestore is accessible',
          details: { databases: databases.length }
        };
      } else {
        return {
          status: 'warning',
          message: 'No Firestore databases found'
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        message: `Firestore connectivity check failed: ${error.message}`
      };
    }
  }

  async checkStorageAccessibility() {
    try {
      // Test Storage access using Firebase CLI
      const result = execSync('firebase storage:buckets:list --json', { 
        encoding: 'utf8',
        timeout: this.timeout,
        cwd: this.projectRoot
      });
      
      const buckets = JSON.parse(result);
      
      if (buckets && buckets.length > 0) {
        return {
          status: 'passed',
          message: 'Firebase Storage is accessible',
          details: { buckets: buckets.length }
        };
      } else {
        return {
          status: 'warning',
          message: 'No Storage buckets found'
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        message: `Storage accessibility check failed: ${error.message}`
      };
    }
  }

  async checkFunctionEndpointsHealth() {
    try {
      const projectId = this.projectInfo?.projectId;
      if (!projectId) {
        return {
          status: 'skipped',
          message: 'Project ID not available for endpoint testing'
        };
      }
      
      // Test some common function endpoints
      const testEndpoints = [
        'generateCV',
        'optimizeCV',
        'generatePodcast'
      ];
      
      const results = [];
      
      for (const endpoint of testEndpoints) {
        try {
          const url = `https://us-central1-${projectId}.cloudfunctions.net/${endpoint}`;
          const response = await this.httpRequest(url, { 
            method: 'GET',
            timeout: 10000 
          });
          
          results.push({
            endpoint: endpoint,
            status: response.statusCode,
            responseTime: response.responseTime,
            accessible: response.statusCode < 500
          });
        } catch (error) {
          results.push({
            endpoint: endpoint,
            status: 'error',
            error: error.message,
            accessible: false
          });
        }
      }
      
      const accessibleEndpoints = results.filter(r => r.accessible);
      
      if (accessibleEndpoints.length === results.length) {
        return {
          status: 'passed',
          message: `All ${results.length} endpoints are accessible`,
          details: { endpoints: results }
        };
      } else if (accessibleEndpoints.length > 0) {
        return {
          status: 'warning',
          message: `${accessibleEndpoints.length}/${results.length} endpoints accessible`,
          details: { endpoints: results }
        };
      } else {
        return {
          status: 'failed',
          message: 'No function endpoints are accessible',
          details: { endpoints: results }
        };
      }
      
    } catch (error) {
      return {
        status: 'failed',
        message: `Endpoint health check failed: ${error.message}`
      };
    }
  }

  async checkCorsConfiguration() {
    try {
      const corsConfigPath = path.join(this.projectRoot, 'cors.json');
      const corsExists = await fs.access(corsConfigPath).then(() => true).catch(() => false);
      
      if (!corsExists) {
        return {
          status: 'warning',
          message: 'CORS configuration file not found',
          details: { configPath: corsConfigPath }
        };
      }
      
      const corsConfig = JSON.parse(await fs.readFile(corsConfigPath, 'utf8'));
      
      // Basic CORS validation
      const issues = [];
      
      if (corsConfig.some && corsConfig.some(config => config.origin.includes('*'))) {
        issues.push('Wildcard origins detected - consider restricting for production');
      }
      
      if (corsConfig.some && corsConfig.some(config => config.method && config.method.includes('*'))) {
        issues.push('Wildcard methods detected - consider restricting methods');
      }
      
      if (issues.length > 0) {
        return {
          status: 'warning',
          message: 'CORS configuration has potential issues',
          details: { issues: issues, configPath: corsConfigPath }
        };
      } else {
        return {
          status: 'passed',
          message: 'CORS configuration looks good',
          details: { configPath: corsConfigPath }
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        message: `CORS configuration check failed: ${error.message}`
      };
    }
  }

  async checkPerformanceBenchmarks() {
    try {
      const benchmarks = [];
      
      // Test hosting performance
      const projectId = this.projectInfo?.projectId;
      if (projectId) {
        const hostingUrl = `https://${projectId}.web.app`;
        const startTime = Date.now();
        
        try {
          await this.httpRequest(hostingUrl, { timeout: 10000 });
          const responseTime = Date.now() - startTime;
          
          benchmarks.push({
            test: 'hosting_response_time',
            value: responseTime,
            unit: 'ms',
            threshold: 2000,
            passed: responseTime < 2000
          });
        } catch (error) {
          benchmarks.push({
            test: 'hosting_response_time',
            error: error.message,
            passed: false
          });
        }
      }
      
      const passedBenchmarks = benchmarks.filter(b => b.passed);
      
      if (benchmarks.length === 0) {
        return {
          status: 'skipped',
          message: 'No performance benchmarks could be run'
        };
      } else if (passedBenchmarks.length === benchmarks.length) {
        return {
          status: 'passed',
          message: `All ${benchmarks.length} performance benchmarks passed`,
          details: { benchmarks: benchmarks }
        };
      } else {
        return {
          status: 'warning',
          message: `${passedBenchmarks.length}/${benchmarks.length} benchmarks passed`,
          details: { benchmarks: benchmarks }
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        message: `Performance benchmark check failed: ${error.message}`
      };
    }
  }

  async checkSecurityValidation() {
    try {
      const securityChecks = [];
      
      // Check if HTTPS is enforced
      const projectId = this.projectInfo?.projectId;
      if (projectId) {
        try {
          const httpUrl = `http://${projectId}.web.app`;
          const response = await this.httpRequest(httpUrl, { timeout: 5000 });
          
          securityChecks.push({
            check: 'https_redirect',
            passed: response.statusCode >= 300 && response.statusCode < 400,
            message: response.statusCode >= 300 ? 'HTTP redirects to HTTPS' : 'HTTP not redirected'
          });
        } catch (error) {
          securityChecks.push({
            check: 'https_redirect',
            passed: false,
            message: 'Could not test HTTP redirect'
          });
        }
      }
      
      // Check security rules files
      const firestoreRulesPath = path.join(this.projectRoot, 'firestore.rules');
      const storageRulesPath = path.join(this.projectRoot, 'storage.rules');
      
      const firestoreRulesExist = await fs.access(firestoreRulesPath).then(() => true).catch(() => false);
      const storageRulesExist = await fs.access(storageRulesPath).then(() => true).catch(() => false);
      
      securityChecks.push({
        check: 'firestore_rules',
        passed: firestoreRulesExist,
        message: firestoreRulesExist ? 'Firestore rules configured' : 'Firestore rules missing'
      });
      
      securityChecks.push({
        check: 'storage_rules',
        passed: storageRulesExist,
        message: storageRulesExist ? 'Storage rules configured' : 'Storage rules missing'
      });
      
      const passedChecks = securityChecks.filter(c => c.passed);
      
      if (passedChecks.length === securityChecks.length) {
        return {
          status: 'passed',
          message: `All ${securityChecks.length} security checks passed`,
          details: { securityChecks: securityChecks }
        };
      } else {
        return {
          status: 'warning',
          message: `${passedChecks.length}/${securityChecks.length} security checks passed`,
          details: { securityChecks: securityChecks }
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        message: `Security validation failed: ${error.message}`
      };
    }
  }

  async checkApiIntegrationTests() {
    try {
      // Check if there are test files and try to run basic tests
      const testsPath = path.join(this.projectRoot, 'functions', 'src', 'test');
      const testsExist = await fs.access(testsPath).then(() => true).catch(() => false);
      
      if (!testsExist) {
        return {
          status: 'skipped',
          message: 'No test directory found'
        };
      }
      
      // Try to run a quick test if available
      try {
        const testResult = execSync('npm test -- --passWithNoTests --testTimeout=30000', { 
          cwd: path.join(this.projectRoot, 'functions'),
          encoding: 'utf8',
          timeout: 30000
        });
        
        if (testResult.includes('PASS') || testResult.includes('0 tests')) {
          return {
            status: 'passed',
            message: 'API integration tests passed',
            details: { output: testResult.substring(0, 500) }
          };
        } else {
          return {
            status: 'warning',
            message: 'Test results unclear',
            details: { output: testResult.substring(0, 500) }
          };
        }
      } catch (testError) {
        return {
          status: 'warning',
          message: 'Could not run integration tests',
          details: { error: testError.message }
        };
      }
    } catch (error) {
      return {
        status: 'failed',
        message: `API integration test check failed: ${error.message}`
      };
    }
  }

  generateHealthReport() {
    const totalChecks = this.results.passed.length + this.results.failed.length + 
                       this.results.warnings.length + this.results.skipped.length;
    
    const criticalFailures = this.results.failed.filter(r => r.critical).length;
    const hasWarnings = this.results.warnings.length > 0;
    const hasCriticalFailures = criticalFailures > 0;
    
    console.log('\n🏥 Health Check Report:');
    console.log('═══════════════════════════════════\n');
    
    // Summary
    console.log('📊 Summary:');
    console.log(`  ✅ Passed: ${this.results.passed.length}`);
    console.log(`  ⚠️  Warnings: ${this.results.warnings.length}`);
    console.log(`  ❌ Failed: ${this.results.failed.length}`);
    console.log(`  ⏭️  Skipped: ${this.results.skipped.length}`);
    console.log(`  📋 Total: ${totalChecks}`);
    console.log();
    
    // Detailed results
    if (this.results.failed.length > 0) {
      console.log('❌ Failed Checks:');
      this.results.failed.forEach(result => {
        const criticalLabel = result.critical ? ' [CRITICAL]' : '';
        console.log(`  • ${result.name}${criticalLabel}: ${result.message}`);
        if (result.details) {
          console.log(`    Details: ${JSON.stringify(result.details, null, 4)}`);
        }
      });
      console.log();
    }
    
    if (this.results.warnings.length > 0) {
      console.log('⚠️  Warning Checks:');
      this.results.warnings.forEach(result => {
        console.log(`  • ${result.name}: ${result.message}`);
        if (result.details) {
          console.log(`    Details: ${JSON.stringify(result.details, null, 4)}`);
        }
      });
      console.log();
    }
    
    if (this.results.passed.length > 0) {
      console.log('✅ Passed Checks:');
      this.results.passed.forEach(result => {
        console.log(`  • ${result.name}: ${result.message}`);
      });
      console.log();
    }
    
    // Final status
    if (hasCriticalFailures) {
      console.log('🚫 CRITICAL HEALTH CHECK FAILURES - Immediate attention required');
      return { 
        status: 'critical_failure', 
        results: this.results, 
        summary: { totalChecks, criticalFailures, hasWarnings } 
      };
    } else if (this.results.failed.length > 0) {
      console.log('❌ HEALTH CHECK FAILURES - Review and fix issues');
      return { 
        status: 'failure', 
        results: this.results, 
        summary: { totalChecks, criticalFailures, hasWarnings } 
      };
    } else if (hasWarnings) {
      console.log('⚠️  HEALTH CHECKS PASSED WITH WARNINGS - Monitor closely');
      return { 
        status: 'warning', 
        results: this.results, 
        summary: { totalChecks, criticalFailures, hasWarnings } 
      };
    } else {
      console.log('✅ ALL HEALTH CHECKS PASSED - Deployment is healthy');
      return { 
        status: 'success', 
        results: this.results, 
        summary: { totalChecks, criticalFailures, hasWarnings } 
      };
    }
  }

  // Helper methods
  async getProjectInfo() {
    try {
      const firebaseConfig = path.join(this.projectRoot, '.firebaserc');
      const config = JSON.parse(await fs.readFile(firebaseConfig, 'utf8'));
      
      return {
        projectId: config.projects?.default || config.projects?.[Object.keys(config.projects)[0]]
      };
    } catch (error) {
      return null;
    }
  }

  async httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const protocol = url.startsWith('https://') ? https : http;
      
      const req = protocol.request(url, {
        method: options.method || 'GET',
        timeout: options.timeout || this.timeout,
        ...options
      }, (res) => {
        const responseTime = Date.now() - startTime;
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          responseTime: responseTime
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }
}

// Main execution
if (require.main === module) {
  const [,, projectRoot, configDir] = process.argv;
  
  if (!projectRoot) {
    console.error('Usage: node health-checker.js <project-root> [config-dir]');
    process.exit(1);
  }
  
  const healthChecker = new HealthChecker(
    projectRoot, 
    configDir || path.join(projectRoot, 'scripts', 'deployment', 'config')
  );
  
  healthChecker.runHealthChecks().then(report => {
    console.log('\n🏥 Health checks completed');
    
    if (report.status === 'critical_failure') {
      process.exit(2);
    } else if (report.status === 'failure') {
      process.exit(1);
    } else if (report.status === 'warning') {
      console.log('⚠️  Proceeding with warnings');
      process.exit(0);
    } else {
      console.log('✅ All health checks passed');
      process.exit(0);
    }
  }).catch(error => {
    console.error('❌ Health check system failed:', error);
    process.exit(1);
  });
}

module.exports = HealthChecker;