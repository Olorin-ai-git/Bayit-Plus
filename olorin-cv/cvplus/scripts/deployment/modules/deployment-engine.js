#!/usr/bin/env node

/**
 * Deployment Engine
 * Core deployment logic with intelligent batching and error handling
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const ErrorHandler = require('./error-handler');
const QuotaManager = require('./quota-manager');

class DeploymentEngine {
  constructor(projectRoot, configDir) {
    this.projectRoot = projectRoot;
    this.configDir = configDir;
    this.errorHandler = new ErrorHandler(projectRoot, configDir);
    this.quotaManager = new QuotaManager(projectRoot, configDir);
    this.deploymentState = {
      phase: 'initializing',
      componentsDeployed: 0,
      totalComponents: 0,
      errors: [],
      warnings: []
    };
  }

  async deploy() {
    console.log('🚀 Starting deployment engine...');
    
    try {
      await this.initializeDeployment();
      await this.deployDatabaseRules();
      await this.deployStorageRules();
      await this.deployFunctionsBatched();
      await this.deployHosting();
      
      console.log('✅ Deployment engine completed successfully');
      return {
        status: 'success',
        componentsDeployed: this.deploymentState.componentsDeployed,
        totalComponents: this.deploymentState.totalComponents
      };
    } catch (error) {
      console.log(`❌ Deployment engine failed: ${error.message}`);
      
      // Try to recover from error
      const recovered = await this.errorHandler.handleError(error, {
        phase: this.deploymentState.phase,
        component: 'deployment-engine'
      });
      
      if (recovered) {
        console.log('🔄 Deployment recovered, retrying...');
        return await this.deploy(); // Retry
      } else {
        throw error;
      }
    }
  }

  async initializeDeployment() {
    console.log('  🔧 Initializing deployment...');
    
    // Get deployment strategy from quota manager
    const strategy = await this.quotaManager.getBatchingStrategy();
    
    this.deploymentState.totalComponents = 4 + strategy.batchCount; // rules + storage + hosting + function batches
    this.deploymentState.batchingStrategy = strategy;
    
    console.log(`    📊 Deployment strategy: ${strategy.batchCount} batches, ${strategy.estimatedTotalTime} min estimated`);
  }

  async deployDatabaseRules() {
    console.log('  📋 Deploying database rules...');
    this.deploymentState.phase = 'database_rules';
    
    try {
      const rulesPath = path.join(this.projectRoot, 'firestore.rules');
      const rulesExist = await fs.access(rulesPath).then(() => true).catch(() => false);
      
      if (!rulesExist) {
        console.log('    ⏭️  No Firestore rules to deploy');
        return;
      }
      
      // Deploy Firestore rules
      execSync('firebase deploy --only firestore:rules', {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000 // 2 minutes
      });
      
      console.log('    ✅ Database rules deployed');
      this.deploymentState.componentsDeployed++;
      
    } catch (error) {
      console.log(`    ❌ Database rules deployment failed: ${error.message}`);
      this.deploymentState.errors.push({
        component: 'database_rules',
        error: error.message
      });
      throw error;
    }
  }

  async deployStorageRules() {
    console.log('  📁 Deploying storage rules...');
    this.deploymentState.phase = 'storage_rules';
    
    try {
      const rulesPath = path.join(this.projectRoot, 'storage.rules');
      const rulesExist = await fs.access(rulesPath).then(() => true).catch(() => false);
      
      if (!rulesExist) {
        console.log('    ⏭️  No Storage rules to deploy');
        return;
      }
      
      // Deploy Storage rules
      execSync('firebase deploy --only storage', {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000 // 2 minutes
      });
      
      console.log('    ✅ Storage rules deployed');
      this.deploymentState.componentsDeployed++;
      
    } catch (error) {
      console.log(`    ❌ Storage rules deployment failed: ${error.message}`);
      this.deploymentState.errors.push({
        component: 'storage_rules',
        error: error.message
      });
      throw error;
    }
  }

  async deployFunctionsBatched() {
    console.log('  ⚡ Deploying functions in batches...');
    this.deploymentState.phase = 'functions';
    
    try {
      const strategy = this.deploymentState.batchingStrategy;
      const functionsDir = path.join(this.projectRoot, 'functions', 'src', 'functions');
      const functionFiles = await this.getFunctionFiles(functionsDir);
      
      if (functionFiles.length === 0) {
        console.log('    ⏭️  No functions to deploy');
        return;
      }
      
      // Create batches
      const batches = this.createFunctionBatches(functionFiles, strategy.batchSize);
      
      console.log(`    📦 Deploying ${functionFiles.length} functions in ${batches.length} batches`);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNumber = i + 1;
        
        console.log(`    📦 Deploying batch ${batchNumber}/${batches.length} (${batch.length} functions)...`);
        
        try {
          await this.deployFunctionBatch(batch, batchNumber);
          console.log(`    ✅ Batch ${batchNumber} deployed successfully`);
          this.deploymentState.componentsDeployed++;
          
          // Wait between batches (except for the last one)
          if (i < batches.length - 1) {
            console.log(`    ⏳ Waiting ${strategy.delayBetweenBatches}ms before next batch...`);
            await this.sleep(strategy.delayBetweenBatches);
          }
          
        } catch (error) {
          console.log(`    ❌ Batch ${batchNumber} failed: ${error.message}`);
          
          // Try to recover from batch failure
          const recovered = await this.errorHandler.handleError(error, {
            component: 'functions_batch',
            batchNumber: batchNumber,
            functions: batch
          });
          
          if (!recovered) {
            this.deploymentState.errors.push({
              component: `functions_batch_${batchNumber}`,
              error: error.message,
              functions: batch
            });
            
            // Continue with next batch or fail completely based on error severity
            if (this.isCriticalFunctionError(error)) {
              throw error;
            } else {
              console.log(`    ⚠️  Continuing with next batch despite batch ${batchNumber} failure`);
              this.deploymentState.warnings.push({
                component: `functions_batch_${batchNumber}`,
                message: `Batch failed but continuing: ${error.message}`
              });
            }
          }
        }
      }
      
      console.log('    ✅ All function batches processed');
      
    } catch (error) {
      console.log(`    ❌ Function deployment failed: ${error.message}`);
      throw error;
    }
  }

  async deployFunctionBatch(functionNames, batchNumber) {
    const functionsList = functionNames.join(',');
    
    // Use timeout wrapper for batch deployment
    return new Promise((resolve, reject) => {
      const timeoutMs = 300000; // 5 minutes per batch
      
      const deployProcess = spawn('firebase', [
        'deploy',
        '--only',
        `functions:${functionsList}`,
        '--force'
      ], {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      deployProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      deployProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timeout = setTimeout(() => {
        deployProcess.kill('SIGTERM');
        reject(new Error(`Batch ${batchNumber} deployment timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      deployProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          console.log(`      ✅ Functions deployed: ${functionsList}`);
          resolve();
        } else {
          const errorMessage = stderr || stdout || `Process exited with code ${code}`;
          reject(new Error(`Batch deployment failed: ${errorMessage}`));
        }
      });
      
      deployProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async deployHosting() {
    console.log('  🌐 Deploying hosting...');
    this.deploymentState.phase = 'hosting';
    
    try {
      // Check if build exists
      const distPath = path.join(this.projectRoot, 'frontend', 'dist');
      const buildExists = await fs.access(distPath).then(() => true).catch(() => false);
      
      if (!buildExists) {
        console.log('    🔨 Build not found, creating build first...');
        
        // Build frontend
        execSync('npm run build', {
          cwd: path.join(this.projectRoot, 'frontend'),
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 300000 // 5 minutes
        });
        
        console.log('    ✅ Frontend build completed');
      }
      
      // Deploy hosting
      execSync('firebase deploy --only hosting', {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000 // 5 minutes
      });
      
      console.log('    ✅ Hosting deployed');
      this.deploymentState.componentsDeployed++;
      
    } catch (error) {
      console.log(`    ❌ Hosting deployment failed: ${error.message}`);
      this.deploymentState.errors.push({
        component: 'hosting',
        error: error.message
      });
      throw error;
    }
  }

  createFunctionBatches(functionFiles, batchSize) {
    const functionNames = functionFiles.map(file => 
      path.basename(file, '.ts')
    );
    
    const batches = [];
    for (let i = 0; i < functionNames.length; i += batchSize) {
      batches.push(functionNames.slice(i, i + batchSize));
    }
    
    return batches;
  }

  async getFunctionFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isFile() && item.endsWith('.ts') && !item.endsWith('.test.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.log(`    ⚠️  Could not read functions directory: ${error.message}`);
    }
    
    return files;
  }

  isCriticalFunctionError(error) {
    const message = error.message.toLowerCase();
    
    // These errors should stop deployment completely
    const criticalPatterns = [
      'authentication failed',
      'permission denied',
      'project not found',
      'invalid project',
      'billing account required'
    ];
    
    return criticalPatterns.some(pattern => message.includes(pattern));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getDeploymentState() {
    return {
      ...this.deploymentState,
      progressPercentage: Math.round(
        (this.deploymentState.componentsDeployed / this.deploymentState.totalComponents) * 100
      )
    };
  }

  getDeploymentSummary() {
    return {
      status: this.deploymentState.errors.length === 0 ? 'success' : 'partial_failure',
      componentsDeployed: this.deploymentState.componentsDeployed,
      totalComponents: this.deploymentState.totalComponents,
      errors: this.deploymentState.errors.length,
      warnings: this.deploymentState.warnings.length,
      phase: this.deploymentState.phase
    };
  }
}

// Main execution
if (require.main === module) {
  const [,, projectRoot, configDir] = process.argv;
  
  if (!projectRoot) {
    console.error('Usage: node deployment-engine.js <project-root> [config-dir]');
    process.exit(1);
  }
  
  const deploymentEngine = new DeploymentEngine(
    projectRoot, 
    configDir || path.join(projectRoot, 'scripts', 'deployment', 'config')
  );
  
  deploymentEngine.deploy().then(result => {
    console.log('\n🚀 Deployment engine completed');
    console.log(`📊 Result: ${result.status}`);
    console.log(`📈 Components: ${result.componentsDeployed}/${result.totalComponents}`);
    process.exit(0);
  }).catch(error => {
    console.error('❌ Deployment engine failed:', error);
    process.exit(1);
  });
}

module.exports = DeploymentEngine;