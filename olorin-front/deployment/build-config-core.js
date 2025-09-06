/**
 * Core Build Configuration Manager for Olorin Frontend
 * Modular architecture compliant with 200-line rule
 */

const fs = require('fs');
const path = require('path');

class BuildConfigCore {
  constructor() {
    this.environment = process.env.REACT_APP_ENV || 'development';
    this.nodeEnv = process.env.NODE_ENV || 'development';
    this.rootDir = path.resolve(__dirname, '..');
    this.buildDir = path.join(this.rootDir, 'build');
  }

  /**
   * Load environment-specific configuration
   */
  loadEnvironmentConfig() {
    const envFile = path.join(this.rootDir, `.env.${this.environment}`);
    
    if (fs.existsSync(envFile)) {
      console.log(`📁 Loading environment config: ${envFile}`);
      const envConfig = fs.readFileSync(envFile, 'utf8');
      
      // Parse environment variables
      const envVars = {};
      envConfig.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && !key.startsWith('#') && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      });
      
      // Set environment variables
      Object.keys(envVars).forEach(key => {
        if (!process.env[key]) {
          process.env[key] = envVars[key];
        }
      });
      
      return envVars;
    } else {
      console.warn(`⚠️  Environment file not found: ${envFile}`);
      return {};
    }
  }

  /**
   * Validate build configuration
   */
  validateBuildConfig() {
    const requiredVars = [
      'REACT_APP_ENVIRONMENT',
      'REACT_APP_API_BASE_URL',
      'REACT_APP_FIREBASE_PROJECT_ID'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing);
      process.exit(1);
    }

    console.log('✅ Build configuration validated successfully');
  }

  /**
   * Get build optimization settings
   */
  getBuildOptimizations() {
    const isProduction = this.nodeEnv === 'production';
    
    return {
      generateSourceMap: process.env.GENERATE_SOURCEMAP !== 'false',
      inlineRuntimeChunk: process.env.INLINE_RUNTIME_CHUNK === 'true',
      bundleAnalysis: process.env.ANALYZE === 'true',
      compression: isProduction,
      minification: isProduction,
      treeShaking: isProduction,
      codeSplitting: isProduction,
      lazyLoading: process.env.REACT_APP_LAZY_LOADING !== 'false'
    };
  }

  /**
   * Initialize build process
   */
  initializeBuild() {
    console.log('🚀 Initializing Olorin Frontend Build');
    console.log(`📍 Environment: ${this.environment}`);
    console.log(`📍 Node Environment: ${this.nodeEnv}`);
    
    this.loadEnvironmentConfig();
    this.validateBuildConfig();
    
    const optimizations = this.getBuildOptimizations();
    console.log('⚙️  Build Optimizations:', optimizations);
    
    return optimizations;
  }
}

module.exports = BuildConfigCore;

// CLI usage
if (require.main === module) {
  const configCore = new BuildConfigCore();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      configCore.initializeBuild();
      break;
    case 'validate':
      configCore.validateBuildConfig();
      break;
    default:
      console.log('Usage: node build-config-core.js [init|validate]');
      process.exit(1);
  }
}