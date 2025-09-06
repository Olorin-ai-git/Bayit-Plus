/**
 * Build Configuration Manager for Olorin Frontend
 * Manages environment-specific build configurations and validation
 */

const fs = require('fs');
const path = require('path');

class BuildConfigManager {
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
   * Generate build metadata
   */
  generateBuildMetadata() {
    const metadata = {
      buildTime: new Date().toISOString(),
      environment: this.environment,
      nodeEnv: this.nodeEnv,
      gitCommit: process.env.GITHUB_SHA || 'unknown',
      buildVersion: process.env.REACT_APP_BUILD_VERSION || '1.0.0',
      optimizations: this.getBuildOptimizations()
    };

    const metadataPath = path.join(this.buildDir, 'build-metadata.json');
    
    // Ensure build directory exists
    if (!fs.existsSync(this.buildDir)) {
      fs.mkdirSync(this.buildDir, { recursive: true });
    }

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('📊 Build metadata generated:', metadataPath);
    
    return metadata;
  }

  /**
   * Validate bundle size
   */
  validateBundleSize() {
    if (!fs.existsSync(this.buildDir)) {
      console.warn('⚠️  Build directory not found, skipping bundle size validation');
      return;
    }

    const maxBundleSize = parseInt(process.env.REACT_APP_BUNDLE_SIZE_LIMIT) || 512000; // 500KB
    const staticJsDir = path.join(this.buildDir, 'static', 'js');
    
    if (!fs.existsSync(staticJsDir)) {
      console.warn('⚠️  JS bundle directory not found');
      return;
    }

    const jsFiles = fs.readdirSync(staticJsDir)
      .filter(file => file.endsWith('.js') && !file.includes('.map'))
      .map(file => {
        const filePath = path.join(staticJsDir, file);
        const stats = fs.statSync(filePath);
        return { file, size: stats.size };
      });

    const totalSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
    
    console.log('📦 Bundle Analysis:');
    jsFiles.forEach(file => {
      const sizeKB = (file.size / 1024).toFixed(2);
      console.log(`  ${file.file}: ${sizeKB} KB`);
    });
    
    const totalSizeKB = (totalSize / 1024).toFixed(2);
    console.log(`📊 Total bundle size: ${totalSizeKB} KB`);
    
    if (totalSize > maxBundleSize) {
      console.error(`❌ Bundle size (${totalSizeKB} KB) exceeds limit (${(maxBundleSize/1024).toFixed(2)} KB)`);
      process.exit(1);
    } else {
      console.log('✅ Bundle size within acceptable limits');
    }
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

  /**
   * Finalize build process
   */
  finalizeBuild() {
    console.log('🏁 Finalizing Olorin Frontend Build');
    
    this.generateBuildMetadata();
    this.validateBundleSize();
    
    console.log('✅ Build process completed successfully');
  }
}

module.exports = BuildConfigManager;

// CLI usage
if (require.main === module) {
  const configManager = new BuildConfigManager();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      configManager.initializeBuild();
      break;
    case 'finalize':
      configManager.finalizeBuild();
      break;
    case 'validate':
      configManager.validateBuildConfig();
      break;
    case 'metadata':
      configManager.generateBuildMetadata();
      break;
    case 'bundle-check':
      configManager.validateBundleSize();
      break;
    default:
      console.log('Usage: node build-config.js [init|finalize|validate|metadata|bundle-check]');
      process.exit(1);
  }
}