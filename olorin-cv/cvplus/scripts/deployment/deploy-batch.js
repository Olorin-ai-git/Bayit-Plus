#!/usr/bin/env node

/**
 * Firebase Functions Batch Deployment Script
 * 
 * This script handles:
 * 1. Environment variable conflict resolution
 * 2. Quota management through batched deployments
 * 3. Retry logic for failed deployments
 * 4. Deployment verification
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 3; // Deploy functions in smaller batches due to quota limits
const RETRY_ATTEMPTS = 5;
const BATCH_DELAY = 120000; // 2 minutes between batches to avoid quota limits
const QUOTA_WAIT_TIME = 300000; // 5 minutes wait for quota exceeded errors

// Critical functions that need immediate deployment (CORS updates)
const CRITICAL_FUNCTIONS = [
  'applyImprovements',
  'getRecommendations', 
  'previewImprovement',
  'podcastStatusPublic',
  'trackUserOutcome',
  'updateUserOutcome',
  'getUserOutcomeStats'
];

// List of all functions - will be dynamically discovered
let ALL_FUNCTIONS = [];

class BatchDeployer {
  constructor() {
    this.successfulFunctions = [];
    this.failedFunctions = [];
    this.skippedFunctions = [];
    this.criticalFailures = [];
  }

  /**
   * Discover all functions from the functions directory
   */
  discoverFunctions() {
    console.log('🔍 Discovering functions...');
    const functionsDir = path.join(__dirname, 'src', 'functions');
    const files = fs.readdirSync(functionsDir);
    const functions = [];
    
    files.forEach(file => {
      if (file.endsWith('.ts')) {
        const content = fs.readFileSync(path.join(functionsDir, file), 'utf8');
        // Look for exported functions (onCall, onRequest, onSchedule)
        const exports = content.match(/export\s+const\s+(\w+)\s*=/g);
        if (exports) {
          exports.forEach(exp => {
            const funcName = exp.match(/export\s+const\s+(\w+)\s*=/)[1];
            functions.push(funcName);
          });
        }
      }
    });
    
    ALL_FUNCTIONS = [...new Set(functions)]; // Remove duplicates
    console.log(`📋 Found ${ALL_FUNCTIONS.length} functions to deploy`);
    return ALL_FUNCTIONS;
  }

  /**
   * Validate environment configuration before deployment
   */
  validateEnvironment() {
    console.log('🔍 Validating environment configuration...');
    
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check for API key conflicts
    const hasAnthropicKey = envContent.includes('ANTHROPIC_API_KEY=sk-');
    const hasOpenAIKey = envContent.includes('OPENAI_API_KEY=sk-');
    const hasElevenLabsKey = envContent.includes('ELEVENLABS_API_KEY=sk_');
    
    if (hasAnthropicKey || hasOpenAIKey || hasElevenLabsKey) {
      console.log('❌ Environment variable conflicts detected!');
      console.log('API keys found in .env file will conflict with Firebase Secrets.');
      console.log('Please remove the following from .env:');
      if (hasAnthropicKey) console.log('  - ANTHROPIC_API_KEY');
      if (hasOpenAIKey) console.log('  - OPENAI_API_KEY'); 
      if (hasElevenLabsKey) console.log('  - ELEVENLABS_API_KEY');
      console.log('These should only be configured as Firebase Secrets.');
      process.exit(1);
    }
    
    // Check Firebase Secrets
    try {
      console.log('🔐 Checking Firebase Secrets...');
      const secrets = execSync('firebase functions:secrets:get --json', { encoding: 'utf8' });
      const secretsData = JSON.parse(secrets);
      
      const requiredSecrets = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'ELEVENLABS_API_KEY'];
      const missingSecrets = [];
      
      for (const secret of requiredSecrets) {
        if (!secretsData[secret] || secretsData[secret].length === 0) {
          missingSecrets.push(secret);
        }
      }
      
      if (missingSecrets.length > 0) {
        console.log('⚠️  Missing Firebase Secrets:', missingSecrets.join(', '));
        console.log('Set them using: firebase functions:secrets:set <SECRET_NAME>');
      }
      
    } catch (error) {
      console.log('⚠️  Could not verify Firebase Secrets:', error.message);
    }
    
    console.log('✅ Environment validation completed');
  }

  /**
   * Build functions before deployment
   */
  buildFunctions() {
    console.log('🏗️  Building functions...');
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
      console.log('✅ Functions built successfully');
    } catch (error) {
      console.log('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Deploy a batch of functions with retry logic
   */
  async deployBatch(functions, batchNumber, totalBatches, isCritical = false) {
    console.log(`\n🚀 Deploying batch ${batchNumber}/${totalBatches} (${functions.length} functions)`);
    console.log(`Functions: ${functions.join(', ')}`);
    if (isCritical) console.log('⚡ CRITICAL BATCH - CORS functions');
    
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const functionsList = functions.map(fn => `functions:${fn}`).join(',');
        
        const deployCmd = `firebase deploy --only ${functionsList}`;
        console.log(`Attempt ${attempt}/${RETRY_ATTEMPTS}: ${deployCmd}`);
        
        execSync(deployCmd, { 
          stdio: 'inherit', 
          cwd: path.dirname(__dirname),
          timeout: 900000 // 15 minute timeout per batch
        });
        
        console.log(`✅ Batch ${batchNumber} deployed successfully`);
        this.successfulFunctions.push(...functions);
        return true;
        
      } catch (error) {
        const errorStr = error.message || error.toString();
        console.log(`❌ Batch ${batchNumber} attempt ${attempt} failed:`, errorStr);
        
        // Check for quota exceeded error
        const isQuotaError = errorStr.includes('429') || 
                           errorStr.includes('Quota exceeded') ||
                           errorStr.includes('quota metric');
        
        if (attempt === RETRY_ATTEMPTS) {
          console.log(`💥 Batch ${batchNumber} failed after ${RETRY_ATTEMPTS} attempts`);
          this.failedFunctions.push(...functions);
          if (isCritical) {
            this.criticalFailures.push(...functions);
          }
          return false;
        } else {
          let waitTime = 60000; // 1 minute default
          
          if (isQuotaError) {
            waitTime = QUOTA_WAIT_TIME; // 5 minutes for quota errors
            console.log(`⚠️  Quota exceeded detected. Waiting ${waitTime/1000} seconds before retry...`);
          } else {
            console.log(`⏳ Retrying batch ${batchNumber} in ${waitTime/1000} seconds...`);
          }
          
          await this.sleep(waitTime);
        }
      }
    }
    return false;
  }

  /**
   * Deploy all functions in batches, prioritizing critical functions
   */
  async deployAll() {
    // Discover functions first
    this.discoverFunctions();
    
    console.log(`\n📦 Starting batch deployment of ${ALL_FUNCTIONS.length} functions`);
    console.log(`Batch size: ${BATCH_SIZE}, Delay between batches: ${BATCH_DELAY/1000}s`);
    
    // Phase 1: Deploy critical functions first (one by one for maximum reliability)
    console.log('\n🔥 Phase 1: Deploying critical functions (CORS fixes)...');
    const availableCritical = CRITICAL_FUNCTIONS.filter(fn => ALL_FUNCTIONS.includes(fn));
    
    for (let i = 0; i < availableCritical.length; i++) {
      const funcName = availableCritical[i];
      console.log(`\n⚡ Deploying critical function ${i + 1}/${availableCritical.length}: ${funcName}`);
      
      const success = await this.deployBatch([funcName], i + 1, availableCritical.length, true);
      
      if (success) {
        console.log(`✅ Critical function ${funcName} deployed successfully`);
      } else {
        console.log(`❌ Critical function ${funcName} failed to deploy`);
      }
      
      // Wait between critical functions
      if (i < availableCritical.length - 1) {
        console.log('⏳ Waiting 90 seconds before next critical function...');
        await this.sleep(90000);
      }
    }
    
    // Phase 2: Deploy remaining functions in batches
    const remainingFunctions = ALL_FUNCTIONS.filter(fn => !CRITICAL_FUNCTIONS.includes(fn));
    
    if (remainingFunctions.length > 0) {
      console.log(`\n🔄 Phase 2: Deploying remaining ${remainingFunctions.length} functions in batches...`);
      
      const batches = [];
      for (let i = 0; i < remainingFunctions.length; i += BATCH_SIZE) {
        batches.push(remainingFunctions.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`Remaining function batches: ${batches.length}`);
      
      for (let i = 0; i < batches.length; i++) {
        await this.deployBatch(batches[i], i + 1, batches.length);
        
        // Add delay between batches to avoid quota limits
        if (i < batches.length - 1) {
          console.log(`⏳ Waiting ${BATCH_DELAY/1000}s before next batch...`);
          await this.sleep(BATCH_DELAY);
        }
      }
    }
  }

  /**
   * Verify deployment status
   */
  verifyDeployment() {
    console.log('\n📊 Deployment Summary');
    console.log('===================');
    console.log(`✅ Successful: ${this.successfulFunctions.length}/${ALL_FUNCTIONS.length} functions`);
    console.log(`❌ Failed: ${this.failedFunctions.length} functions`);
    console.log(`⏭️  Skipped: ${this.skippedFunctions.length} functions`);
    
    // Critical functions status
    const availableCritical = CRITICAL_FUNCTIONS.filter(fn => ALL_FUNCTIONS.includes(fn));
    const successfulCritical = this.successfulFunctions.filter(fn => CRITICAL_FUNCTIONS.includes(fn));
    
    console.log('\n🔥 Critical Functions (CORS fixes):');
    console.log(`✅ Successful: ${successfulCritical.length}/${availableCritical.length}`);
    console.log(`❌ Failed: ${this.criticalFailures.length}`);
    
    if (this.criticalFailures.length > 0) {
      console.log('\n💥 CRITICAL FUNCTION FAILURES (CORS issues may persist):');
      this.criticalFailures.forEach(fn => console.log(`  - ${fn}`));
    }
    
    if (this.failedFunctions.length > 0) {
      console.log('\n❌ All failed functions:');
      this.failedFunctions.forEach(fn => console.log(`  - ${fn}`));
      
      console.log('\n🔄 To retry failed functions:');
      const retryCmd = this.failedFunctions.map(fn => `functions:${fn}`).join(',');
      console.log(`firebase deploy --only ${retryCmd}`);
    }
    
    // Success determination
    const allCriticalSuccess = this.criticalFailures.length === 0;
    const overallSuccess = this.successfulFunctions.length === ALL_FUNCTIONS.length;
    
    if (overallSuccess) {
      console.log('\n🎉 ALL FUNCTIONS DEPLOYED SUCCESSFULLY!');
      console.log('✅ CORS issues should now be resolved.');
      console.log('🧪 You can now test the Magic Transform button.');
      return true;
    } else if (allCriticalSuccess) {
      console.log('\n🎯 CRITICAL FUNCTIONS DEPLOYED SUCCESSFULLY!');
      console.log('✅ CORS issues should now be resolved.');
      console.log('🧪 You can test the Magic Transform button.');
      console.log(`⚠️  ${this.failedFunctions.length} non-critical functions still need deployment.`);
      return 'partial';
    } else {
      console.log('\n⚠️  DEPLOYMENT FAILED - CRITICAL FUNCTIONS NOT DEPLOYED');
      console.log('❌ CORS issues will persist until critical functions are deployed.');
      return false;
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Main deployment process
   */
  async run() {
    console.log('🚀 CVPlus Firebase Functions Batch Deployment');
    console.log('=============================================');
    
    try {
      // Step 1: Validate environment
      this.validateEnvironment();
      
      // Step 2: Build functions
      this.buildFunctions();
      
      // Step 3: Deploy in batches
      await this.deployAll();
      
      // Step 4: Verify and report
      const success = this.verifyDeployment();
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('💥 Deployment failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the deployment if this script is executed directly
if (require.main === module) {
  const deployer = new BatchDeployer();
  deployer.run();
}

module.exports = BatchDeployer;