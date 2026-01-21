/**
 * Build Metadata and Validation Manager
 * Handles metadata generation and bundle size validation
 */

const fs = require('fs');
const path = require('path');
const BuildConfigCore = require('./build-config-core');

class BuildMetadataManager extends BuildConfigCore {
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
   * Finalize build process
   */
  finalizeBuild() {
    console.log('🏁 Finalizing Olorin Frontend Build');
    
    this.generateBuildMetadata();
    this.validateBundleSize();
    
    console.log('✅ Build process completed successfully');
  }
}

module.exports = BuildMetadataManager;

// CLI usage
if (require.main === module) {
  const metadataManager = new BuildMetadataManager();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'finalize':
      metadataManager.finalizeBuild();
      break;
    case 'metadata':
      metadataManager.generateBuildMetadata();
      break;
    case 'bundle-check':
      metadataManager.validateBundleSize();
      break;
    default:
      console.log('Usage: node build-config-metadata.js [finalize|metadata|bundle-check]');
      process.exit(1);
  }
}