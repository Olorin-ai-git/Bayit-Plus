#!/usr/bin/env node

/**
 * Firebase Secret Manager loader for frontend projects.
 * 
 * This script loads secrets from Firebase Secret Manager at build time
 * and injects them as environment variables for React applications.
 * 
 * Usage:
 *   node scripts/load-secrets.js [project-name] [environment]
 * 
 * Examples:
 *   node scripts/load-secrets.js olorin-front development
 *   node scripts/load-secrets.js olorin-web-portal production
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const fs = require('fs');
const path = require('path');

class FrontendSecretLoader {
  constructor(projectName, environment = 'development') {
    this.projectName = projectName;
    this.environment = environment;
    this.firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'olorin-ai';
    this.client = null;
    
    console.log(`🔐 Initializing Secret Manager for ${projectName} (${environment})`);
  }

  /**
   * Initialize the Secret Manager client
   */
  async initClient() {
    try {
      this.client = new SecretManagerServiceClient();
      console.log('✅ Secret Manager client initialized');
      return true;
    } catch (error) {
      console.warn('⚠️  Failed to initialize Secret Manager client:', error.message);
      console.log('📝 Will use environment variable fallbacks');
      return false;
    }
  }

  /**
   * Get a secret from Firebase Secret Manager
   */
  async getSecret(secretName) {
    if (!this.client) {
      return null;
    }

    try {
      // Try environment-specific secret first
      const envSecretPath = `${this.environment}/olorin/${this.projectName}/${secretName}`;
      const envSecretName = `projects/${this.firebaseProjectId}/secrets/${envSecretPath}/versions/latest`;
      
      try {
        const [version] = await this.client.accessSecretVersion({
          name: envSecretName,
        });
        console.log(`✅ Loaded secret: ${envSecretPath}`);
        return version.payload.data.toString();
      } catch (envError) {
        // Try base secret path
        const baseSecretPath = `olorin/${this.projectName}/${secretName}`;
        const baseSecretName = `projects/${this.firebaseProjectId}/secrets/${baseSecretPath}/versions/latest`;
        
        const [version] = await this.client.accessSecretVersion({
          name: baseSecretName,
        });
        console.log(`✅ Loaded secret: ${baseSecretPath}`);
        return version.payload.data.toString();
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load secret ${secretName}:`, error.message);
      return null;
    }
  }

  /**
   * Get secret configuration based on project
   */
  getSecretConfig() {
    const configs = {
      'olorin-front': {
        secrets: {
          'REACT_APP_API_BASE_URL': {
            secretName: 'api_base_url',
            envVar: 'REACT_APP_API_BASE_URL',
            default: 'http://localhost:8000'
          },
          'REACT_APP_WEBSOCKET_URL': {
            secretName: 'websocket_url',
            envVar: 'REACT_APP_WEBSOCKET_URL',
            default: 'ws://localhost:8000'
          },
          'REACT_APP_GOOGLE_MAPS_API_KEY': {
            secretName: 'google_maps_api_key',
            envVar: 'REACT_APP_GOOGLE_MAPS_API_KEY',
            default: ''
          },
          'REACT_APP_GAIA_API_KEY': {
            secretName: 'gaia_api_key',
            envVar: 'REACT_APP_GAIA_API_KEY',
            default: ''
          }
        }
      },
      'olorin-web-portal': {
        secrets: {
          'REACT_APP_EMAILJS_PUBLIC_KEY': {
            secretName: 'emailjs_public_key',
            envVar: 'REACT_APP_EMAILJS_PUBLIC_KEY',
            default: ''
          },
          'REACT_APP_API_BASE_URL': {
            secretName: 'api_base_url',
            envVar: 'REACT_APP_API_BASE_URL',
            default: 'http://localhost:8000'
          },
          'REACT_APP_GOOGLE_ANALYTICS_ID': {
            secretName: 'google_analytics_id',
            envVar: 'REACT_APP_GOOGLE_ANALYTICS_ID',
            default: ''
          }
        }
      }
    };

    return configs[this.projectName] || { secrets: {} };
  }

  /**
   * Load all secrets for the project
   */
  async loadSecrets() {
    const hasClient = await this.initClient();
    const config = this.getSecretConfig();
    const loadedSecrets = {};

    for (const [envVarName, secretConfig] of Object.entries(config.secrets)) {
      // First check if already set in environment
      if (process.env[envVarName]) {
        loadedSecrets[envVarName] = process.env[envVarName];
        console.log(`📋 Using existing env var: ${envVarName}`);
        continue;
      }

      // Try to load from Secret Manager
      if (hasClient) {
        const secretValue = await this.getSecret(secretConfig.secretName);
        if (secretValue) {
          loadedSecrets[envVarName] = secretValue;
          continue;
        }
      }

      // Check for fallback environment variable
      const fallbackValue = process.env[secretConfig.envVar];
      if (fallbackValue) {
        loadedSecrets[envVarName] = fallbackValue;
        console.log(`📋 Using fallback env var: ${secretConfig.envVar}`);
        continue;
      }

      // Use default value
      if (secretConfig.default) {
        loadedSecrets[envVarName] = secretConfig.default;
        console.log(`📋 Using default value for: ${envVarName}`);
      }
    }

    return loadedSecrets;
  }

  /**
   * Write secrets to .env file for build process
   */
  async writeEnvFile(targetDir) {
    const secrets = await this.loadSecrets();
    const envPath = path.join(targetDir, '.env.local');
    
    // Create .env.local content
    const envContent = Object.entries(secrets)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Write to file with restricted permissions (owner read/write only)
    fs.writeFileSync(envPath, envContent, { mode: 0o600 });
    console.log(`✅ Wrote secrets to ${envPath} with secure permissions (600)`);
    
    // Verify permissions were set correctly
    const stats = fs.statSync(envPath);
    const mode = (stats.mode & parseInt('777', 8)).toString(8);
    if (mode !== '600') {
      console.warn(`⚠️  File permissions are ${mode}, expected 600. Attempting to fix...`);
      try {
        fs.chmodSync(envPath, 0o600);
        console.log('✅ File permissions corrected to 600');
      } catch (error) {
        console.error(`❌ Failed to set secure permissions: ${error.message}`);
      }
    }
    
    // Also set in current process for immediate use
    Object.entries(secrets).forEach(([key, value]) => {
      process.env[key] = value;
    });

    return secrets;
  }

  /**
   * Validate that required secrets are present
   */
  validateSecrets(secrets) {
    const config = this.getSecretConfig();
    const missing = [];

    for (const [envVarName, secretConfig] of Object.entries(config.secrets)) {
      if (!secretConfig.default && !secrets[envVarName]) {
        missing.push(envVarName);
      }
    }

    if (missing.length > 0) {
      console.warn('⚠️  Missing required secrets:', missing.join(', '));
      if (this.environment === 'production') {
        throw new Error(`Missing required secrets for production: ${missing.join(', ')}`);
      }
    }

    return missing.length === 0;
  }
}

/**
 * Main execution
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const projectName = args[0] || process.env.PROJECT_NAME;
  const environment = args[1] || process.env.NODE_ENV || 'development';

  if (!projectName) {
    console.error('❌ Error: Project name is required');
    console.log('Usage: node scripts/load-secrets.js [project-name] [environment]');
    console.log('Example: node scripts/load-secrets.js olorin-front development');
    process.exit(1);
  }

  // Validate project name
  const validProjects = ['olorin-front', 'olorin-web-portal'];
  if (!validProjects.includes(projectName)) {
    console.error(`❌ Error: Invalid project name. Must be one of: ${validProjects.join(', ')}`);
    process.exit(1);
  }

  try {
    const loader = new FrontendSecretLoader(projectName, environment);
    
    // Determine target directory
    const targetDir = process.cwd();
    console.log(`📁 Target directory: ${targetDir}`);

    // Load and write secrets
    const secrets = await loader.writeEnvFile(targetDir);
    
    // Validate secrets
    const isValid = loader.validateSecrets(secrets);
    
    if (isValid) {
      console.log('✅ All secrets loaded successfully');
    } else {
      console.log('⚠️  Some optional secrets are missing');
    }

    // Log summary
    console.log('\n📊 Summary:');
    console.log(`  Project: ${projectName}`);
    console.log(`  Environment: ${environment}`);
    console.log(`  Secrets loaded: ${Object.keys(secrets).length}`);
    
  } catch (error) {
    console.error('❌ Error loading secrets:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { FrontendSecretLoader };

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}