#!/usr/bin/env node

/**
 * Quota Manager and Monitoring System
 * Monitors and manages Firebase quotas and resource usage
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class QuotaManager {
  constructor(projectRoot, configDir) {
    this.projectRoot = projectRoot;
    this.configDir = configDir;
    this.quotaConfig = this.initializeQuotaConfig();
    this.currentUsage = {};
    this.quotaWarnings = [];
  }

  initializeQuotaConfig() {
    return {
      functions: {
        maxPerMinute: 100,        // Function deployments per minute
        maxConcurrent: 10,       // Concurrent deployments
        maxSizePerFunction: 100, // MB
        maxTotalSize: 1000,      // MB
        timeout: 540             // seconds
      },
      firestore: {
        maxOperationsPerSecond: 10000,
        maxDocumentSize: 1,      // MB
        maxIndexes: 200
      },
      storage: {
        maxUploadSize: 32,       // MB
        maxOperationsPerSecond: 5000,
        maxBandwidthPerDay: 50   // GB
      },
      hosting: {
        maxFileSize: 10,         // MB
        maxFilesPerDeploy: 2000
      },
      billing: {
        dailyBudgetLimit: 100,   // USD
        warningThreshold: 0.8    // 80% of limit
      }
    };
  }

  async monitorQuotas() {
    console.log('📊 Monitoring Firebase quotas...');
    
    try {
      await this.checkFunctionQuotas();
      await this.checkFirestoreQuotas();
      await this.checkStorageQuotas();
      await this.checkHostingQuotas();
      await this.checkBillingQuotas();
      
      return this.generateQuotaReport();
    } catch (error) {
      console.log(`❌ Quota monitoring failed: ${error.message}`);
      throw error;
    }
  }

  async checkFunctionQuotas() {
    console.log('  🔍 Checking function quotas...');
    
    try {
      // Get function list and sizes
      const functionsPath = path.join(this.projectRoot, 'functions', 'src', 'functions');
      const functionFiles = await this.getFunctionFiles(functionsPath);
      
      let totalFunctionSize = 0;
      const functionSizes = {};
      
      for (const file of functionFiles) {
        const stat = await fs.stat(file);
        const sizeInMB = stat.size / (1024 * 1024);
        const functionName = path.basename(file, '.ts');
        
        functionSizes[functionName] = sizeInMB;
        totalFunctionSize += sizeInMB;
        
        // Check individual function size
        if (sizeInMB > this.quotaConfig.functions.maxSizePerFunction) {
          this.quotaWarnings.push({
            type: 'FUNCTION_SIZE_WARNING',
            function: functionName,
            size: sizeInMB,
            limit: this.quotaConfig.functions.maxSizePerFunction
          });
        }
      }
      
      // Check total deployment size
      if (totalFunctionSize > this.quotaConfig.functions.maxTotalSize) {
        this.quotaWarnings.push({
          type: 'TOTAL_SIZE_WARNING',
          totalSize: totalFunctionSize,
          limit: this.quotaConfig.functions.maxTotalSize
        });
      }
      
      this.currentUsage.functions = {
        count: functionFiles.length,
        totalSize: totalFunctionSize,
        individualSizes: functionSizes,
        estimatedDeploymentTime: this.estimateDeploymentTime(functionFiles.length)
      };
      
      console.log(`    📦 Functions to deploy: ${functionFiles.length}`);
      console.log(`    📏 Total size: ${totalFunctionSize.toFixed(2)} MB`);
      
    } catch (error) {
      console.log(`    ⚠️  Function quota check failed: ${error.message}`);
    }
  }

  async checkFirestoreQuotas() {
    console.log('  🔍 Checking Firestore quotas...');
    
    try {
      // Check Firestore rules and indexes
      const rulesPath = path.join(this.projectRoot, 'firestore.rules');
      const indexesPath = path.join(this.projectRoot, 'firestore.indexes.json');
      
      let indexCount = 0;
      
      try {
        const indexesContent = await fs.readFile(indexesPath, 'utf8');
        const indexesData = JSON.parse(indexesContent);
        indexCount = indexesData.indexes ? indexesData.indexes.length : 0;
      } catch (error) {
        // Indexes file might not exist
      }
      
      if (indexCount > this.quotaConfig.firestore.maxIndexes) {
        this.quotaWarnings.push({
          type: 'FIRESTORE_INDEXES_WARNING',
          indexCount: indexCount,
          limit: this.quotaConfig.firestore.maxIndexes
        });
      }
      
      this.currentUsage.firestore = {
        indexCount: indexCount,
        hasRules: await fs.access(rulesPath).then(() => true).catch(() => false)
      };
      
      console.log(`    📋 Firestore indexes: ${indexCount}`);
      
    } catch (error) {
      console.log(`    ⚠️  Firestore quota check failed: ${error.message}`);
    }
  }

  async checkStorageQuotas() {
    console.log('  🔍 Checking Storage quotas...');
    
    try {
      const rulesPath = path.join(this.projectRoot, 'storage.rules');
      const hasRules = await fs.access(rulesPath).then(() => true).catch(() => false);
      
      this.currentUsage.storage = {
        hasRules: hasRules,
        estimatedUsage: 'Unable to determine without API access'
      };
      
      console.log(`    📁 Storage rules configured: ${hasRules ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.log(`    ⚠️  Storage quota check failed: ${error.message}`);
    }
  }

  async checkHostingQuotas() {
    console.log('  🔍 Checking Hosting quotas...');
    
    try {
      const distPath = path.join(this.projectRoot, 'frontend', 'dist');
      
      try {
        const files = await this.getAllFiles(distPath);
        let totalSize = 0;
        let largeFiles = [];
        
        for (const file of files) {
          const stat = await fs.stat(file);
          const sizeInMB = stat.size / (1024 * 1024);
          totalSize += sizeInMB;
          
          if (sizeInMB > this.quotaConfig.hosting.maxFileSize) {
            largeFiles.push({
              file: path.relative(distPath, file),
              size: sizeInMB
            });
          }
        }
        
        if (files.length > this.quotaConfig.hosting.maxFilesPerDeploy) {
          this.quotaWarnings.push({
            type: 'HOSTING_FILE_COUNT_WARNING',
            fileCount: files.length,
            limit: this.quotaConfig.hosting.maxFilesPerDeploy
          });
        }
        
        if (largeFiles.length > 0) {
          this.quotaWarnings.push({
            type: 'HOSTING_FILE_SIZE_WARNING',
            largeFiles: largeFiles
          });
        }
        
        this.currentUsage.hosting = {
          fileCount: files.length,
          totalSize: totalSize,
          largeFiles: largeFiles
        };
        
        console.log(`    📁 Files to deploy: ${files.length}`);
        console.log(`    📏 Total size: ${totalSize.toFixed(2)} MB`);
        
      } catch (error) {
        console.log(`    ℹ️  Build not found - will be created during deployment`);
        this.currentUsage.hosting = {
          fileCount: 0,
          totalSize: 0,
          buildRequired: true
        };
      }
      
    } catch (error) {
      console.log(`    ⚠️  Hosting quota check failed: ${error.message}`);
    }
  }

  async checkBillingQuotas() {
    console.log('  🔍 Checking billing quotas...');
    
    try {
      // This would typically check actual billing via Firebase APIs
      // For now, provide estimates based on usage patterns
      
      const estimatedCost = this.estimateDeploymentCost();
      
      if (estimatedCost > this.quotaConfig.billing.dailyBudgetLimit * 
          this.quotaConfig.billing.warningThreshold) {
        this.quotaWarnings.push({
          type: 'BILLING_WARNING',
          estimatedCost: estimatedCost,
          warningThreshold: this.quotaConfig.billing.dailyBudgetLimit * 
                           this.quotaConfig.billing.warningThreshold
        });
      }
      
      this.currentUsage.billing = {
        estimatedCost: estimatedCost,
        currency: 'USD'
      };
      
      console.log(`    💰 Estimated deployment cost: $${estimatedCost.toFixed(2)}`);
      
    } catch (error) {
      console.log(`    ⚠️  Billing quota check failed: ${error.message}`);
    }
  }

  generateQuotaReport() {
    const hasWarnings = this.quotaWarnings.length > 0;
    const hasErrors = this.quotaWarnings.some(w => w.type.includes('ERROR'));
    
    console.log('\n📊 Quota Monitoring Report:');
    console.log('═══════════════════════════════════\n');
    
    // Current Usage Summary
    console.log('📈 Current Usage:');
    
    if (this.currentUsage.functions) {
      console.log(`  Functions: ${this.currentUsage.functions.count} functions, ` +
                 `${this.currentUsage.functions.totalSize.toFixed(2)} MB`);
    }
    
    if (this.currentUsage.firestore) {
      console.log(`  Firestore: ${this.currentUsage.firestore.indexCount} indexes`);
    }
    
    if (this.currentUsage.hosting) {
      if (this.currentUsage.hosting.buildRequired) {
        console.log(`  Hosting: Build required`);
      } else {
        console.log(`  Hosting: ${this.currentUsage.hosting.fileCount} files, ` +
                   `${this.currentUsage.hosting.totalSize.toFixed(2)} MB`);
      }
    }
    
    if (this.currentUsage.billing) {
      console.log(`  Estimated Cost: $${this.currentUsage.billing.estimatedCost.toFixed(2)}`);
    }
    
    console.log();
    
    // Warnings and Recommendations
    if (hasWarnings) {
      console.log('⚠️  Quota Warnings:');
      
      this.quotaWarnings.forEach(warning => {
        switch (warning.type) {
          case 'FUNCTION_SIZE_WARNING':
            console.log(`  • Function ${warning.function} is ${warning.size.toFixed(2)} MB ` +
                       `(limit: ${warning.limit} MB)`);
            break;
          
          case 'TOTAL_SIZE_WARNING':
            console.log(`  • Total deployment size is ${warning.totalSize.toFixed(2)} MB ` +
                       `(limit: ${warning.limit} MB)`);
            console.log(`    💡 Consider batching deployment or optimizing function sizes`);
            break;
          
          case 'FIRESTORE_INDEXES_WARNING':
            console.log(`  • Firestore has ${warning.indexCount} indexes ` +
                       `(limit: ${warning.limit})`);
            break;
          
          case 'HOSTING_FILE_COUNT_WARNING':
            console.log(`  • Hosting deployment has ${warning.fileCount} files ` +
                       `(limit: ${warning.limit})`);
            break;
          
          case 'HOSTING_FILE_SIZE_WARNING':
            console.log(`  • Large files detected in hosting:`);
            warning.largeFiles.forEach(file => {
              console.log(`    - ${file.file}: ${file.size.toFixed(2)} MB`);
            });
            break;
          
          case 'BILLING_WARNING':
            console.log(`  • Estimated cost $${warning.estimatedCost.toFixed(2)} ` +
                       `exceeds warning threshold $${warning.warningThreshold.toFixed(2)}`);
            break;
        }
      });
      
      console.log();
    }
    
    // Deployment Recommendations
    console.log('💡 Deployment Recommendations:');
    
    if (this.currentUsage.functions && this.currentUsage.functions.count > 10) {
      console.log('  • Use batch deployment for functions (recommended batch size: 5)');
      console.log(`  • Estimated deployment time: ${this.currentUsage.functions.estimatedDeploymentTime} minutes`);
    }
    
    if (this.quotaWarnings.some(w => w.type === 'TOTAL_SIZE_WARNING')) {
      console.log('  • Consider function optimization to reduce bundle sizes');
      console.log('  • Enable tree shaking and remove unused dependencies');
    }
    
    if (this.currentUsage.hosting && this.currentUsage.hosting.buildRequired) {
      console.log('  • Frontend build will be performed during deployment');
      console.log('  • Allow extra time for build process');
    }
    
    console.log();
    
    // Final Status
    if (hasErrors) {
      console.log('🚫 QUOTA ERRORS DETECTED - Deployment may fail');
      return { status: 'error', warnings: this.quotaWarnings, usage: this.currentUsage };
    } else if (hasWarnings) {
      console.log('⚠️  QUOTA WARNINGS - Deployment will proceed with caution');
      return { status: 'warning', warnings: this.quotaWarnings, usage: this.currentUsage };
    } else {
      console.log('✅ QUOTA CHECK PASSED - Ready for deployment');
      return { status: 'success', warnings: [], usage: this.currentUsage };
    }
  }

  async getBatchingStrategy() {
    if (!this.currentUsage.functions) {
      await this.checkFunctionQuotas();
    }
    
    const functionCount = this.currentUsage.functions.count;
    const totalSize = this.currentUsage.functions.totalSize;
    
    // Determine batch size based on quota constraints
    let batchSize = 5; // Default
    
    if (totalSize > 500) { // Large deployment
      batchSize = 3;
    } else if (totalSize > 200) { // Medium deployment
      batchSize = 4;
    }
    
    // Adjust for quota warnings
    if (this.quotaWarnings.some(w => w.type === 'TOTAL_SIZE_WARNING')) {
      batchSize = Math.max(2, Math.floor(batchSize / 2));
    }
    
    const batchCount = Math.ceil(functionCount / batchSize);
    const delayBetweenBatches = this.calculateOptimalDelay(batchSize, totalSize);
    
    return {
      batchSize: batchSize,
      batchCount: batchCount,
      delayBetweenBatches: delayBetweenBatches,
      estimatedTotalTime: batchCount * 2 + (batchCount - 1) * (delayBetweenBatches / 60000) // minutes
    };
  }

  // Helper methods
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
      // Directory might not exist
    }
    
    return files;
  }

  async getAllFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...await this.getAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }

  estimateDeploymentTime(functionCount) {
    // Base time per function deployment + overhead
    const baseTimePerFunction = 0.5; // minutes
    const overhead = 2; // minutes
    
    return Math.ceil(functionCount * baseTimePerFunction + overhead);
  }

  estimateDeploymentCost() {
    // Rough cost estimation based on deployment size
    let cost = 0;
    
    if (this.currentUsage.functions) {
      // Function deployment costs (very rough estimate)
      cost += this.currentUsage.functions.count * 0.01; // $0.01 per function
      cost += this.currentUsage.functions.totalSize * 0.001; // $0.001 per MB
    }
    
    if (this.currentUsage.hosting) {
      // Hosting deployment costs
      cost += this.currentUsage.hosting.totalSize * 0.0001; // $0.0001 per MB
    }
    
    return Math.max(cost, 0.05); // Minimum $0.05
  }

  calculateOptimalDelay(batchSize, totalSize) {
    // Calculate delay based on batch size and total deployment size
    let baseDelay = 30000; // 30 seconds
    
    if (totalSize > 500) {
      baseDelay = 60000; // 1 minute for large deployments
    }
    
    if (batchSize < 3) {
      baseDelay = 45000; // 45 seconds for small batches
    }
    
    return baseDelay;
  }

  getQuotaThresholds() {
    return this.quotaConfig;
  }

  updateQuotaConfig(newConfig) {
    this.quotaConfig = { ...this.quotaConfig, ...newConfig };
  }
}

// Main execution
if (require.main === module) {
  const [,, projectRoot, configDir] = process.argv;
  
  if (!projectRoot) {
    console.error('Usage: node quota-manager.js <project-root> [config-dir]');
    process.exit(1);
  }
  
  const quotaManager = new QuotaManager(
    projectRoot, 
    configDir || path.join(projectRoot, 'scripts', 'deployment', 'config')
  );
  
  quotaManager.monitorQuotas().then(report => {
    console.log('\n📊 Quota monitoring completed');
    
    if (report.status === 'error') {
      process.exit(1);
    } else if (report.status === 'warning') {
      console.log('⚠️  Proceeding with warnings');
      process.exit(0);
    } else {
      console.log('✅ All quota checks passed');
      process.exit(0);
    }
  }).catch(error => {
    console.error('❌ Quota monitoring failed:', error);
    process.exit(1);
  });
}

module.exports = QuotaManager;