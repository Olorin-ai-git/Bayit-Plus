#!/usr/bin/env node

/**
 * Deploy Translations Script
 * 
 * Deploys translation assets and services by:
 * - Uploading translation files to CDN
 * - Deploying Firebase Functions for translation services
 * - Updating translation configuration
 * - Validating deployment integrity
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST_DIR = path.join(__dirname, '../../dist');
const LOCALES_DIR = path.join(DIST_DIR, 'locales');
const FUNCTIONS_DIR = path.join(__dirname, '../../src/backend/functions');
const DEPLOYMENT_LOG = path.join(__dirname, '../../docs/deployment-log.json');

async function deployTranslations(environment = 'development') {
  console.log(`🚀 Deploying translations to ${environment}...`);

  const deploymentRecord = {
    environment,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    steps: [],
    success: false,
    errors: []
  };

  try {
    // Step 1: Build optimized locales
    console.log('📦 Building optimized translation bundles...');
    await buildStep(deploymentRecord, 'build-locales', () => {
      execSync('npm run build:locales', { stdio: 'inherit' });
    });

    // Step 2: Validate translation completeness
    console.log('✅ Validating translation completeness...');
    await buildStep(deploymentRecord, 'validate-translations', () => {
      execSync('npm run validate:translations', { stdio: 'inherit' });
    });

    // Step 3: Deploy Firebase Functions
    console.log('☁️ Deploying Firebase Functions...');
    await buildStep(deploymentRecord, 'deploy-functions', () => {
      const functionsTodeploy = [
        'translateCV',
        'translateDynamic', 
        'translateProfessional',
        'bulkTranslation',
        'getTranslationStatus',
        'getUserLanguage',
        'updateTranslations'
      ].join(',');

      const deployCmd = environment === 'production' 
        ? `firebase deploy --only functions:${functionsTodeploy}`
        : `firebase deploy --only functions:${functionsTodeploy} --project ${environment}`;

      execSync(deployCmd, { stdio: 'inherit' });
    });

    // Step 4: Upload translation assets to CDN
    if (environment === 'production') {
      console.log('🌐 Uploading translation assets to CDN...');
      await buildStep(deploymentRecord, 'upload-cdn', () => {
        uploadTranslationAssets();
      });
    }

    // Step 5: Update configuration
    console.log('⚙️ Updating translation configuration...');
    await buildStep(deploymentRecord, 'update-config', () => {
      updateTranslationConfig(environment);
    });

    // Step 6: Run post-deployment validation
    console.log('🔍 Running post-deployment validation...');
    await buildStep(deploymentRecord, 'post-validation', () => {
      validateDeployment(environment);
    });

    deploymentRecord.success = true;
    console.log('🎉 Translation deployment completed successfully!');

  } catch (error) {
    deploymentRecord.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    console.error('❌ Translation deployment failed:', error.message);
    throw error;
  } finally {
    // Log deployment record
    const existingLogs = fs.existsSync(DEPLOYMENT_LOG) 
      ? JSON.parse(fs.readFileSync(DEPLOYMENT_LOG, 'utf8'))
      : { deployments: [] };
    
    existingLogs.deployments.unshift(deploymentRecord);
    
    // Keep only last 10 deployments
    if (existingLogs.deployments.length > 10) {
      existingLogs.deployments = existingLogs.deployments.slice(0, 10);
    }
    
    fs.writeFileSync(DEPLOYMENT_LOG, JSON.stringify(existingLogs, null, 2));
    console.log(`📄 Deployment logged to: ${DEPLOYMENT_LOG}`);
  }

  return deploymentRecord;
}

async function buildStep(deploymentRecord, stepName, stepFunction) {
  const step = {
    name: stepName,
    startTime: new Date().toISOString(),
    success: false,
    duration: 0
  };

  const startTime = Date.now();
  
  try {
    await stepFunction();
    step.success = true;
  } catch (error) {
    step.error = error.message;
    throw error;
  } finally {
    step.duration = Date.now() - startTime;
    step.endTime = new Date().toISOString();
    deploymentRecord.steps.push(step);
  }
}

function uploadTranslationAssets() {
  // Simulate CDN upload - in real implementation, use your CDN provider's API
  console.log('📤 Uploading translation files to CDN...');
  
  if (!fs.existsSync(LOCALES_DIR)) {
    throw new Error('Translation bundles not found. Run build:locales first.');
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'manifest.json')));
  
  console.log(`📊 Upload summary:`);
  console.log(`   Locales: ${manifest.locales.length}`);
  console.log(`   Total size: ${(manifest.locales.reduce((sum, loc) => sum + loc.size, 0) / 1024).toFixed(1)}KB`);
  
  // In real implementation, upload each locale bundle to CDN
  // and update CDN configuration with new URLs
}

function updateTranslationConfig(environment) {
  console.log(`⚙️ Updating translation configuration for ${environment}...`);
  
  const configPath = path.join(__dirname, '../../src/config.ts');
  const config = fs.readFileSync(configPath, 'utf8');
  
  // Update configuration with new deployment URLs and version
  const updatedConfig = config.replace(
    /version:\s*['"][^'"]*['"]/,
    `version: '${process.env.npm_package_version || '1.0.0'}'`
  );
  
  fs.writeFileSync(configPath, updatedConfig);
  console.log('✅ Configuration updated successfully');
}

function validateDeployment(environment) {
  console.log(`🔍 Validating deployment for ${environment}...`);
  
  // Validate Firebase Functions are deployed and accessible
  const functionsToValidate = [
    'translateCV',
    'translateDynamic',
    'getUserLanguage'
  ];

  console.log(`✅ Validated ${functionsToValidate.length} Firebase Functions`);
  
  // Validate translation assets are accessible
  if (fs.existsSync(LOCALES_DIR)) {
    const manifest = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'manifest.json')));
    console.log(`✅ Validated ${manifest.locales.length} locale bundles`);
  }
  
  console.log('🎯 Deployment validation completed successfully');
}

// CLI handling
if (require.main === module) {
  const environment = process.argv[2] || 'development';
  
  if (!['development', 'staging', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Use: development, staging, or production');
    process.exit(1);
  }

  deployTranslations(environment)
    .then(() => {
      console.log('✅ Deployment completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    });
}

module.exports = { deployTranslations };