/**
 * Main Build Configuration Manager for Olorin Frontend
 * Orchestrates modular build configuration components
 * Compliant with 200-line architecture standard
 */

const BuildConfigCore = require('./build-config-core');
const BuildMetadataManager = require('./build-config-metadata');

class BuildConfigManager extends BuildMetadataManager {
  constructor() {
    super();
    console.log('🔧 Build Config Manager initialized');
  }

  /**
   * Complete build initialization and validation
   */
  fullInitialization() {
    try {
      const optimizations = this.initializeBuild();
      console.log('✨ Full initialization completed successfully');
      return optimizations;
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Complete build finalization with all checks
   */
  fullFinalization() {
    try {
      this.finalizeBuild();
      console.log('✨ Full finalization completed successfully');
    } catch (error) {
      console.error('❌ Finalization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Run comprehensive build validation
   */
  comprehensiveValidation() {
    try {
      this.validateBuildConfig();
      console.log('✨ Comprehensive validation completed successfully');
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Display build configuration summary
   */
  displaySummary() {
    console.log('\n📋 Build Configuration Summary');
    console.log('================================');
    console.log(`Environment: ${this.environment}`);
    console.log(`Node Environment: ${this.nodeEnv}`);
    console.log(`Root Directory: ${this.rootDir}`);
    console.log(`Build Directory: ${this.buildDir}`);
    
    const optimizations = this.getBuildOptimizations();
    console.log('\n⚙️  Optimizations:');
    Object.entries(optimizations).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    console.log('================================\n');
    
    return optimizations;
  }
}

module.exports = BuildConfigManager;

// CLI usage
if (require.main === module) {
  const configManager = new BuildConfigManager();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      configManager.fullInitialization();
      break;
    case 'finalize':
      configManager.fullFinalization();
      break;
    case 'validate':
      configManager.comprehensiveValidation();
      break;
    case 'summary':
      configManager.displaySummary();
      break;
    case 'metadata':
      configManager.generateBuildMetadata();
      break;
    case 'bundle-check':
      configManager.validateBundleSize();
      break;
    default:
      console.log('Usage: node build-config.js [init|finalize|validate|summary|metadata|bundle-check]');
      console.log('\nCommands:');
      console.log('  init        - Initialize build with full configuration');
      console.log('  finalize    - Finalize build with validation');
      console.log('  validate    - Run configuration validation');
      console.log('  summary     - Display configuration summary');
      console.log('  metadata    - Generate build metadata');
      console.log('  bundle-check - Validate bundle size');
      process.exit(1);
  }
}