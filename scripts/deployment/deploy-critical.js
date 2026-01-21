#!/usr/bin/env node

/**
 * Deploy Critical Functions Script
 * 
 * This script focuses on deploying only the functions that were specifically
 * failing due to environment variable conflicts, using a conservative approach.
 */

const { execSync } = require('child_process');
const path = require('path');

// Functions that were specifically failing with environment variable conflicts
const CRITICAL_FUNCTIONS = [
  'generatePortfolioGallery',
  'generateLanguageVisualization', 
  'generateTestimonialsCarousel',
  'generateCertificationBadges',
  'generatePodcast',
  'processCV-enhanced',
  'analyzeAchievements',
  'generateAchievementShowcase'
];

// Functions that were hitting quota limits
const QUOTA_LIMITED_FUNCTIONS = [
  'updateQRCode',
  'generateSocialMediaIntegration', 
  'processCV',
  'analyzeCV',
  'generateAudioFromText',
  'removeSocialProfile'
];

class CriticalDeployer {
  constructor() {
    this.successfulFunctions = [];
    this.failedFunctions = [];
  }

  /**
   * Validate that environment conflicts are resolved
   */
  validateEnvironment() {
    console.log('🔍 Validating critical environment configuration...');
    
    try {
      // Check Firebase Secrets
      const secrets = execSync('firebase functions:secrets:get OPENAI_API_KEY --json 2>/dev/null', { encoding: 'utf8' });
      console.log('✅ OPENAI_API_KEY secret is configured');
    } catch (error) {
      console.log('❌ OPENAI_API_KEY secret not found:', error.message);
      return false;
    }

    try {
      const secrets = execSync('firebase functions:secrets:get ANTHROPIC_API_KEY --json 2>/dev/null', { encoding: 'utf8' });
      console.log('✅ ANTHROPIC_API_KEY secret is configured');
    } catch (error) {
      console.log('❌ ANTHROPIC_API_KEY secret not found:', error.message);
      return false;
    }

    return true;
  }

  /**
   * Deploy a specific function with retry logic
   */
  async deployFunction(functionName, attempt = 1, maxAttempts = 3) {
    console.log(`\n🚀 Deploying ${functionName} (attempt ${attempt}/${maxAttempts})`);
    
    try {
      const deployCmd = `firebase deploy --only functions:${functionName}`;
      execSync(deployCmd, { 
        stdio: 'inherit', 
        cwd: path.dirname(__dirname),
        timeout: 300000 // 5 minute timeout per function
      });
      
      console.log(`✅ ${functionName} deployed successfully`);
      this.successfulFunctions.push(functionName);
      
    } catch (error) {
      console.log(`❌ ${functionName} deployment failed:`, error.message);
      
      if (attempt < maxAttempts) {
        console.log(`⏳ Retrying ${functionName} in 15 seconds...`);
        await this.sleep(15000);
        return this.deployFunction(functionName, attempt + 1, maxAttempts);
      } else {
        console.log(`💥 ${functionName} failed after ${maxAttempts} attempts`);
        this.failedFunctions.push(functionName);
      }
    }
  }

  /**
   * Deploy critical functions one by one with delays
   */
  async deployCriticalFunctions() {
    console.log(`\n📦 Deploying ${CRITICAL_FUNCTIONS.length} critical functions`);
    console.log('These functions had environment variable conflicts');
    
    for (const functionName of CRITICAL_FUNCTIONS) {
      await this.deployFunction(functionName);
      
      // Add delay to avoid quota limits
      console.log('⏳ Waiting 20 seconds to avoid quota limits...');
      await this.sleep(20000);
    }
  }

  /**
   * Deploy quota-limited functions with extra delays
   */
  async deployQuotaLimitedFunctions() {
    console.log(`\n📦 Deploying ${QUOTA_LIMITED_FUNCTIONS.length} quota-limited functions`);
    console.log('These functions hit quota limits during mass deployment');
    
    for (const functionName of QUOTA_LIMITED_FUNCTIONS) {
      await this.deployFunction(functionName);
      
      // Extra delay for quota-sensitive functions
      console.log('⏳ Waiting 30 seconds to avoid quota limits...');
      await this.sleep(30000);
    }
  }

  /**
   * Generate deployment summary
   */
  generateSummary() {
    console.log('\n📊 Critical Deployment Summary');
    console.log('============================');
    console.log(`✅ Successful: ${this.successfulFunctions.length} functions`);
    console.log(`❌ Failed: ${this.failedFunctions.length} functions`);
    
    if (this.successfulFunctions.length > 0) {
      console.log('\n✅ Successfully deployed:');
      this.successfulFunctions.forEach(fn => console.log(`  - ${fn}`));
    }
    
    if (this.failedFunctions.length > 0) {
      console.log('\n❌ Failed functions:');
      this.failedFunctions.forEach(fn => console.log(`  - ${fn}`));
      
      console.log('\n🔄 To retry failed functions individually:');
      this.failedFunctions.forEach(fn => {
        console.log(`firebase deploy --only functions:${fn}`);
      });
    }
    
    const totalAttempted = CRITICAL_FUNCTIONS.length + QUOTA_LIMITED_FUNCTIONS.length;
    const successRate = (this.successfulFunctions.length / totalAttempted * 100).toFixed(1);
    console.log(`\n📈 Success Rate: ${successRate}%`);
    
    return this.failedFunctions.length === 0;
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Main execution
   */
  async run() {
    console.log('🚀 CVPlus Critical Functions Deployment');
    console.log('======================================');
    
    try {
      // Step 1: Validate environment
      if (!this.validateEnvironment()) {
        console.log('❌ Environment validation failed');
        process.exit(1);
      }
      
      // Step 2: Deploy critical functions (environment variable conflicts)
      await this.deployCriticalFunctions();
      
      // Step 3: Deploy quota-limited functions  
      await this.deployQuotaLimitedFunctions();
      
      // Step 4: Generate summary
      const success = this.generateSummary();
      
      if (success) {
        console.log('\n🎉 All critical functions deployed successfully!');
        console.log('\nNext steps:');
        console.log('1. Test the deployed functions');
        console.log('2. Monitor logs: firebase functions:log');
        console.log('3. Deploy remaining functions if needed');
      }
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('💥 Critical deployment failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const deployer = new CriticalDeployer();
  deployer.run();
}

module.exports = CriticalDeployer;